# Laplace's Notes · Personal Blog

Laplace / Qimai Yan 的个人博客，分类为 **具身智能 / 电力电子 / 个人经历**。浅色纯白、深色纯深灰，强调色为绿色；演示文章已移除。

在线网址：<https://aurorasgod.github.io>。另一份 Sites 部署：<https://field-notes-research.gptplus6267.chatgpt.site>。

## 从 Obsidian 发布

Robotics 与 PowerElectronics 已安装 **Laplace Blog Manager**，两个主页都提供 **网站管理** 入口。选择 Markdown 笔记，填写标题、摘要、分类和日期；网页标识自动生成，可修改。编辑独立发布稿，点击 **发布文章** 打开预览，再点 **确认发布并推送**。文章列表还可修改、删除和恢复已有网页。

插件会转换内部图片引用、检查未公开笔记链接、本地构建、提交选中文章及其附件，并推送至 GitHub。随后 **检查部署** 查看 GitHub Pages 的发布结果。原笔记不修改；整个笔记库不会被上传。

桌面 Obsidian 不一定继承终端代理；连接失败时在插件设置填写 **Git 代理**，并用 **检查 GitHub 连接** 验证。Git 代理仅作用于本插件的网络命令；拉取失败不会导出稿件，提交后的推送失败可 **重试推送**，无需重新发布。

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

**标签**：元数据填写 `tags: [VLA, 机器人学习]`；Obsidian 网站管理的标签栏也可填写 `#VLA #机器人学习` 或 `VLA, 机器人学习`。网站会显示可点击的 `#标签`，点击后精确筛选同标签文章。文章页提供“全部标签”选择框；搜索框与 ⌘K 全站搜索均支持 `#VLA`，也能将普通关键词和标签组合，例如 `训练 #VLA`。标签可与栏目分类一起筛选。

**Push 后的等待**：Push 只把源码交给 GitHub；Actions 随后下载源码、安装依赖、构建 HTML 与搜索索引、上传构建文件，最后部署至 Pages。部署结束前仍显示上一版。如果某一步失败，网站继续保留上一版。使用插件“检查部署”或仓库 Actions 查看状态；显示 success 后再刷新正式网址 `https://aurorasgod.github.io`。

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

## 文章评论

每篇公开文章末尾使用 [giscus](https://giscus.app/zh-CN) 评论，数据保存在本仓库的 [GitHub Discussions](https://github.com/aurorasgod/aurorasgod.github.io/discussions)。访客无需登录即可阅读，登录 GitHub 后可留言、回复、编辑自己的评论，支持 Markdown。维护者可在 GitHub 中管理、锁定讨论或处理不合适的留言。留言后直接更新，不需要 Push 或重新部署网站。

评论服务说明保留在此 README 中，网页不显示“由 giscus 提供支持”；自托管评论主题仅隐藏这条说明，保留评论数量、排序、登录及留言操作。

仓库需要开启 Discussions，并从 [giscus 官方安装页](https://github.com/apps/giscus/installations/new) 将应用安装到 **aurorasgod.github.io 这一个仓库**。所需权限仅为仓库元数据读取与 Discussions 读写，不需要源码写入权限。仓库和 Announcements 分类的公开 ID 已写入 `src/lib/comments.ts`；不在前端保存 GitHub Token。

评论以文章标识 `/blog/<slug>/` 关联，并严格匹配。修改标题、正文、域名或通过 Obsidian 重新发布同一标识的文章，原评论保留；改变网页标识则会使用另一条讨论。新文章会在首条评论时自动创建对应讨论。删除网页不会自动删除 GitHub 中的评论。

评论标题、正文、输入框使用网站已有字体，白色/深灰底色与绿色按钮随网站主题切换；接近文章末尾才加载评论，不阻塞正文。网络失败时可重新加载，或从“GitHub 讨论”打开仓库。`src/pages/comments/[theme].css.ts` 输出自托管评论主题；`giscus.json` 限定正式网址与本地预览来源，更换域名时同步更新该文件。

编辑器使用中性细边框标识输入焦点，保留键盘导航的可见焦点；输入与预览采用相同的基础高度，短文本切换不会让下方留言跳动。按钮只过渡颜色，不改变尺寸；手机输入字号避免聚焦时自动放大，减少动态效果设置会关闭这些过渡。明暗主题通过 giscus 消息更新，不重新创建评论框或清空已输入的文字。评论主题按样式内容生成版本号，部署后自动使用新样式。

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
