"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Motion presets ────────────────────────────────── */

const up: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

/* ── Copy button ───────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button
      onClick={copy}
      aria-label="Copy"
      className={cn(
        "shrink-0 h-7 w-7 flex items-center justify-center bg-transparent border border-rim rounded-md cursor-pointer transition-[border-color,color] duration-150",
        done ? "text-ok" : "text-lo hover:border-mute hover:text-mid"
      )}
    >
      {done ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l3.5 3.5L12 3" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M9 5V3.5A1.5 1.5 0 007.5 2H3.5A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
        </svg>
      )}
    </button>
  );
}

/* ── OS detection ──────────────────────────────────── */

type OS = "mac" | "linux" | "windows";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform ?? "").toLowerCase();
  if (ua.includes("win") || platform.includes("win")) return "windows";
  if (ua.includes("mac") || platform.includes("mac")) return "mac";
  return "linux";
}

const CMDS: Record<OS, { label: string; cmd: string }> = {
  mac:     { label: "macOS (arm64)",        cmd: "curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh" },
  linux:   { label: "Linux",                cmd: "curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh" },
  windows: { label: "Windows (PowerShell)", cmd: "irm https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.ps1 | iex" },
};

/* ── Stats ─────────────────────────────────────────── */

const STATS = [
  { value: "6",    label: "commands" },
  { value: "14",   label: "fake generators" },
  { value: "4",    label: "platforms" },
  { value: "Rust", label: "core" },
  { value: "MIT",  label: "license" },
];

/* ── Roadmap ───────────────────────────────────────── */

const ROADMAP = [
  { status: "done",        label: "JSON config",            desc: "blast.config.json — define endpoints, bodies, headers, and fake data in one file. No scripting." },
  { status: "done",        label: "Fake data engine",       desc: "20+ generators: emails, UUIDs, passwords, names, addresses, lorem, companies." },
  { status: "done",        label: "Request chaining",       desc: "Extract from responses, inject into next request. Full user journeys without code." },
  { status: "in-progress", label: "Mock server",            desc: "blast mock starts a local HTTP server from your config. Every route returns fake responses. Zero config." },
  { status: "planned",     label: "Scenario mode",          desc: "Ordered sequences of requests. Each virtual user runs login → create → fetch." },
  { status: "planned",     label: "blast history",          desc: "Auto-saves every run. Flags p99 regressions against the previous baseline." },
  { status: "planned",     label: "Multi-stage load",       desc: "stages: ramp-up, hold, cooldown in config. Reproducible and version-controlled." },
  { status: "planned",     label: "Threshold assertions",   desc: "--assert p99<200ms exits non-zero. Drop into CI as a performance gate." },
];

const COMPARE_ROWS = [
  { feature: "JSON config, no scripting", blast: true,  k6: false, wrk: false, ab: false },
  { feature: "Mock server built-in",    blast: true,  k6: false, wrk: false, ab: false },
  { feature: "Request chaining",        blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Fake data generation",    blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Zero-code setup",         blast: true,  k6: false, wrk: true,  ab: true  },
  { feature: "CI exit codes",           blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "RPS ramp / stress mode",  blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Rust performance",        blast: true,  k6: false, wrk: true,  ab: false },
];

/* ── Terminal demo lines ───────────────────────────── */

const DEMO: { t: string; text: string }[] = [
  { t: "cmd",      text: "$ blast check" },
  { t: "blank",    text: "" },
  { t: "ok",       text: "  ✓  health             GET  /health                   4ms" },
  { t: "ok",       text: "  ✓  register user      POST /api/v1/auth/register    31ms" },
  { t: "ok",       text: "  ✓  login              POST /api/v1/auth/login       27ms" },
  { t: "blank",    text: "" },
  { t: "pass",     text: "  3/3 passed" },
  { t: "blank",    text: "" },
  { t: "cmd",      text: "$ blast run --rps 50 --duration 30" },
  { t: "blank",    text: "" },
  { t: "prog",     text: "  elapsed  1s    sent    50    ok    50    p99   12ms" },
  { t: "prog",     text: "  elapsed  5s    sent   250    ok   250    p99   11ms" },
  { t: "prog",     text: "  elapsed 10s    sent   500    ok   500    p99   14ms" },
  { t: "blank",    text: "" },
  { t: "stat",     text: "  requests   1500    success rate  100.0%" },
  { t: "stat",     text: "  p50 8ms    p95 14ms    p99 18ms    p999 31ms" },
];

function demoClassName(t: string): string {
  if (t === "cmd")   return "text-hi";
  if (t === "ok")    return "text-ok";
  if (t === "pass")  return "text-ok font-semibold";
  if (t === "prog")  return "text-[#71717a]";
  if (t === "stat")  return "text-accent";
  return "select-none text-transparent";
}

/* ── Page ──────────────────────────────────────────── */

export default function Home() {
  const [os, setOS] = useState<OS>("linux");
  const [tab, setTab] = useState<OS>("linux");

  useEffect(() => {
    const detected = detectOS();
    setOS(detected);
    setTab(detected);
  }, []);

  const activeCmd = CMDS[tab];

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20">
        {/* Background grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
          }}
        />
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 500,
            background: "radial-gradient(ellipse at top, rgba(249,115,22,0.12) 0%, transparent 65%)",
          }}
        />

        <div className="relative max-w-[1100px] mx-auto grid grid-cols-2 gap-16 items-center max-[860px]:grid-cols-1 max-[860px]:gap-10">
          {/* Left — text */}
          <div>
            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/8 border border-accent/18 rounded-full px-3 py-[0.2rem] mb-8 tracking-[0.01em]"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-accent inline-block" />
              v0.2.0 · stable
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold tracking-[-0.045em] leading-[1.06] text-hi mb-5"
            >
              Load test your API.{" "}
              <span className="gradient-text">Find the limit.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="text-base text-[#71717a] leading-[1.75] mb-10 max-w-[420px]"
            >
              One config file. Run load tests to find where your API breaks — or spin up a mock server so frontend devs can build right now.
            </motion.p>

            {/* Install one-liner — OS detected */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
            >
              {/* OS tabs */}
              <div className="inline-flex gap-0.5 bg-surface border border-line rounded-lg p-[3px] mb-3">
                {(["linux", "mac", "windows"] as OS[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setTab(o)}
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-[5px] border-none cursor-pointer transition-all duration-150",
                      tab === o ? "bg-rim text-hi" : "bg-transparent text-lo"
                    )}
                  >
                    {o === "linux" ? "Linux" : o === "mac" ? "macOS" : "Windows"}
                    {o === os && (
                      <span className="ml-1.5 text-[0.6rem] text-accent">your system</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Command box */}
              <div className="flex items-center gap-3 bg-[#0a0a0c] border border-line rounded-[10px] px-4 py-[0.875rem]">
                <span className="font-mono text-xs text-mute shrink-0">
                  {tab === "windows" ? "PS>" : "$"}
                </span>
                <code className="flex-1 font-mono text-[0.8125rem] text-mid overflow-hidden text-ellipsis whitespace-nowrap">
                  {activeCmd.cmd}
                </code>
                <CopyButton text={activeCmd.cmd} />
              </div>

              <p className="mt-[0.625rem] text-xs text-mute">
                {activeCmd.label} · No compiler required.{" "}
                <Link href="/install" className="text-lo underline underline-offset-[3px]">
                  All platforms →
                </Link>
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
              className="flex gap-3 flex-wrap mt-8"
            >
              <Link
                href="/docs"
                className="inline-flex items-center h-[42px] px-[1.375rem] bg-[linear-gradient(120deg,var(--color-accent),var(--color-warm))] text-canvas rounded-lg text-sm font-bold no-underline tracking-[-0.01em] shadow-[0_0_32px_rgba(249,115,22,0.25)] hover:opacity-88 transition-opacity duration-150"
              >
                Read the docs
              </Link>
              <a
                href="https://github.com/Walon-Foundation/blast"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-[42px] px-5 bg-transparent border border-rim text-[#71717a] rounded-lg text-sm font-medium no-underline transition-[border-color,color] duration-150 hover:border-mute hover:text-hi"
              >
                GitHub
              </a>
            </motion.div>
          </div>

          {/* Right — terminal */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="bg-[#0a0a0c] border border-line rounded-xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] max-[860px]:hidden"
          >
            {/* Title bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-surface bg-[rgba(255,255,255,0.015)]">
              <span className="w-[11px] h-[11px] rounded-full bg-err" />
              <span className="w-[11px] h-[11px] rounded-full bg-caution" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#28ca42]" />
              <span className="ml-[0.625rem] font-mono text-xs text-mute">
                blast
              </span>
            </div>
            {/* Output */}
            <pre className="px-6 py-5 font-mono text-[0.8rem] leading-[1.9] overflow-x-auto m-0">
              {DEMO.map((line, i) => (
                <div key={i} className={demoClassName(line.t)}>
                  {line.text || " "}
                </div>
              ))}
            </pre>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <section className="border-t border-line border-b border-b-line bg-surface">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-[1100px] mx-auto px-6 flex flex-wrap"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              variants={up}
              className={cn(
                "flex-[1_1_120px] px-6 py-5 flex flex-col gap-[0.2rem]",
                i > 0 ? "border-l border-line" : ""
              )}
            >
              <span
                className="gradient-text font-mono text-2xl font-bold tracking-[-0.03em]"
              >
                {s.value}
              </span>
              <span className="text-[0.8125rem] text-lo">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Two tools ──────────────────────────────────── */}
      <section className="border-t border-line px-6 py-20">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.875rem]">
              What blast does
            </p>
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.035em] text-hi leading-[1.15]">
              One config. Two tools.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="grid grid-cols-2 gap-px bg-line border border-line rounded-[10px] overflow-hidden max-[700px]:grid-cols-1"
          >
            {/* Panel 1 — Load testing */}
            <div className="bg-canvas px-8 py-9 max-[700px]:border-b max-[700px]:border-line">
              <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.625rem]">
                For engineers &amp; QA
              </p>
              <h3 className="text-xl font-bold tracking-[-0.025em] text-hi mb-3 leading-[1.2]">
                Find where your API breaks
              </h3>
              <p className="text-[0.9rem] text-[#71717a] leading-[1.7] mb-6">
                Fixed-RPS load tests, stress ramps, and per-second live stats. blast tells you the exact RPS where p99 crosses 500ms or errors appear — then stops automatically.
              </p>
              <ul className="list-none p-0 m-0 mb-6">
                {[
                  "JSON config — define endpoints, no scripting",
                  "Fake data generation for realistic traffic",
                  "Request chaining via JSON extraction",
                  "p50/p95/p99/p999 percentile reports",
                ].map((item) => (
                  <li key={item} className="text-sm text-mid pl-5 relative mb-[0.4rem]">
                    <span className="absolute left-0 text-mute">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/docs" className="text-sm text-mid no-underline hover:text-hi transition-colors duration-150">
                Read the load testing docs →
              </Link>
            </div>

            {/* Panel 2 — Mock server */}
            <div className="bg-canvas px-8 py-9 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,var(--color-accent),transparent)]" />
              <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.625rem]">
                For frontend developers
              </p>
              <h3 className="text-xl font-bold tracking-[-0.025em] text-hi mb-3 leading-[1.2]">
                Build UI without the backend
              </h3>
              <p className="text-[0.9rem] text-[#71717a] leading-[1.7] mb-6">
                blast mock reads your config and starts a local HTTP server in seconds. Every endpoint returns realistic fake data so you can build and iterate without waiting for the backend to be ready.
              </p>
              <ul className="list-none p-0 m-0 mb-6">
                {[
                  "One command, all your routes mounted",
                  "Responses with {{fake.*}} data per request",
                  "Same config the load tests run against",
                  "No stubs, no mocking libraries, no configuration",
                ].map((item) => (
                  <li key={item} className="text-sm text-mid pl-5 relative mb-[0.4rem]">
                    <span className="absolute left-0 text-mute">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/docs#cmd-mock" className="text-sm text-accent no-underline hover:text-warm transition-colors duration-150">
                Learn about blast mock →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mock server demo ───────────────────────────── */}
      <section className="border-t border-line px-6 py-20">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.875rem]">
              blast mock
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.03em] text-hi leading-[1.15] mb-3">
              A real server from your config.
            </h2>
            <p className="text-[0.9375rem] text-[#71717a] leading-[1.7] max-w-[480px]">
              Run blast mock and every path in your config becomes a live endpoint returning fake data. Point your frontend at localhost and ship.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-[680px] mx-auto"
          >
            <div className="bg-[#0a0a0c] border border-line rounded-[10px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.025)]">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-surface bg-[rgba(255,255,255,0.015)]">
                <span className="w-[11px] h-[11px] rounded-full bg-err" />
                <span className="w-[11px] h-[11px] rounded-full bg-caution" />
                <span className="w-[11px] h-[11px] rounded-full bg-[#28ca42]" />
                <span className="ml-[0.625rem] font-mono text-xs text-mute">blast</span>
              </div>
              <pre className="px-7 py-6 font-mono text-[0.8125rem] leading-[1.9] overflow-x-auto m-0">
                {[
                  { t: "cmd",    text: "$ blast mock --port 4000" },
                  { t: "blank",  text: "" },
                  { t: "dim",    text: "  Loaded blast.config.json" },
                  { t: "blank",  text: "" },
                  { t: "ok",     text: "  GET    /api/v1/users               200" },
                  { t: "ok",     text: "  POST   /api/v1/auth/register       201" },
                  { t: "ok",     text: "  POST   /api/v1/auth/login          200" },
                  { t: "ok",     text: "  GET    /api/v1/users/{id}          200" },
                  { t: "ok",     text: "  DELETE /api/v1/users/{id}          204" },
                  { t: "blank",  text: "" },
                  { t: "pass",   text: "  5 routes mounted" },
                  { t: "accent", text: "  Listening on http://localhost:4000" },
                ].map((line, i) => (
                  <div key={i} className={cn(
                    line.t === "cmd"    ? "text-hi" :
                    line.t === "dim"    ? "text-lo" :
                    line.t === "ok"     ? "text-ok" :
                    line.t === "pass"   ? "text-ok font-semibold" :
                    line.t === "accent" ? "text-accent" :
                    "text-transparent select-none"
                  )}>{line.text || " "}</div>
                ))}
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Comparison ─────────────────────────────────── */}
      <section className="border-t border-line px-6 py-20">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.875rem]">
              Why blast
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold tracking-[-0.04em] text-hi mb-3 leading-[1.15]">
              Built for API contracts, not scripts.
            </h2>
            <p className="text-[0.9375rem] text-[#71717a] leading-[1.7] max-w-[540px]">
              Most load tools require you to write code. blast reads the config your team already wrote.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="overflow-x-auto rounded-[10px] border border-line">
              <table className="w-full border-collapse min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-[0.875rem] text-xs font-semibold tracking-[0.06em] uppercase text-mute w-[40%]">
                      Feature
                    </th>
                    {[
                      { name: "blast", accent: true },
                      { name: "k6",    accent: false },
                      { name: "wrk",   accent: false },
                      { name: "ab",    accent: false },
                    ].map((tool) => (
                      <th
                        key={tool.name}
                        className={cn(
                          "text-center px-4 py-[0.875rem] text-xs font-bold tracking-[0.04em] font-mono",
                          tool.accent ? "text-accent" : "text-lo"
                        )}
                      >
                        {tool.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i < COMPARE_ROWS.length - 1 ? "border-b border-surface" : ""}
                    >
                      <td className="px-5 py-3 text-sm text-mid">
                        {row.feature}
                      </td>
                      {([row.blast, row.k6, row.wrk, row.ab] as boolean[]).map((has, ci) => (
                        <td key={ci} className="text-center px-4 py-3">
                          {has ? (
                            <span className={cn("text-[0.9rem] font-bold", ci === 0 ? "text-accent" : "text-lo")}>&#10003;</span>
                          ) : (
                            <span className="text-rim text-[0.9rem]">&#8212;</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-rim mt-3 text-right">
              k6 requires JS. wrk requires Lua for anything beyond GETs. ab has no auth or body support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Roadmap ────────────────────────────────────── */}
      <section className="border-t border-line px-6 py-20">
        <div className="max-w-[720px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.875rem]">
              Roadmap
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.03em] text-hi leading-[1.15] mb-[0.625rem]">
              What&apos;s shipping next.
            </h2>
            <p className="text-[0.9375rem] text-[#71717a] leading-[1.7] max-w-[420px]">
              Core load testing and fake data are stable and shipped. Mock server is in active development.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="border border-line rounded-[10px] overflow-hidden"
          >
            {ROADMAP.map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-start gap-4 px-5 py-4",
                  i < ROADMAP.length - 1 ? "border-b border-line" : "",
                  item.status === "done" ? "bg-[rgba(134,239,172,0.015)]" : "bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 mt-[0.1rem] text-[0.6rem] font-bold tracking-[0.07em] uppercase rounded px-[0.45rem] py-[0.2rem] border text-center",
                    "min-w-[80px]",
                    item.status === "done"
                      ? "text-ok bg-ok/7 border-ok/18"
                      : item.status === "in-progress"
                      ? "text-accent bg-accent/7 border-accent/20"
                      : "text-mute bg-mute/7 border-mute/25"
                  )}
                >
                  {item.status === "done" ? "done" : item.status === "in-progress" ? "in progress" : "planned"}
                </span>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold mb-[0.2rem] tracking-[-0.01em]",
                      item.status === "done" ? "text-lo line-through" : "text-hi"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-[0.8125rem] text-mute leading-[1.6]">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section className="border-t border-line px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[560px] mx-auto text-center"
        >
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.03em] text-hi mb-[0.875rem] leading-[1.15]">
            One config. Two tools. Ship faster.
          </h2>
          <p className="text-[0.9375rem] text-[#71717a] leading-[1.7] mb-8">
            Load test your API and mock it for frontend development — both from the same config file.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/docs"
              className="inline-flex items-center h-[42px] px-[1.375rem] bg-[linear-gradient(120deg,var(--color-accent),var(--color-warm))] text-canvas rounded-lg text-sm font-bold no-underline tracking-[-0.01em] shadow-[0_0_32px_rgba(249,115,22,0.2)] hover:opacity-88 transition-opacity duration-150"
            >
              Get started
            </Link>
            <Link
              href="/install"
              className="inline-flex items-center h-[42px] px-5 bg-transparent border border-rim text-[#71717a] rounded-lg text-sm font-medium no-underline transition-[border-color,color] duration-150 hover:border-mute hover:text-hi"
            >
              Install guide
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
