#!/bin/zsh
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "此安装器只能在 macOS 上使用。"
  exit 1
fi

cd -- "$(dirname -- "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "没有找到 npm。请先安装 Node.js 22.12 或更高版本。"
  exit 1
fi

echo "正在安装视频制作 OS 的 macOS 构建依赖…"
npm ci --no-audit --no-fund
env NODE_USE_ENV_PROXY=1 npx install-electron --no
case "$(uname -m)" in
  arm64) arch="arm64" ;;
  x86_64) arch="x64" ;;
  *) echo "不支持的 macOS CPU 架构：$(uname -m)"; exit 1 ;;
esac
npm run build:mac -- --arch "$arch"
echo "构建完成。现在可以双击“启动OS-mac.command”或直接打开 dist 内的 .app。"
