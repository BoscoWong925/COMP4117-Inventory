@echo off
REM University Inventory System - Setup and Run Script (Windows)

echo ================================
echo University Inventory System
echo COMP Department
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo Node.js version: %NODE_VERSION%
echo npm version: %NPM_VERSION%
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Setup complete!
echo.
echo Starting development server...
echo The application will open at: http://localhost:3000
echo.
echo Demo Credentials:
echo    Admin:    admin / admin123
echo    Operator: operator / operator123
echo    User:     user / user123
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
pause
