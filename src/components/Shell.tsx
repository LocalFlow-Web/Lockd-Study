"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon, Wordmark } from "./bits";

export function Shell({ children }: { children: React.ReactNode }) {
  const { classes, sets, addClass } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => setOpen(false), [pathname]);

  const activeSet = pathname.startsWith("/app/set/") ? sets.find((s) => pathname === `/app/set/${s.id}`) : undefined;
  const activeClassId = pathname.startsWith("/app/class/") ? pathname.split("/")[3] : activeSet?.classId;

  function submitClass(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setAdding(false);
      return;
    }
    const c = addClass(name);
    setName("");
    setAdding(false);
    router.push(`/app/class/${c.id}`);
  }

  return (
    <div className="shell">
      <aside className="sidebar" data-open={open} aria-label="Classes">
        <div className="sidebar-top">
          <Wordmark href="/app" />
          <button className="icon-btn mobile-only" onClick={() => setOpen(false)} aria-label="Close menu">
            <Icon.Close />
          </button>
        </div>

        <nav className="side-group">
          <Link href="/app" className="side-link" aria-current={pathname === "/app" ? "page" : undefined}>
            <Icon.Upload size={16} />
            Upload a PDF
          </Link>
        </nav>

        <nav className="side-group" aria-label="Your classes">
          <h4>Classes</h4>
          {classes.map((c) => {
            const classSets = sets.filter((s) => s.classId === c.id);
            const isActive = c.id === activeClassId;
            return (
              <div key={c.id}>
                <Link
                  href={`/app/class/${c.id}`}
                  className="side-link"
                  aria-current={pathname === `/app/class/${c.id}` ? "page" : undefined}
                >
                  <span className="dot" style={{ background: c.color }} />
                  {c.name}
                  <span className="count">{classSets.length}</span>
                </Link>
                {isActive && classSets.length > 0 && (
                  <div className="side-sets">
                    {classSets.map((s) => (
                      <Link
                        key={s.id}
                        href={`/app/set/${s.id}`}
                        className="side-link"
                        aria-current={pathname === `/app/set/${s.id}` ? "page" : undefined}
                      >
                        <span>{s.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {adding ? (
            <form className="new-class" onSubmit={submitClass}>
              <input
                className="input"
                autoFocus
                placeholder="e.g. Chem 160"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => !name.trim() && setAdding(false)}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                aria-label="Class name"
              />
              <button className="btn btn-primary btn-small" type="submit">
                Add
              </button>
            </form>
          ) : (
            <button className="side-link" onClick={() => setAdding(true)}>
              <Icon.Plus size={16} />
              Add a class
            </button>
          )}
        </nav>

        <p className="sidebar-foot">Saved on this device</p>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div>
        <div className="mobile-bar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon.Menu />
          </button>
          <Wordmark href="/app" />
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
