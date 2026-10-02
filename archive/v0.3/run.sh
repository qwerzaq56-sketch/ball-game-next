#!/usr/bin/env bash
# Local static server launcher for macOS/Linux (Windows users: double-click run.bat instead).
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  echo "Starting local server with Python 3... open http://localhost:8000"
  python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  echo "Starting local server with Python... open http://localhost:8000"
  python -m http.server 8000
elif command -v npx >/dev/null 2>&1; then
  echo "Python not found, using Node.js (npx serve)... open the URL it prints"
  npx --yes serve -l 8000 .
else
  echo "Neither Python nor Node.js was found on this machine."
  echo "Install Python (https://www.python.org/downloads/) and run this script again,"
  echo "or open this folder with any other local static file server."
  exit 1
fi
