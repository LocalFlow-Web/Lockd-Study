"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, timeAgo } from "@/components/bits";
import { Flashcards } from "@/components/Flashcards";
import { NotesView } from "@/components/NotesView";
import { Quiz } from "@/components/Quiz";
import { useStore } from "@/lib/store";

type Tab = "notes" | "cards" | "quiz";

export default function SetPage() {
  const { id } = useParams<{ id: string }>();
  const { sets, classes, ready, deleteSet } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notes");

  if (!ready) return null;
  const set = sets.find((s) => s.id === id);
  if (!set) {
    return (
      <div className="page">
        <p className="empty">
          This study set isn&apos;t on this device. <Link href="/app">Upload a PDF</Link> to make a new one.
        </p>
      </div>
    );
  }
  const cls = classes.find((c) => c.id === set.classId);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "notes", label: "Notes" },
    { id: "cards", label: "Flashcards", count: set.flashcards.length },
    { id: "quiz", label: "Practice quiz", count: set.quiz.length },
  ];

  return (
    <div className="page">
      {cls && (
        <Link href={`/app/class/${cls.id}`} className="crumb">
          <span className="dot" style={{ background: cls.color }} />
          {cls.name}
        </Link>
      )}
      <div className="page-head">
        <div>
          <h1>{set.title}</h1>
          <p className="page-sub">
            From {set.fileName}, {timeAgo(set.createdAt)}
          </p>
        </div>
        <button
          className="icon-btn"
          aria-label="Delete study set"
          title="Delete study set"
          onClick={() => {
            if (confirm(`Delete “${set.title}”? This can't be undone.`)) {
              deleteSet(set.id);
              router.push(cls ? `/app/class/${cls.id}` : "/app");
            }
          }}
        >
          <Icon.Trash />
        </button>
      </div>

      {set.demo && (
        <p className="banner">
          This is sample content so you can try the app. Once an API key is added, uploads will be turned into notes
          from your actual PDF.
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Study modes">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count !== undefined && <small>{t.count}</small>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "notes" && <NotesView notes={set.notes} />}
        {tab === "cards" && <Flashcards set={set} />}
        {tab === "quiz" && <Quiz set={set} />}
      </div>
    </div>
  );
}
