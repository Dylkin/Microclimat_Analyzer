@echo off
echo Initializing Git repository...
git init
echo.
echo Adding all files to Git...
git add .
echo.
echo Creating initial commit...
git commit -m "Initial commit: Microclimat Analyzer project"
echo.
echo Creating main branch...
git branch -M main
echo.
echo Git repository initialized successfully!
echo Current status:
git status
pause

