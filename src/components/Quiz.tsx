"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { QuizQuestion, StudySet } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const MAX_QUESTIONS = 20;
const LENGTHS = Array.from({ length: MAX_QUESTIONS }, (_, i) => i + 1);

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

type Phase = "setup" | "running" | "done";

export function Quiz({ set }: { set: StudySet }) {
  const { recordScore, addQuizQuestions } = useStore();
  const pool = set.quiz;
  const [length, setLength] = useState(() => Math.min(10, Math.max(pool.length, 1)));
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortBy = Math.max(0, length - pool.length);

  function begin(qs: QuizQuestion[]) {
    setQuestions(qs);
    setAnswers(qs.map(() => null));
    setPos(0);
    setPhase("running");
  }

  async function start() {
    setError(null);
    if (shortBy === 0) {
      begin(pickRandom(pool, length));
      return;
    }

    // The pool is too small: write more questions from the notes first.
    setWriting(true);
    try {
      const res = await fetch("/api/more-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: set.notes, existing: pool.map((q) => q.question), count: shortBy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't write more questions. Try again.");
      const extra = data.quiz as QuizQuestion[];
      if (extra.length) addQuizQuestions(set.id, extra);
      const combined = [...pool, ...extra];
      if (combined.length < length) {
        setLength(combined.length);
        setError(
          `This lecture only had enough material for ${combined.length} questions, so the quiz is ${combined.length} long.`,
        );
      }
      begin(pickRandom(combined, Math.min(length, combined.length)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write more questions. Try again.");
    } finally {
      setWriting(false);
    }
  }

  if (phase === "setup") {
    return (
      <div className="quiz">
        <div className="quiz-setup">
          <h2>Practice quiz</h2>
          <p className="page-sub">
            Each quiz pulls a random mix from this set&apos;s {pool.length} questions, so retakes are different.
            {set.bestScore !== undefined ? ` Your best score so far is ${set.bestScore}%.` : ""}
          </p>

          <div className="quiz-setup-row">
            <label htmlFor="quiz-length">How many questions?</label>
            <select
              id="quiz-length"
              className="select"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              disabled={writing}
            >
              {LENGTHS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {shortBy > 0 && !writing && (
            <p className="quiz-setup-note">
              This set has {pool.length}, so Lockd will write {shortBy} more from your notes before starting.
            </p>
          )}

          <button className="btn btn-primary" onClick={start} disabled={writing}>
            {writing ? `Writing ${shortBy} more questions…` : "Start quiz"}
          </button>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const correctCount = answers.filter((a, i) => a === questions[i].answerIndex).length;
  const total = questions.length;

  if (phase === "done") {
    const pct = Math.round((correctCount / total) * 100);
    const missed = questions.filter((q, i) => answers[i] !== q.answerIndex);
    return (
      <div className="quiz">
        <div className="score">
          <div className="score-num">
            {correctCount}
            <small>/{total}</small>
          </div>
          <h2 style={{ fontSize: 24, margin: 0 }}>
            {pct === 100
              ? "Perfect. You've got this one."
              : pct >= 70
                ? "Solid. Review what you missed."
                : "Keep going. Review the misses below."}
          </h2>
          <p className="page-sub">
            {pct}% this round{set.bestScore !== undefined ? `, best ${Math.max(set.bestScore, pct)}%` : ""}
          </p>
          <div className="fc-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => begin(pickRandom(pool, Math.min(total, pool.length)))}>
              New {total}-question quiz
            </button>
            <button className="btn btn-quiet" onClick={() => setPhase("setup")}>
              Change length
            </button>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="review">
            <h2 style={{ fontSize: 20, margin: "8px 0 4px" }}>What you missed</h2>
            {missed.map((q) => (
              <div key={q.question} className="review-item">
                <b>{q.question}</b>
                <p>
                  Answer: {q.options[q.answerIndex]}. {q.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const q = questions[pos];
  const picked = answers[pos];
  const answered = picked !== null;

  function pick(i: number) {
    if (answered) return;
    setAnswers((a) => a.map((v, k) => (k === pos ? i : v)));
  }

  function next() {
    if (pos + 1 < total) setPos(pos + 1);
    else {
      recordScore(set.id, Math.round((correctCount / total) * 100));
      setPhase("done");
    }
  }

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span>
          Question {pos + 1} of {total}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {correctCount} correct
          <button className="btn btn-quiet btn-small" onClick={() => setPhase("setup")}>
            End quiz
          </button>
        </span>
      </div>
      <div className="quiz-track" aria-hidden="true">
        {questions.map((qq, i) => (
          <span
            key={i}
            data-state={
              i === pos && !answered
                ? "current"
                : answers[i] === null
                  ? "todo"
                  : answers[i] === qq.answerIndex
                    ? "right"
                    : "wrong"
            }
          />
        ))}
      </div>

      <h2>{q.question}</h2>

      <div className="options" role="group" aria-label="Answer choices">
        {q.options.map((opt, i) => {
          let state: string | undefined;
          if (answered) {
            if (i === q.answerIndex) state = "right";
            else if (i === picked) state = "wrong";
            else state = "dim";
          }
          return (
            <button key={i} className="option" data-state={state} onClick={() => pick(i)} disabled={answered}>
              <span className="letter">{LETTERS[i]}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <div className="explain" data-right={picked === q.answerIndex} role="status">
            <strong>{picked === q.answerIndex ? "Correct" : `Not quite. It's ${LETTERS[q.answerIndex]}.`}</strong>
            {q.explanation}
          </div>
          <div className="quiz-next">
            <button className="btn btn-primary" onClick={next} autoFocus>
              {pos + 1 < total ? "Next question" : "See your score"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
