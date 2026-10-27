import type { Notes } from "@/lib/types";
import { Rich } from "./bits";

export function NotesView({ notes }: { notes: Notes }) {
  return (
    <article className="notes">
      <p className="summary">{notes.summary}</p>

      {notes.sections.map((sec, i) => (
        <section key={i} className="note-section">
          <header>
            <h2>{sec.heading}</h2>
            {sec.page ? <span className="page-ref">Page {sec.page}</span> : null}
          </header>
          <ul>
            {sec.points.map((p, j) => (
              <li key={j}>
                <Rich text={p} />
              </li>
            ))}
          </ul>
          {sec.examTip && (
            <p className="exam-tip">
              <strong>Exam tip</strong>
              <span>{sec.examTip}</span>
            </p>
          )}
        </section>
      ))}

      {notes.keyTerms.length > 0 && (
        <section className="terms">
          <h2>Key terms</h2>
          <dl>
            {notes.keyTerms.map((t) => (
              <div key={t.term} style={{ display: "contents" }}>
                <dt>{t.term}</dt>
                <dd>{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}
