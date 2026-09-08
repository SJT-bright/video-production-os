@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 视频制作 OS 桌面版
echo.
echo   正在启动 视频制作 OS 桌面版 ...
echo   创作浏览器支持 GPT、Gemini、Grok、Midjourney、Updream、小云雀、核绘和 LibTV。
echo.

where node.exe >nul 2>nul
if errorlevel 1 (
  echo   [错误] 没有找到 Node.js，无法校验桌面发行版。
  pause
  exit /b 1
)

if exist "dist\视频制作OS-win32-x64\视频制作OS.exe" (
  node ".\verify-desktop-build.cjs" >nul 2>nul
  if not errorlevel 1 (
    echo   正在打开已校验的独立桌面 APP ...
    start "" "dist\视频制作OS-win32-x64\视频制作OS.exe"
    exit /b 0
  )
  echo   检测到桌面发行版已过期，正在安全重建 ...
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo   [错误] 没有找到 npm，无法重建当前桌面发行版。
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo   首次运行：正在安装桌面版依赖，请保持网络连接 ...
  set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
  call npm.cmd install --no-audit --no-fund
  if not exist "node_modules\electron\dist\electron.exe" (
    node ".\node_modules\electron\install.js"
  )
  if not exist "node_modules\electron\dist\electron.exe" (
    echo   [错误] 桌面版依赖安装失败。
    echo   请稍后双击“安装桌面版依赖.bat”重试；不会自动跳转到网页兼容版。
    pause
    exit /b 1
  )
)

call npm.cmd run build:desktop
if errorlevel 1 goto desktop_failed

node ".\verify-desktop-build.cjs"
if errorlevel 1 goto desktop_failed

echo   正在打开刚生成的独立桌面 APP ...
start "" "dist\视频制作OS-win32-x64\视频制作OS.exe"
exit /b 0

:desktop_failed
echo.
echo   [错误] 当前桌面发行版未通过安全构建或启动前校验。
echo   已停止，不会自动打开系统浏览器，也不会用旧 EXE 覆盖新功能。
echo   诊断日志位于 %%APPDATA%%\视频制作 OS\logs\video-os.log 附近。
echo   如需主动使用网页兼容版，请单独双击“启动OS-浏览器版.bat”。
pause
exit /b 1
