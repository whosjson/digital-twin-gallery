# 数字分身画像馆 · 项目说明

> 一座没有实体围墙的博物馆，收藏人类文明中闪耀过的灵魂。

本文件夹包含两部分：**可直接打开的网站成品** 和 **可继续开发的项目源码**。

---

## 📁 目录结构

```
数字分身画像馆-完整交付/
├── 01-可直接打开网站/        # 网站成品（双击 index.html 即可使用，或部署到任意服务器）
│   ├── index.html            # 自包含主页（HTML + CSS + JS 全部内联，单文件即可运行）
│   ├── assets/               # 原始打包资源（app.js / index.css，已内联到 index.html，可删）
│   ├── audio/                # 背景音乐（3 首 MP3）
│   ├── data/                 # people.json（128 位人物完整档案数据，按需加载）
│   └── images/               # 所有画像与背景图（146 张）
│
└── 02-项目源码/              # React + TypeScript 项目源码（可继续开发）
    ├── index.html            # 入口 HTML
    ├── package.json          # 依赖清单
    ├── vite.config.ts        # Vite 构建配置
    ├── tsconfig*.json        # TypeScript 配置
    ├── public/               # 静态资源（构建时原样复制到 dist）
    │   ├── audio/            # 背景音乐
    │   ├── data/             # people.json 人物数据
    │   └── images/           # 画像与背景图
    └── src/                  # 源代码
        ├── main.tsx          # 应用入口（React 根组件挂载）
        ├── App.tsx           # 路由配置（门厅 / 三馆）
        ├── config.ts         # 站点配置 + 数据加载器（people.json 按需加载）
        ├── index.css         # 全局样式
        ├── pages/            # 页面组件
        │   ├── Lobby.tsx         # 门厅（三入口首页）
        │   ├── Home.tsx          # 历史人物画廊（3D 涡旋墙）
        │   ├── PrivateGallery.tsx# 私人画廊（可手动添加人物）
        │   ├── VirtualGallery.tsx# 虚拟 IP 画廊（3D 纵深走廊）
        │   └── Info.tsx          # 关于本馆
        ├── components/       # 通用组件
        │   └── ImageDetailOverlay.tsx  # 人物详情弹窗
        └── lib/              # 3D 引擎
            ├── VortexGallery.ts    # 涡旋墙引擎（three.js）
            └── VirtualCorridor.ts  # 纵深走廊引擎（three.js）
```

---

## 🚀 快速开始（继续开发）

### 环境要求
- Node.js 18 或更高版本

### 安装与运行

```bash
cd 02-项目源码

# 安装依赖
npm install

# 本地开发（热更新，打开 http://localhost:3000）
npm run dev

# 生产构建（输出到 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

### 构建后如何变成"单文件自包含 HTML"

项目构建后默认输出多个文件（app.js、chunk、css、图片等）。如果需要像 `01-可直接打开网站/index.html` 那样的**单文件自包含**版本（方便部署到对静态资源同步不稳定的平台），运行：

```bash
python3 ../内联打包脚本.py
```

（该脚本会把 app.js 和 index.css 直接内联进 index.html。脚本已附在本交付根目录。）

---

## 🏛️ 三个展厅说明

| 展厅 | 路由 | 说明 |
|------|------|------|
| **历史人物画廊** | `/celebrities` | 128 位历史名人 3D 涡旋墙，滚动驱动、悬停暂停、点击查看人物档案（生平/小传/一生要旨） |
| **私人画廊** | `/private` | 可手动添加普通人的画像与传记，数据存于浏览器 localStorage |
| **虚拟 IP 画廊** | `/virtual` | 二次元/虚构角色的 3D 纵深走廊，滚动前进、两侧画像、悬停打开 |

---

## ⚠️ 部署注意事项

如果你的目标平台（如某些 AI 网站生成器）对**静态资源同步不稳定**（例如只同步 HTML 但丢失 JS/JSON 文件），请使用 `01-可直接打开网站/` 里的**自包含单文件版**，或运行内联脚本把代码打包进单个 HTML。

---

## 📦 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **3D 渲染**: Three.js（涡旋墙 + 纵深走廊）
- **样式**: 原生 CSS（金色博物馆主题）
- **数据**: 128 位人物档案（`public/data/people.json` 按需加载）

---

*建造者：路明 · 最后更新：2026-10-02*
