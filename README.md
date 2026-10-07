# Laplace's Notes · Personal Blog

Laplace / Qimai Yan 的个人博客，分类为 **具身智能 / 电力电子 / 个人经历**。浅色纯白、深色纯深灰，强调色为绿色；演示文章已移除。

在线网址：<https://aurorasgod.github.io>。另一份 Sites 部署：<https://field-notes-research.gptplus6267.chatgpt.site>。

## 从 Obsidian 发布

Robotics 与 PowerElectronics 已安装 **Laplace Blog Publisher**，两个主页都提供 **发布文章** 入口。使用界面选择笔记，填写标题、摘要、英文文章地址、分类和日期，编辑独立发布稿，预览正文与附件，再确认公开并发布。

插件会转换内部图片引用、检查未公开笔记链接、本地构建、提交选中文章及其附件，并推送至 GitHub。随后 **检查部署** 查看 GitHub Pages 的发布结果。原笔记不修改；整个笔记库不会被上传。

源码及详细说明：[`integrations/obsidian/laplace-blog-publisher/`](integrations/obsidian/laplace-blog-publisher/README.md)。插件设置与发布稿只留在本地 Obsidian 库中。博客克隆目录移动后，需在插件设置中更新路径。

## 手动添加文章

复制 `templates/blog-post.md` 到 `src/content/blog/my-first-post.md`。填写元数据与正文：

```markdown
---
title: "我的文章"
description: "一两句话概括内容。"
pubDate: 2026-10-07
category: personal
tags: [记录]
publish: true
draft: false
featured: false
---

## 小标题

正文。
```

分类 ID：`embodied-ai`（具身智能）、`power-electronics`（电力电子）、`personal`（个人经历）。`publish` 默认 false，`draft: true` 和未来日期的文章不进入网站。修订时填写 `updatedDate: YYYY-MM-DD`，日期不应早于发布日期。`featured: true` 将最新的一篇置顶。

图片放入 `public/images/`，正文使用 `![图片说明](/images/photo.webp)`。标准 Markdown、数学公式 `$...$` / `$$...$$` 和代码块均可使用。

完成后，在 GitHub Desktop 查看差异，Commit → Push origin。`.github/workflows/deploy.yml` 会在 main 推送后自动构建、发布；无需上传 dist。公开仓库中的源文件本身也可公开访问，仓库只放可公开的材料。

## 本地开发与验证

使用 Node.js 24，在项目根目录执行：

```bash
npm ci
npm run dev
```

按终端提供的 localhost 地址预览。本地预览不会自动发布。

```bash
npm run check
npm run build
node scripts/verify.mjs
node --test tests/activity.test.mjs tests/publisher.test.cjs
```

GitHub 静态版使用 `npm run build:static`；工作流自动注入 GitHub 地址与统计 API 地址。Sites 使用 Worker 构建，由相应发布流程管理，两个网址分别部署。

## 修改网站

- `src/site.ts`：身份、简介和分类。
- `src/pages/index.astro`：首页。
- `src/pages/about/index.astro`：关于。
- `src/content/projects/`：项目介绍。
- `src/styles/global.css` / `notebook.css`：配色与排版。
- `public/avatar.jpg`：头像。

英文标题与小标题使用 Fraunces，正文使用 Newsreader；中文为 Noto Serif SC。字体自托管、按 Unicode 分块加载；许可见 `FONT-LICENSES.txt`。

## 更新与访问热力图

近 26 周的日历使用北京时间。公开文章的发布日期与修订日期自动生成更新记录；同篇同日只记一次。修订正文后应更新 `updatedDate`。没有文章时更新次数为 0，不使用演示数据。

访问为全站页面访问次数（PV），由 Cloudflare Worker + D1 持久保存，所有访客共享。GitHub Pages 调用既有 Sites API；新文章地址无需为统计单独重新部署 Worker。仅保存每日总数及 24 小时随机事件 ID，不保存 IP、身份或页面路径。同一标签页 30 秒内重复刷新同一页面不重计。

颜色权重为 `4 × 更新 + log2(PV + 1)`，按 0、2、4、7 分档。强调色跟随深浅主题。统计开始前的日期显示“访问未统计”；API 故障不会使用本地模拟数据。

数据库定义：`db/schema.ts`；迁移位于 `drizzle/`。本地完整 Worker 预览：

```bash
npm run build
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev:activity
```

更换自定义域名时需同步调整 `worker/activity.mjs` 的允许来源和 `PUBLIC_ACTIVITY_API`。不要将 Worker 构建输出作为 GitHub Pages 静态文件上传。
