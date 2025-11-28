@echo off
echo Stopping Gomoku Development Server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a
echo Done.
