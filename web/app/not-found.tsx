import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page not found",
};

export default function NotFound() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1.5rem",
        textAlign: "center",
        minHeight: "60vh",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(5rem, 15vw, 9rem)",
          fontWeight: 800,
          letterSpacing: "-0.06em",
          lineHeight: 1,
          color: "#1c1c1f",
          marginBottom: "1.5rem",
          userSelect: "none",
        }}
      >
        404
      </p>

      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#fafafa",
          letterSpacing: "-0.03em",
          marginBottom: "0.75rem",
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: "0.9375rem",
          color: "#52525b",
          lineHeight: 1.6,
          maxWidth: 360,
          marginBottom: "2rem",
        }}
      >
        That route doesn&apos;t exist. Maybe the URL is wrong or the page was moved.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#09090b",
            background: "linear-gradient(120deg, #f97316, #fbbf24)",
            padding: "0.5rem 1.25rem",
            borderRadius: 7,
            textDecoration: "none",
          }}
        >
          Home
        </Link>
        <Link
          href="/docs"
          style={{
            fontSize: "0.875rem",
            color: "#71717a",
            background: "#111113",
            border: "1px solid #1c1c1f",
            padding: "0.5rem 1.25rem",
            borderRadius: 7,
            textDecoration: "none",
          }}
        >
          Docs
        </Link>
      </div>
    </main>
  );
}
