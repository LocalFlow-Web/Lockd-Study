import JSZip from "jszip";

// Pulls the text out of a PowerPoint (.pptx) file, slide by slide, including
// speaker notes. A .pptx is a zip of XML files, so no PowerPoint is needed.
// Pictures aren't included: a slide that's only a diagram comes out empty.

export type SlideText = { number: number; text: string; notes: string };

function decode(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Each <a:p> is a paragraph; its <a:t> runs are the visible text.
function paragraphs(xml: string): string[] {
  return xml
    .split(/<\/a:p>/)
    .map((chunk) => [...chunk.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1])).join(""))
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function resolve(from: string, target: string) {
  // Targets are relative to the folder of the file that owns the .rels.
  if (target.startsWith("/")) return target.slice(1);
  const parts = from.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

function relsMap(xml: string | undefined, owner: string) {
  const map = new Map<string, string>();
  if (!xml) return map;
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) map.set(id, resolve(owner, target));
  }
  return map;
}

export async function extractPptx(data: ArrayBuffer): Promise<SlideText[]> {
  const zip = await JSZip.loadAsync(data);
  const read = (path: string) => zip.file(path)?.async("string");

  // Slide order comes from presentation.xml, not from file names.
  const presentation = await read("ppt/presentation.xml");
  if (!presentation) throw new Error("not a pptx");
  const presRels = relsMap(await read("ppt/_rels/presentation.xml.rels"), "ppt/presentation.xml");
  let slidePaths = [...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)]
    .map((m) => presRels.get(m[1]))
    .filter((p): p is string => !!p);

  if (!slidePaths.length) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/\d+/g)!.pop()) - Number(b.match(/\d+/g)!.pop()));
  }

  const slides: SlideText[] = [];
  let number = 0;
  for (const path of slidePaths) {
    const xml = await read(path);
    if (!xml) continue;
    if (/<p:sld\b[^>]*\bshow="0"/.test(xml)) continue; // hidden slide
    number++;

    const name = path.split("/").pop()!;
    const rels = relsMap(await read(path.replace(name, `_rels/${name}.rels`)), path);
    const notesPath = [...rels.values()].find((t) => t.includes("notesSlides/"));
    const notesXml = notesPath ? await read(notesPath) : undefined;

    slides.push({
      number,
      text: paragraphs(xml).join("\n"),
      // Notes pages repeat the slide number in a placeholder; drop bare numbers.
      notes: notesXml ? paragraphs(notesXml).filter((p) => !/^\d+$/.test(p)).join("\n") : "",
    });
  }
  return slides;
}

export function slidesToText(slides: SlideText[]): string {
  return slides
    .map((s) => {
      const parts = [`--- Slide ${s.number} ---`, s.text || "(no text on this slide, likely an image or diagram)"];
      if (s.notes) parts.push(`Speaker notes: ${s.notes}`);
      return parts.join("\n");
    })
    .join("\n\n");
}
