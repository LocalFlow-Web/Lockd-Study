import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DEMO_MATERIAL, titleFromFileName } from "@/lib/demo";
import { extractPptx, slidesToText } from "@/lib/pptx";
import { claimUpload, finishUpload, requireUser } from "@/lib/supabase/limits";
import type { StudyMaterial } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Whole-PDF uploads. Vercel rejects request bodies over 4.5 MB. The browser
// only sends PDFs up to 4 MB whole and extracts the text from bigger ones
// (see src/lib/extract-client.ts), so this is just a backstop.
const MAX_BYTES = process.env.VERCEL ? 4.4 * 1024 * 1024 : 22 * 1024 * 1024;
// Extracted text: about 150k tokens. Real lectures are far below this.
const MAX_TEXT_CHARS = 600_000;
const MODEL = process.env.LOCKD_MODEL || "claude-haiku-5-5";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "notes", "flashcards", "quiz"],
  properties: {
    title: { type: "string" },
    notes: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "sections", "keyTerms"],
      properties: {
        summary: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["heading", "points"],
            properties: {
              heading: { type: "string" },
              points: { type: "array", items: { type: "string" } },
              examTip: { type: "string" },
              page: { type: "integer" },
            },
          },
        },
        keyTerms: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["term", "definition"],
            properties: { term: { type: "string" }, definition: { type: "string" } },
          },
        },
      },
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back"],
        properties: { front: { type: "string" }, back: { type: "string" } },
      },
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answerIndex", "explanation"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answerIndex: { type: "integer" },
          explanation: { type: "string" },
        },
      },
    },
  },
};

const INSTRUCTIONS = `You turn a student's lecture (a PDF or the text of PowerPoint slides) into study material for a college exam.

Notes:
- "summary": 2–3 plain sentences on what the lecture covers and why it matters.
- "sections": follow the lecture's own order. Short, scannable bullet points in plain language, not copied slide text. Wrap the most important term in a bullet in **double asterisks** (at most one or two per bullet). Add "examTip" only when something is clearly exam-worthy (emphasized, repeated, or a common trick). Set "page" to the PDF page or slide number the section mainly comes from.
- "keyTerms": the vocabulary a student must know, with one-sentence definitions.

Flashcards: 10–25 cards. One fact per card. Fronts are questions, backs are short answers.

Quiz: 20 multiple-choice questions with exactly 4 options each (fewer only if the lecture is too short to support 20 distinct questions). Students take random subsets of this pool, so cover the whole lecture and don't repeat the same fact. Test understanding, not just recall. "answerIndex" is the 0-based index of the correct option. Vary which position holds the correct answer. "explanation" says why the answer is right in one or two sentences.

"title": a short, clean title for the lecture.

Only use what's in the document. If something is unclear in the source, leave it out rather than guessing. For PowerPoint text, speaker notes often hold the professor's explanations: use them.`;

type Source =
  | { type: "base64"; media_type: "application/pdf"; data: string }
  | { type: "text"; media_type: "text/plain"; data: string };

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Two ways in: JSON with text the browser already extracted (PowerPoints and
// big PDFs), or a multipart upload of a whole PDF (or a .pptx, as a fallback).
async function readUpload(req: Request): Promise<{ fileName: string; source: Source } | NextResponse> {
  if (req.headers.get("content-type")?.includes("application/json")) {
    let body: { fileName?: string; text?: string };
    try {
      body = await req.json();
    } catch {
      return fail("Bad request.", 400);
    }
    const text = (body.text ?? "").trim();
    if (!text) return fail("No text came through. Try the upload again.", 400);
    if (text.length > MAX_TEXT_CHARS) {
      return fail("That lecture has a huge amount of text. Split it into two files and upload each one.", 413);
    }
    return { fileName: body.fileName || "Lecture", source: { type: "text", media_type: "text/plain", data: text } };
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Upload a PDF or PowerPoint file.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Upload a PDF or PowerPoint file.", 400);

  const lower = file.name.toLowerCase();
  const kind = lower.endsWith(".pdf") || file.type === "application/pdf" ? "pdf" : lower.endsWith(".pptx") ? "pptx" : null;
  if (!kind) {
    const hint =
      lower.endsWith(".ppt") || lower.endsWith(".key")
        ? "Open it and save it as .pptx or PDF, then try again."
        : "Upload a PDF or a PowerPoint (.pptx) file.";
    return fail(`Lockd can't read that file type. ${hint}`, 400);
  }
  if (file.size > MAX_BYTES) {
    return fail("That file is too big to send whole. Reload the page and upload it again.", 413);
  }

  const bytes = await file.arrayBuffer();
  if (kind === "pdf") {
    return {
      fileName: file.name,
      source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") },
    };
  }

  let slideText: string;
  try {
    slideText = slidesToText(await extractPptx(bytes));
  } catch {
    return fail("Couldn't open that PowerPoint. Save it again as .pptx, or export it as a PDF.", 400);
  }
  if (slideText.replace(/--- Slide \d+ ---|\(no text on this slide[^)]*\)/g, "").trim().length < 40) {
    return fail(
      "Those slides are mostly pictures, so there's no text to read. Export the deck as a PDF and upload that instead.",
      422,
    );
  }
  return { fileName: file.name, source: { type: "text", media_type: "text/plain", data: slideText } };
}

export async function POST(req: Request) {
  // Signed-in users only (when logins are set up).
  const signed = await requireUser();
  if (signed instanceof NextResponse) return signed;

  const upload = await readUpload(req);
  if (upload instanceof NextResponse) return upload;
  const { fileName, source } = upload;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Demo mode: no key yet, so return sample material after a short pause.
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1800));
    const material: StudyMaterial = { ...DEMO_MATERIAL, title: titleFromFileName(fileName), demo: true };
    return NextResponse.json(material);
  }

  // Count this upload against the daily limit before spending anything.
  let uploadId: number | null = null;
  if (signed) {
    const claimed = await claimUpload(signed, fileName);
    if (claimed instanceof NextResponse) return claimed;
    uploadId = claimed;
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source, title: fileName },
            { type: "text", text: INSTRUCTIONS },
          ],
        },
      ],
    });

    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");
    const parsed = JSON.parse(text.text) as Omit<StudyMaterial, "demo">;

    // Keep quiz answers in range even if the model slips.
    parsed.quiz = parsed.quiz.filter((q) => q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length);

    console.log(
      `[generate] ${message.model} | ${fileName} (${source.type === "text" ? "text" : "pdf"}): ${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens`,
    );

    if (signed && uploadId !== null) {
      await finishUpload(signed, uploadId, {
        ok: true,
        model: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      });
    }

    return NextResponse.json({ ...parsed, demo: false } satisfies StudyMaterial);
  } catch (err) {
    console.error("[generate] failed", err);
    // A failed upload doesn't count against the limit.
    if (signed && uploadId !== null) await finishUpload(signed, uploadId, { ok: false });
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    const message =
      status === 401
        ? "The API key was rejected. Check ANTHROPIC_API_KEY in .env.local."
        : status === 429
          ? "Too many requests right now. Wait a minute and try again."
          : "Couldn't read that file. Try again, or try a different one.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
