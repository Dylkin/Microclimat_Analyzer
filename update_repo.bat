@echo off
echo ========================================
echo Update Repository
echo ========================================
echo.
echo 1. Fetching latest changes from remote...
git fetch origin
echo.
echo 2. Checking current branch...
git branch --show-current
echo.
echo 3. Pulling latest changes from main...
git checkout main
git pull origin main
echo.
echo 4. Installing/updating dependencies...
npm install
echo.
echo 5. Installing Supabase dependency...
npm install @supabase/supabase-js
echo.
echo 6. Checking for security vulnerabilities...
npm audit
echo.
echo 7. Current repository status...
git status
echo.
echo ========================================
echo Repository updated successfully!
echo ========================================
pause

