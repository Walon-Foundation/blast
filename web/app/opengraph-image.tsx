import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "blast — API load testing and mock server";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 600,
            background:
              "radial-gradient(ellipse at center, rgba(249,115,22,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #f97316, #fbbf24)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            position: "relative",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              background: "linear-gradient(120deg, #f97316, #fbbf24)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            blast
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 22,
              color: "#71717a",
              letterSpacing: "-0.01em",
              textAlign: "center",
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            Config-driven API load testing and mock server generation from a single OpenAPI spec.
          </div>

          {/* Command pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["blast run", "blast stress", "blast mock"].map((cmd) => (
              <div
                key={cmd}
                style={{
                  padding: "6px 18px",
                  background: "#111113",
                  border: "1px solid #27272a",
                  borderRadius: 6,
                  fontSize: 15,
                  color: "#d4d4d8",
                  fontFamily: "monospace",
                  letterSpacing: "-0.01em",
                }}
              >
                {cmd}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
