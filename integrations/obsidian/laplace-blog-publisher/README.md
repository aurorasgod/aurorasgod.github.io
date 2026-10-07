# Laplace Blog Manager 1.1.1

在 Obsidian 内管理 `aurorasgod.github.io` 的文章，兼容 Robotics 和 PowerElectronics 的研究主页。

## 使用

在设置 → 第三方插件中启用 **Laplace Blog Manager**，再点击研究主页的 **网站管理**、左侧地球图标，或运行命令 **打开网站管理**。

- **从笔记新建**：选 Markdown 笔记，填写标题、摘要和分类；网页标识自动生成，可修改；发布稿独立保存，原笔记不变。
- **文章**：直接读取博客仓库 `src/content/blog`，两个 Obsidian 库显示同一份文章列表，支持搜索和刷新。点击文章可修改标题、分类、摘要、标签、日期、置顶及正文。已有地址保持不变。
- **发布文章/发布修改**：先打开预览，点击预览窗口中的 **确认发布并推送**，插件将稿件写入 `src/content/blog/<网页标识>.md`，构建通过后执行 Git add、commit、push，GitHub Pages 自动部署。**预览**也可打开同一窗口。按钮始终可点击，表单问题显示在界面中。
- **删除文章**：确认后移除网页，保留原笔记及所有附件。在博客仓库 `.git/laplace-blog-trash` 留存恢复副本，不上传这份副本。
- **恢复列表**：打开恢复稿，确认预览并推送后重新上线。如原地址已存在，禁止覆盖。
- **保存编辑稿**：只保存本地插件草稿，不更新网页。切换文章时会自动保存。
- **重试推送**：推送失败时重用同一提交；**检查部署**查看 GitHub Actions 结果。

管理范围为博客文章页。首页、关于页和项目页仍由网站源码定义。

## 设置

博客仓库目录：`/Users/laplace/Documents/GitHub/aurorasgod.github.io`

Git：`/usr/bin/git`；Node.js：`/usr/local/bin/node`。沿用本机 Git 登录及权限，不保存 GitHub token。网站依赖须已安装。仓库须在 main 分支且没有其他未提交或未推送修改；插件不会强制推送或自动合并。

已有公开图片保留，新附件仅导出当前稿明确引用的文件。未公开笔记的内部链接默认阻止发布，也可明确转成纯文字；不会复制关联笔记正文。上传前须检查正文和附件。

## 修复加载失败

Obsidian 提供的 `require` 从应用目录解析路径，直接 `require('./core.cjs')` 会导致加载失败。1.1.0 将核心代码内联到 `main.js`，运行时仅依赖 Obsidian 与系统 Node/Electron 模块。

修改 `main.source.cjs` 或 `core.cjs` 后运行：

```sh
node build.cjs
```

安装文件为 `manifest.json`、生成的 `main.js`、`styles.css`。插件 ID 保持 `laplace-blog-publisher`，旧设置和主页入口继续兼容。

## 1.1.1 修复

原“文章地址”改为“网页标识”，显示真实保存路径，并提供“自动生成”。没有设置网页标识的笔记会生成稳定标识；旧草稿误填的 Markdown 完整路径会自动转换。输入格式在访问文件系统前验证，避免显示不明确的“无效的导出路径”。

发布按钮直接打开预览；移除表单里的独立确认开关。预览窗口确认后才写入博客仓库和启动 push，不会上传整个 Obsidian 仓库。输入错误、仓库冲突、构建失败或推送失败均显示进度或可操作的提示。
