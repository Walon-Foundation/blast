import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog" };

type Badge = "feat" | "fix" | "chore" | "docs" | "ci" | "perf";

const BADGE_COLORS: Record<Badge, { bg: string; color: string }> = {
  feat:  { bg: "#1a1f2e", color: "#93c5fd" },
  fix:   { bg: "#1f1a1a", color: "#fca5a5" },
  chore: { bg: "#1a1a1a", color: "#a1a1aa" },
  docs:  { bg: "#1a1f1a", color: "#86efac" },
  ci:    { bg: "#1f1a2e", color: "#c4b5fd" },
  perf:  { bg: "#1f1e1a", color: "#fde68a" },
};

interface Entry {
  type: Badge;
  text: string;
}

interface Release {
  version: string;
  date: string;
  latest?: boolean;
  entries: Entry[];
}

const RELEASES: Release[] = [
  {
    version: "v0.1.1",
    date: "June 2025",
    latest: true,
    entries: [
      { type: "feat", text: "Add blast mock — start a live HTTP server from your OpenAPI spec" },
      { type: "feat", text: "Schema-derived fake data for mock responses ({{fake.*}} resolved)" },
      { type: "feat", text: "x-blast-weight field for weighted traffic distribution in blast run" },
      { type: "fix",  text: "Correct dot-path extraction for nested arrays (items.0.id now works)" },
      { type: "fix",  text: "blast stress no longer exits early on the first step" },
      { type: "ci",   text: "Switch release pipeline from goreleaser to cargo-dist" },
      { type: "ci",   text: "Drop x86_64-apple-darwin target; build macOS arm64 only" },
      { type: "docs", text: "Add OpenAPI config guide and x-blast extension reference" },
    ],
  },
  {
    version: "v0.1.0",
    date: "May 2025",
    entries: [
      { type: "feat", text: "Initial release — blast init, validate, check, seed, run, stress" },
      { type: "feat", text: "OpenAPI 3.x spec as primary config format" },
      { type: "feat", text: "Legacy blast.config.json format auto-detected and supported" },
      { type: "feat", text: "Fake data placeholders: email, name, uuid, password, city, country, and more" },
      { type: "feat", text: "Request chaining via x-blast-extract and {{variable}} interpolation" },
      { type: "feat", text: "Setup phase (x-blast-setup) runs once before any load traffic" },
      { type: "feat", text: "blast stress auto-stops when p99 > 500ms or error rate > 1%" },
      { type: "chore", text: "MIT license" },
    ],
  },
];

function TypeBadge({ type }: { type: Badge }) {
  const c = BADGE_COLORS[type];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1em 0.5em",
        borderRadius: 4,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: c.bg,
        color: c.color,
        flexShrink: 0,
      }}
    >
      {type}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "4rem 1.5rem 8rem",
      }}
    >
      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#fafafa",
          marginBottom: "0.5rem",
        }}
      >
        Changelog
      </h1>
      <p
        style={{
          color: "#71717a",
          fontSize: "0.9375rem",
          marginBottom: "3.5rem",
          lineHeight: 1.6,
        }}
      >
        All notable changes to blast, newest first.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
        {RELEASES.map((rel) => (
          <section key={rel.version}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
                paddingBottom: "1rem",
                borderBottom: "1px solid #1c1c1f",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "#fafafa",
                  letterSpacing: "-0.02em",
                }}
              >
                {rel.version}
              </span>
              {rel.latest && (
                <span
                  style={{
                    padding: "0.15em 0.6em",
                    borderRadius: 999,
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "rgba(249,115,22,0.12)",
                    color: "#fb923c",
                    border: "1px solid rgba(249,115,22,0.25)",
                  }}
                >
                  latest
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.8125rem",
                  color: "#3f3f46",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {rel.date}
              </span>
            </div>

            {/* Entries */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {rel.entries.map((e, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.75rem",
                  }}
                >
                  <TypeBadge type={e.type} />
                  <span style={{ fontSize: "0.9rem", color: "#a1a1aa", lineHeight: 1.6 }}>
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
