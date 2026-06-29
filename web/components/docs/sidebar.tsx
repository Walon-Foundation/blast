"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
      { label: "trace",    href: "#cmd-trace",    sub: true },
      { label: "stage",    href: "#cmd-stage",    sub: true },
    ],
  },
  {
    title: "Configuration",
    links: [
      { label: "Config file",    href: "#configuration" },
      { label: "Endpoint fields", href: "#extensions" },
      { label: "Fake data",      href: "#fake-data" },
      { label: "Tags",           href: "#tags" },
      { label: "Stages",         href: "#stages" },
    ],
  },
  {
    title: "Advanced",
    links: [
      { label: "Setup phase",          href: "#setup" },
      { label: "Request chaining",     href: "#chaining" },
      { label: "Scenarios",            href: "#scenarios" },
      { label: "Variable files",       href: "#vars" },
      { label: "Threshold assertions", href: "#assertions" },
      { label: "History",              href: "#history" },
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
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="text-[0.8125rem] text-mute no-underline transition-colors duration-150 block mb-1 hover:text-[#71717a]"
      >
        ← Home
      </Link>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-mute mb-2 pl-2">
            {section.title}
          </p>
          <div className="flex flex-col gap-px">
            {section.links.map((link) => {
              const id = link.href.slice(1);
              const isActive = active === id;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block text-[0.8125rem] no-underline py-[0.3rem] px-2 rounded-[5px] border-l-2 transition-colors duration-150 hover:text-mid",
                    link.sub ? "ml-1" : "ml-0",
                    isActive
                      ? "text-hi bg-accent/8 border-accent"
                      : "text-lo border-transparent"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
