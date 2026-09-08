---
name: 视频制作 OS
description: 面向 AI 短剧创作者的本地内容生产与资产索引后台
colors:
  ink: "#1d1d1f"
  work-surface: "#f5f5f7"
  sidebar: "rgba(246,246,248,0.82)"
  panel: "#ffffff"
  structure: "#2c2c2e"
  structure-soft: "#3a3a3c"
  accent: "#007aff"
  border: "rgba(60,60,67,0.18)"
  text-muted: "rgba(60,60,67,0.72)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, system-ui, sans-serif"
    fontSize: "clamp(30px, 3vw, 44px)"
    fontWeight: 680
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  control: "9px"
  card: "16px"
  hero: "24px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "36px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  navigation-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: 视频制作 OS

## Overview

**Creative North Star: "Mac 上的影视制作控制台"**

界面像一款真正的 macOS 专业生产工具：左侧 Source List 是稳定目录，中间是随任务切换的主工作区，必要时右侧 Inspector 承载镜头事实和逐镜提示词。首页只用真实项目、拆解、素材、成片和入库状态证明系统正在工作。

**Key Characteristics:**

- 固定 Source List、紧凑 Toolbar、Split View 与 Inspector。
- 真实数据驱动的统计、最近入库和状态提示。
- 高密度但克制的系统排版，清楚区分拆解、制作、资产和知识。
- 固定明亮的 macOS 工作台外观，同时尊重减少透明度、减少动态效果与增强对比度设置。

## Colors

采用 macOS 中性系统灰与 Apple 蓝强调色。绿色、橙色、红色只表达成功、待补输入与错误，不作为装饰。

**The Real State Rule.** 颜色永远辅助文字状态；在线、空库、失败和选中都必须有文字标签。

## Typography

优先使用 San Francisco／系统字体，中文回退到苹方。标题使用克制的系统字重与紧凑行距，正文保持易读；小型英文栏目标签只用于关键分区定位。

**The Operational Type Rule.** 页面标题、数据、文件名和动作优先，任何品牌文案都不能压过当前任务状态。

## Layout

宽屏采用 Source List + 主工作区 + 可选 Inspector；中等窗口把 Inspector 放到主区下方；窄窗口把侧栏变成抽屉。剧本拆解工作台固定使用“剧本库 → 分组/镜头大纲 → 镜头检查器”，让文件、结构和逐镜提示词同时可读。创作资产既可在资产中心使用全尺寸“剧本文件夹 Source List + 媒体网格”Split View，也可在创作浏览器中以浮层／占位面板打开，支持 360–760px 直接调宽和一键展开／还原。

## Elevation & Depth

以边框、色块和轻微结构阴影区分层级。常规卡片保持平整，只有抽屉、全局搜索、灯箱和临时导入状态浮在主界面之上。

**The System Material Rule.** 侧栏、Toolbar 和 Popover 可使用 macOS 系统材质感；内容卡片保持稳定实体表面。系统要求减少透明度时必须回退为不透明表面。

## Shapes

大结构使用克制的中等圆角，小控件使用较小圆角。交通灯只由 macOS 原生窗口提供，网页 DOM 不伪造；不模仿桌面图标或程序坞。

## Components

### Buttons

- 主按钮使用 Apple 蓝和白字，仅用于“进入创作”“送入创作工作台”等主要任务。
- 次按钮使用白底、结构边框和深色文字，用于扫描、导入与查看。
- 悬停不做漂浮式位移；键盘焦点始终显示清晰的蓝色外环。

### Cards / Containers

- hero 使用浅色系统材质和大圆角，承载当前流水线状态与两个主要入口。
- 统计卡和媒体卡保持白色平整表面，以边框区分；悬停时才出现轻微位移。
- 空状态使用浅灰绿底和虚线边框，明确说明数据为空的原因和下一步动作。

### Navigation

- 左侧导航按工作台、资产中心、交付、知识与规则和系统分组；创作资产、视频素材、音频素材与 Obsidian 资产同属资产中心，但不合并底层目录。
- 当前项使用系统 Apple 蓝、白字和 `aria-current="page"`；未选中项仍保持足够对比度。
- 窄窗口时侧栏变成可关闭抽屉，选择模块后自动收起。

### Inputs / Fields

- 搜索与筛选使用白色实体表面、结构边框和中等圆角。
- 输入框占位文案只承诺真实可搜索的内容类型。

### Script Breakdown Workbench

- Codex 只通过 `视频制作OS/data/script-breakdowns` 中的固定 Schema JSON 交接；界面显示格式校验和异常文件。
- 左栏按剧本与版本索引，中栏按七字段表演节拍分组呈现逐镜大纲，右栏检查剧情任务、连续性、生成工具、缺失输入、提示词和验收项。
- `ready` 镜头才显示“送入创作工作台”；`needs-input` 镜头只允许复制补全请求，不能出现伪完成提示词。

### Creator Address Bar

- 地址栏是桌面浏览器的一级操作，不是只读状态文案；必须支持键盘输入、Enter 提交、明确的「前往」按钮和 Escape 恢复当前地址。
- 加载状态使用文字地址旁的状态点表达；失败原因放在恢复条中，不用错误文案覆盖用户可编辑的网址。
- 当前平台名称保持为短标签，输入区域占据剩余宽度；中等窗口可隐藏平台短标签，但不能隐藏地址输入或提交动作。
- 主进程负责地址规范化和协议拒绝，渲染层只负责即时反馈，不能把前端校验当作安全边界。

### Creator Asset Panel

- 入口固定在创作浏览器顶部，并通过文字、选中状态和 `aria-pressed` 同时说明开关状态。
- 边栏内部按“布局方式 → 搜索 → 原始文件夹层级 → 图片网格”组织；不读取笔记内容重新分类。
- 图片卡片以拖拽为主要动作，同时提供“复制图片”和“在文件夹中显示”两条第三方网站不兼容时的降级路径。
- 浮层和占位是用户显式选择，不以含糊图标代替；最后状态和宽度保存在本机。
- 大量图片使用原生懒加载，超长中文文件名截断但通过完整路径提示保留上下文。

## Do's and Don'ts

### Do:

- **Do** 让每个统计卡、最近入库卡和状态文案都有真实数据来源。
- **Do** 用固定左侧导航保留全部现有模块，并让当前模块同时通过背景、文字和语义状态可辨认。
- **Do** 在资产页面只提供收集、索引、预览和管理动作。
- **Do** 让用户主动决定 Obsidian 图片何时进入第三方平台，并为原生拖拽失败提供复制和定位恢复动作。
- **Do** 让创作者可以像普通浏览器一样输入可信网址，并始终看见当前真实地址。

### Don't:

- **Don't** 展示不存在的 Remotion 源码、NAS 容量、项目数或成片数。
- **Don't** 在网页 DOM 里伪造 Mac 桌面、Dock 或交通灯；窗口交通灯由 Electron/macOS 原生提供。
- **Don't** 把视频素材、成片、Obsidian 图片资产和知识文档混成同一类内容。
- **Don't** 在边栏打开时自动上传、自动附加或自动修改任何 Obsidian 文件。
- **Don't** 把桌面启动失败静默改成打开系统浏览器，也不要允许危险协议进入原生网页视图。
