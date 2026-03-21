@echo off
echo Starting commit...
git add .
git commit -m "Auto-commit: %date% %time%"
if errorlevel 1 (
    echo Nothing to commit or error occurred.
) else (
    echo Commit successful.
    echo Pushing to remote...
    git push origin master
    if errorlevel 1 (
        echo Push failed. Please ensure you have set up a remote repository and added it with:
        echo git remote add origin <your-repo-url>
        echo git push -u origin master
    ) else (
        echo Push successful.
    )
)
pause
