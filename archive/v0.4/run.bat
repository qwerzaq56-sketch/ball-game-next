@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    echo Starting local server with Python...
    echo Open http://localhost:8000 in your browser.
    python -m http.server 8000
    goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Starting local server with Python launcher...
    echo Open http://localhost:8000 in your browser.
    py -m http.server 8000
    goto :end
)

where npx >nul 2>nul
if %errorlevel%==0 (
    echo Python was not found, but Node.js is available.
    echo Starting local server with "npx serve"...
    echo Open the URL it prints ^(usually http://localhost:3000^) in your browser.
    npx --yes serve -l 8000 .
    goto :end
)

echo.
echo Neither Python nor Node.js was found on this PC.
echo Install Python from https://www.python.org/downloads/ ^(check "Add to PATH" during setup^)
echo and run this script again, or open this folder with any other local static file server.
echo.
pause
exit /b 1

:end
pause
