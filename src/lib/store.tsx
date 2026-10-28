"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MATERIAL } from "./demo";
import { supabaseBrowser } from "./supabase/client";
import { authEnabled } from "./supabase/config";
import type { CardStatus, QuizQuestion, StudyClass, StudyMaterial, StudySet } from "./types";

// Two modes:
// - Local (no Supabase configured): everything lives in this browser.
// - Cloud (Supabase configured, user signed in): classes and study sets are
//   saved to the user's account and sync across devices.
// The rest of the app doesn't know or care which one is running.
const STORAGE_KEY = "lockd:v1";
const IMPORTED_KEY = "lockd:v1:imported";

export const CLASS_COLORS = ["#4C3FD1", "#1F8A5B", "#D14B7A", "#1C7FB8", "#C77A12", "#6A5A4A"];

type State = { classes: StudyClass[]; sets: StudySet[] };

export type Usage = { used: number; limit: number | null; plan: string; resetAt: string | null };

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function seed(): State {
  const bio: StudyClass = { id: "bio101", name: "Bio 101", color: CLASS_COLORS[1] };
  const set: StudySet = {
    ...DEMO_MATERIAL,
    title: "Cellular respiration",
    demo: true,
    id: "sample",
    classId: bio.id,
    fileName: "Lecture 9 - Cellular Respiration.pdf",
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    cardStatus: DEMO_MATERIAL.flashcards.map(() => "new"),
  };
  return { classes: [bio], sets: [set] };
}

// Sample sets saved before the sample quiz grew to 20 questions get the full pool.
function upgrade(state: State): State {
  return {
    ...state,
    sets: state.sets.map((x) =>
      x.demo && x.quiz.length < DEMO_MATERIAL.quiz.length ? { ...x, quiz: DEMO_MATERIAL.quiz } : x,
    ),
  };
}

function readLocal(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? upgrade(JSON.parse(raw) as State) : null;
  } catch {
    return null;
  }
}

type Store = State & {
  ready: boolean;
  cloud: boolean;
  email: string | null;
  syncError: string | null;
  usage: Usage | null;
  refreshUsage: () => void;
  signOut: () => Promise<void>;
  addClass: (name: string) => StudyClass;
  renameClass: (id: string, name: string) => void;
  deleteClass: (id: string) => void;
  addSet: (classId: string, fileName: string, material: StudyMaterial) => StudySet;
  deleteSet: (id: string) => void;
  setCardStatus: (setId: string, index: number, status: CardStatus) => void;
  resetCards: (setId: string) => void;
  recordScore: (setId: string, score: number) => void;
  addQuizQuestions: (setId: string, questions: QuizQuestion[]) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ classes: [], sets: [] });
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  // What the database currently holds, so only real changes get written.
  const synced = useRef<State>({ classes: [], sets: [] });

  const refreshUsage = useCallback(() => {
    if (!authEnabled) return;
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setUsage(u))
      .catch(() => {});
  }, []);

  // ---- Load ----
  useEffect(() => {
    if (!authEnabled) {
      setState(readLocal() ?? seed());
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = supabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/login";
        return;
      }
      setEmail(auth.user.email ?? null);

      const [classesRes, setsRes] = await Promise.all([
        supabase.from("classes").select("id, name, color").order("created_at"),
        supabase.from("study_sets").select("data").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (classesRes.error || setsRes.error) {
        console.error(classesRes.error ?? setsRes.error);
        setSyncError("Couldn't load your study sets. Check your connection and reload the page.");
        setReady(true);
        return;
      }

      const remote: State = upgrade({
        classes: classesRes.data as StudyClass[],
        sets: setsRes.data.map((r) => r.data as StudySet),
      });

      if (remote.classes.length || remote.sets.length) {
        synced.current = remote;
        setState(remote);
      } else {
        // New account: bring over anything made on this device before logins
        // existed (once), otherwise start with the sample lecture.
        let start = seed();
        try {
          const local = readLocal();
          if (local && !localStorage.getItem(IMPORTED_KEY) && local.sets.length) start = local;
          localStorage.setItem(IMPORTED_KEY, "1");
        } catch {
          // Storage blocked: fall back to the sample.
        }
        synced.current = { classes: [], sets: [] };
        setState(start); // the save effect below uploads it
      }
      setReady(true);
    })();
    refreshUsage();

    return () => {
      cancelled = true;
    };
  }, [refreshUsage]);

  // ---- Save ----
  useEffect(() => {
    if (!ready) return;

    if (!authEnabled) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage full or blocked: the app keeps working for this session.
      }
      return;
    }
    // Wait a moment so rapid changes (flipping through cards) become one write.
    const t = setTimeout(async () => {
      const before = synced.current;
      const after = state;
      const supabase = supabaseBrowser();
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

      const classUpserts = after.classes.filter((c) => !same(c, before.classes.find((b) => b.id === c.id)));
      const classDeletes = before.classes.filter((b) => !after.classes.some((c) => c.id === b.id)).map((c) => c.id);
      const setUpserts = after.sets.filter((s) => !same(s, before.sets.find((b) => b.id === s.id)));
      const setDeletes = before.sets.filter((b) => !after.sets.some((s) => s.id === b.id)).map((s) => s.id);
      if (!classUpserts.length && !classDeletes.length && !setUpserts.length && !setDeletes.length) return;

      const results = await Promise.all([
        classUpserts.length
          ? supabase.from("classes").upsert(classUpserts.map((c) => ({ id: c.id, name: c.name, color: c.color })))
          : null,
        setUpserts.length
          ? supabase.from("study_sets").upsert(
              setUpserts.map((s) => ({
                id: s.id,
                class_id: s.classId,
                data: s,
                created_at: new Date(s.createdAt).toISOString(),
                updated_at: new Date().toISOString(),
              })),
            )
          : null,
        setDeletes.length ? supabase.from("study_sets").delete().in("id", setDeletes) : null,
        classDeletes.length ? supabase.from("classes").delete().in("id", classDeletes) : null,
      ]);

      const failed = results.find((r) => r?.error);
      if (failed?.error) {
        console.error(failed.error);
        setSyncError("Some changes didn't save to your account. Check your connection; they'll retry on your next change.");
        return;
      }
      synced.current = after;
      setSyncError(null);
    }, 500);

    return () => clearTimeout(t);
  }, [state, ready]);

  const signOut = useCallback(async () => {
    if (!authEnabled) return;
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }, []);

  // ---- Changes ----
  const addClass = useCallback((name: string) => {
    const created: StudyClass = { id: uid(), name: name.trim() || "New class", color: CLASS_COLORS[0] };
    setState((s) => {
      created.color = CLASS_COLORS[s.classes.length % CLASS_COLORS.length];
      return { ...s, classes: [...s.classes, created] };
    });
    return created;
  }, []);

  const renameClass = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)) }));
  }, []);

  const deleteClass = useCallback((id: string) => {
    setState((s) => ({ classes: s.classes.filter((c) => c.id !== id), sets: s.sets.filter((x) => x.classId !== id) }));
  }, []);

  const addSet = useCallback((classId: string, fileName: string, material: StudyMaterial) => {
    const created: StudySet = {
      ...material,
      id: uid(),
      classId,
      fileName,
      createdAt: Date.now(),
      cardStatus: material.flashcards.map(() => "new"),
    };
    setState((s) => ({ ...s, sets: [created, ...s.sets] }));
    return created;
  }, []);

  const deleteSet = useCallback((id: string) => {
    setState((s) => ({ ...s, sets: s.sets.filter((x) => x.id !== id) }));
  }, []);

  const setCardStatus = useCallback((setId: string, index: number, status: CardStatus) => {
    setState((s) => ({
      ...s,
      sets: s.sets.map((x) =>
        x.id === setId ? { ...x, cardStatus: x.cardStatus.map((st, i) => (i === index ? status : st)) } : x,
      ),
    }));
  }, []);

  const resetCards = useCallback((setId: string) => {
    setState((s) => ({
      ...s,
      sets: s.sets.map((x) => (x.id === setId ? { ...x, cardStatus: x.cardStatus.map(() => "new") } : x)),
    }));
  }, []);

  const recordScore = useCallback((setId: string, score: number) => {
    setState((s) => ({
      ...s,
      sets: s.sets.map((x) => (x.id === setId ? { ...x, bestScore: Math.max(x.bestScore ?? 0, score) } : x)),
    }));
  }, []);

  const addQuizQuestions = useCallback((setId: string, questions: QuizQuestion[]) => {
    setState((s) => ({
      ...s,
      sets: s.sets.map((x) => (x.id === setId ? { ...x, quiz: [...x.quiz, ...questions] } : x)),
    }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      cloud: authEnabled,
      email,
      syncError,
      usage,
      refreshUsage,
      signOut,
      addClass,
      renameClass,
      deleteClass,
      addSet,
      deleteSet,
      setCardStatus,
      resetCards,
      recordScore,
      addQuizQuestions,
    }),
    [
      state,
      ready,
      email,
      syncError,
      usage,
      refreshUsage,
      signOut,
      addClass,
      renameClass,
      deleteClass,
      addSet,
      deleteSet,
      setCardStatus,
      resetCards,
      recordScore,
      addQuizQuestions,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
