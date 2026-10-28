# Lockd Study

Upload a lecture (PDF or PowerPoint .pptx) and get clean notes, flashcards, and a practice quiz, organized by class.

PowerPoint files are read as text: every slide plus the speaker notes. Slides that are only pictures or diagrams come through empty, so for diagram-heavy decks, export to PDF and upload that.

File size doesn't matter for PowerPoints or big PDFs: the browser pulls the text out and uploads only that (an 80 MB deck sends a few KB). PDFs up to 20 MB are sent whole so Claude can also see their diagrams.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/LocalFlow-Web/Lockd-Study.git
cd Lockd-Study
npm install
npm run dev
```

Then open http://localhost:3000.

## Demo mode vs. real mode

With no API key, the app runs in **demo mode**: every upload returns the same sample study set (cellular respiration) so you can try the whole flow for free. A banner on the study set tells you it's sample content.

To use real AI output:

1. Make an account at https://console.anthropic.com, add credits, and set a monthly spend limit.
2. Create an API key.
3. Copy `.env.example` to `.env.local` and paste the key after `ANTHROPIC_API_KEY=`.
4. Restart `npm run dev`.

`.env.local` is ignored by git, so the key never ends up on GitHub.

## Where things live

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | Landing page |
| `src/app/app/` | The app: home/upload, class pages, study set pages |
| `src/app/api/generate/route.ts` | Sends the PDF or slide text to Claude and returns notes, cards, and quiz. Returns sample data when there's no key. |
| `src/app/api/more-questions/route.ts` | Writes extra quiz questions from a set's notes when someone asks for a longer quiz |
| `src/lib/pptx.ts` | Reads slide text and speaker notes out of .pptx files |
| `src/lib/extract-client.ts` | Pulls text out of PowerPoints and big PDFs in the browser so large files upload fast |
| `src/components/` | Notes view, flashcards, quiz, upload box, sidebar |
| `src/lib/store.tsx` | Saves classes and study sets in the browser (localStorage) |
| `src/lib/demo.ts` | The sample study set |
| `src/app/globals.css` | All styles and design tokens |

## Before sharing with friends

- Deploy on Vercel: import this repo, add `ANTHROPIC_API_KEY` in the project's environment variables.
- Vercel caps whole-file uploads at 4.5 MB per request. PowerPoints and PDFs over 20 MB already avoid this (text only), but PDFs between 4.5 and 20 MB will need to upload to storage first (planned with Supabase), or be sent as text.
- Add logins and per-person upload limits so usage stays capped.
- Everything is currently saved in each person's browser, so it won't sync between devices yet.
