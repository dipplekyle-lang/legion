@echo off
setlocal
cd /d "%~dp0"
title Legion setup
color 0b

echo.
echo    ========================================
echo        LEGION - setting up
echo    ========================================
echo.
echo    This gets Legion ready. It takes a few minutes
echo    and you only do it once. Sit back.
echo.

rem --- Legion runs on Python 3.12: use it if it's there (other versions are left alone) ---
py -3.12 -c "1" >nul 2>nul && (set "PY=py -3.12" & goto :haspy)
for /f "delims=" %%P in ('dir /b /s "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" 2^>nul') do set "PYEXE=%%P"
if defined PYEXE (set "PY="%PYEXE%"" & goto :haspy)

rem --- no Python 3.12: install it for them, no website, no clicking around ---
echo    [1/2] Installing Python 3.12 (one time)...
echo.
where winget >nul 2>nul
if errorlevel 1 goto :nowinget

winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements --scope user
echo.
echo    Python installed. Finishing up...

rem winget-installed Python isn't on PATH in THIS window yet - find it
for /f "delims=" %%P in ('dir /b /s "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" 2^>nul') do set "PYEXE=%%P"
if defined PYEXE (set "PY="%PYEXE%"" & goto :haspy)
py -3.12 -c "1" >nul 2>nul && (set "PY=py -3.12" & goto :haspy)

echo.
echo    Python was installed, but this window needs to restart to see it.
echo    Please CLOSE this window and double-click Setup again. That's the last step.
echo.
pause
exit /b

:nowinget
echo    This Windows is a bit older and can't install Python automatically.
echo    I've opened the download page. Install it, and on the first screen
echo    TICK the box "Add python.exe to PATH". Then run Setup again.
echo.
start https://www.python.org/downloads/
pause
exit /b

:haspy
echo    [2/2] Getting Legion ready...
echo.
%PY% setup.py
echo.
echo    Done. You can close this window.
pause
