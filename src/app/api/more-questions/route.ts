import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DEMO_MATERIAL } from "@/lib/demo";
import type { Notes, QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.LOCKD_MODEL || "claude-haiku-5-5";
const MAX_NEW = 20;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["quiz"],
  properties: {
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

// Writes extra quiz questions from a study set's notes, so a student can ask
// for a longer quiz than the set's current pool. The original PDF isn't
// needed: the notes already hold what the lecture covered.
export async function POST(req: Request) {
  let body: { notes?: Notes; existing?: string[]; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const count = Math.min(Math.max(Math.floor(body.count ?? 0), 1), MAX_NEW);
  const existing = new Set((body.existing ?? []).map((q) => q.trim().toLowerCase()));
  if (!body.notes) return NextResponse.json({ error: "Missing notes." }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Demo mode: hand back sample questions the set doesn't have yet.
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 900));
    const fresh = DEMO_MATERIAL.quiz.filter((q) => !existing.has(q.question.trim().toLowerCase())).slice(0, count);
    return NextResponse.json({ quiz: fresh });
  }

  const notesText = [
    body.notes.summary,
    ...body.notes.sections.map((s) => `## ${s.heading}\n${s.points.map((p) => `- ${p}`).join("\n")}`),
    "Key terms:",
    ...body.notes.keyTerms.map((t) => `- ${t.term}: ${t.definition}`),
  ].join("\n\n");

  const prompt = `Here are a student's lecture notes:

${notesText}

They already have these quiz questions:
${[...existing].map((q) => `- ${q}`).join("\n") || "(none)"}

Write ${count} NEW multiple-choice questions based only on these notes. Don't repeat or rephrase the existing questions. Exactly 4 options each. "answerIndex" is the 0-based index of the correct option; vary its position. "explanation" says why the answer is right in one or two sentences. Test understanding, not just recall.`;

  try {
    const message = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");
    const parsed = JSON.parse(text.text) as { quiz: QuizQuestion[] };
    const quiz = parsed.quiz
      .filter((q) => q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length)
      .filter((q) => !existing.has(q.question.trim().toLowerCase()))
      .slice(0, count);
    return NextResponse.json({ quiz });
  } catch (err) {
    console.error("[more-questions] failed", err);
    return NextResponse.json({ error: "Couldn't write more questions. Try again." }, { status: 502 });
  }
}
