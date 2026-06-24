"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
  sub?: boolean;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Getting started",
    links: [
      { label: "Overview",    href: "#overview" },
      { label: "Install",     href: "#install" },
      { label: "Quick start", href: "#quickstart" },
    ],
  },
  {
    title: "Commands",
    links: [
      { label: "init",     href: "#cmd-init",     sub: true },
      { label: "validate", href: "#cmd-validate", sub: true },
      { label: "check",    href: "#cmd-check",    sub: true },
      { label: "seed",     href: "#cmd-seed",     sub: true },
      { label: "run",      href: "#cmd-run",      sub: true },
      { label: "stress",   href: "#cmd-stress",   sub: true },
      { label: "mock",     href: "#cmd-mock",     sub: true },
    ],
  },
  {
    title: "Configuration",
    links: [
      { label: "OpenAPI spec",       href: "#configuration" },
      { label: "x-blast extensions", href: "#extensions" },
      { label: "Fake data",          href: "#fake-data" },
      { label: "Tags",               href: "#tags" },
    ],
  },
  {
    title: "Advanced",
    links: [
      { label: "Setup phase",      href: "#setup" },
      { label: "Request chaining", href: "#chaining" },
    ],
  },
];

const ALL_IDS = SECTIONS.flatMap((s) => s.links.map((l) => l.href.slice(1)));

export function ActiveSidebar() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );

    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Link
        href="/"
        style={{
          fontSize: "0.8125rem",
          color: "#3f3f46",
          textDecoration: "none",
          transition: "color 0.15s",
          display: "block",
          marginBottom: "0.25rem",
        }}
        className="sidebar-back"
      >
        ← Home
      </Link>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#3f3f46",
              marginBottom: "0.5rem",
              paddingLeft: "0.5rem",
            }}
          >
            {section.title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {section.links.map((link) => {
              const id = link.href.slice(1);
              const isActive = active === id;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    color: isActive ? "#fafafa" : "#52525b",
                    textDecoration: "none",
                    padding: "0.3rem 0.5rem",
                    borderRadius: 5,
                    marginLeft: link.sub ? "0.25rem" : 0,
                    background: isActive ? "rgba(249,115,22,0.07)" : "transparent",
                    borderLeft: isActive ? "2px solid #f97316" : "2px solid transparent",
                    transition: "color 0.15s, background 0.15s, border-color 0.15s",
                  }}
                  className="sidebar-link"
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}

      <style>{`
        .sidebar-back:hover { color: #71717a !important; }
        .sidebar-link:hover { color: #a1a1aa !important; }
      `}</style>
    </div>
  );
}
