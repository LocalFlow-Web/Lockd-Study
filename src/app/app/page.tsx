"use client";

import { SetList } from "@/components/SetList";
import { Uploader } from "@/components/Uploader";
import { useStore } from "@/lib/store";

export default function Home() {
  const { sets, ready } = useStore();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>What are we studying?</h1>
          <p className="page-sub">Upload a lecture and Lockd turns it into notes, flashcards, and a practice quiz.</p>
        </div>
      </div>

      <Uploader />

      <section className="lib">
        <h2>Recent study sets</h2>
        {ready && <SetList sets={[...sets].sort((a, b) => b.createdAt - a.createdAt)} />}
      </section>
    </div>
  );
}
