import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Termcatch — Rezerwacje online dla salonów i usług";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(17,24,39,0.06), transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#111827",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "40px",
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "#111827" }}>
            termcatch
          </div>
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.1,
            letterSpacing: "-2px",
          }}
        >
          Złap termin w najlepszych salonach
        </div>
        <div
          style={{
            fontSize: "30px",
            color: "#6b7280",
            marginTop: "28px",
          }}
        >
          Fryzjer, barber, paznokcie, masaż — rezerwuj online 24/7
        </div>
      </div>
    ),
    { ...size }
  );
}
