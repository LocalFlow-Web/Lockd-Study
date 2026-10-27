"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { Icon } from "./bits";

function shuffled(arr: number[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Flashcards({ set }: { set: StudySet }) {
  const { setCardStatus, resetCards } = useStore();
  const all = useMemo(() => set.flashcards.map((_, i) => i), [set.flashcards]);
  const [deck, setDeck] = useState<number[]>(all);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  const cardIndex = deck[pos];
  const card = set.flashcards[cardIndex];
  const known = set.cardStatus.filter((s) => s === "known").length;
  const learning = set.cardStatus.filter((s) => s === "learning").length;

  const go = useCallback(
    (next: number) => {
      setFlipped(false);
      if (next >= deck.length) setFinished(true);
      else setPos(Math.max(0, next));
    },
    [deck.length],
  );

  const mark = useCallback(
    (status: "known" | "learning") => {
      setCardStatus(set.id, cardIndex, status);
      go(pos + 1);
    },
    [setCardStatus, set.id, cardIndex, go, pos],
  );

  function start(indices: number[]) {
    setDeck(indices);
    setPos(0);
    setFlipped(false);
    setFinished(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished || e.target instanceof HTMLInputElement) return;
      if (e.key === " " || e.key === "Enter") {
        if (e.target instanceof HTMLButtonElement && !e.target.classList.contains("card")) return;
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(pos + 1);
      else if (e.key === "ArrowLeft") go(pos - 1);
      else if (e.key === "1" && flipped) mark("learning");
      else if (e.key === "2" && flipped) mark("known");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, flipped, go, mark, pos]);

  if (!set.flashcards.length) return <p className="empty">This set has no flashcards.</p>;

  if (finished) {
    const missed = all.filter((i) => set.cardStatus[i] !== "known");
    return (
      <div className="fc">
        <div className="done">
          <h2>{missed.length === 0 ? "Every card locked in." : "Round done."}</h2>
          <p>
            You know {known} of {set.flashcards.length} cards
            {learning > 0 ? `, and ${learning} still need work` : ""}.
          </p>
          <div className="fc-actions">
            {missed.length > 0 && (
              <button className="btn btn-primary" onClick={() => start(shuffled(missed))}>
                Study the {missed.length} I missed
              </button>
            )}
            <button className="btn btn-quiet" onClick={() => start(all)}>
              Go through all cards
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => {
                resetCards(set.id);
                start(all);
              }}
            >
              Reset progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc">
      <div className="fc-top">
        <span>
          Card {pos + 1} of {deck.length}
        </span>
        <span style={{ display: "flex", gap: 8 }}>
          <span>
            {known} known, {learning} learning
          </span>
          <button className="icon-btn" onClick={() => start(shuffled(deck))} aria-label="Shuffle cards" title="Shuffle">
            <Icon.Shuffle size={16} />
          </button>
        </span>
      </div>

      <div className="fc-stage">
        <button
          className="card"
          data-flipped={flipped}
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? `Answer: ${card.back}. Click to see the question.` : `Question: ${card.front}. Click to reveal the answer.`}
        >
          <span className="face face-front">
            <span className="face-label">Question</span>
            <span className="face-q">{card.front}</span>
            <span className="face-hint">Click or press space to flip</span>
          </span>
          <span className="face face-back">
            <span className="face-label">Answer</span>
            <span className="face-a">{card.back}</span>
          </span>
        </button>
      </div>

      <div className="fc-actions">
        <button className="icon-btn" onClick={() => go(pos - 1)} disabled={pos === 0} aria-label="Previous card">
          <Icon.Back />
        </button>
        {flipped ? (
          <>
            <button className="btn btn-learning" onClick={() => mark("learning")}>
              Still learning
            </button>
            <button className="btn btn-known" onClick={() => mark("known")}>
              Got it
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        )}
        <button className="icon-btn" onClick={() => go(pos + 1)} aria-label="Next card">
          <Icon.Next />
        </button>
      </div>

      <div className="fc-dots" aria-label="Cards in this round">
        {deck.map((ci, i) => (
          <button
            key={`${ci}-${i}`}
            data-status={set.cardStatus[ci]}
            aria-current={i === pos}
            aria-label={`Card ${i + 1}, ${set.cardStatus[ci]}`}
            onClick={() => {
              setPos(i);
              setFlipped(false);
            }}
          />
        ))}
      </div>

      <p className="keys">
        <kbd>Space</kbd> flip, <kbd>1</kbd> still learning, <kbd>2</kbd> got it, <kbd>←</kbd> <kbd>→</kbd> move
      </p>
    </div>
  );
}
