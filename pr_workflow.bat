@echo off
echo ========================================
echo Pull Request Workflow
echo ========================================
echo.
echo Available branches for PR:
echo 1. podgotovkaprotokola-ok
echo 2. reportok1-proekt-stad2
echo 3. reportok1-proekt-stad1
echo 4. reportok1-proekt
echo 5. reportok-proekt1-ochist
echo 6. tabl+grafik
echo 7. graficok
echo 8. parser174T+H
echo.
set /p choice="Select branch for PR (1-8): "

if "%choice%"=="1" set branch_name=podgotovkaprotokola-ok
if "%choice%"=="2" set branch_name=reportok1-proekt-stad2
if "%choice%"=="3" set branch_name=reportok1-proekt-stad1
if "%choice%"=="4" set branch_name=reportok1-proekt
if "%choice%"=="5" set branch_name=reportok-proekt1-ochist
if "%choice%"=="6" set branch_name=tabl+grafik
if "%choice%"=="7" set branch_name=graficok
if "%choice%"=="8" set branch_name=parser174T+H

echo.
echo Selected branch: %branch_name%
echo.
echo Fetching latest changes...
git fetch origin
echo.
echo Switching to %branch_name%...
git checkout %branch_name%
echo.
echo Current branch:
git branch --show-current
echo.
echo Pushing branch to remote...
git push origin %branch_name%
echo.
echo ========================================
echo Ready for Pull Request!
echo ========================================
echo.
echo Branch: %branch_name%
echo Target: main
echo.
echo Next steps:
echo 1. Go to your Git platform (GitHub/GitLab/etc.)
echo 2. Create Pull Request from %branch_name% to main
echo 3. Add appropriate title and description
echo.
echo Repository URL:
git remote get-url origin
echo.
pause

