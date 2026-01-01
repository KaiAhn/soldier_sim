@echo off
echo Starting local server on http://localhost:8080
echo Press Ctrl+C to stop the server
cd /d "%~dp0"
npx http-server -p 8080

