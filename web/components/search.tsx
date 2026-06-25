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
      className="fixed inset-0 bg-black/70 backdrop-blur z-[200] flex items-start justify-center pt-[clamp(3rem,10vh,8rem)] px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] bg-surface border border-rim rounded-xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-[0.875rem] border-b border-line">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#52525b" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
            className="flex-1 bg-transparent border-none outline-none text-[0.9375rem] text-hi caret-accent"
          />
          <kbd className="text-[0.6875rem] text-mute bg-canvas border border-rim rounded px-[0.4rem] py-[0.15rem] font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-mute text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((entry) => (
              <a
                key={entry.href}
                href={entry.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 no-underline border-b border-surface transition-colors duration-100 gap-4 hover:bg-line"
              >
                <span className="text-sm text-hi">{entry.title}</span>
                <span className="text-xs text-mute shrink-0 font-mono">
                  {entry.section}
                </span>
              </a>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-[0.625rem] border-t border-line flex gap-5">
          {([["↵", "open"], ["↑↓", "navigate"], ["esc", "close"]] as [string, string][]).map(([key, label]) => (
            <span key={key} className="text-[0.6875rem] text-mute flex items-center gap-[0.3rem]">
              <kbd className="font-mono bg-canvas border border-rim rounded-[3px] px-[0.35rem] py-[0.1rem]">{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
