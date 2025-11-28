@echo off
echo Checking for process on port 3000...
netstat -aon | find ":3000" | find "LISTENING"
if %errorlevel%==0 (
    echo Server is RUNNING.
) else (
    echo Server is NOT running.
)
pause
