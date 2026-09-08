#!/bin/zsh
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "此启动器只能在 macOS 上使用。"
  exit 1
fi

cd -- "$(dirname -- "$0")"
case "$(uname -m)" in
  arm64) arch="arm64" ;;
  x86_64) arch="x64" ;;
  *) echo "不支持的 macOS CPU 架构：$(uname -m)"; exit 1 ;;
esac

app_path="dist/视频制作 OS-darwin-${arch}/视频制作 OS.app"
if [[ -d "$app_path" ]] && node verify-mac-build.cjs --arch "$arch" >/dev/null 2>&1; then
  echo "已验证当前 macOS App 与源码一致。"
else
  if ! command -v npm >/dev/null 2>&1; then
    echo "没有找到 npm。请先安装 Node.js，再双击“安装桌面版依赖-mac.command”。"
    exit 1
  fi
  echo "正在为 ${arch} 生成独立 macOS App…"
  npm run build:mac -- --arch "$arch"
fi

if [[ ! -d "$app_path" ]]; then
  echo "macOS App 构建未完成，已停止，不会自动打开网页兼容版。"
  exit 1
fi

node verify-mac-build.cjs --arch "$arch"

open "$app_path"
