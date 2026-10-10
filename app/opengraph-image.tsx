import { ImageResponse } from "next/og";
export const alt = "AI Perks — Your business, beautifully in sync.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f4f7ed",
        padding: 70,
        color: "#244d38",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        ai perks <span style={{ color: "#7f9c68", marginLeft: 12 }}>✳</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -4,
            display: "flex",
          }}
        >
          Your business,
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -4,
            display: "flex",
            color: "#70925f",
          }}
        >
          beautifully in sync.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#849477",
            display: "flex",
            marginTop: 24,
          }}
        >
          Conversations. Customers. AI assistance. One thoughtful workspace.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 16,
          color: "#8c9b7f",
          justifyContent: "space-between",
        }}
      >
        <span>Made for the people behind the business.</span>
        <span>ai-perks-two.vercel.app</span>
      </div>
    </div>,
    size,
  );
}
