import { ImageResponse } from "next/og";
export const alt = "Duzelo — A little help. A lot closer. Local services in South Africa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        padding: "65px 80px",
        background: "#173f35",
        color: "#f9f7f0",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: "-2px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 54,
            height: 54,
            borderRadius: 17,
            background: "#f6bc5c",
            color: "#173f35",
            marginRight: 16,
            fontSize: 35,
          }}
        >
          D
        </div>
        Duzelo.
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 83,
            fontWeight: 750,
            lineHeight: 1.05,
            letterSpacing: "-4px",
          }}
        >
          <span>A little help.</span>
          <span>A lot closer.</span>
        </div>
        <div style={{ fontSize: 22, color: "#c9dfd0", marginTop: 25 }}>
          A better kind of local, starting in Mkhondo.
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#c9dfd0" }}
      >
        <span>NEIGHBOURHOOD SERVICE DESK</span>
        <span>PRODUCT PREVIEW · SOUTH AFRICA</span>
      </div>
    </div>,
    size,
  );
}
