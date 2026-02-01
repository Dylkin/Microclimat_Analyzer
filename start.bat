@echo off
echo Starting Microclimat Analyzer...
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Starting development server...
echo Server will be available at: http://localhost:5173
echo.
call npm run dev

