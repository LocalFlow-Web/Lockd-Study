import Link from "next/link";
import { Wordmark } from "@/components/bits";
import { authEnabled } from "@/lib/supabase/config";

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Wordmark />
        <Link href={authEnabled ? "/login" : "/app"} className="btn btn-quiet btn-small">
          {authEnabled ? "Sign in" : "Open Lockd"}
        </Link>
      </nav>

      <header className="hero">
        <div>
          <h1>Turn any lecture into a study session.</h1>
          <p className="hero-lede">
            Upload your PowerPoint slides or a PDF. Lockd writes clean notes, builds flashcards, and quizzes you on what&apos;s
            likely to be on the exam.
          </p>
          <div className="hero-actions">
            <Link href="/app" className="btn btn-primary">
              Upload a lecture
            </Link>
            <Link href="/app/set/sample" className="btn btn-quiet">
              See a sample lecture
            </Link>
          </div>
          <p className="hero-note">Everything stays organized by class, all semester.</p>
        </div>

        <div className="hero-demo" aria-hidden="true">
          <div className="slide">
            <b>Lecture 9: Cellular Respiration</b>
            Glycolysis occurs in the cytosol and yields a net of 2 ATP and 2 NADH per glucose molecule, producing two
            molecules of pyruvate which are subsequently transported into the mitochondrial matrix…
          </div>
          <div className="notepage">
            <h3>Glycolysis</h3>
            <ul>
              <li>
                Happens in the <span className="hl sweep sweep-1">cytoplasm</span>, no oxygen needed
              </li>
              <li>
                1 glucose → 2 <span className="hl sweep sweep-2">pyruvate</span>
              </li>
              <li>
                Net gain: 2 ATP + 2 <span className="hl sweep sweep-3">NADH</span>
              </li>
              <li>Pyruvate moves into the mitochondria next</li>
            </ul>
          </div>
        </div>
      </header>

      <section className="section">
        <h2>One upload, three ways to study.</h2>
        <p className="section-lede">
          Read the notes once, drill the flashcards until they stick, then take the practice quiz to see what you
          actually know.
        </p>
        <div className="outputs">
          <article className="output">
            <h3>Notes worth rereading</h3>
            <p>Short bullets in plain language, key terms highlighted, and exam tips flagged.</p>
            <ul className="mini-notes">
              <li>
                <mark>ATP synthase</mark> uses the H+ gradient to make ATP
              </li>
              <li>
                <mark>Oxygen</mark> is the final electron acceptor
              </li>
              <li>Without it, output drops to 2 ATP per glucose</li>
            </ul>
          </article>
          <article className="output">
            <h3>Flashcards</h3>
            <p>One fact per card. Mark what you know and keep drilling the rest.</p>
            <div className="mini-card">
              Where does glycolysis happen?
              <span>Tap to flip</span>
            </div>
          </article>
          <article className="output">
            <h3>Practice quiz</h3>
            <p>Multiple choice with an explanation for every answer.</p>
            <div className="mini-quiz">
              <div>Krebs cycle</div>
              <div className="right">Glycolysis</div>
              <div>Electron transport chain</div>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <h3>Upload the lecture</h3>
            <p>PowerPoint slides or a PDF of a reading or study guide. Pick the class it belongs to.</p>
          </li>
          <li>
            <h3>Get your study set</h3>
            <p>Notes, flashcards, and a quiz are ready in under a minute.</p>
          </li>
          <li>
            <h3>Study until it&apos;s locked in</h3>
            <p>Your progress saves, so you can pick up where you left off before the exam.</p>
          </li>
        </ol>
      </section>

      <section className="closing">
        <h2>Got a lecture you need to learn tonight?</h2>
        <Link href="/app" className="btn btn-primary">
          Upload a lecture
        </Link>
      </section>

      <footer className="footer">Lockd Study</footer>
    </div>
  );
}
