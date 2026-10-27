import type { StudyMaterial } from "./types";

// Sample output used when no ANTHROPIC_API_KEY is set, so the whole app
// can be tried and styled for free. Shaped exactly like real output.
export const DEMO_MATERIAL: Omit<StudyMaterial, "title" | "demo"> = {
  notes: {
    summary:
      "Cellular respiration is how cells turn glucose into usable energy (ATP). It runs in three stages: glycolysis in the cytoplasm, the Krebs cycle in the mitochondrial matrix, and the electron transport chain on the inner mitochondrial membrane. Oxygen is the final electron acceptor, which is why most ATP depends on it.",
    sections: [
      {
        heading: "The big picture",
        page: 2,
        points: [
          "Overall equation: C6H12O6 + 6 O2 → 6 CO2 + 6 H2O + energy",
          "Goal is to make **ATP**, the cell's energy currency",
          "Glucose is oxidized (loses electrons); oxygen is reduced (gains electrons)",
          "Energy is released in small steps so the cell can capture it instead of losing it as heat",
        ],
        examTip: "Know which molecule is oxidized and which is reduced. It's a favorite multiple-choice question.",
      },
      {
        heading: "Glycolysis",
        page: 4,
        points: [
          "Happens in the **cytoplasm** and does not need oxygen",
          "Splits 1 glucose (6 carbons) into 2 **pyruvate** (3 carbons each)",
          "Net yield: 2 ATP and 2 **NADH**",
          "Uses 2 ATP in the investment phase, makes 4 ATP in the payoff phase",
        ],
      },
      {
        heading: "Pyruvate oxidation and the Krebs cycle",
        page: 7,
        points: [
          "Pyruvate enters the **mitochondrial matrix** and becomes **acetyl-CoA**, releasing CO2",
          "Each acetyl-CoA runs one turn of the **Krebs cycle** (citric acid cycle)",
          "Per glucose (2 turns): 2 ATP, 6 NADH, 2 FADH2, 4 CO2",
          "This is where most of the CO2 you exhale comes from",
        ],
      },
      {
        heading: "Electron transport chain",
        page: 10,
        points: [
          "Located on the **inner mitochondrial membrane**",
          "NADH and FADH2 drop off electrons, which pass along protein complexes",
          "That flow pumps H+ ions into the intermembrane space, building a gradient",
          "H+ flows back through **ATP synthase**, which makes most of the ATP (about 26–28)",
          "**Oxygen** is the final electron acceptor and forms water",
        ],
        examTip: "If a question removes oxygen, the chain stops and ATP output drops to glycolysis only.",
      },
      {
        heading: "When there's no oxygen",
        page: 13,
        points: [
          "**Fermentation** regenerates NAD+ so glycolysis can keep going",
          "Lactic acid fermentation: muscles during intense exercise",
          "Alcoholic fermentation: yeast, produces ethanol and CO2",
          "Only 2 ATP per glucose, versus about 30–32 with oxygen",
        ],
      },
    ],
    keyTerms: [
      { term: "ATP", definition: "Adenosine triphosphate, the molecule cells spend for energy." },
      { term: "NADH", definition: "Electron carrier that brings high-energy electrons to the electron transport chain." },
      { term: "Pyruvate", definition: "3-carbon molecule produced when glycolysis splits glucose." },
      { term: "Acetyl-CoA", definition: "Molecule pyruvate becomes before entering the Krebs cycle." },
      { term: "ATP synthase", definition: "Enzyme that uses the H+ gradient to make ATP." },
      { term: "Fermentation", definition: "Anaerobic process that regenerates NAD+ so glycolysis can continue." },
    ],
  },
  flashcards: [
    { front: "Where does glycolysis happen?", back: "In the cytoplasm. It doesn't need oxygen." },
    { front: "What does glycolysis produce from 1 glucose (net)?", back: "2 pyruvate, 2 ATP, and 2 NADH." },
    { front: "What molecule enters the Krebs cycle?", back: "Acetyl-CoA, made from pyruvate in the mitochondrial matrix." },
    { front: "What is the final electron acceptor in the electron transport chain?", back: "Oxygen. It combines with electrons and H+ to form water." },
    { front: "What does ATP synthase use to make ATP?", back: "The flow of H+ ions back across the inner mitochondrial membrane." },
    { front: "Which stage makes the most ATP?", back: "The electron transport chain, about 26–28 ATP per glucose." },
    { front: "Why do cells ferment without oxygen?", back: "To regenerate NAD+ so glycolysis can keep producing ATP." },
    { front: "Where does the CO2 you exhale come from?", back: "Mostly pyruvate oxidation and the Krebs cycle." },
  ],
  quiz: [
    {
      question: "Which stage of cellular respiration happens in the cytoplasm?",
      options: ["Krebs cycle", "Glycolysis", "Electron transport chain", "Pyruvate oxidation"],
      answerIndex: 1,
      explanation: "Glycolysis runs in the cytoplasm. Every later stage happens inside the mitochondria.",
    },
    {
      question: "What happens to ATP production if oxygen is removed?",
      options: [
        "It increases because glycolysis speeds up",
        "It stays the same",
        "It drops to about 2 ATP per glucose",
        "It stops completely",
      ],
      answerIndex: 2,
      explanation: "Without oxygen the electron transport chain stops, leaving only glycolysis (with fermentation) at 2 ATP per glucose.",
    },
    {
      question: "During cellular respiration, glucose is:",
      options: ["Reduced", "Oxidized", "Neither oxidized nor reduced", "Converted directly into ATP"],
      answerIndex: 1,
      explanation: "Glucose loses electrons, so it's oxidized. Oxygen gains them, so it's reduced.",
    },
    {
      question: "What directly powers ATP synthase?",
      options: ["Glucose", "A gradient of H+ ions", "Carbon dioxide", "Pyruvate"],
      answerIndex: 1,
      explanation: "The electron transport chain pumps H+ across the membrane, and their flow back through ATP synthase drives ATP production.",
    },
    {
      question: "Which product of the Krebs cycle carries electrons to the electron transport chain?",
      options: ["CO2", "Water", "NADH", "Acetyl-CoA"],
      answerIndex: 2,
      explanation: "NADH (and FADH2) carry high-energy electrons to the chain. CO2 is a waste product.",
    },
  ],
};

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return "Untitled lecture";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
