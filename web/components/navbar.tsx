"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { label: "Docs",      href: "/docs" },
  { label: "Changelog", href: "/changelog" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid #1c1c1f",
        background: "rgba(9,9,11,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "0.9375rem",
            color: "#fafafa",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          blast
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: "0.875rem",
                color: pathname.startsWith(l.href) ? "#fafafa" : "#71717a",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              className="nav-link-item"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true, bubbles: true })
              );
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#111113",
              border: "1px solid #1c1c1f",
              borderRadius: 6,
              padding: "0.3rem 0.625rem",
              color: "#52525b",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "border-color 0.15s, color 0.15s",
            }}
            className="search-trigger"
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            Search
            <kbd style={{ fontSize: "0.6rem", background: "#09090b", border: "1px solid #27272a", borderRadius: 3, padding: "0.1rem 0.3rem", color: "#3f3f46" }}>⌘K</kbd>
          </button>
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.875rem",
              color: "#71717a",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            className="nav-link-item"
          >
            GitHub
          </a>
          <Link
            href="/install"
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#09090b",
              background: "linear-gradient(120deg, #f97316, #fbbf24)",
              padding: "0.35rem 0.875rem",
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: "-0.01em",
              transition: "opacity 0.15s",
            }}
            className="nav-download"
          >
            Download
          </Link>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            color: "#71717a",
            cursor: "pointer",
            padding: "0.25rem",
          }}
          className="nav-hamburger"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            borderTop: "1px solid #1c1c1f",
            background: "#09090b",
            padding: "0.75rem 1.5rem 1.25rem",
          }}
          className="nav-mobile-menu"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "0.625rem 0",
                fontSize: "0.9375rem",
                color: "#a1a1aa",
                textDecoration: "none",
                borderBottom: "1px solid #1c1c1f",
              }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "0.625rem 0",
              fontSize: "0.9375rem",
              color: "#a1a1aa",
              textDecoration: "none",
              borderBottom: "1px solid #1c1c1f",
            }}
          >
            GitHub
          </a>
          <Link
            href="/install"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              marginTop: "0.875rem",
              textAlign: "center",
              padding: "0.625rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#09090b",
              background: "linear-gradient(120deg, #f97316, #fbbf24)",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Download
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .nav-link-item, .nav-download, .search-trigger { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
        .search-trigger:hover { border-color: #27272a !important; color: #a1a1aa !important; }
      `}</style>
    </header>
  );
}
