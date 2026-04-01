@echo off
setlocal enabledelayedexpansion
cd /d "C:\Users\student\govnobot"

REM Load .env file if it exists
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" (
      set "%%A=%%B"
    )
  )
)

REM Run Node.js with the bot script
"C:\Program Files\nodejs\node.exe" "C:\Users\student\govnobot\src\index.js"

"
