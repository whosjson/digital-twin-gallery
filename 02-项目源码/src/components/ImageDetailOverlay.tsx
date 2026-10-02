import { useEffect, useRef } from "react";
import type { ImageItem } from "@/config";
import { overlayConfig } from "@/config";

interface Props {
  image: ImageItem | null;
  onClose: () => void;
}

const sketchLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.16em",
  color: "rgba(201,165,92,0.85)",
  margin: "0 0 6px 0",
};

const sketchBody: React.CSSProperties = {
  fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
  fontSize: "15px",
  lineHeight: 1.75,
  color: "rgba(255,255,255,0.8)",
  margin: 0,
  textAlign: "justify",
};

export default function ImageDetailOverlay({ image, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const panel = panelRef.current;

    // Web fonts (Noto Serif SC, Cormorant) resize text after first paint,
    // which can leave Chromium's scroll metrics stale. Nudge a reflow once
    // everything has settled so the archive can scroll its full length.
    let cancelled = false;
    const refresh = () => {
      if (cancelled || !panel) return;
      panel.style.display = "none";
      void panel.offsetHeight; // force reflow
      panel.style.display = "block";
    };
    const t1 = window.setTimeout(refresh, 80);
    const t2 = window.setTimeout(refresh, 450);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => refresh());
    }

    // The vortex canvas owns the window wheel listener; hand the wheel to
    // the text panel instead while the archive is open.
    const onWheel = (e: WheelEvent) => {
      if (!panel) return;
      e.preventDefault();
      e.stopPropagation();
      const max = panel.scrollHeight - panel.clientHeight;
      panel.scrollTop = Math.min(Math.max(panel.scrollTop + e.deltaY, 0), Math.max(max, 0));
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    };
  }, [image, onClose]);

  const open = !!image;

  const eyebrow =
    image && image.category
      ? overlayConfig.frameDetailLabel
        ? `${image.category} — ${overlayConfig.frameDetailLabel}`
        : image.category
      : "";

  return (
    <div
      ref={panelRef}
      onClick={onClose}
      className="overlay-scroll"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.96)",
        zIndex: 100,
        display: "block",
        overflow: "auto",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.35s ease",
        overscrollBehavior: "contain",
      }}
    >
      {image && (
        <>
          {/* Portrait — pinned to the left while the archive scrolls */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              width: "46%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <img
              src={image.src}
              alt={image.title}
              style={{
                display: "block",
                maxWidth: "86%",
                maxHeight: "calc(100vh - 112px)",
                objectFit: "contain",
                boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
                transform: open ? "scale(1)" : "scale(0.98)",
                transition: "transform 0.35s ease",
              }}
            />
          </div>

          {/* Text panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "#ffffff",
              fontFamily: "system-ui, -apple-system, sans-serif",
              display: "block",
              width: "46%",
              maxWidth: "720px",
              marginLeft: "auto",
              marginRight: "4%",
              padding: "56px 14px 72px 0",
              boxSizing: "border-box",
              transform: open ? "translateY(0)" : "translateY(12px)",
              transition: "transform 0.35s ease",
            }}
          >
            {eyebrow && (
              <p
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#c9a55c",
                  opacity: 0.9,
                  margin: "0 0 20px 0",
                }}
              >
                {eyebrow}
              </p>
            )}

            {/* Epithet — Chinese name — English name */}
            <div style={{ margin: "0 0 20px 0" }}>
              <h2
                style={{
                  fontFamily: "'Noto Serif SC', 'Times New Roman', serif",
                  fontSize: "clamp(30px, 2.9vw, 44px)",
                  fontWeight: 700,
                  lineHeight: 1.12,
                  letterSpacing: "0.01em",
                  margin: 0,
                }}
              >
                {image.title}
              </h2>
              {image.englishName && (
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontSize: "clamp(17px, 1.5vw, 22px)",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    color: "rgba(232,221,196,0.72)",
                    margin: "10px 0 0 0",
                  }}
                >
                  {image.englishName}
                </p>
              )}
            </div>

            {/* Vital records — era / origin / aliases */}
            {(image.born || image.origin || image.alias) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "76px 1fr",
                  rowGap: "8px",
                  columnGap: "16px",
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  margin: "0 0 20px 0",
                }}
              >
                {image.born && (
                  <>
                    <span style={{ opacity: 0.5, letterSpacing: "0.08em" }}>
                      生卒
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.9)" }}>
                      {image.born}
                    </span>
                  </>
                )}
                {image.origin && (
                  <>
                    <span style={{ opacity: 0.5, letterSpacing: "0.08em" }}>
                      身份
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.9)" }}>
                      {image.origin}
                    </span>
                  </>
                )}
                {image.alias && (
                  <>
                    <span style={{ opacity: 0.5, letterSpacing: "0.08em" }}>
                      别称
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.9)" }}>
                      {image.alias}
                    </span>
                  </>
                )}
              </div>
            )}

            {image.description && (
              <p
                style={{
                  fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
                  fontSize: "17.5px",
                  lineHeight: 1.68,
                  color: "rgba(255,255,255,0.85)",
                  margin: "0 0 20px 0",
                }}
              >
                {image.description}
              </p>
            )}

            {/* Biography — a life in a thousand characters */}
            {image.biography && (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  paddingTop: "4px",
                  margin: "0 0 20px 0",
                }}
              >
                <p
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#c9a55c",
                    opacity: 0.95,
                    margin: "10px 0 12px 0",
                  }}
                >
                  人物生平
                </p>
                {image.biography.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
                      fontSize: "15.5px",
                      lineHeight: 1.85,
                      color: "rgba(255,255,255,0.78)",
                      margin: "0 0 14px 0",
                      textAlign: "justify",
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Portrait sketch — contribution / shadow / era in three strokes */}
            {(image.highlight || image.shadow || image.era) && (
              <div
                style={{
                  margin: "0 0 20px 0",
                  border: "1px solid rgba(201,165,92,0.25)",
                  background:
                    "linear-gradient(180deg, rgba(201,165,92,0.08) 0%, rgba(201,165,92,0.02) 100%)",
                  padding: "18px 20px",
                }}
              >
                <p
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#c9a55c",
                    opacity: 0.95,
                    margin: "0 0 16px 0",
                  }}
                >
                  人物小传 · 三笔
                </p>
                {image.highlight && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={sketchLabel}>最重要的贡献</p>
                    <p style={sketchBody}>{image.highlight}</p>
                  </div>
                )}
                {image.shadow && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={sketchLabel}>他的黑暗面</p>
                    <p style={sketchBody}>{image.shadow}</p>
                  </div>
                )}
                {image.era && (
                  <div>
                    <p style={sketchLabel}>他所处的时代</p>
                    <p style={sketchBody}>{image.era}</p>
                  </div>
                )}
              </div>
            )}
            {image.creed && (
              <div
                style={{
                  position: "relative",
                  margin: "0 0 20px 0",
                  padding: "18px 22px 18px 24px",
                  borderLeft: "3px solid #c9a55c",
                  background:
                    "linear-gradient(90deg, rgba(201,165,92,0.14) 0%, rgba(201,165,92,0.03) 78%)",
                }}
              >
                <p
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#c9a55c",
                    opacity: 0.95,
                    margin: "0 0 10px 0",
                  }}
                >
                  一生要旨
                </p>
                <p
                  style={{
                    fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
                    fontSize: "19px",
                    lineHeight: 1.6,
                    color: "#f3e9d2",
                    margin: 0,
                  }}
                >
                  {image.creed}
                </p>
              </div>
            )}

            {(overlayConfig.fileLabel || overlayConfig.seriesLabel) && (
              <div
                style={{
                  margin: "0 0 20px 0",
                  paddingTop: "18px",
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  display: "grid",
                  gridTemplateColumns: "110px 1fr",
                  rowGap: "8px",
                  fontSize: "13px",
                  opacity: 0.75,
                }}
              >
                {overlayConfig.fileLabel && (
                  <>
                    <span style={{ opacity: 0.6 }}>
                      {overlayConfig.fileLabel}
                    </span>
                    <span style={{ fontFamily: "monospace" }}>
                      {image.archive ?? image.src.split("/").pop()}
                    </span>
                  </>
                )}
                {overlayConfig.seriesLabel && (
                  <>
                    <span style={{ opacity: 0.6 }}>
                      {overlayConfig.seriesLabel}
                    </span>
                    <span>{image.title.split(" — ")[0]}</span>
                  </>
                )}
              </div>
            )}

            {overlayConfig.closeLabel && (
              <button
                onClick={onClose}
                style={{
                  alignSelf: "flex-start",
                  margin: "0 0 4px 0",
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.35)",
                  padding: "10px 22px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                }}
              >
                {overlayConfig.closeLabel}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
