import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#09090b",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 46,
            width: 8,
            height: 88,
            borderRadius: 4,
            background: "linear-gradient(180deg, #f97316, #fbbf24)",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#fafafa",
            fontFamily: "monospace",
            letterSpacing: "-6px",
            marginLeft: 16,
            display: "flex",
          }}
        >
          b
        </div>
      </div>
    ),
    { ...size }
  );
}
