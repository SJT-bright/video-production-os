@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 视频制作 OS 浏览器兼容版
echo.
echo   正在启动 视频制作 OS 浏览器兼容版 ...
echo   此版本保留资产管理，但不提供第三方网页内嵌。
echo.
node server.js --open
pause
