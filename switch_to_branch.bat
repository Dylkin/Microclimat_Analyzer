@echo off
echo ========================================
echo Switch to Branch: podgotovkaprotokola-ok
echo ========================================
echo.
echo Current branch:
git branch --show-current
echo.
echo Fetching latest changes from remote...
git fetch origin
echo.
echo Switching to podgotovkaprotokola-ok branch...
git checkout -b podgotovkaprotokola-ok origin/podgotovkaprotokala-ok
echo.
echo Current branch after switch:
git branch --show-current
echo.
echo Branch status:
git status
echo.
echo ========================================
echo Branch switched successfully!
echo ========================================
pause

