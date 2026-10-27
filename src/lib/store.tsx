"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_MATERIAL } from "./demo";
import type { CardStatus, QuizQuestion, StudyClass, StudyMaterial, StudySet } from "./types";

// Everything is saved in the browser for now. Once logins exist, this moves
// to Supabase and the rest of the app stays the same.
const STORAGE_KEY = "lockd:v1";

export const CLASS_COLORS = ["#4C3FD1", "#1F8A5B", "#D14B7A", "#1C7FB8", "#C77A12", "#6A5A4A"];

type State = { classes: StudyClass[]; sets: StudySet[] };

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

type Store = State & {
  ready: boolean;
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

// Sample sets saved before the sample quiz grew to 20 questions get the full pool.
function upgrade(state: State): State {
  return {
    ...state,
    sets: state.sets.map((x) =>
      x.demo && x.quiz.length < DEMO_MATERIAL.quiz.length ? { ...x, quiz: DEMO_MATERIAL.quiz } : x,
    ),
  };
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ classes: [], sets: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as State;
    } catch {
      loaded = null;
    }
    setState(loaded ? upgrade(loaded) : seed());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the app keeps working for this session.
    }
  }, [state, ready]);

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
    [state, ready, addClass, renameClass, deleteClass, addSet, deleteSet, setCardStatus, resetCards, recordScore, addQuizQuestions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
