// Shape of everything the app stores and the API returns.

export type NoteSection = {
  heading: string;
  // Bullet points. Wrap key terms in **double asterisks** to highlight them.
  points: string[];
  // Optional flag for material likely to show up on an exam.
  examTip?: string;
  // Page of the source PDF this section came from, if known.
  page?: number;
};

export type KeyTerm = { term: string; definition: string };

export type Notes = {
  summary: string;
  sections: NoteSection[];
  keyTerms: KeyTerm[];
};

export type Flashcard = { front: string; back: string };

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

// What /api/generate returns.
export type StudyMaterial = {
  title: string;
  notes: Notes;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  demo: boolean;
};

export type CardStatus = "new" | "learning" | "known";

export type StudySet = StudyMaterial & {
  id: string;
  classId: string;
  fileName: string;
  createdAt: number;
  cardStatus: CardStatus[];
  bestScore?: number;
};

export type StudyClass = {
  id: string;
  name: string;
  color: string;
};
