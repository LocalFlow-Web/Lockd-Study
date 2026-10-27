"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/bits";
import { SetList } from "@/components/SetList";
import { Uploader } from "@/components/Uploader";
import { useStore } from "@/lib/store";

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const { classes, sets, ready, renameClass, deleteClass } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const cls = classes.find((c) => c.id === id);

  if (!ready) return null;
  if (!cls) {
    return (
      <div className="page">
        <p className="empty">This class doesn&apos;t exist anymore. Pick another one from the sidebar.</p>
      </div>
    );
  }

  const classSets = sets.filter((s) => s.classId === cls.id).sort((a, b) => b.createdAt - a.createdAt);
  const cards = classSets.reduce((n, s) => n + s.flashcards.length, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = new FormData(e.currentTarget).get("name") as string;
                renameClass(cls.id, v);
                setEditing(false);
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input className="input" name="name" defaultValue={cls.name} autoFocus aria-label="Class name" />
              <button className="btn btn-primary btn-small">Save</button>
            </form>
          ) : (
            <h1 style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="dot" style={{ background: cls.color, width: 16, height: 16, borderRadius: 5 }} />
              {cls.name}
            </h1>
          )}
          <p className="page-sub">
            {classSets.length} study {classSets.length === 1 ? "set" : "sets"}, {cards} flashcards
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
            Rename
          </button>
          <button
            className="icon-btn"
            aria-label="Delete class"
            title="Delete class"
            onClick={() => {
              if (confirm(`Delete ${cls.name} and its ${classSets.length} study sets? This can't be undone.`)) {
                deleteClass(cls.id);
                router.push("/app");
              }
            }}
          >
            <Icon.Trash />
          </button>
        </div>
      </div>

      <Uploader classId={cls.id} />

      <section className="lib">
        <h2>Study sets</h2>
        <SetList sets={classSets} showClass={false} />
      </section>
    </div>
  );
}
