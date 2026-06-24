"use client";

import { useState, useEffect, useRef } from "react";

interface SearchEntry {
  title: string;
  href: string;
  section: string;
  keywords: string;
}

const INDEX: SearchEntry[] = [
  { title: "Overview",            href: "/docs#overview",       section: "Getting started", keywords: "what is blast introduction" },
  { title: "Install",             href: "/docs#install",        section: "Getting started", keywords: "install download curl bash" },
  { title: "Quick start",         href: "/docs#quickstart",     section: "Getting started", keywords: "quick start begin first run" },
  { title: "blast init",          href: "/docs#cmd-init",       section: "Commands",        keywords: "init create config openapi.json" },
  { title: "blast validate",      href: "/docs#cmd-validate",   section: "Commands",        keywords: "validate check config load" },
  { title: "blast check",         href: "/docs#cmd-check",      section: "Commands",        keywords: "check test endpoints once" },
  { title: "blast seed",          href: "/docs#cmd-seed",       section: "Commands",        keywords: "seed populate data run" },
  { title: "blast run",           href: "/docs#cmd-run",        section: "Commands",        keywords: "run load test rps requests" },
  { title: "blast stress",        href: "/docs#cmd-stress",     section: "Commands",        keywords: "stress ramp breaking point" },
  { title: "blast mock",          href: "/docs#cmd-mock",       section: "Commands",        keywords: "mock server local fake api" },
  { title: "OpenAPI spec config", href: "/docs#configuration",  section: "Configuration",   keywords: "openapi config spec json yaml" },
  { title: "x-blast extensions",  href: "/docs#extensions",    section: "Configuration",   keywords: "extensions x-blast setup extract weight" },
  { title: "Fake data",           href: "/docs#fake-data",      section: "Configuration",   keywords: "fake email uuid name password random" },
  { title: "Tags",                href: "/docs#tags",           section: "Configuration",   keywords: "tags seed run stress check filter" },
  { title: "Setup phase",         href: "/docs#setup",          section: "Advanced",        keywords: "setup before auth token header" },
  { title: "Request chaining",    href: "/docs#chaining",       section: "Advanced",        keywords: "extract chain response inject variable" },
  { title: "Install blast",       href: "/install",             section: "Pages",           keywords: "download binary linux mac windows" },
  { title: "Changelog",           href: "/changelog",           section: "Pages",           keywords: "changelog release version history" },
];

function fuzzy(query: string, entry: SearchEntry): boolean {
  const q = query.toLowerCase();
  const haystack = `${entry.title} ${entry.keywords} ${entry.section}`.toLowerCase();
  return q.split(" ").every((word) => haystack.includes(word));
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? INDEX.filter((e) => fuzzy(query, e))
    : INDEX.slice(0, 8);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "clamp(3rem, 10vh, 8rem) 1rem 0",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#111113",
          border: "1px solid #27272a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            borderBottom: "1px solid #1c1c1f",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#52525b" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "0.9375rem",
              color: "#fafafa",
              caretColor: "#f97316",
            }}
          />
          <kbd
            style={{
              fontSize: "0.6875rem",
              color: "#3f3f46",
              background: "#09090b",
              border: "1px solid #27272a",
              borderRadius: 4,
              padding: "0.15rem 0.4rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {results.length === 0 ? (
            <p style={{ padding: "1.25rem 1rem", fontSize: "0.875rem", color: "#3f3f46", textAlign: "center" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((entry) => (
              <a
                key={entry.href}
                href={entry.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  textDecoration: "none",
                  borderBottom: "1px solid #111113",
                  transition: "background 0.1s",
                  gap: "1rem",
                }}
                className="search-result-row"
              >
                <span style={{ fontSize: "0.875rem", color: "#fafafa" }}>{entry.title}</span>
                <span style={{ fontSize: "0.75rem", color: "#3f3f46", flexShrink: 0, fontFamily: "var(--font-mono)" }}>
                  {entry.section}
                </span>
              </a>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: "0.625rem 1rem",
            borderTop: "1px solid #1c1c1f",
            display: "flex",
            gap: "1.25rem",
          }}
        >
          {([["↵", "open"], ["↑↓", "navigate"], ["esc", "close"]] as [string, string][]).map(([key, label]) => (
            <span key={key} style={{ fontSize: "0.6875rem", color: "#3f3f46", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <kbd style={{ fontFamily: "var(--font-mono)", background: "#09090b", border: "1px solid #27272a", borderRadius: 3, padding: "0.1rem 0.35rem" }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .search-result-row:hover { background: #1c1c1f !important; }
      `}</style>
    </div>
  );
}
