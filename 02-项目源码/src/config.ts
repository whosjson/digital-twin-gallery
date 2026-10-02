// 人物数据已拆分为 public/data/people.json 按需加载，避免人物生平文字
// 全部打进 JS bundle（这是此前 bundle 过大导致加载失败的根因）。

export interface SiteConfig {
  language: string;
  brandName: string;
  copyright: string;
  builder: string;
  lastUpdated: string;
}

export interface NavigationConfig {
  infoLinkLabel: string;
}

export interface ContactEntry {
  label: string;
  value: string;
  href?: string;
}

export interface InfoPageConfig {
  backLinkLabel: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  contactLabel: string;
  contactEntries: ContactEntry[];
}

export interface OverlayConfig {
  frameDetailLabel: string;
  fileLabel: string;
  seriesLabel: string;
  closeLabel: string;
}

export interface ImageItem {
  src: string;
  category: string;
  title: string;
  description: string;
  born?: string;
  origin?: string;
  alias?: string;
  creed?: string;
  englishName?: string;
  biography?: string;
  highlight?: string;
  shadow?: string;
  era?: string;
  archive?: string;
}

export interface GalleryConfig {
  images: ImageItem[];
}

export const siteConfig: SiteConfig = {
  language: "zh-CN",
  brandName: "数字分身画像馆",
  copyright: "© 2026 数字分身画像馆",
  builder: "路明",
  lastUpdated: "2026-10-02",
};

export const navigationConfig: NavigationConfig = {
  infoLinkLabel: "关于本馆",
};

export const infoPageConfig: InfoPageConfig = {
  backLinkLabel: "返回展厅",
  eyebrow: "关于 — 人类数字分身画像馆",
  title: "把每一个有趣的灵魂，铸造成永不褪色的数字分身。",
  paragraphs: [
    "这是一座没有实体围墙的博物馆。我们不收藏文物，而是收藏\"人\"——用数据与想象，为人类文明中那些闪耀过的灵魂重建数字分身。每一幅画像都不是对历史的复制，而是一次重新点亮：古典油画的肌理之下，像素与光在暗处流动，仿佛他们仍在思考。",
    "展厅中央是一面永不停歇的涡旋之墙。滚动，时间便开始流转；鼠标悬停，涡旋会为你屏息静立，中央画像随之亮起金色的高光轮廓；点击任何一幅画像，灯光聚焦，铭牌亮起——档案里躺着他的生卒与国籍，一段约千字的生平，以及右侧那句\"一生要旨\"，是我们替他做的最长情的总结。",
    "目前馆内共陈列一百二十八位馆藏，按九个系列分厅而立：十九位大科学家、十二位大作家、八位大艺术家、八位大音乐家、四位大商人、四位大工程师、四位大军事家、四位大预言家，以及跨越时代的华夏群像、女性先驱、银幕传奇与体坛之星——从阿基米德到吴健雄，从荷马到李清照，从巴赫到邓丽君，再到在世的乔丹、梅西与马斯克，人类三千年的智识与勇气，都挂在这面墙上。",
    "而这座馆真正的主角，是你。旁边的\"私人画廊\"永远为普通人留着一面墙——敬爱的长辈、同行者，或任何你想为之立像的人。上传一张照片，写下他的一生，让认真活过的每一个你，都成为馆藏的一部分。",
  ],
  contactLabel: "联系本馆",
  contactEntries: [
    {
      label: "馆长信箱",
      value: "curator@twin-gallery.art",
      href: "mailto:curator@twin-gallery.art",
    },
    {
      label: "展厅",
      value: "线上常设展厅\n7×24 小时开放",
    },
    {
      label: "分身定制",
      value: "预约属于你的数字分身画像",
      href: "mailto:curator@twin-gallery.art?subject=数字分身定制预约",
    },
    {
      label: "合作洽谈",
      value: "美术馆 / 品牌联名\n请来信说明来意",
    },
  ],
};

export const overlayConfig: OverlayConfig = {
  frameDetailLabel: "馆藏画像",
  fileLabel: "档案编号",
  seriesLabel: "所属系列",
  closeLabel: "关闭",
};

// ── 人物数据：从 people.json 异步加载 ──────────────────────────────
let cachedPeople: ImageItem[] | null = null;
let loadPromise: Promise<ImageItem[]> | null = null;

export async function loadPeople(): Promise<ImageItem[]> {
  if (cachedPeople) return cachedPeople;
  if (loadPromise) return loadPromise;
  loadPromise = fetch("/data/people.json")
    .then((r) => {
      if (!r.ok) throw new Error(`people.json HTTP ${r.status}`);
      return r.json() as Promise<ImageItem[]>;
    })
    .then((list) => {
      cachedPeople = list;
      return list;
    })
    .catch((err) => {
      console.error("加载人物数据失败:", err);
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

export const galleryConfig: GalleryConfig = {
  images: [],
};
