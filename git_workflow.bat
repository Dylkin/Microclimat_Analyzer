@echo off
echo ========================================
echo Git Workflow for Microclimat Analyzer
echo ========================================
echo.
echo 1. Checking if Git is initialized...
if not exist ".git" (
    echo Git not initialized. Initializing...
    git init
    git add .
    git commit -m "Initial commit: Microclimat Analyzer project"
    git branch -M main
    echo Git repository created!
) else (
    echo Git repository already exists.
)
echo.
echo 2. Current branch status:
git branch --show-current
echo.
echo 3. Available branches:
git branch -a
echo.
echo 4. Current status:
git status
echo.
echo ========================================
echo To merge a branch into main:
echo 1. git checkout main
echo 2. git merge [branch-name]
echo ========================================
pause

