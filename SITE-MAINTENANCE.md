# 网站维护

首页已经采用夜航设计。运行 `npm run dev` 后访问终端给出的根地址；旧 `/designs/nocturne/`、`/design-lab/` 和 `/design-lab/compare/` 跳转到首页，其余提案页面已移除。

## 导航与主题

- `SiteRuntime.astro` 在两套布局中接入 Astro ClientRouter，正文约 200ms 淡入淡出。共用 `SiteHeader.astro` 通过 `transition:persist` 常驻，栏目、品牌与工具区尺寸固定；预留滚动条空间，避免长短页面之间横移。只更新选中标识和当前页面的工具状态。
- `src/scripts/navigation.ts` 优先预取文章页 HTML、样式和脚本，五个公开栏目页采用当前标签页内 60 秒缓存。缓存失效或预取失败时回到 Astro 默认加载流程；省流量和 2G 连接跳过主动预取。等待网络时保留当前页面，超过 180ms 才显示顶部细进度条。外链、下载与非栏目页继续使用原有导航行为；减少动态效果时关闭过渡动画。
- `src/scripts/page-lifecycle.ts` 在每次页面进入时绑定功能，离开时取消全局监听、计时器和观察器。首页 WebGL 场景随页面释放，再进入时重新初始化；开场只在首次首页访问时播放。
- 配色统一位于 `src/data/palette.ts`，通用导航样式位于 `src/styles/theme.css`。首页与内页共用同一个明暗主题（用户选择优先，否则跟随系统），导航栏的主题按钮在所有页面可用；首页另有动态效果开关，两个按钮并排。浅色首页沿用同一张山景，叠加 `theme.css` 中 `--hero-tint` / `--hero-top` / `--hero-middle` / `--hero-bottom` 的浅色遮罩，呈晨雾效果，文字用深色；深色首页保持原样。未滚动时导航栏透明压在山景上，文字颜色在 `header.css` 中按主题分别指定。开场动画（`intro.css`）和卡牌纹样（`glass-orbit.ts` 的 `applyTheme`、`orbit-preview.ts`）同样按主题取色，WebGL 背景在主题切换时重绘。内页使用浅灰日间、炭灰夜间，统一绿色选中下划线、链接和强调标识。音乐台与评论区共用配色。

## 首页

- 页面：`src/layouts/Home.astro`；样式：`src/styles/home.css`。
- 身份和曲目信息：`src/data/home.ts`；头像：`public/avatar.jpg`。
- 科研成果：`src/data/research.ts`，由首页与 `/research/` 共用。目前为空，仅预留科研成果，不收录竞赛经历。
- 交互：`src/scripts/home.ts`。开场由 `src/components/HomeIntro.astro` 与 `src/styles/intro.css` 实现，山景分片、错峰字标与 Three.js 卡牌展开共同入场。每个标签页会话播放一次，可跳过；页脚旋转箭头可重播，减少动态效果时停用。近况、文章、项目使用支持键盘操作的标签页。
- 开场关闭与初始动态状态由 HTML 内联脚本先行设置，不依赖首页模块下载完成。正文默认可见，滚动进入动画只在观察到元素后执行。头像和背景图优先加载；手机画布限制像素预算，玻璃折射使用半分辨率缓冲。
- 近况区恢复原有 `ActivityHeatmap.astro`：近 26 周的文章更新和访问量，支持悬停与方向键。继续使用原统计 API；本地无 API 配置时只显示真实文章更新，并标注访问量暂不可用。
- 月份标签由 `activityMonths()` 计算，每个标签预留三周宽度，省略过短的首月标签并避让末月；统计、图例和日期详情独立排版。日期格本身不省略。
- 热力图使用统一的方格边长和间距，按设备像素取整，月份与星期共用网格尺寸；容器变化和浏览器缩放时重新计算，单格最大 12px，避免小数列宽造成视觉大小不一。未运行 JavaScript 时保留固定尺寸的完整日历。
- 中文界面使用自托管 Noto Sans SC Variable；标题和诗句保留现有衬线字体。字体随构建打包，访问不依赖 Google Fonts 网络。
- 卡牌：`src/scripts/glass-orbit.ts`。只有一条 requestAnimationFrame 渲染循环，跟随显示器刷新率逐帧绘制，不再固定抽帧至 60 FPS；按时间差更新轨道并平滑指针，离屏或后台停绘。移除了与倒角相交的描边，限制像素预算、使用整数画布尺寸，并收紧相机深度范围以减少抖动。WebGL 不可用时退回静态玻璃。头像与「L.」作为同一 Three.js 组参与深度遮挡和悬停反馈，前侧卡牌可以同时掠过二者。
- 环绕轨迹在 `src/lib/orbit-layout.mjs`：桌面 8 张、手机 6 张，沿真实倾斜圆周持续旋转，约 20 秒一周。后半圈从头像后上方经过，前半圈从头像下方、原问候语位置经过；前侧卡牌更大，后侧更小。卡牌允许掠过头像边缘，仅保留脸部中心与文字的空间；头像与卡牌共用 Three.js 深度缓冲，前侧玻璃可折射头像，后侧则被头像遮挡。DOM 头像保留链接、替代文本及加载失败时的显示。问候语移至左上方，大标题与头像之间留出通道。使用正交相机保持圆周投影稳定，圆周的 X、Y、Z 坐标满足同一半径约束；轨道有呼吸扩缩与鼠标角度响应。测试验证完整圆周、前后穿行、适量重叠和文字边界。
- 增量动效集中在 `src/styles/motion.css`（由 `home.css` 与 `global.css` 引入）：导航悬停下划线、主题切换时新主题从按钮处圆形展开（`theme.ts` 调用 View Transitions，不支持的浏览器直接切换）、首页文章/方向/项目卡片随所在区块依次入场、热力图按列浮现、项目卡片跟随指针的光斑、「继续探索」箭头轻微起伏；内页的标题与列表入场、文章阅读进度条（CSS 滚动时间线，不支持时不显示）、目录当前项标记过渡、项目页线稿描绘。全部受首页「动态效果」开关或系统「减少动态效果」控制。
- 通用交互样式：`src/styles/interactions.css`。图标悬停、按下反馈、箭头位移、项目轻抬起和标签页指示线均保持布局尺寸不变，并支持减少动态效果。

## 项目页线稿

项目列表（`src/pages/projects/index.astro`）每个项目左侧的线稿在 `src/components/ProjectSketch.astro`，按项目文件名（id）取图：研究工作台是文件树、论文、待办与热力图；具身智能是机械臂伸向杯子和它预想的未来画面；电力电子是 Buck 变换器及其驱动信号与电感电流纹波。画布 280 × 220，只写形状即可，组件会自动补上描绘动画需要的 `pathLength`。`sketch-fill` 为实心、`sketch-soft` 为浅线、`sketch-static` 为虚线；颜色仍由 `global.css` 中 `.project-visual` 的三套配色决定。新项目没有对应线稿时显示一张通用的笔记本。

## 学术主页

学术主页是一张可以单独转发的页面，有两个语言版本：英文在 `/academic/`（默认），中文在 `/academic/zh/`，右上角可以互相切换；发给只看中文的人时直接发中文地址。它参考常见的 GitHub 学术主页（academicpages、al-folio、Jon Barron 式单页）的内容顺序：姓名与单位、照片、简介、研究兴趣、论文、教育与实习经历、竞赛获奖、奖学金与荣誉、项目。

- 内容：`src/data/academic.ts`（姓名、单位、简介、研究兴趣、教育、实习、竞赛获奖 `awards`、奖学金与荣誉 `honors`、项目、更新日期）。每段文字写成 `{ en: '…', zh: '…' }`，两种语言必须同时改；页面上的固定用语（栏目名、按钮）在同一文件的 `academicLabels`。`photo` 填 `public/` 下的照片文件名后显示证件照，留空则不显示图片；`email` 填写后显示邮箱。论文列表取自 `src/data/research.ts`，为空时整节不显示。照片放在 `public/`，按 4:5 竖幅裁好（现为 720 × 900 的 `academic-photo.jpg`）。
- 页面：`src/layouts/Academic.astro`（两个语言共用），由 `src/pages/academic/index.astro`（英文）和 `src/pages/academic/zh/index.astro`（中文）分别调用；样式：`src/styles/academic.css`，英文的行距和栏宽用 `:lang(en)` 单独调整。
- 这一页是独立页面：没有音乐台、共用导航和动效，只用浅色，不接入 ClientRouter（站内指向它的链接带 `data-astro-reload`）。`scripts/verify.mjs` 以 `data-standalone-page` 标记识别并校验它保持独立。
- 「打印本页」调用浏览器打印，打印样式会隐藏工具栏并在外链后附上网址，可直接另存为 PDF。

## 音乐台

播放列表在 `src/data/home.ts` 的 `soundtracks` 数组，播放器在 `src/components/MusicStation.astro` 与 `src/scripts/music.ts`。原有 Beneath the Mask 雨天版由站点作者提供，保留在第一首。

所有页面顶部共用音乐图标和弹出播放器；支持原生 Popover 时使用原生行为，旧浏览器使用手动开关与焦点管理。面板默认隐藏，页面滚动后仍可访问。面板外点击、Esc 或关闭按钮均可收起，关闭面板不暂停播放。样式独立位于 `src/styles/music.css`。

支持上一曲、下一曲、曲目列表、播放、暂停、拖动进度、音量、静音和音量记忆。默认列表循环，支持切换单曲循环；手动切歌保留播放或暂停状态，点击列表曲目开始播放。初次访问不自动播放；只加载选中曲目。播放器随常驻导航栏保留，避免嵌套持久化重复移动音频节点；旧浏览器移动节点暂停音频时尝试恢复。整页刷新仍按稳定曲目 ID 保存选择、进度和静音状态，近期正在播放时尝试继续，浏览器阻止时显示“点击继续播放”。兼容旧版单曲进度记录，并提供系统媒体面板的播放、暂停与切歌操作。

当前收录站点作者提供的五首音频：Beneath the Mask 雨天版、Life Will Change、Tokyo Daylight、Ark、Rivers in the Desert，按此顺序播放。后续将提供的音频加入 `public/audio/` 并更新 `soundtracks` 即可；只有一首曲目时，上一曲和下一曲按钮自动禁用。

## 云端论文 PDF

入口：项目 → 具身智能研究&思考 → 论文资料。资料页位于 `/projects/robotics-notebook/library/`，首页没有直接入口；该页不进入站点地图，并标记 `noindex`。

`src/data/papers.json` 存储 Robotics 云端“附件/论文”目录中明确公开的 18 份 PDF：OneDrive 分享链接、站内副本地址、阅读页 slug 和 SHA-256。只复制清单内的 PDF 到 `public/papers/`，没有 Markdown 笔记、同步凭据或会过期的下载令牌。

列表默认打开站内 PDF.js 阅读器（`src/scripts/pdf-reader.ts`），支持翻页、页码、缩放、查找、旋转、全屏和下载，阅读器页面保留 OneDrive 备用入口。字体、字符映射和解码器由 `prepare-pdf-assets.mjs` 在 dev/build 前从锁定版本的 `pdfjs-dist` 复制，不依赖外部 CDN。阅读页不进入站点地图并标记 `noindex`。

这 18 份 PDF 已逐文件设为“任何人持链接可查看”，无需登录，不能修改云端原件；没有共享上级文件夹或整个 Obsidian 库。分享链接可被转发，深层路由本身不提供访问控制。需要撤回时，必须同时移除网站清单及 `public/papers/` 对应副本并重新发布，再删除 OneDrive 的分享链接；只删除云端分享不会移除已发布的网站副本。

更新引用：

```sh
node scripts/onedrive-papers.mjs "<本地 Robotics 库路径>" src/data/papers.json
node scripts/sync-paper-copies.mjs "<本地 Robotics 库路径>"
```

第一个脚本从本机 Remotely Save 配置读取连接信息，仅调用 Graph 的读取接口；只更新已批准清单，保留分享链接和站内副本元数据。第二个脚本只复制已列出的本地 PDF，校验路径、文件签名、云端记录大小与 SHA-256。云端授权过期时需先在插件中恢复连接；令牌不会写入网站或日志。`scripts/verify.mjs` 会核验部署副本的大小和哈希。

## 检查与发布

```powershell
npm run check
npm run build:static
$env:STATIC_DIR = 'dist'
node scripts/verify.mjs
```

本地预览不会发布。GitHub Pages 在 `main` 推送后由现有工作流构建。

设计参考：[Apple](https://www.apple.com/macbook-pro/)、[Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)、[菲比官方演示](https://www.youtube.com/watch?v=dHsB18XWojs)。山景为已有 Unsplash 设计素材，卡牌纹样由代码生成。

开场参考（2026-10-20 核查）：[Bruno Simon Folio 2019](https://github.com/brunosimon/folio-2019) 4,748 stars；[Folio 2025 的 Reveal.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/Reveal.js) 1,954 stars；[Anime.js 字标时间线示例](https://github.com/juliangarnier/anime/blob/master/examples/animejs-v4-logo-animation/index.js) 73,712 stars。借鉴分阶段揭示、场景入场和错峰节奏，本项目自行实现 CSS 关键帧与既有 Three.js 联动，没有复制这些项目的代码或素材，也未添加新的动画依赖。
