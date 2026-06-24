import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#09090b",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 5,
            top: 8,
            width: 3,
            height: 16,
            borderRadius: 2,
            background: "linear-gradient(180deg, #f97316, #fbbf24)",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#fafafa",
            fontFamily: "monospace",
            letterSpacing: "-1px",
            marginLeft: 4,
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
