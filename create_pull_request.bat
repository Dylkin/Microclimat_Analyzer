@echo off
echo ========================================
echo Create Pull Request Workflow
echo ========================================
echo.
echo 1. Checking current branch...
git branch --show-current
echo.
echo 2. Checking if we're on the correct branch...
for /f %%i in ('git branch --show-current') do set current_branch=%%i
if "%current_branch%"=="podgotovkaprotokola-ok" (
    echo ✓ You are on the correct branch: podgotovkaprotokola-ok
) else (
    echo ⚠ You are on branch: %current_branch%
    echo Switching to podgotovkaprotokola-ok...
    git checkout podgotovkaprotokola-ok
)
echo.
echo 3. Checking for uncommitted changes...
git status --porcelain
echo.
echo 4. Pushing branch to remote (if needed)...
git push origin podgotovkaprotokola-ok
echo.
echo 5. Getting remote repository URL...
git remote get-url origin
echo.
echo ========================================
echo Pull Request Information:
echo ========================================
echo Source Branch: podgotovkaprotokola-ok
echo Target Branch: main
echo.
echo To create Pull Request:
echo 1. Go to your Git hosting platform (GitHub/GitLab/etc.)
echo 2. Navigate to your repository
echo 3. Click "New Pull Request" or "Create Merge Request"
echo 4. Select:
echo    - Source: podgotovkaprotokola-ok
echo    - Target: main
echo 5. Add title: "Podgotovka protokola OK"
echo 6. Add description of changes
echo 7. Create the Pull Request
echo.
echo ========================================
pause

