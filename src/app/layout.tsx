import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lockd Study",
  description: "Upload lecture slides or a PDF and get clean notes, flashcards, and a practice quiz.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1428" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
