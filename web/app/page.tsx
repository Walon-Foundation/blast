"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

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
      style={{
        flexShrink: 0,
        height: 28,
        width: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "1px solid #27272a",
        borderRadius: 6,
        color: done ? "#86efac" : "#52525b",
        cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s",
      }}
      className="copy-btn-wrap"
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
  { status: "done",        label: "OpenAPI as config",      desc: "Read standard OpenAPI 3.x files directly. x-blast-* extensions carry load-test metadata." },
  { status: "done",        label: "Fake data engine",       desc: "20+ generators: emails, UUIDs, passwords, names, addresses, lorem, companies." },
  { status: "done",        label: "Request chaining",       desc: "Extract from responses, inject into next request. Full user journeys without code." },
  { status: "in-progress", label: "Mock server",            desc: "blast mock starts a local HTTP server from your spec. Every route returns schema-shaped fake responses. Zero config." },
  { status: "planned",     label: "Scenario mode",          desc: "Ordered sequences of requests. Each virtual user runs login → create → fetch." },
  { status: "planned",     label: "blast history",          desc: "Auto-saves every run. Flags p99 regressions against the previous baseline." },
  { status: "planned",     label: "Multi-stage load",       desc: "x-blast-stages: ramp-up, hold, cooldown in config. Reproducible and version-controlled." },
  { status: "planned",     label: "Threshold assertions",   desc: "--assert p99<200ms exits non-zero. Drop into CI as a performance gate." },
];

const COMPARE_ROWS = [
  { feature: "OpenAPI spec as config",  blast: true,  k6: false, wrk: false, ab: false },
  { feature: "Mock server built-in",    blast: true,  k6: false, wrk: false, ab: false },
  { feature: "Request chaining",        blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Fake data generation",    blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Zero-code setup",         blast: true,  k6: false, wrk: true,  ab: true  },
  { feature: "CI exit codes",           blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "RPS ramp / stress mode",  blast: true,  k6: true,  wrk: false, ab: false },
  { feature: "Rust performance",        blast: true,  k6: false, wrk: true,  ab: false },
];

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  done:          { color: "#86efac", bg: "rgba(134,239,172,0.07)",  border: "rgba(134,239,172,0.18)",  label: "done" },
  "in-progress": { color: "#f97316", bg: "rgba(249,115,22,0.07)",   border: "rgba(249,115,22,0.2)",    label: "in progress" },
  planned:       { color: "#3f3f46", bg: "rgba(63,63,70,0.07)",     border: "rgba(63,63,70,0.25)",     label: "planned" },
};

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

function demoStyle(t: string): React.CSSProperties {
  if (t === "cmd")   return { color: "#fafafa" };
  if (t === "ok")    return { color: "#86efac" };
  if (t === "pass")  return { color: "#86efac", fontWeight: 600 };
  if (t === "prog")  return { color: "#71717a" };
  if (t === "stat")  return { color: "#f97316" };
  return { userSelect: "none", color: "transparent" };
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
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "6rem 1.5rem 5rem",
        }}
      >
        {/* Background grid */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 500,
            background: "radial-gradient(ellipse at top, rgba(249,115,22,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left — text */}
          <div>
            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#f97316",
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.18)",
                borderRadius: 100,
                padding: "0.2rem 0.75rem",
                marginBottom: "2rem",
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
              v0.1.1 · stable
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 800,
                letterSpacing: "-0.045em",
                lineHeight: 1.06,
                color: "#fafafa",
                marginBottom: "1.25rem",
              }}
            >
              Load test your API.{" "}
              <span className="gradient-text">Find the limit.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              style={{
                fontSize: "1rem",
                color: "#71717a",
                lineHeight: 1.75,
                marginBottom: "2.5rem",
                maxWidth: 420,
              }}
            >
              One OpenAPI spec. Run load tests to find where your API breaks — or spin up a mock server so frontend devs can build right now.
            </motion.p>

            {/* Install one-liner — OS detected */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
            >
              {/* OS tabs */}
              <div
                style={{
                  display: "inline-flex",
                  gap: 2,
                  background: "#111113",
                  border: "1px solid #1c1c1f",
                  borderRadius: 8,
                  padding: 3,
                  marginBottom: "0.75rem",
                }}
              >
                {(["linux", "mac", "windows"] as OS[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setTab(o)}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      padding: "0.25rem 0.625rem",
                      borderRadius: 5,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: tab === o ? "#27272a" : "none",
                      color: tab === o ? "#fafafa" : "#52525b",
                    }}
                  >
                    {o === "linux" ? "Linux" : o === "mac" ? "macOS" : "Windows"}
                    {o === os && (
                      <span style={{ marginLeft: "0.375rem", fontSize: "0.6rem", color: "#f97316" }}>your system</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Command box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "#0a0a0c",
                  border: "1px solid #1c1c1f",
                  borderRadius: 10,
                  padding: "0.875rem 1rem",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#3f3f46", flexShrink: 0 }}>
                  {tab === "windows" ? "PS>" : "$"}
                </span>
                <code
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                    color: "#a1a1aa",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeCmd.cmd}
                </code>
                <CopyButton text={activeCmd.cmd} />
              </div>

              <p style={{ marginTop: "0.625rem", fontSize: "0.75rem", color: "#3f3f46" }}>
                {activeCmd.label} · No compiler required.{" "}
                <Link href="/install" style={{ color: "#52525b", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  All platforms →
                </Link>
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
              style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "2rem" }}
            >
              <Link
                href="/docs"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 42,
                  padding: "0 1.375rem",
                  background: "linear-gradient(120deg, #f97316, #fbbf24)",
                  color: "#09090b",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 0 32px rgba(249,115,22,0.25)",
                  transition: "opacity 0.15s",
                }}
                className="btn-primary"
              >
                Read the docs
              </Link>
              <a
                href="https://github.com/Walon-Foundation/blast"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 42,
                  padding: "0 1.25rem",
                  background: "none",
                  border: "1px solid #27272a",
                  color: "#71717a",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                className="btn-secondary"
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
            style={{
              background: "#0a0a0c",
              border: "1px solid #1c1c1f",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)",
            }}
            className="hero-terminal"
          >
            {/* Title bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #111113",
                background: "rgba(255,255,255,0.015)",
              }}
            >
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28ca42" }} />
              <span style={{ marginLeft: "0.625rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#3f3f46" }}>
                blast
              </span>
            </div>
            {/* Output */}
            <pre
              style={{
                padding: "1.25rem 1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                lineHeight: 1.9,
                overflowX: "auto",
                margin: 0,
              }}
            >
              {DEMO.map((line, i) => (
                <div key={i} style={demoStyle(line.t)}>
                  {line.text || " "}
                </div>
              ))}
            </pre>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", borderBottom: "1px solid #1c1c1f", background: "#111113" }}>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              variants={up}
              style={{
                flex: "1 1 120px",
                padding: "1.25rem 1.5rem",
                borderLeft: i > 0 ? "1px solid #1c1c1f" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
              }}
            >
              <span
                className="gradient-text"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                {s.value}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "#52525b" }}>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Two tools ──────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: "3rem" }}
          >
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3f3f46", marginBottom: "0.875rem" }}>
              What blast does
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.035em", color: "#fafafa", lineHeight: 1.15 }}>
              One spec. Two tools.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              background: "#1c1c1f",
              border: "1px solid #1c1c1f",
              borderRadius: 10,
              overflow: "hidden",
            }}
            className="two-tools-grid"
          >
            {/* Panel 1 — Load testing */}
            <div style={{ background: "#09090b", padding: "2.25rem 2rem" }}>
              <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3f3f46", marginBottom: "0.625rem" }}>
                For engineers &amp; QA
              </p>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#fafafa", marginBottom: "0.75rem", lineHeight: 1.2 }}>
                Find where your API breaks
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#71717a", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Fixed-RPS load tests, stress ramps, and per-second live stats. blast tells you the exact RPS where p99 crosses 500ms or errors appear — then stops automatically.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
                {[
                  "OpenAPI spec as config — no extra files",
                  "Fake data generation for realistic traffic",
                  "Request chaining via JSON extraction",
                  "p50/p95/p99/p999 percentile reports",
                ].map((item) => (
                  <li key={item} style={{ fontSize: "0.875rem", color: "#a1a1aa", paddingLeft: "1.25rem", position: "relative", marginBottom: "0.4rem" }}>
                    <span style={{ position: "absolute", left: 0, color: "#3f3f46" }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/docs" style={{ fontSize: "0.875rem", color: "#a1a1aa", textDecoration: "none" }} className="panel-link">
                Read the load testing docs →
              </Link>
            </div>

            {/* Panel 2 — Mock server */}
            <div style={{ background: "#09090b", padding: "2.25rem 2rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, #f97316, transparent)" }} />
              <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3f3f46", marginBottom: "0.625rem" }}>
                For frontend developers
              </p>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#fafafa", marginBottom: "0.75rem", lineHeight: 1.2 }}>
                Build UI without the backend
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#71717a", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                blast mock reads your OpenAPI spec and starts a local HTTP server in seconds. Every endpoint returns realistic fake data so you can build and iterate without waiting for the backend to be ready.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
                {[
                  "One command, all your routes mounted",
                  "Responses shaped by your OpenAPI schemas",
                  "Same spec the backend tests against",
                  "No stubs, no mocking libraries, no configuration",
                ].map((item) => (
                  <li key={item} style={{ fontSize: "0.875rem", color: "#a1a1aa", paddingLeft: "1.25rem", position: "relative", marginBottom: "0.4rem" }}>
                    <span style={{ position: "absolute", left: 0, color: "#3f3f46" }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/docs#cmd-mock" style={{ fontSize: "0.875rem", color: "#f97316", textDecoration: "none" }} className="panel-link-accent">
                Learn about blast mock →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mock server demo ───────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: "2.5rem" }}
          >
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3f3f46", marginBottom: "0.875rem" }}>
              blast mock
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fafafa", lineHeight: 1.15, marginBottom: "0.75rem" }}>
              A real server from a spec file.
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#71717a", lineHeight: 1.7, maxWidth: 480 }}>
              Run blast mock and every path in your OpenAPI spec becomes a live endpoint returning schema-shaped fake data. Point your frontend at localhost and ship.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ maxWidth: 680, margin: "0 auto" }}
          >
            <div style={{ background: "#0a0a0c", border: "1px solid #1c1c1f", borderRadius: 10, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.025)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.75rem 1rem", borderBottom: "1px solid #111113", background: "rgba(255,255,255,0.015)" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28ca42" }} />
                <span style={{ marginLeft: "0.625rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#3f3f46" }}>blast</span>
              </div>
              <pre style={{ padding: "1.5rem 1.75rem", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", lineHeight: 1.9, overflowX: "auto", margin: 0 }}>
                {[
                  { t: "cmd",    text: "$ blast mock --port 4000" },
                  { t: "blank",  text: "" },
                  { t: "dim",    text: "  Loaded openapi.json" },
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
                  <div key={i} style={
                    line.t === "cmd"    ? { color: "#fafafa" } :
                    line.t === "dim"    ? { color: "#52525b" } :
                    line.t === "ok"     ? { color: "#86efac" } :
                    line.t === "pass"   ? { color: "#86efac", fontWeight: 600 } :
                    line.t === "accent" ? { color: "#f97316" } :
                    { color: "transparent", userSelect: "none" as const }
                  }>{line.text || " "}</div>
                ))}
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Comparison ─────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: "2.5rem" }}
          >
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3f3f46", marginBottom: "0.875rem" }}>
              Why blast
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.04em", color: "#fafafa", marginBottom: "0.75rem", lineHeight: 1.15 }}>
              Built for API contracts, not scripts.
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#71717a", lineHeight: 1.7, maxWidth: 540 }}>
              Most load tools require you to write code. blast reads the spec your team already has.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #1c1c1f" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1c1c1f" }}>
                    <th style={{ textAlign: "left", padding: "0.875rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#3f3f46", width: "40%" }}>
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
                        style={{
                          textAlign: "center",
                          padding: "0.875rem 1rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: tool.accent ? "#f97316" : "#52525b",
                          fontFamily: "var(--font-mono)",
                        }}
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
                      style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid #111113" : "none" }}
                    >
                      <td style={{ padding: "0.75rem 1.25rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
                        {row.feature}
                      </td>
                      {([row.blast, row.k6, row.wrk, row.ab] as boolean[]).map((has, ci) => (
                        <td key={ci} style={{ textAlign: "center", padding: "0.75rem 1rem" }}>
                          {has ? (
                            <span style={{ color: ci === 0 ? "#f97316" : "#52525b", fontSize: "0.9rem", fontWeight: 700 }}>&#10003;</span>
                          ) : (
                            <span style={{ color: "#27272a", fontSize: "0.9rem" }}>&#8212;</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#27272a", marginTop: "0.75rem", textAlign: "right" }}>
              k6 requires JS. wrk requires Lua for anything beyond GETs. ab has no auth or body support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Roadmap ────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: "2.5rem" }}
          >
            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#3f3f46",
                marginBottom: "0.875rem",
              }}
            >
              Roadmap
            </p>
            <h2
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#fafafa",
                lineHeight: 1.15,
                marginBottom: "0.625rem",
              }}
            >
              What&apos;s shipping next.
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#71717a", lineHeight: 1.7, maxWidth: 420 }}>
              Core load testing and fake data are stable and shipped. Mock server is in active development.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              border: "1px solid #1c1c1f",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {ROADMAP.map((item, i) => {
              const s = STATUS_META[item.status];
              return (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    borderBottom: i < ROADMAP.length - 1 ? "1px solid #1c1c1f" : "none",
                    background: item.status === "done" ? "rgba(134,239,172,0.015)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: "0.1rem",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: s.color,
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: 4,
                      padding: "0.2rem 0.45rem",
                      minWidth: 80,
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </span>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: item.status === "done" ? "#52525b" : "#fafafa",
                        marginBottom: "0.2rem",
                        textDecoration: item.status === "done" ? "line-through" : "none",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #1c1c1f", padding: "5rem 1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}
        >
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#fafafa",
              marginBottom: "0.875rem",
              lineHeight: 1.15,
            }}
          >
            One spec. Two tools. Ship faster.
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#71717a", lineHeight: 1.7, marginBottom: "2rem" }}>
            Load test your API and mock it for frontend development — both from the same OpenAPI file.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/docs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 42,
                padding: "0 1.375rem",
                background: "linear-gradient(120deg, #f97316, #fbbf24)",
                color: "#09090b",
                borderRadius: 8,
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "-0.01em",
                boxShadow: "0 0 32px rgba(249,115,22,0.2)",
              }}
              className="btn-primary"
            >
              Get started
            </Link>
            <Link
              href="/install"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 42,
                padding: "0 1.25rem",
                background: "none",
                border: "1px solid #27272a",
                color: "#71717a",
                borderRadius: 8,
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
              className="btn-secondary"
            >
              Install guide
            </Link>
          </div>
        </motion.div>
      </section>

      <style>{`
        .btn-primary:hover { opacity: 0.88; }
        .btn-secondary:hover { border-color: #3f3f46 !important; color: #fafafa !important; }
        .copy-btn-wrap:hover { border-color: #3f3f46 !important; color: #a1a1aa !important; }
        .panel-link:hover { color: #fafafa !important; }
        .panel-link-accent:hover { color: #fbbf24 !important; }
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          .hero-terminal { display: none !important; }
        }
        @media (max-width: 700px) {
          .two-tools-grid { grid-template-columns: 1fr !important; }
          .two-tools-grid > div:first-child { border-bottom: 1px solid #1c1c1f; }
        }
      `}</style>
    </main>
  );
}
