import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "blast release history. See what changed in each version — new features, fixes, and infrastructure updates.",
  alternates: {
    canonical: "https://blast.walonfoundation.com/changelog",
  },
  openGraph: {
    title: "blast Changelog",
    description: "Release history for blast — new features, fixes, and CI/CD updates.",
    url: "https://blast.walonfoundation.com/changelog",
  },
};

type Badge = "feat" | "fix" | "chore" | "docs" | "ci" | "perf";

const BADGE_CLASSES: Record<Badge, string> = {
  feat:  "bg-[#1a1f2e] text-[#93c5fd]",
  fix:   "bg-[#1f1a1a] text-[#fca5a5]",
  chore: "bg-[#1a1a1a] text-mid",
  docs:  "bg-[#1a1f1a] text-ok",
  ci:    "bg-[#1f1a2e] text-[#c4b5fd]",
  perf:  "bg-[#1f1e1a] text-[#fde68a]",
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
      { type: "feat", text: "Add blast mock — start a live HTTP server from blast.config.json" },
      { type: "feat", text: "mock_response field on endpoints; {{fake.*}} resolved per request" },
      { type: "feat", text: "weight field for weighted traffic distribution in blast run" },
      { type: "fix",  text: "Correct dot-path extraction for nested arrays (items.0.id now works)" },
      { type: "fix",  text: "blast stress no longer exits early on the first step" },
      { type: "ci",   text: "Switch release pipeline from goreleaser to cargo-dist" },
      { type: "ci",   text: "Drop x86_64-apple-darwin target; build macOS arm64 only" },
      { type: "docs", text: "Add blast.config.json configuration guide and endpoint field reference" },
    ],
  },
  {
    version: "v0.1.0",
    date: "May 2025",
    entries: [
      { type: "feat", text: "Initial release — blast init, validate, check, seed, run, stress" },
      { type: "feat", text: "blast.config.json as config format — base_url, headers, setup, endpoints" },
      { type: "feat", text: "Fake data placeholders: email, name, uuid, password, city, country, and more" },
      { type: "feat", text: "Request chaining via extract field and {{variable}} interpolation" },
      { type: "feat", text: "Setup array in blast.config.json runs once before any load traffic" },
      { type: "feat", text: "blast stress auto-stops when p99 > 500ms or error rate > 1%" },
      { type: "chore", text: "MIT license" },
    ],
  },
];

function TypeBadge({ type }: { type: Badge }) {
  return (
    <span
      className={`inline-block shrink-0 rounded px-[0.5em] py-[0.1em] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${BADGE_CLASSES[type]}`}
    >
      {type}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <main className="max-w-[720px] mx-auto px-6 pt-16 pb-32">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-hi mb-2">
        Changelog
      </h1>
      <p className="text-[#71717a] text-[0.9375rem] mb-14 leading-[1.6]">
        All notable changes to blast, newest first.
      </p>

      <div className="flex flex-col gap-12">
        {RELEASES.map((rel) => (
          <section key={rel.version}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
              <span className="font-mono text-lg font-bold text-hi tracking-[-0.02em]">
                {rel.version}
              </span>
              {rel.latest && (
                <span className="px-[0.6em] py-[0.15em] rounded-full text-[0.6875rem] font-semibold uppercase tracking-[0.06em] bg-accent/12 text-[#fb923c] border border-accent/25">
                  latest
                </span>
              )}
              <span className="ml-auto text-[0.8125rem] text-mute font-mono">
                {rel.date}
              </span>
            </div>

            {/* Entries */}
            <ul className="list-none p-0 m-0 flex flex-col gap-[0.625rem]">
              {rel.entries.map((e, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <TypeBadge type={e.type} />
                  <span className="text-[0.9rem] text-mid leading-[1.6]">
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
