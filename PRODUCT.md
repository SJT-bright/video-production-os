# Product

<!-- impeccable:product-schema 1 -->

## Platform

macOS desktop (Electron) as the primary product, with a local-web development preview and a Windows compatibility build

## Users

主要用户是本项目创作者本人，在 Mac 本机长期制作 AI 青春校园短剧，需要同时管理 Codex 剧本拆解、Seedance／Grok 逐镜生产、图片设计、网页生成平台、项目知识和本地媒体文件。

## Product Purpose

视频制作 OS 是青春校园短剧项目的本地生产中枢。它把 Codex 固定格式剧本拆解、逐镜提示词、创作入口、项目进度、成片、视频与音频素材、Obsidian 资产、蒸馏文档和 Agent 规则放在同一个可检索界面中；成功标准是用户能从一段剧本继续到可生成镜头，并能找到真实资产与确认归档状态。

## Positioning

产品不是通用网盘，也不是单一生成器。它以本地文件夹、固定 Schema JSON 和 Obsidian 的真实层级为权威索引，通过独立 Electron Mac 应用承接 GPT、Gemini、Grok、Midjourney、Updream、小云雀、核绘、LibTV 及用户手动输入的可信网页，并把下载结果归档回项目。Codex 集成采用可审计的本地文件桥接，不抓取聊天窗口，也不假装存在未经授权的 Codex IPC。

## Operating Context

- 当前项目根目录由应用包相对位置解析；本机示例为 `/Users/.../青春校园短剧`。
- 视频与音频素材权威来源：项目根目录下的 `素材库`。
- 生成时复用的图片、音频、视频和文档资产：项目根目录下的 `创作资产库/<剧本>/<子文件夹>`。
- 两者在界面上统一归入“资产中心”，但继续使用独立目录、权限和生命周期：创作资产是生成前输入，素材库是生成后输出。
- 剧本拆解权威交接目录：`视频制作OS/data/script-breakdowns`。
- 人物、服装、场景、色卡和图片资产由当前 Obsidian Vault 只读索引。
- 主要视频生成方式是 Seedance；当前没有 Remotion 生产内容。
- 图片设计和视频设计是两套模式，共享 GPT 登录环境，但提示词、平台和下载归档链路各自独立。

## Capabilities and Constraints

- 必须保留剧本拆解工作台、创作浏览器、图片/视频模式、镜头台账、素材库、音频库、Obsidian、项目知识、Agent 与规则、搜索、预览、收藏、评分、成片标记和 Finder 定位。
- Codex 拆解必须遵循 `SCRIPT-BREAKDOWN-PROTOCOL.md`；格式错误、缺少真实尾帧或关键输入的镜头不能伪装成 ready 提示词。
- 资产模块只负责收集、索引、预览和管理，不把资产自动作为生成辅助输入。
- 成片只由用户明确标记为成片的视频构成，不能按扩展名自动推断。
- 首页数字和卡片必须来自真实扫描结果；没有数据时显示真实空状态，不展示虚构 Remotion 内容或示例统计。
- Web 版提供数据管理；真实内嵌网页与下载路由依赖 Electron 桌面版。
- Electron 创作浏览器提供用户主动控制的 Obsidian 图片边栏：可关闭、以浮层覆盖平台，或以占位方式缩窄平台；边栏只读，只有用户拖拽、复制或定位时才使用图片，不自动把资产注入生成上下文。
- 桌面创作浏览器必须提供可编辑地址栏；只接受 `http/https`，省略协议时安全补全，危险协议、超长地址和含凭据 URL 必须在主进程拒绝。
- `启动OS.bat` 与发行 EXE 不得自动调用系统浏览器；网页兼容版只能通过独立入口启动。

## Brand Commitments

- 产品名称使用“视频制作 OS”。
- 界面采用 macOS 原生生产工具语法：系统 Source List、紧凑 Toolbar、Split View、Inspector、Apple 蓝强调色与系统材质。
- Electron 使用 macOS 原生 inset 标题栏和系统交通灯；网页 DOM 不伪造交通灯，也不模仿 Finder 桌面或 Dock。
- 界面跟随系统深浅色、减少动态效果、减少透明度与增强对比度偏好。

## Evidence on Hand

- 本地扫描 API、素材元数据、Obsidian 目录树、Agent 经验 JSON 和蒸馏文档均已存在。
- Electron 创作浏览器及图片/视频双模式已存在。
- 项目当前可能没有视频或音频素材，因此空状态是正常且必须支持的真实状态。
- 没有可证明的 NAS 容量和 Remotion 资产数据，界面不得伪造。

## Product Principles

1. 真实数据优先于展示效果。
2. 制作、项目、成片、素材与知识各归其位。
3. 收集索引与生成辅助严格分离；只有通过门禁的逐镜提示词才能送入创作工作台。
4. 高频工作从首页一步到达，低频维护动作保持可见但不抢主位。
5. 本地文件和 Obsidian 是权威来源，界面不偷偷复制或改写原始资产。

## Accessibility & Inclusion

所有导航、筛选、折叠卡片和主要动作必须可用键盘操作；焦点清晰，在线、扫描、选中等状态不得只依赖颜色表达；窄窗口和高系统缩放下仍应可操作。
