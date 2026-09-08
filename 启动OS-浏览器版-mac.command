#!/bin/zsh
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "此启动器只能在 macOS 上使用。"
  exit 1
fi

cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。"
  exit 1
fi

node server.js --open
