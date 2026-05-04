@echo off
start "Backend" cmd /k "cd /d D:\archive2\backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 3
start "Frontend" cmd /k "cd /d D:\archive2\frontend && npm start"