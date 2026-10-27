import Link from "next/link";
import { Fragment } from "react";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="Lockd Study home">
      <span aria-hidden="true">
        L<span className="lock" />ckd
      </span>
      <small>Study</small>
    </Link>
  );
}

// Renders **term** as a highlighted term.
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <mark key={i}>{p.slice(2, -2)}</mark> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

type IconProps = { size?: number };
const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Icon = {
  Upload: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
  Plus: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Menu: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  Back: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Next: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  Shuffle: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  ),
  Trash: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  ),
  Check: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M5 12l5 5 9-10" />
    </svg>
  ),
  Doc: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  Close: ({ size }: IconProps) => (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
};

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
