import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import VortexGallery from "@/lib/VortexGallery";
import Lenis from "lenis";
import {
  siteConfig,
  navigationConfig,
  loadPeople,
  type ImageItem,
} from "@/config";
import ImageDetailOverlay from "@/components/ImageDetailOverlay";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vortexRef = useRef<VortexGallery | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const hoverRafRef = useRef<number>(0);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const spotTarget = useRef({ x: -400, y: -400 });
  const spotCurrent = useRef({ x: -400, y: -400 });
  const spotRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIdxRef = useRef(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [centerGlow, setCenterGlow] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loadError, setLoadError] = useState(false);

  const PLAYLIST = [
    { title: "America", src: "/audio/bgm_america.mp3" },
    { title: "China", src: "/audio/bgm_china.mp3" },
    { title: "Maori", src: "/audio/bgm_maori.mp3" },
  ];

  useEffect(() => {
    let alive = true;
    loadPeople()
      .then((list) => {
        if (alive) setImages(list);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const hasImages = images.length > 0;

  useEffect(() => {
    if (!canvasRef.current || !hasImages) return;

    let vortex: VortexGallery | null = null;
    try {
      vortex = new VortexGallery(
        canvasRef.current,
        images.map((i) => i.src)
      );
      vortexRef.current = vortex;
    } catch (err) {
      console.error("Vortex init failed:", err);
      setWebglFailed(true);
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", () => {
      // Lenis drives smooth scroll — the wheel handler in VortexGallery
      // already receives normalized wheel events. We feed additional
      // scroll velocity into the vortex for momentum.
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Ambient BGM — plays the playlist in order, looping forever.
    // preload="none" keeps the 28MB of audio off the critical first paint.
    const audio = new Audio();
    audio.preload = "none";
    audio.src = PLAYLIST[0].src;
    audio.volume = 0.55;
    audio.addEventListener("ended", () => {
      trackIdxRef.current = (trackIdxRef.current + 1) % PLAYLIST.length;
      setTrackIdx(trackIdxRef.current);
      audio.src = PLAYLIST[trackIdxRef.current].src;
      audio.play().catch(() => {});
    });
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      vortex?.destroy();
      lenis.destroy();
    };
  }, [hasImages, images]);

  // Pause the whole vortex while the detail overlay is open OR while the
  // visitor hovers any portrait — like the hall holding its breath.
  useEffect(() => {
    vortexRef.current?.setPaused(selectedIdx !== null || hovered);
  }, [selectedIdx, hovered]);

  // Music toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.play().catch(() => setMusicOn(false));
    } else {
      audio.pause();
    }
  }, [musicOn]);

  // Skip to the next track
  const nextTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;
    trackIdxRef.current = (trackIdxRef.current + 1) % PLAYLIST.length;
    setTrackIdx(trackIdxRef.current);
    audio.src = PLAYLIST[trackIdxRef.current].src;
    if (musicOn) audio.play().catch(() => {});
  };

  // Spotlight follows the visitor's gaze — eased for a buttery glide
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = spotCurrent.current;
      const t = spotTarget.current;
      c.x += (t.x - c.x) * 0.14;
      c.y += (t.y - c.y) * 0.14;
      if (spotRef.current) {
        spotRef.current.style.background = `radial-gradient(circle 330px at ${c.x}px ${c.y}px, rgba(255, 224, 168, 0.20) 0%, rgba(255, 224, 168, 0.07) 45%, rgba(255, 224, 168, 0) 70%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cancel any pending hover hit-test on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(hoverRafRef.current);
  }, []);

  if (!hasImages) return null;

  const recheckHover = (clientX: number, clientY: number) => {
    const vortex = vortexRef.current;
    const canvas = canvasRef.current;
    if (!vortex || !canvas) return;
    const idx = vortex.pickAtScreen(
      clientX,
      clientY,
      canvas.getBoundingClientRect(),
      85
    );
    setHovered(idx !== null);
    setCenterGlow(idx !== null && idx === vortex.textureIndex);
    canvas.style.cursor = idx !== null ? "pointer" : "default";
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vortex = vortexRef.current;
    const canvas = canvasRef.current;
    if (!vortex || !canvas) return;
    const idx = vortex.pickAtScreen(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect()
    );
    if (idx !== null) {
      setCenterGlow(false);
      setSelectedIdx(idx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    lastMouseRef.current = { x: clientX, y: clientY };
    spotTarget.current = { x: clientX, y: clientY };
    if (hoverRafRef.current) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      recheckHover(clientX, clientY);
    });
  };

  const handleMouseLeave = () => {
    lastMouseRef.current = null;
    setHovered(false);
    setCenterGlow(false);
    spotTarget.current = { x: -400, y: -400 };
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  };

  const handleCloseOverlay = () => {
    setSelectedIdx(null);
    // Re-evaluate what's under the cursor once the overlay is gone
    const m = lastMouseRef.current;
    if (m) requestAnimationFrame(() => recheckHover(m.x, m.y));
  };

  // Projected on-screen size of the center frame (world 1.7×2.3 at z=0,
  // camera z=5, fov 50°) — the golden rim hugs this rect when hovered.
  const frameH = Math.min(
    window.innerHeight * (2.3 / (2 * 5 * Math.tan((25 * Math.PI) / 180))),
    window.innerHeight * 0.96
  );
  const frameW = frameH * (1.7 / 2.3);

  if (webglFailed) {
    return <WebglFallback />;
  }

  if (loadError) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#07080c",
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
        <div style={{ fontSize: "26px", letterSpacing: "0.3em", color: "#ecc98a", marginBottom: "14px" }}>
          数字分身画像馆
        </div>
        <div style={{ fontSize: "13px", opacity: 0.65, lineHeight: 1.9, maxWidth: "460px" }}>
          人物档案载入失败，请刷新重试。
        </div>
        <button
          onClick={() => location.reload()}
          style={{
            marginTop: "26px",
            background: "transparent",
            color: "#ecc98a",
            border: "1px solid rgba(236,201,138,0.5)",
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
        background: "#07080c",
      }}
    >
      {/* WebGL Canvas — the entire page is the vortex */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />

      {/* Spotlight — a hand-lamp of warm light following the cursor */}
      <div
        ref={spotRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "none",
          mixBlendMode: "soft-light",
        }}
      />

      {/* Vignette — draws the eye to the lit center of the hall */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 95% 85% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      {/* Golden rim — the museum spotlight outlines the hovered center frame */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${frameW}px`,
          height: `${frameH}px`,
          transform: `translate(-50%, -50%) scale(${centerGlow ? 1.018 : 1})`,
          border: "1.5px solid rgba(236,201,138,0.95)",
          boxShadow:
            "0 0 28px 4px rgba(236,201,138,0.32), inset 0 0 28px rgba(236,201,138,0.10)",
          opacity: centerGlow ? 1 : 0,
          transition: "opacity 0.45s ease, transform 0.45s ease",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* UI Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Top-left Brand — engraved gold */}
        {siteConfig.brandName && (
          <div
            style={{
              position: "absolute",
              top: "30px",
              left: "34px",
              pointerEvents: "auto",
              cursor: "default",
            }}
          >
            <span className="brand-marquee">{siteConfig.brandName}</span>
            <span className="brand-marquee-sub">HALL OF DIGITAL TWINS</span>
          </div>
        )}

        {/* Top-right — Private hall & Info */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: "32px",
            display: "flex",
            gap: "28px",
            alignItems: "center",
          }}
        >
          <Link
            to="/"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              color: "#e8ddc4",
              textDecoration: "none",
              pointerEvents: "auto",
              transition: "opacity 0.3s ease",
              textShadow: "0 1px 12px rgba(0,0,0,0.8)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            门厅
          </Link>
          {navigationConfig.infoLinkLabel && (
            <Link
              to="/info"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                color: "#e8ddc4",
                textDecoration: "none",
                pointerEvents: "auto",
                transition: "opacity 0.3s ease",
                textShadow: "0 1px 12px rgba(0,0,0,0.8)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {navigationConfig.infoLinkLabel}
            </Link>
          )}
        </div>

        {/* Music controls — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "32px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Current track name */}
          {musicOn && (
            <span
              style={{
                fontSize: "11.5px",
                color: "rgba(236,201,138,0.85)",
                letterSpacing: "0.06em",
                marginRight: "4px",
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
              }}
            >
              ♪ {PLAYLIST[trackIdx].title}
            </span>
          )}

          {/* Next track */}
          <button
            onClick={nextTrack}
            title="切歌"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(232,221,196,0.28)",
              color: "#e8ddc4",
              cursor: "pointer",
              pointerEvents: "auto",
              transition: "border-color 0.3s ease, background 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(236,201,138,0.75)";
              e.currentTarget.style.background = "rgba(236,201,138,0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(232,221,196,0.28)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <SkipIcon />
          </button>

          {/* Play / pause */}
          <button
            onClick={() => setMusicOn((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(232,221,196,0.28)",
              padding: "8px 16px",
              color: "#e8ddc4",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "12.5px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              pointerEvents: "auto",
              transition: "border-color 0.3s ease, background 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(236,201,138,0.75)";
              e.currentTarget.style.background = "rgba(236,201,138,0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(232,221,196,0.28)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <MusicIcon on={musicOn} />
            {musicOn ? "音乐 · 开" : "音乐 · 关"}
          </button>
        </div>

        {/* Footer */}
        {siteConfig.copyright && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "12px",
              fontWeight: 400,
              color: "#e8ddc4",
              opacity: 0.5,
              letterSpacing: "0.02em",
              textAlign: "center",
              lineHeight: 1.7,
            }}
          >
            <div>{siteConfig.copyright}</div>
            <div style={{ fontSize: "11px", opacity: 0.75 }}>
              本馆建造者：{siteConfig.builder} · 最后更新：
              {siteConfig.lastUpdated}
            </div>
          </div>
        )}
      </div>

      <ImageDetailOverlay
        image={selectedIdx !== null ? images[selectedIdx] : null}
        onClose={handleCloseOverlay}
      />
    </div>
  );
}

function MusicIcon({ on }: { on: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        gap: "2.5px",
        height: "14px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "2.5px",
            borderRadius: "1px",
            background: on ? "#ecc98a" : "rgba(232,221,196,0.45)",
            height: on ? undefined : `${5 + i * 3}px`,
            animation: on
              ? `eq-bar 0.9s ease-in-out ${i * 0.18}s infinite`
              : "none",
            ...(on ? { height: "12px" } : {}),
          }}
        />
      ))}
      <style>{`
        @keyframes eq-bar {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </span>
  );
}

/* Shown when the browser cannot run WebGL */
function WebglFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#07080c",
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
      <div style={{ fontSize: "26px", letterSpacing: "0.3em", color: "#ecc98a", marginBottom: "14px" }}>
        数字分身画像馆
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
          color: "#ecc98a",
          border: "1px solid rgba(236,201,138,0.5)",
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

/* Geometric "next track" mark drawn with borders — no emoji, matches the gold theme */
function SkipIcon() {
  const tri = {
    width: 0,
    height: 0,
    borderTop: "4.5px solid transparent",
    borderBottom: "4.5px solid transparent",
    borderLeft: "6px solid currentColor",
  } as const;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "1.5px",
        color: "#e8ddc4",
      }}
    >
      <span style={tri} />
      <span
        style={{
          width: "2px",
          height: "10px",
          background: "currentColor",
          borderRadius: "1px",
        }}
      />
    </span>
  );
}
