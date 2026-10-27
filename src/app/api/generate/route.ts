import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DEMO_MATERIAL, titleFromFileName } from "@/lib/demo";
import type { StudyMaterial } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over 4.5 MB, so stay under that when deployed.
// Locally there's no such limit. Before launch, large PDFs should upload to
// storage first (Supabase) and be passed to this route by reference.
const MAX_BYTES = process.env.VERCEL ? 4.4 * 1024 * 1024 : 25 * 1024 * 1024;
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

const INSTRUCTIONS = `You turn a student's lecture PDF into study material for a college exam.

Notes:
- "summary": 2–3 plain sentences on what the lecture covers and why it matters.
- "sections": follow the lecture's own order. Short, scannable bullet points in plain language, not copied slide text. Wrap the most important term in a bullet in **double asterisks** (at most one or two per bullet). Add "examTip" only when something is clearly exam-worthy (emphasized, repeated, or a common trick). Set "page" to the PDF page the section mainly comes from.
- "keyTerms": the vocabulary a student must know, with one-sentence definitions.

Flashcards: 10–25 cards. One fact per card. Fronts are questions, backs are short answers.

Quiz: 8–12 multiple-choice questions with exactly 4 options each. Test understanding, not just recall. "answerIndex" is the 0-based index of the correct option. Vary which position holds the correct answer. "explanation" says why the answer is right in one or two sentences.

"title": a short, clean title for the lecture.

Only use what's in the document. If something is unclear in the source, leave it out rather than guessing.`;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "That file isn't a PDF. Export it as a PDF and try again." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    const mb = Math.floor(MAX_BYTES / 1024 / 1024);
    return NextResponse.json({ error: `That PDF is over ${mb} MB. Try splitting it into smaller parts.` }, { status: 413 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Demo mode: no key yet, so return sample material after a short pause.
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1800));
    const material: StudyMaterial = { ...DEMO_MATERIAL, title: titleFromFileName(file.name), demo: true };
    return NextResponse.json(material);
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
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
            { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: file.name },
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
      `[generate] ${file.name}: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens`,
    );

    return NextResponse.json({ ...parsed, demo: false } satisfies StudyMaterial);
  } catch (err) {
    console.error("[generate] failed", err);
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    const message =
      status === 401
        ? "The API key was rejected. Check ANTHROPIC_API_KEY in .env.local."
        : status === 429
          ? "Too many requests right now. Wait a minute and try again."
          : "Couldn't read that PDF. Try again, or try a different file.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
