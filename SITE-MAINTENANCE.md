# 网站维护

首页已经采用夜航设计。运行 `npm run dev` 后访问终端给出的根地址；旧 `/designs/nocturne/`、`/design-lab/` 和 `/design-lab/compare/` 跳转到首页，其余提案页面已移除。

## 导航与主题

- `SiteRuntime.astro` 在两套布局中接入 Astro ClientRouter，正文约 200ms 淡入淡出。共用 `SiteHeader.astro` 通过 `transition:persist` 常驻，栏目、品牌与工具区尺寸固定；预留滚动条空间，避免长短页面之间横移。只更新选中标识和当前页面的工具状态。
- `src/scripts/navigation.ts` 优先预取文章页 HTML、样式和脚本，五个公开栏目页采用当前标签页内 60 秒缓存。缓存失效或预取失败时回到 Astro 默认加载流程；省流量和 2G 连接跳过主动预取。等待网络时保留当前页面，超过 180ms 才显示顶部细进度条。外链、下载与非栏目页继续使用原有导航行为；减少动态效果时关闭过渡动画。
- `src/scripts/page-lifecycle.ts` 在每次页面进入时绑定功能，离开时取消全局监听、计时器和观察器。首页 WebGL 场景随页面释放，再进入时重新初始化；开场只在首次首页访问时播放。
- 配色统一位于 `src/data/palette.ts`，通用导航样式位于 `src/styles/theme.css`。首页固定深色山景，不修改阅读主题偏好；内页按用户选择或系统设置使用浅灰日间、炭灰夜间，统一绿色选中下划线、链接和强调标识。音乐台与评论区共用配色。

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
- 通用交互样式：`src/styles/interactions.css`。图标悬停、按下反馈、箭头位移、项目轻抬起和标签页指示线均保持布局尺寸不变，并支持减少动态效果。

## 音乐台

播放列表在 `src/data/home.ts` 的 `soundtracks` 数组，播放器在 `src/components/MusicStation.astro` 与 `src/scripts/music.ts`。原有 Beneath the Mask 雨天版由站点作者提供，保留在第一首。

所有页面顶部共用音乐图标和弹出播放器；支持原生 Popover 时使用原生行为，旧浏览器使用手动开关与焦点管理。面板默认隐藏，页面滚动后仍可访问。面板外点击、Esc 或关闭按钮均可收起，关闭面板不暂停播放。样式独立位于 `src/styles/music.css`。

支持上一曲、下一曲、曲目列表、播放、暂停、拖动进度、音量、静音和音量记忆。默认列表循环，支持切换单曲循环；手动切歌保留播放或暂停状态，点击列表曲目开始播放。初次访问不自动播放；只加载选中曲目。播放器随常驻导航栏保留，避免嵌套持久化重复移动音频节点；旧浏览器移动节点暂停音频时尝试恢复。整页刷新仍按稳定曲目 ID 保存选择、进度和静音状态，近期正在播放时尝试继续，浏览器阻止时显示“点击继续播放”。兼容旧版单曲进度记录，并提供系统媒体面板的播放、暂停与切歌操作。

当前收录站点作者提供的五首音频：Beneath the Mask 雨天版、Life Will Change、Tokyo Daylight、Ark、Rivers in the Desert，按此顺序播放。后续将提供的音频加入 `public/audio/` 并更新 `soundtracks` 即可；只有一首曲目时，上一曲和下一曲按钮自动禁用。

## 云端论文 PDF

入口：项目 → 具身智能研究&思考 → 论文资料。资料页位于 `/projects/robotics-notebook/library/`，首页没有直接入口；该页不进入站点地图，并标记 `noindex`。

`src/data/papers.json` 存储 Robotics 云端“附件/论文”目录中明确公开的 18 份 PDF 引用，只保留文件信息与 OneDrive `1drv.ms` 分享链接。不包含 Markdown 笔记、同步凭据或会过期的预授权下载地址。

这 18 份 PDF 已逐文件设为“任何人持链接可查看”，无需登录，不能修改云端原件；没有共享上级文件夹或整个 Obsidian 库。分享链接可被转发，深层路由本身不提供访问控制。需要撤回时，在 OneDrive 中对相应 PDF 打开“管理访问权限”，删除对应的“任何人可查看”链接，并移除网站引用。

更新引用：

```sh
node scripts/onedrive-papers.mjs "<本地 Robotics 库路径>" src/data/papers.json
```

此脚本从本机 Remotely Save 配置读取连接信息，仅调用 Graph 的读取接口。目标清单为 `anonymous-view` 时，只更新已经列出的文件并保留分享链接，不自动加入或公开新文件。授权过期时需先在插件中恢复连接；脚本不会把令牌写到文件或日志。

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
