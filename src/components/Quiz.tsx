"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { StudySet } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Quiz({ set }: { set: StudySet }) {
  const { recordScore } = useStore();
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => set.quiz.map(() => null));
  const [done, setDone] = useState(false);

  if (!set.quiz.length) return <p className="empty">This set has no quiz questions.</p>;

  const q = set.quiz[pos];
  const picked = answers[pos];
  const answered = picked !== null;
  const correctCount = answers.filter((a, i) => a === set.quiz[i].answerIndex).length;

  function pick(i: number) {
    if (answered) return;
    setAnswers((a) => a.map((v, k) => (k === pos ? i : v)));
  }

  function next() {
    if (pos + 1 < set.quiz.length) setPos(pos + 1);
    else {
      const pct = Math.round((correctCount / set.quiz.length) * 100);
      recordScore(set.id, pct);
      setDone(true);
    }
  }

  function restart() {
    setAnswers(set.quiz.map(() => null));
    setPos(0);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((correctCount / set.quiz.length) * 100);
    const missed = set.quiz.map((qq, i) => ({ qq, a: answers[i] })).filter(({ qq, a }) => a !== qq.answerIndex);
    return (
      <div className="quiz">
        <div className="score">
          <div className="score-num">
            {correctCount}
            <small>/{set.quiz.length}</small>
          </div>
          <h2 style={{ fontSize: 24, margin: 0 }}>
            {pct === 100 ? "Perfect. You've got this one." : pct >= 70 ? "Solid. Review what you missed." : "Keep going. Review the misses below."}
          </h2>
          <p className="page-sub">
            {pct}% this round{set.bestScore !== undefined ? `, best ${Math.max(set.bestScore, pct)}%` : ""}
          </p>
          <button className="btn btn-primary" onClick={restart} style={{ marginTop: 8 }}>
            Retake quiz
          </button>
        </div>

        {missed.length > 0 && (
          <div className="review">
            <h2 style={{ fontSize: 20, margin: "8px 0 4px" }}>What you missed</h2>
            {missed.map(({ qq }) => (
              <div key={qq.question} className="review-item">
                <b>{qq.question}</b>
                <p>
                  Answer: {qq.options[qq.answerIndex]}. {qq.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span>
          Question {pos + 1} of {set.quiz.length}
        </span>
        <span>{correctCount} correct</span>
      </div>
      <div className="quiz-track" aria-hidden="true">
        {set.quiz.map((qq, i) => (
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
              {pos + 1 < set.quiz.length ? "Next question" : "See your score"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
