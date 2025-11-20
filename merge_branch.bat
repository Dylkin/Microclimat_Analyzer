@echo off
echo ========================================
echo Merge Branch to Main
echo ========================================
echo.
echo Available remote branches:
echo 1. addtable
echo 2. grafic
echo 3. graficok
echo 4. nottable
echo 5. parser174T+H
echo 6. podgotovkaprotokola-ok
echo 7. projekt-status2
echo 8. report
echo 9. report1
echo 10. reportok
echo 11. reportok-proekt1
echo 12. reportok-proekt1-ochist
echo 13. reportok1
echo 14. reportok1-proekt
echo 15. reportok1-proekt-stad1
echo 16. reportok1-proekt-stad2
echo 17. tabl+grafik
echo.
set /p branch_name="Enter branch name to merge (without 'origin/'): "
echo.
echo Adding untracked files first...
git add .
git commit -m "Add utility scripts and configuration files"
echo.
echo Fetching latest changes from remote...
git fetch origin
echo.
echo Switching to main branch...
git checkout main
echo.
echo Merging branch: %branch_name%
git merge origin/%branch_name%
echo.
echo Merge completed! Current status:
git status
echo.
echo ========================================
pause

