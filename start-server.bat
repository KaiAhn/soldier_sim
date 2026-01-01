@echo off
echo Starting local server on http://localhost:8000
echo Press Ctrl+C to stop the server
cd /d "%~dp0"
python -m http.server 8000

