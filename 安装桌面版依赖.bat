@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 安装 视频制作 OS 桌面版依赖
echo.
echo   正在安装 Electron 桌面运行环境 ...
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm.cmd install --no-audit --no-fund
if not exist "node_modules\electron\dist\electron.exe" (
  node ".\node_modules\electron\install.js"
)
if errorlevel 1 (
  echo   安装失败，请检查网络后重试。
) else (
  echo   安装完成，现在可以双击“启动OS.bat”。
)
pause
