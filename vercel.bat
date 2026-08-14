@echo off
REM vercel wrapper with hostname patch
set "NODE_OPTIONS=--require ../clasp-fix.cjs"
if exist "%APPDATA%\npm\vercel.cmd" (
  call "%APPDATA%\npm\vercel.cmd" %*
) else (
  call "%ProgramFiles%\nodejs\npx.cmd" vercel %*
)
