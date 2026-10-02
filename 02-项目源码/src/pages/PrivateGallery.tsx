import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { ImageItem } from "@/config";
import ImageDetailOverlay from "@/components/ImageDetailOverlay";

const STORAGE_KEY = "private-twin-gallery-v1";

interface PrivateEntry extends ImageItem {
  id: string;
}

// 示例馆藏：三个普通人的记忆，汇成历史正文
const SAMPLE_ENTRIES: PrivateEntry[] = [
  {
    id: "sample-grandma",
    src: "/images/private_grandma.jpg",
    category: "私人馆藏",
    title: "岁月的温度 — 外婆王秀兰",
    born: "1938 – 2021",
    origin: "山东青岛 · 退休纺织女工",
    description:
      "她的一生没离开过那座小城，却把五个孩子送进了五个不同的远方。灶台上的热气、织机旁的光阴，都织进了我们记忆里最软的地方。",
    creed: "把苦日子过出甜味来——家人围坐、灯火可亲，就是一生最好的功名。",
    biography:
      "王秀兰1938年生于青岛，十六岁进纺织厂当学徒，在织机声里站了四十年。丈夫早逝后她独自拉扯五个孩子，白天上工、夜里缝补，把每一分钱掰成两半花。退休后她成了全家的港湾：谁回家，灶上就有热汤；谁离家，行李里就多一包她晒的萝卜干。\n\n她不识字，却记得每个孙辈的生日；没出过远门，却看着孩子们一个个去了北上广和国外。2021年冬天她在睡梦中安然离世，享年八十三岁。整理遗物时，家人在她的木箱底发现一沓从未寄出的信，每一封的开头都是\"我想你们了\"。",
    archive: "私藏 NO. 001",
  },
  {
    id: "sample-father",
    src: "/images/private_father.jpg",
    category: "私人馆藏",
    title: "沉默的脊梁 — 父亲李建国",
    born: "1962 – （在世）",
    origin: "河南周口 · 木工、装修工人",
    description:
      "他的工具箱比我的年纪还大，手上的老茧比任何勋章都亮。他话不多，却用三十年的早出晚归，把\"父亲\"两个字磨成了沉默的山。",
    creed: "不善言辞的人，把爱都做进了手艺里——一桌一椅、一砖一瓦，都是他说不出口的牵挂。",
    biography:
      "李建国1962年生于周口农村，十八岁跟师傅学木工，从此与刨花和钉子打了半辈子交道。九十年代他背着工具箱进城，从打家具到做装修，手上添了几十道疤，也一点点把家从土坯房搬进了城里的楼房。他不善表达，孩子考上大学的那个晚上，他在阳台上抽了一整包烟。\n\n如今六十多岁的他仍闲不住，小区里谁家的桌子腿松了、柜门掉了，都来找这位\"李师傅\"。他常说的一句话是：\"手艺不会骗人，你下多少功夫，它就还你多少实在。\"他鬓角已白，工具箱里的刨子却擦得锃亮。",
    archive: "私藏 NO. 002",
  },
  {
    id: "sample-teacher",
    src: "/images/private_teacher.jpg",
    category: "私人馆藏",
    title: "点灯的人 — 陈雨晴老师",
    born: "1988 – （在世）",
    origin: "云南昭通 · 乡村小学教师",
    description:
      "大学毕业后她回到大山里的小学，一守就是十二年。粉笔灰染白了她的指尖，却把一双双眼睛点亮成了星星。",
    creed: "教育不是注满一桶水，而是点燃一把火——山里的孩子眼里有光，大山就挡不住未来。",
    biography:
      "陈雨晴1988年生于昭通山村，是村里第一个考上师范大学的孩子。2011年毕业，她放弃了城里的教职，回到母校那间漏雨的小学。十二年里，她教过四百多个孩子，翻山家访磨破了十几双鞋，把三十多个学生送出了大山。\n\n她办的\"萤火虫图书角\"最初只有四十本书，如今已扩展到全乡七所学校。有人问她图什么，她指着教室后墙那行歪歪扭扭的字说：\"他们写——'老师，我长大也想成为你'。\"山里的夜很静，她的备课本上，灯光常常亮到深夜。",
    archive: "私藏 NO. 003",
  },
];

const EMPTY_FORM = {
  epithet: "",
  name: "",
  englishName: "",
  born: "",
  origin: "",
  description: "",
  creed: "",
  biography: "",
  src: "",
};

export default function PrivateGallery() {
  const [entries, setEntries] = useState<PrivateEntry[]>(SAMPLE_ENTRIES);
  const [selected, setSelected] = useState<PrivateEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries([...SAMPLE_ENTRIES, ...JSON.parse(raw)]);
    } catch {
      /* corrupted storage — start fresh */
    }
  }, []);

  const persist = (list: PrivateEntry[]) => {
    setEntries(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("persist failed:", err);
      alert("存储空间不足：图片过大，请换一张更小的照片。");
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale to a museum-cell-friendly size so localStorage survives
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const cvs = document.createElement("canvas");
        cvs.width = Math.round(img.width * scale);
        cvs.height = Math.round(img.height * scale);
        cvs.getContext("2d")!.drawImage(img, 0, 0, cvs.width, cvs.height);
        setForm((f) => ({ ...f, src: cvs.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return alert("请填写人物姓名。");
    if (!form.src) return alert("请上传一张画像照片。");
    const entry: PrivateEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src: form.src,
      category: "私人馆藏",
      title: form.epithet.trim()
        ? `${form.epithet.trim()} — ${form.name.trim()}`
        : form.name.trim(),
      englishName: form.englishName.trim() || undefined,
      born: form.born.trim() || undefined,
      origin: form.origin.trim() || undefined,
      description: form.description.trim(),
      creed: form.creed.trim() || undefined,
      biography: form.biography.trim() || undefined,
      archive: `私藏 NO. ${String(entries.filter(e=>!e.id.startsWith('sample-')).length + 1).padStart(3, "0")}`,
    };
    persist([...entries, entry]);
    setForm({ ...EMPTY_FORM });
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定将这具分身移出私人画廊吗？")) return;
    persist(entries.filter((e) => e.id !== id));
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        color: "#ece3cc",
        overflowX: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Memory backdrop — countless ordinary portraits forming history */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: "url(/images/private_memory_bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />
      {/* Readability veil */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(ellipse 95% 85% at 50% 40%, rgba(20,14,8,0.35) 0%, rgba(14,10,6,0.82) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Content wrapper above backdrop */}
      <div style={{ position: "relative", zIndex: 2 }}>
      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "26px 34px",
          background:
            "linear-gradient(180deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0) 100%)",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <span className="brand-marquee" style={{ fontSize: "20px" }}>
            数字分身画像馆
          </span>
          <span className="brand-marquee-sub">PRIVATE WING · 私人画廊</span>
        </Link>
        <Link
          to="/"
          style={{
            color: "#e8ddc4",
            textDecoration: "none",
            fontSize: "14px",
            transition: "opacity 0.3s ease",
          }}
        >
          返回门厅
        </Link>
      </div>

      {/* Intro */}
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "150px 40px 10px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#c9a55c",
            margin: "0 0 18px 0",
          }}
        >
          Private Wing
        </p>
        <h1
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3vw, 40px)",
            margin: "0 0 16px 0",
          }}
        >
          私人画廊
        </h1>
        <p
          style={{
            fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
            fontSize: "16px",
            lineHeight: 1.8,
            color: "rgba(236,227,204,0.7)",
            margin: 0,
          }}
        >
          主馆陈列历史的名人，这里收录你自己的选择——敬爱的长辈、同行者，
          或任何你想为之立像的人。上传一张照片，写下他的一生，
          这座侧厅的墙为他留一个位置。
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          maxWidth: "1360px",
          margin: "0 auto",
          padding: "48px 40px 120px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: "34px",
        }}
      >
        {/* Add card */}
        <button
          onClick={() => setAdding(true)}
          style={{
            aspectRatio: "4 / 5",
            background: "rgba(255,255,255,0.03)",
            border: "1.5px dashed rgba(201,165,92,0.45)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            color: "#c9a55c",
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(201,165,92,0.08)";
            e.currentTarget.style.borderColor = "rgba(201,165,92,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = "rgba(201,165,92,0.45)";
          }}
        >
          <span style={{ fontSize: "34px", fontWeight: 200 }}>＋</span>
          <span style={{ fontSize: "13.5px", letterSpacing: "0.12em" }}>
            添加画像
          </span>
        </button>

        {entries.map((e) => (
          <div key={e.id} style={{ position: "relative" }}>
            <div
              onClick={() => setSelected(e)}
              style={{
                cursor: "pointer",
                border: "1px solid rgba(201,165,92,0.35)",
                padding: "7px",
                background:
                  "linear-gradient(160deg, rgba(201,165,92,0.10), rgba(0,0,0,0.4))",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(ev) => {
                ev.currentTarget.style.transform = "translateY(-4px)";
                ev.currentTarget.style.boxShadow =
                  "0 18px 44px rgba(0,0,0,0.55), 0 0 22px rgba(201,165,92,0.18)";
              }}
              onMouseLeave={(ev) => {
                ev.currentTarget.style.transform = "translateY(0)";
                ev.currentTarget.style.boxShadow = "none";
              }}
            >
              <img
                src={e.src}
                alt={e.title}
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                }}
              />
              <div style={{ padding: "12px 6px 6px", textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    fontSize: "15.5px",
                    fontWeight: 700,
                  }}
                >
                  {e.title}
                </div>
                {e.born && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      opacity: 0.55,
                      marginTop: "5px",
                    }}
                  >
                    {e.born}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(e.id)}
              title="移出画像馆"
              style={{
                position: "absolute",
                top: "-9px",
                right: "-9px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "1px solid rgba(236,227,204,0.35)",
                background: "rgba(10,10,12,0.9)",
                color: "rgba(236,227,204,0.75)",
                fontSize: "13px",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p
          style={{
            textAlign: "center",
            marginTop: "-40px",
            paddingBottom: "80px",
            fontSize: "13px",
            opacity: 0.4,
          }}
        >
          侧厅的墙还空着——点击"添加画像"，为第一个人立像。
        </p>
      )}

      {/* Add modal */}
      {adding && (
        <div
          onClick={() => setAdding(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,7,10,0.9)",
            zIndex: 60,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            padding: "60px 24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              background: "#101318",
              border: "1px solid rgba(201,165,92,0.35)",
              padding: "40px 44px",
              height: "fit-content",
            }}
          >
            <h2
              style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: "24px",
                fontWeight: 700,
                margin: "0 0 6px 0",
              }}
            >
              添加画像
            </h2>
            <p
              style={{
                fontSize: "12.5px",
                opacity: 0.55,
                margin: "0 0 28px 0",
              }}
            >
              带 * 为必填。数据只保存在当前浏览器中。
            </p>

            {/* Portrait upload */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "1.5px dashed rgba(201,165,92,0.45)",
                padding: form.src ? "10px" : "34px",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: "22px",
                color: "#c9a55c",
              }}
            >
              {form.src ? (
                <img
                  src={form.src}
                  alt="预览"
                  style={{
                    maxHeight: "220px",
                    maxWidth: "100%",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <span style={{ fontSize: "13.5px", letterSpacing: "0.08em" }}>
                  ＋ 上传画像照片 *
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {(
              [
                ["name", "姓名 *", "如：祖母 · 王秀兰"],
                ["epithet", "代名词", "最能代表他/她的一个词，如：家里的灯塔"],
                ["englishName", "英文名（选填）", "如：Xiulan Wang"],
                ["born", "生卒/年代（选填）", "如：1938 – 2021"],
                ["origin", "身份（选填）", "如：江苏苏州人 · 小学教师"],
              ] as const
            ).map(([key, label, ph]) => (
              <label
                key={key}
                style={{ display: "block", marginBottom: "16px" }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    opacity: 0.6,
                    marginBottom: "7px",
                  }}
                >
                  {label}
                </span>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  style={inputStyle}
                />
              </label>
            ))}

            {(
              [
                ["description", "策展人短评（选填）", "一两句话，写在铭牌上"],
                ["creed", "一生要旨（选填）", "一句话概括这个人的一生"],
                ["biography", "人物生平（选填）", "他/她的故事，长短不限"],
              ] as const
            ).map(([key, label, ph]) => (
              <label
                key={key}
                style={{ display: "block", marginBottom: "16px" }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    opacity: 0.6,
                    marginBottom: "7px",
                  }}
                >
                  {label}
                </span>
                <textarea
                  value={form[key]}
                  placeholder={ph}
                  rows={key === "biography" ? 5 : 2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>
            ))}

            <div style={{ display: "flex", gap: "14px", marginTop: "26px" }}>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  background: "#c9a55c",
                  color: "#0c0d10",
                  border: "none",
                  padding: "13px 0",
                  fontSize: "14px",
                  letterSpacing: "0.14em",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                收入馆藏
              </button>
              <button
                onClick={() => setAdding(false)}
                style={{
                  background: "transparent",
                  color: "#ece3cc",
                  border: "1px solid rgba(236,227,204,0.35)",
                  padding: "13px 26px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageDetailOverlay
        image={selected}
        onClose={() => setSelected(null)}
      />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(236,227,204,0.22)",
  color: "#ece3cc",
  padding: "11px 14px",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
};
