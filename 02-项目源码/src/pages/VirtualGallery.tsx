import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import VirtualCorridor, { type VirtualItem } from "@/lib/VirtualCorridor";
import { siteConfig } from "@/config";

// 示例馆藏：后续由你挑选替换为真正的二次元/虚构人物
const VIRTUAL_ITEMS: VirtualItem[] = [
  { src: "/images/virtual/v01_hero.jpg", title: "黑衣剑士", en: "The Black Swordsman", note: "示例 · 动漫英雄" },
  { src: "/images/virtual/v02_witch.jpg", title: "见习魔女", en: "The Little Witch", note: "示例 · 治愈幻想" },
  { src: "/images/virtual/v03_mecha.jpg", title: "机甲驾驶员", en: "Mecha Pilot", note: "示例 · 科幻机战" },
  { src: "/images/virtual/v04_samurai.jpg", title: "浪人剑客", en: "The Ronin", note: "示例 · 时代剑戟" },
  { src: "/images/virtual/v05_idol.jpg", title: "舞台偶像", en: "The Idol", note: "示例 · 青春偶像" },
  { src: "/images/virtual/v07_cyborg.jpg", title: "赛博义体人", en: "The Cyborg", note: "示例 · 赛博朋克" },
  { src: "/images/virtual/v10_spirit.jpg", title: "九尾狐仙", en: "The Fox Spirit", note: "示例 · 神怪传说" },
  { src: "/images/virtual/v11_pirate.jpg", title: "草帽船长", en: "The Pirate Captain", note: "示例 · 冒险热血" },
];

export default function VirtualGallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const corridorRef = useRef<VirtualCorridor | null>(null);
  const hoverRafRef = useRef<number>(0);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<VirtualItem | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let corridor: VirtualCorridor | null = null;
    try {
      corridor = new VirtualCorridor(canvasRef.current, VIRTUAL_ITEMS);
      corridorRef.current = corridor;
    } catch (err) {
      console.error("Corridor init failed:", err);
      setWebglFailed(true);
      return;
    }
    return () => corridor?.destroy();
  }, []);

  useEffect(() => {
    corridorRef.current?.setPaused(selected !== null || hoveredIdx !== null);
  }, [selected, hoveredIdx]);

  useEffect(() => () => cancelAnimationFrame(hoverRafRef.current), []);

  const recheckHover = (x: number, y: number) => {
    const c = corridorRef.current;
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    const idx = c.pickAtScreen(x, y, canvas.getBoundingClientRect());
    setHoveredIdx(idx);
    canvas.style.cursor = idx !== null ? "pointer" : "default";
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    lastMouseRef.current = { x: clientX, y: clientY };
    if (hoverRafRef.current) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      recheckHover(clientX, clientY);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = corridorRef.current;
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    const idx = c.pickAtScreen(e.clientX, e.clientY, canvas.getBoundingClientRect());
    if (idx !== null) setSelected(VIRTUAL_ITEMS[idx]);
  };

  if (webglFailed) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#05060a",
          color: "#e8ddc4",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Noto Serif SC', 'Songti SC', serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "26px", letterSpacing: "0.3em", color: "#5abeeb", marginBottom: "14px" }}>
          虚拟 IP 画廊
        </div>
        <div style={{ fontSize: "13px", opacity: 0.65, lineHeight: 1.9, maxWidth: "480px" }}>
          这座展厅需要浏览器开启 WebGL 才能呈现。
          <br />
          请尝试使用最新版 Chrome、Edge、Firefox 或 Safari，并确认已开启硬件加速。
        </div>
        <button
          onClick={() => location.reload()}
          style={{
            marginTop: "26px",
            background: "transparent",
            color: "#5abeeb",
            border: "1px solid rgba(90,190,235,0.5)",
            padding: "10px 30px",
            fontSize: "13px",
            letterSpacing: "0.14em",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#05060a",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMove}
        onClick={handleClick}
        onMouseLeave={() => {
          lastMouseRef.current = null;
          setHoveredIdx(null);
          if (canvasRef.current) canvasRef.current.style.cursor = "default";
        }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      />

      {/* Vignette — subtle, keeps the bright cyberspace airy */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 92% 82% at 50% 48%, rgba(10,30,60,0) 55%, rgba(10,25,50,0.25) 100%)",
        }}
      />

      {/* Header */}
      <div style={{ position: "absolute", top: "26px", left: "34px", zIndex: 10 }}>
        <span
          style={{
            fontFamily: "'Noto Serif SC', 'Songti SC', serif",
            fontWeight: 900,
            fontSize: "20px",
            letterSpacing: "0.3em",
            color: "#ffffff",
            textShadow: "0 1px 14px rgba(0,0,0,0.75), 0 0 30px rgba(0,0,0,0.4)",
          }}
        >
          {siteConfig.brandName}
        </span>
        <span
          style={{
            display: "block",
            marginTop: "8px",
            fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
            fontStyle: "italic",
            fontSize: "11.5px",
            letterSpacing: "0.32em",
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 1px 10px rgba(0,0,0,0.7)",
          }}
        >
          HALL OF VIRTUAL FIGURES · 虚拟 IP 画廊
        </span>
      </div>
      <Link
        to="/"
        style={{
          position: "absolute",
          top: "30px",
          right: "34px",
          zIndex: 10,
          color: "#ffffff",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 500,
          textShadow: "0 1px 12px rgba(0,0,0,0.75)",
          transition: "opacity 0.3s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        返回门厅
      </Link>

      {/* Hint */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          fontSize: "12px",
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.06em",
          textShadow: "0 1px 10px rgba(0,0,0,0.7)",
          pointerEvents: "none",
        }}
      >
        滚动前进 · 悬停两侧画像可打开展示
      </div>

      {/* Detail overlay */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,7,10,0.92)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "56px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              gap: "48px",
              alignItems: "center",
              maxWidth: "980px",
            }}
          >
            <img
              src={selected.src}
              alt={selected.title}
              style={{
                maxHeight: "calc(100vh - 160px)",
                maxWidth: "46%",
                objectFit: "contain",
                border: "1.5px solid rgba(236,201,138,0.85)",
                boxShadow: "0 0 44px rgba(236,201,138,0.25), 0 30px 80px rgba(0,0,0,0.6)",
              }}
            />
            <div style={{ color: "#fff" }}>
              <p
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#5abeeb",
                  margin: "0 0 14px 0",
                }}
              >
                {selected.en || "Virtual Figure"}
              </p>
              <h2
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: 700,
                  fontSize: "clamp(28px, 2.6vw, 40px)",
                  margin: "0 0 18px 0",
                }}
              >
                {selected.title}
              </h2>
              {selected.note && (
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.8,
                    color: "rgba(255,255,255,0.72)",
                    margin: "0 0 26px 0",
                  }}
                >
                  {selected.note}
                </p>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.35)",
                  padding: "10px 24px",
                  fontSize: "13px",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
