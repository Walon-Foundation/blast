import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #1c1c1f",
        marginTop: "6rem",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "1.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            color: "#3f3f46",
            letterSpacing: "-0.02em",
          }}
        >
          blast — MIT License
        </span>

        <nav
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Docs",       href: "/docs",       external: false },
            { label: "Changelog",  href: "/changelog",  external: false },
            { label: "Install",    href: "/install",    external: false },
            { label: "GitHub",   href: "https://github.com/Walon-Foundation/blast", external: true },
            { label: "Releases", href: "https://github.com/Walon-Foundation/blast/releases", external: true },
          ].map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.8125rem",
                  color: "#3f3f46",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                className="footer-link"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                href={l.href}
                style={{
                  fontSize: "0.8125rem",
                  color: "#3f3f46",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                className="footer-link"
              >
                {l.label}
              </Link>
            )
          )}
        </nav>
      </div>

      <style>{`
        .footer-link:hover { color: #71717a !important; }
      `}</style>
    </footer>
  );
}
