"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { StudyMaterial } from "@/lib/types";
import { Icon } from "./bits";

const STEPS = ["Reading the PDF", "Writing your notes", "Making flashcards", "Building the practice quiz"];

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
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("That file isn't a PDF. Export it as a PDF and try again.");
      return;
    }

    let target = classId;
    if (!target) target = addClass("My class").id;

    setBusy(file.name);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/generate", { method: "POST", body });
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
          accept="application/pdf,.pdf"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Icon.Doc size={32} />
        <h2>Drop a lecture PDF here</h2>
        <p>Slides, readings, or study guides. You&apos;ll get notes, flashcards, and a quiz.</p>
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
            Choose a PDF
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
