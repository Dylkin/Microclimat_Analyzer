@echo off
echo ========================================
echo Quick Merge Options
echo ========================================
echo.
echo Select branch to merge:
echo.
echo 1. reportok1-proekt-stad2 (Latest project stage 2)
echo 2. reportok1-proekt-stad1 (Project stage 1)
echo 3. reportok1-proekt (Main project)
echo 4. reportok-proekt1-ochist (Cleaned project)
echo 5. tabl+grafik (Tables + Graphics)
echo 6. graficok (Graphics OK)
echo 7. parser174T+H (Parser for 174T+H)
echo 8. Custom branch name
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" set branch_name=reportok1-proekt-stad2
if "%choice%"=="2" set branch_name=reportok1-proekt-stad1
if "%choice%"=="3" set branch_name=reportok1-proekt
if "%choice%"=="4" set branch_name=reportok-proekt1-ochist
if "%choice%"=="5" set branch_name=tabl+grafik
if "%choice%"=="6" set branch_name=graficok
if "%choice%"=="7" set branch_name=parser174T+H
if "%choice%"=="8" (
    set /p branch_name="Enter custom branch name: "
)

echo.
echo Selected branch: %branch_name%
echo.
echo Adding current changes...
git add .
git commit -m "Add utility scripts before merge"
echo.
echo Fetching latest changes...
git fetch origin
echo.
echo Merging %branch_name% into main...
git merge origin/%branch_name%
echo.
echo ========================================
echo Merge completed!
echo ========================================
git status
pause

