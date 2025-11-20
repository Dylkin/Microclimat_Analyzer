@echo off
echo Checking Git status...
git status
echo.
echo Available branches:
git branch -a
echo.
echo Current branch:
git branch --show-current
echo.
echo Switching to main branch...
git checkout main
echo.
echo Merging current branch into main...
git merge HEAD
echo.
echo Final status:
git status
pause

