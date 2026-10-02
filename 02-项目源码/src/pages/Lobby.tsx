import { Link } from "react-router";
import { siteConfig } from "@/config";

const DOORS = [
  {
    to: "/private",
    title: "私人画廊",
    en: "PRIVATE WING",
    desc: "由我记录的每一个普通人的传记",
    glow: "rgba(214,150,90,0.55)",
    align: "left",
  },
  {
    to: "/celebrities",
    title: "历史人物画廊",
    en: "HALL OF HISTORICAL FIGURES",
    desc: "一百二十八位人类文明史上的闪耀灵魂",
    glow: "rgba(233,201,120,0.55)",
    align: "center",
  },
  {
    to: "/virtual",
    title: "虚拟 IP 画廊",
    en: "HALL OF VIRTUAL FIGURES",
    desc: "二次元角色与虚构人物的想象殿堂",
    glow: "rgba(90,190,235,0.55)",
    align: "right",
  },
];

export default function Lobby() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(1200px 700px at 50% 30%, #1a2030 0%, #07080c 70%)",
      }}
    >
      {/* Background atrium — CSS background is more reliable than <img> on CDN */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          backgroundImage: "url(/images/lobby_gate.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark veil for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          background:
            "radial-gradient(ellipse 90% 80% at 50% 40%, rgba(5,6,10,0.28) 0%, rgba(5,6,10,0.78) 100%)",
        }}
      />

      {/* Brand */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "36px",
          zIndex: 10,
        }}
      >
        <span className="brand-marquee">{siteConfig.brandName}</span>
        <span className="brand-marquee-sub">HALL OF DIGITAL TWINS</span>
      </div>

      {/* Intro */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          textAlign: "center",
          width: "min(90%, 760px)",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#c9a55c",
            margin: "0 0 16px 0",
            textShadow: "0 1px 10px rgba(0,0,0,0.9)",
          }}
        >
          Choose Your Hall
        </p>
        <h1
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 700,
            fontSize: "clamp(26px, 3.2vw, 42px)",
            color: "#f3e9d2",
            margin: 0,
            textShadow: "0 2px 24px rgba(0,0,0,0.95)",
            letterSpacing: "0.04em",
          }}
        >
          三座展厅，三种铭记
        </h1>
      </div>

      {/* Doors */}
      <div
        style={{
          position: "absolute",
          bottom: "9%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: "26px",
          width: "min(94%, 1320px)",
          justifyContent: "center",
        }}
      >
        {DOORS.map((door) => (
          <DoorCard key={door.to} {...door} />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          fontSize: "11px",
          color: "rgba(232,221,196,0.45)",
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <div>{siteConfig.copyright}</div>
        <div style={{ fontSize: "10.5px", opacity: 0.75 }}>
          本馆建造者：{siteConfig.builder} · 最后更新：{siteConfig.lastUpdated}
        </div>
      </div>
    </div>
  );
}

function DoorCard({
  to,
  title,
  en,
  desc,
  glow,
}: {
  to: string;
  title: string;
  en: string;
  desc: string;
  glow: string;
  align: string;
}) {
  return (
    <Link
      to={to}
      style={{
        flex: 1,
        maxWidth: "400px",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,11,16,0.66)",
        border: "1px solid rgba(236,227,204,0.2)",
        backdropFilter: "blur(8px)",
        padding: "26px 28px 24px",
        textAlign: "center",
        transition:
          "transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, background 0.35s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-8px)";
        el.style.borderColor = glow;
        el.style.background = "rgba(16,18,25,0.85)";
        el.style.boxShadow = `0 22px 50px rgba(0,0,0,0.6), 0 0 32px ${glow}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.borderColor = "rgba(236,227,204,0.2)";
        el.style.background = "rgba(10,11,16,0.66)";
        el.style.boxShadow = "none";
      }}
    >
      {/* eyebrow — fixed height so all titles sit on one line */}
      <div
        style={{
          height: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10.5px",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "#c9a55c",
        }}
      >
        {en}
      </div>

      {/* title — fixed height keeps every hall name on the same baseline */}
      <div
        style={{
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 700,
          fontSize: "clamp(19px, 1.6vw, 25px)",
          color: "#f3e9d2",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>

      {/* description — fixed height block for alignment */}
      <div
        style={{
          height: "46px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          fontSize: "13px",
          lineHeight: 1.7,
          color: "rgba(236,227,204,0.62)",
        }}
      >
        {desc}
      </div>

      <div
        style={{
          marginTop: "18px",
          fontSize: "12px",
          letterSpacing: "0.18em",
          color: "#ecc98a",
        }}
      >
        进入展厅 →
      </div>
    </Link>
  );
}
