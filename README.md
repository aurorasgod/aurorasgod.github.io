# Laplace's Notes

Laplace / Qimai Yan 的个人研究博客。使用 Astro 与 Markdown 管理文章；页面静态生成，热力图访问统计由 Cloudflare Worker + D1 保存。

## 本机运行

使用 Node.js 24 LTS。在项目目录执行：

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。修改文件会自动刷新。此模式只预览文章和排版；完整的访问统计预览需要下面的 Worker 启动方式。

```bash
npm run check
npm run build
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev:activity
```

## 修改个人信息与页面

- `src/site.ts`：网站名称、昵称、姓名、GitHub、邮箱和研究分类。
- `public/avatar.jpg`：头像。
- `src/styles/global.css`：配色、排版和手机适配。
- `src/pages/index.astro`：首页。
- `src/pages/about/index.astro`：个人介绍。
- `src/content/projects/`：项目介绍。

字体在 `src/styles/fonts.css`：网站标题、文章标题和正文一至六级小标题统一使用 Fraunces，中文使用 Noto Serif SC（思源宋体）。长段落和正文表格使用 Newsreader + Noto Serif SC，代码使用等宽字体。字体文件自托管，按 Unicode 分块加载，访问页面无需连接 Google Fonts。字体许可保存在 `FONT-LICENSES.txt`。

## 添加文章

复制 `templates/blog-post.md` 到 `src/content/blog/`，改成自己的英文文件名，例如 `my-reading-note.md`。模板默认是草稿，发布前设为 `publish: true`、`draft: false`，并填写当天日期。也可以直接新建如下文件：

```markdown
---
title: "我的论文阅读笔记"
description: "这篇笔记主要讨论什么。"
pubDate: 2026-10-07
category: embodied-ai
tags: [VLA, 阅读笔记]
publish: true
draft: false
example: false
featured: false
---

## 研究问题

正文写在这里。
```

分类可选 `embodied-ai`、`world-model`、`power-electronics`、`tools`。

- `publish` 默认是 `false`；设为 `true` 才能进入网站。
- `draft: true` 的文章，以及发布日期在未来的文章，不生成阅读页，不进入列表、搜索或 RSS。
- `example: true` 会显示“示例文章”标记。项目带有 4 篇演示文章，可编辑或移出 `src/content/blog/` 后换成自己的内容。
- `featured: true` 用于首页置顶；多个置顶时选择最新的一篇。
- 添加 `updatedDate: 2026-10-08` 可在文章显示修订日期。

文章标题、摘要、标签和正文进入全文搜索；列表分类数量与估算阅读时间在构建时生成。使用 `$...$` 和 `$$...$$` 写公式，三反引号写代码块。

## 从 Obsidian 整理文章

把准备公开的笔记复制到 `src/content/blog/`，补充上面的元数据：

1. 把 `[[另一篇笔记]]` 改为标准 Markdown 链接。
2. 把需要公开的图片复制到 `public/images/`，用 `![说明](/images/文件名.png)` 引用。
3. 给图表、引用补充必要的说明和来源。
4. 本地预览公式、代码与图片，然后提交。

`publish` 控制网页展示；GitHub 公开仓库里的所有已提交源文件仍可被访问，因此仓库中只放准备公开的内容。Obsidian 本地插件和 Codex 侧栏不会随网站发布。

## 发布到 aurorasgod.github.io

当前网站已经公开发布在 https://field-notes-research.gptplus6267.chatgpt.site 。下面的步骤将源码发布到你的 GitHub 账号，得到 https://aurorasgod.github.io 。只需要做一次，以后推送文章即可自动更新。

### 1. 创建仓库并下载到电脑

1. 登录 GitHub 的 aurorasgod 账号，选择 New repository。
2. 仓库名填写 aurorasgod.github.io，选择 Public，勾选 Add README，创建仓库。如果这个仓库已经存在，直接使用它。
3. 在 GitHub Desktop 登录同一账号，选择 File → Clone Repository → URL，填写 https://github.com/aurorasgod/aurorasgod.github.io.git ，选择本地保存位置，然后 Clone。
4. 记住这个新仓库的本地目录，以后文章都放在这里。

[GitHub 官方创建说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [GitHub Desktop 克隆说明](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)

### 2. 复制源码并推送

1. 解压提供的 Laplace-Notes-源码.zip，将 Laplace-Notes 文件夹内的源码复制到刚克隆的仓库目录，可以覆盖初始化的 README.md。
2. package.json、astro.config.mjs、src/、public/ 应直接位于仓库根目录；不要把整个 Laplace-Notes 文件夹嵌套在里面。
3. 在 Finder 按 ⌘⇧. 显示隐藏文件，确保一起复制 .github/ 和 .gitignore；保留克隆目录里原有的 .git，不要从其他目录复制 .git。
4. 回到 GitHub Desktop，填写提交说明，例如 Create personal blog，点击 Commit to main，然后 Push origin。

当前 Codex 工作目录绑定了 Sites 源码仓库。下载包不包含它的 Git 历史或登录凭据；按以上方式复制到新的 GitHub 克隆目录即可。不要在当前工作目录直接覆盖远程仓库地址。

### 3. 打开 GitHub Pages

1. 打开 GitHub 仓库，进入 Settings → Pages。
2. 在 Build and deployment 中将 Source 设为 GitHub Actions。
3. 打开 Actions → Publish personal site；如果第一次上传发生在启用 Pages 之前，点击 Run workflow，选择 main 后运行。
4. 等待 build 和 deploy 都成功，在 Settings → Pages 点击 Visit site，或打开 https://aurorasgod.github.io 。

源码包含 .github/workflows/deploy.yml，使用 Astro 官方发布动作；静态构建命令已配置为 npm run build:static。无需手动上传 dist，也无需 gh-pages 分支。之后每次推送 main 都会自动重新构建和发布。

[Astro 官方 GitHub Pages 部署说明](https://docs.astro.build/en/guides/deploy/github/)

### 4. 上传你自己的文章

**在电脑上写，使用 GitHub Desktop 发布：**

1. 在新仓库目录复制 templates/blog-post.md 到 src/content/blog/my-first-post.md。
2. 修改标题、摘要、日期、分类和正文；使用 ## 写二级标题，### 写三级标题。
3. 将 publish 改为 true、draft 改为 false。日期不能晚于发布当天。
4. 在 GitHub Desktop 查看修改，填写说明，Commit to main → Push origin。
5. 等待 Actions 成功，再打开网站的“文章”栏目。文件 my-first-post.md 对应 /blog/my-first-post/。

**直接在 GitHub 网页写：**

1. 打开仓库的 src/content/blog/ 目录，选择 Add file → Create new file，命名 my-first-post.md。
2. 复制模板，修改元数据并填入 Markdown 正文，将 publish 设为 true、draft 设为 false。
3. 点击 Commit changes，提交到 main，等待自动发布完成。修改已有文章时打开文件并点击编辑按钮。

**从 Obsidian 上传：**

将自己准备公开的 .md 笔记复制到 src/content/blog/，添加本文“添加文章”中的元数据，将双中括号链接换成 Markdown 链接。这样不需要迁移整个 Obsidian 仓库。

### 5. 插入图片与修改旧文章

图片放到 public/images/，在文章写：

~~~markdown
![图片说明](/images/my-figure.webp)
~~~

在 GitHub 网页也可以进入 public/images/ → Add file → Upload files 上传图片，然后提交。图片和文章都提交并推送后，会一起出现在下一次发布中。修订旧文章时添加或更新 updatedDate: YYYY-MM-DD，热力图会计入修订日期。

当前访问统计使用现有站点的 Worker + D1，已允许 aurorasgod.github.io 跨域访问。GitHub 工作流自动设置 PUBLIC_ACTIVITY_API，因此两个网址共用访问汇总。GitHub Pages 自身只托管静态页面。GitHub 的提交更新 GitHub 网站；当前 chatgpt.site 网站由 Codex 单独发布。更换自定义域名时还需更新 worker/activity.mjs 的允许来源。

### 6. 本地预览（可选）

安装 Node.js 24，在 GitHub 克隆目录执行：

~~~bash
npm ci
npm run dev
~~~

打开终端显示的地址查看文章。预览不会自动发布；仍需 Commit + Push。手动检查 GitHub 静态版本可以执行：

~~~bash
SITE_URL=https://aurorasgod.github.io BASE_PATH=/ PUBLIC_ACTIVITY_API=https://field-notes-research.gptplus6267.chatgpt.site npm run build:static
~~~

## 功能

首页置顶与最新笔记、主题目录、文章分类与标签、全文搜索、深浅主题、文章目录、公式与代码高亮、代码与文章链接复制、项目详情、RSS、站点地图、404 页面、手机导航、键盘搜索（⌘K / Ctrl+K）。主题目录的文章数量按公开文章自动生成。浅色背景纯白，深色背景纯深灰，强调色使用绿色。

排版参考了 [Paco Coursey](https://paco.me) 的留白、[Maggie Appleton](https://maggieappleton.com) 的主题组织，以及 [Anthony Fu](https://antfu.me) 的简洁导航；页面代码和布局独立编写。

GitHub Pages 仍然负责静态页面；工作流将访问统计连接到当前已发布网站的 API。该 API 允许 aurorasgod.github.io 跨域访问；如更换域名，应同步修改 worker/activity.mjs 中的允许来源及 PUBLIC_ACTIVITY_API。不要把 Worker 构建输出当作 GitHub Pages 页面上传。

## 更新热力图

首页展示最近 26 周，日期按北京时间（Asia/Shanghai）。方格颜色自动合并文章更新与全站页面访问，鼠标移入或键盘聚焦可查看日期、更新次数和访问次数。

- 更新：公开文章的 pubDate 和 updatedDate 自动生成；同一篇文章同一天只计一次。改正文后请更新 updatedDate，重新构建发布。草稿和未来文章不计入。
- 访问：所有页面在浏览器前台显示时向 /api/visit 上报；D1 持久保存按日汇总，所有访客共享。此指标是页面访问次数（PV），不是去重访客人数（UV）。同一标签页 30 秒内重复刷新同一页面不重复计数；后台预加载、常见爬虫不计入。
- 权重：每次更新贡献 4，访问贡献 log2(PV + 1)；权重按 0、2、4、7 分成五档，使流量不会淹没更新。强调色继承页面的 --accent，随深浅主题切换。
- 访问量从功能首次上线起统计，没有虚构历史。API 故障时显示“访问量暂不可用”，不会用本地或模拟数据充数。
- 只保存每日总数和短期随机事件 ID（24 小时内用于重试去重）；不保存 IP、访客身份或页面路径。

数据库定义：db/schema.ts。迁移：npm run db:generate。Sites 发布自动应用 drizzle/ 迁移；本地预览数据库独立于线上。

## 文章图片

将图片放到 public/images/ 后，在文章中写 ![图片说明](/images/photo.webp)。也可用标准 Markdown 引用外部 HTTPS 图片；本地素材更稳定。图片在正文自动限制宽度。普通项目仓库发布时图片路径需加仓库前缀，或用 Astro url() 辅助函数。

首次开始统计之前的日期显示“访问未统计”，而非将未知的历史访问量标记为零。
