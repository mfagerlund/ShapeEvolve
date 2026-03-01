@echo off
echo Building...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Deploying to Firebase...
call firebase deploy
if %errorlevel% neq 0 (
    echo Deploy failed!
    exit /b 1
)

echo Done! Live at https://shapeevolve.web.app
