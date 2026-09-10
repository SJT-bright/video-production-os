# 全软件 3D 功能图标

2026-09-10 · 内置 imagegen 生成；未使用 CLI。

## 用途

共 10 张透明 PNG，统一采用圆润珍珠陶瓷、彩色珐琅、可见厚度与左上柔光。按 apple-design 材质深度原则，细小图标使用轻阴影，入口图标保留更完整的轮廓；不增加浮动动画，不改变窗口层级。

覆盖主导航、总览、图片／视频创作入口、剧本选择和拆解、Agent、知识库、媒体索引、音频预览、创作浏览器、拖入入口和创作资产库。返回、关闭、展开、搜索等操作符号保留清晰形状。所有用户素材和第三方网站画面保持原样。

所有文件均在本目录：

- [library-3d-v1.png](library-3d-v1.png)
- [video-3d-v1.png](video-3d-v1.png)
- [audio-3d-v1.png](audio-3d-v1.png)
- [document-3d-v1.png](document-3d-v1.png)
- [image-3d-v1.png](image-3d-v1.png)
- [studio-3d-v1.png](studio-3d-v1.png)
- [sparkle-3d-v1.png](sparkle-3d-v1.png)
- [knowledge-3d-v1.png](knowledge-3d-v1.png)
- [import-3d-v1.png](import-3d-v1.png)
- [film-3d-v1.png](film-3d-v1.png)

程序化使用入口：`ui-icons.js`；跨页面样式：`ui-icons.css`。

## 本次最终提示词

参考图：`video-3d-v1.png`，只用于材质、灯光与视角，不用于人物或内容。

### image

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A thick pearl-white squircle tile with a sapphire-blue raised landscape symbol: two simple rounded mountain peaks and one small sun. Enamel relief visibly protrudes from tile.
```

### studio

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A compact sculpted pearl-white creative browser window icon, sapphire-blue top bar, three tiny rounded buttons, pale-lavender vertical sidebar and a large blue translucent pane. Simplify to three broad panel shapes, no text, no tiny widgets. Browser window itself is the object, no extra enclosing tile.
```

### sparkle

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A thick lavender-violet translucent enamel four-point sparkle inset onto a pearl-white squircle tile. One confident sculpted star, no small surrounding stars or confetti.
```

### knowledge

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A compact open book with ivory layered pages, violet-blue cover visible beneath, soft amber bookmark. Near-frontal, visible thick page edges, no lettering or lines, book is the object, no additional tile.
```

### import

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A thick sapphire-blue downward arrow hovering just above a pearl-white rounded inbox tray. Keep them one compact combined icon. Blue enamel, ivory tray, clear depth, no extra tile.
```

### film

```text
Use case: stylized-concept. Create ONE isolated premium 3D icon for a macOS video creation application. Use the attached red play icon ONLY as a material, lighting and camera style reference; replace its symbol with the subject below. Same pearl ceramic and colored translucent enamel, rounded extruded thickness, soft upper-left studio highlights and restrained ambient occlusion. Almost frontal with slight elevated three-quarter view. Large simple silhouette clearly readable at 24–80 px. Centered square canvas, subject fills 80%, equal padding. TRUE TRANSPARENT alpha background, no colored background, no floor, no text, no labels, no branding, no humans, no scene, no scattered particles or speckles. Clean silhouette. Not flat vector or emoji.
Subject: A pearl-white and charcoal-blue 3D film clapperboard with slightly open hinged top and simple diagonal sapphire inlays. Body has one raised vermilion play triangle. No text, numbers or tiny writing. Clapperboard is the object, no enclosing tile.
```

此前四张图标的提示词见 [icons-3d-prompts.md](icons-3d-prompts.md)。
