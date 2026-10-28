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

## Logins, accounts, and the daily limit (Supabase)

Without Supabase settings the app runs in **local mode**: no login, everything saved in the browser, no limits.

To turn on accounts:

1. Create a free project at https://supabase.com.
2. In **Authentication → Sign In / Providers → Email**, turn off "Confirm email" (Supabase's built-in email only sends a few per hour; turn it back on once a real email service is set up).
3. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and run it. On a Mac: `cat supabase/schema.sql | pbcopy` copies it.
4. From **Project Settings → API Keys**, add the Project URL and the **publishable** key to `.env.local` (see `.env.example`). Never put the secret key in the app.
5. Restart `npm run dev`.

6. For "Forgot your password?": in **Authentication → URL Configuration → Redirect URLs**, add `http://localhost:3000/**` (and later your live site, like `https://your-app.vercel.app/**`). The reset email's link comes back to `/auth/callback`, which signs the person in and opens `/reset-password`. With Supabase's default email the link only works in the browser the reset was requested from. Once custom SMTP is set up, you can also paste `supabase/reset-password-email.html` into **Authentication → Emails → Reset Password**: it adds a 6-digit code that works on any device.

**Email delivery:** Supabase's built-in email only delivers to members of your Supabase team, about 2 emails per hour. Before other people use Lockd, connect a real email provider (Resend, Postmark, Brevo, etc.) in **Authentication → Emails → SMTP Settings**, or password reset codes won't reach them.

Then `/app` requires signing in, classes and study sets save to the account (and sync across devices), and each free account gets 3 uploads per rolling 24 hours (`DAILY_UPLOAD_LIMIT`). A user with `plan = 'pro'` in the `profiles` table has no limit; that's where the paid tier will plug in. Uploads are tracked in the `uploads` table with model and token counts, so you can see cost per person.

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
| `src/lib/store.tsx` | Saves classes and study sets: to the account when signed in, otherwise in the browser |
| `src/lib/supabase/` | Login clients, upload limit checks |
| `src/middleware.ts` | Keeps sessions fresh and sends signed-out visitors to /login |
| `src/app/login/page.tsx` | Sign in, create account, and request a password reset |
| `src/app/auth/callback/route.ts` | Where links in Supabase emails land; signs the person in |
| `src/app/reset-password/page.tsx` | Set a new password after clicking the reset link |
| `supabase/reset-password-email.html` | Email template for password reset codes |
| `supabase/schema.sql` | Database tables and security rules |
| `src/lib/demo.ts` | The sample study set |
| `src/app/globals.css` | All styles and design tokens |

## Before sharing with friends

- Deploy on Vercel: import this repo, add `ANTHROPIC_API_KEY` in the project's environment variables.
- Vercel caps whole-file uploads at 4.5 MB per request. PowerPoints and PDFs over 20 MB already avoid this (text only), but PDFs between 4.5 and 20 MB will need to upload to storage first (planned with Supabase), or be sent as text.
