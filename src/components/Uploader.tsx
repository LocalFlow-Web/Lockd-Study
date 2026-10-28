"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { meaningfulLength, PDF_DIRECT_MAX, pdfToText, pptxToText } from "@/lib/extract-client";
import { useStore } from "@/lib/store";
import type { StudyMaterial } from "@/lib/types";
import { Icon } from "./bits";

const STEPS = ["Reading your lecture", "Writing your notes", "Making flashcards", "Building the practice quiz"];

class UploadError extends Error {}

// PowerPoints and big PDFs: read the text here and send only that, so file
// size doesn't matter. Smaller PDFs go up whole so diagrams are seen too.
async function send(file: File): Promise<Response> {
  const lower = file.name.toLowerCase();
  const isPptx = lower.endsWith(".pptx");

  if (isPptx || file.size > PDF_DIRECT_MAX) {
    let text: string;
    try {
      text = isPptx ? await pptxToText(file) : await pdfToText(file);
    } catch {
      throw new UploadError(
        isPptx
          ? "Couldn't open that PowerPoint. Save it again as .pptx, or export it as a PDF."
          : "Couldn't open that PDF. Try exporting it again.",
      );
    }
    if (meaningfulLength(text) < 40) {
      throw new UploadError(
        isPptx
          ? "Those slides are mostly pictures, so there's no text to read. Export the deck as a PDF and upload that instead."
          : "This PDF is scanned images with no text, and it's too big to send whole. Split it into smaller PDFs (under 20 MB each).",
      );
    }
    return fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, text }),
    });
  }

  const body = new FormData();
  body.append("file", file);
  return fetch("/api/generate", { method: "POST", body });
}

export function Uploader({ classId: fixedClassId }: { classId?: string }) {
  const { classes, addClass, addSet } = useStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [classId, setClassId] = useState(fixedClassId ?? "");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedClassId) setClassId(fixedClassId);
    else if (!classId && classes.length) setClassId(classes[0].id);
  }, [fixedClassId, classes, classId]);

  // Advance the progress list while waiting. The last step waits for the response.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, [busy]);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".pptx") && file.type !== "application/pdf") {
      setError(
        lower.endsWith(".ppt") || lower.endsWith(".key")
          ? "Lockd can't read that file type. Open it and save it as .pptx or PDF, then try again."
          : "Lockd reads PDFs and PowerPoint (.pptx) files. Export it as one of those and try again.",
      );
      return;
    }

    let target = classId;
    if (!target) target = addClass("My class").id;

    setBusy(file.name);
    try {
      const res = await send(file);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      const set = addSet(target, file.name, data as StudyMaterial);
      router.push(`/app/set/${set.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(null);
    }
  }

  if (busy) {
    return (
      <div className="working" role="status" aria-live="polite">
        <div>
          <h2 style={{ fontSize: 22 }}>Building your study set</h2>
          <p className="page-sub">{busy}</p>
        </div>
        <ol className="working-steps">
          {STEPS.map((label, i) => (
            <li key={label} data-state={i < step ? "done" : i === step ? "active" : "todo"}>
              <span className="tick">{i < step && <Icon.Check size={12} />}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label
        className="drop"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Icon.Doc size={32} />
        <h2>Drop a lecture here</h2>
        <p>PDF or PowerPoint (.pptx). You&apos;ll get notes, flashcards, and a quiz.</p>
        <div className="drop-row" onClick={(e) => e.preventDefault()}>
          {!fixedClassId && classes.length > 0 && (
            <select
              className="select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="Class this PDF belongs to"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            <Icon.Upload size={16} />
            Choose a file
          </button>
        </div>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
