# Lockd Study

Upload a lecture PDF and get clean notes, flashcards, and a practice quiz, organized by class.

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
| `src/app/api/generate/route.ts` | Sends the PDF to Claude and returns notes, cards, and quiz. Returns sample data when there's no key. |
| `src/components/` | Notes view, flashcards, quiz, upload box, sidebar |
| `src/lib/store.tsx` | Saves classes and study sets in the browser (localStorage) |
| `src/lib/demo.ts` | The sample study set |
| `src/app/globals.css` | All styles and design tokens |

## Before sharing with friends

- Deploy on Vercel: import this repo, add `ANTHROPIC_API_KEY` in the project's environment variables.
- Vercel caps uploads at 4.5 MB per request. Bigger PDFs will need to upload to storage first (planned with Supabase).
- Add logins and per-person upload limits so usage stays capped.
- Everything is currently saved in each person's browser, so it won't sync between devices yet.
