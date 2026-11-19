@echo off
cd /d "%~dp0"
title Namecard Drive Sync
node scripts\namecard-sync-worker.mjs
pause
