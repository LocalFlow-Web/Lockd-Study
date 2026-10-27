"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { timeAgo } from "./bits";

export function SetList({ sets, showClass = true }: { sets: StudySet[]; showClass?: boolean }) {
  const { classes } = useStore();

  if (!sets.length) {
    return <p className="empty">No study sets yet. Upload a lecture PDF above to make your first one.</p>;
  }

  return (
    <div>
      {sets.map((s) => {
        const cls = classes.find((c) => c.id === s.classId);
        const known = s.cardStatus.filter((x) => x === "known").length;
        const pct = s.flashcards.length ? Math.round((known / s.flashcards.length) * 100) : 0;
        return (
          <Link key={s.id} href={`/app/set/${s.id}`} className="set-row">
            <div>
              <h3>{s.title}</h3>
              <div className="set-meta">
                {showClass && cls && (
                  <span className="tag">
                    <span className="dot" style={{ background: cls.color }} />
                    {cls.name}
                  </span>
                )}
                <span>{s.flashcards.length} cards</span>
                <span>{s.quiz.length} quiz questions</span>
                {s.bestScore !== undefined && <span>Best quiz score {s.bestScore}%</span>}
                <span>{timeAgo(s.createdAt)}</span>
              </div>
            </div>
            <div className="progress" title={`${known} of ${s.flashcards.length} cards known`}>
              <span className="bar">
                <span style={{ width: `${pct}%` }} />
              </span>
              {pct}% known
            </div>
          </Link>
        );
      })}
    </div>
  );
}
