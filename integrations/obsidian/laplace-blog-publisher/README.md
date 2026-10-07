# Laplace Blog Manager 1.1.0

在 Obsidian 内管理 `aurorasgod.github.io` 的文章，兼容 Robotics 和 PowerElectronics 的研究主页。

## 使用

在设置 → 第三方插件中启用 **Laplace Blog Manager**，再点击研究主页的 **网站管理**、左侧地球图标，或运行命令 **打开网站管理**。

- **从笔记新建**：选 Markdown 笔记，填写标题、地址、摘要和分类；发布稿独立保存，原笔记不变。
- **文章**：直接读取博客仓库 `src/content/blog`，两个 Obsidian 库显示同一份文章列表，支持搜索和刷新。点击文章可修改标题、分类、摘要、标签、日期、置顶及正文。已有地址保持不变。
- **预览 → 确认公开 → 发布文章/发布修改**：构建通过后提交并推送，GitHub Pages 自动部署。
- **删除文章**：确认后移除网页，保留原笔记及所有附件。在博客仓库 `.git/laplace-blog-trash` 留存恢复副本，不上传这份副本。
- **恢复列表**：打开恢复稿，预览并发布后重新上线。如原地址已存在，禁止覆盖。
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
