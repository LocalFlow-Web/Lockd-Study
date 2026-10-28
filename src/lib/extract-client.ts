// Runs in the browser. Big lecture files are mostly images, so instead of
// uploading the whole file we pull out the text here and send only that.
// A 200 MB slide deck usually becomes well under 1 MB of text.

import { extractPptx, slidesToText } from "./pptx";

// PDFs at or under this size are sent whole, so Claude can also see diagrams.
// Bigger ones are sent as text only. Vercel rejects request bodies over
// 4.5 MB, so stay under that.
export const PDF_DIRECT_MAX = 4 * 1024 * 1024;

export async function pptxToText(file: File): Promise<string> {
  return slidesToText(await extractPptx(await file.arrayBuffer()));
}

export async function pdfToText(file: File): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });
  return text
    .map((page, i) => `--- Page ${i + 1} ---\n${page.replace(/[ \t]+/g, " ").trim() || "(no text on this page)"}`)
    .join("\n\n");
}

// How much real text is there, ignoring the page/slide markers we add.
export function meaningfulLength(text: string): number {
  return text
    .replace(/--- (Slide|Page) \d+ ---/g, "")
    .replace(/\(no text on this (slide|page)[^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim().length;
}
