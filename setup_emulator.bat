@echo off
echo === YouTube Commenter - Emulator Setup Script ===
echo This script will set up the environment for emulator/VPS deployment
echo.

echo 1. Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js is installed
    node --version
) else (
    echo ✗ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 2. Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ npm is installed
    npm --version
) else (
    echo ✗ npm is not installed!
    echo Please install npm
    pause
    exit /b 1
)

echo.
echo 3. Installing Node.js dependencies...
npm install
if %errorlevel% equ 0 (
    echo ✓ Node.js dependencies installed successfully
) else (
    echo ✗ Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo 4. Checking Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Python is installed
    python --version
    set PYTHON_CMD=python
) else (
    py --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ Python is installed via py launcher
        py --version
        set PYTHON_CMD=py
    ) else (
        echo ✗ Python is not installed!
        echo Please install Python from https://python.org/
        echo The app will use fallback methods for folder deletion
        set PYTHON_CMD=
    )
)

echo.
echo 5. Installing Python dependencies...
if defined PYTHON_CMD (
    %PYTHON_CMD% -m pip install selenium unidecode
    if %errorlevel% equ 0 (
        echo ✓ Python dependencies installed successfully
    ) else (
        echo ⚠ Warning: Failed to install Python dependencies
        echo The app will use fallback methods for folder deletion
    )
) else (
    echo ⚠ Skipping Python dependencies installation
)

echo.
echo 6. Checking Chrome installation...
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Chrome is installed
) else (
    echo ⚠ Warning: Chrome not found in PATH
    echo Please install Chrome browser
)

echo.
echo 7. Checking ChromeDriver...
set CHROMEDRIVER_FOUND=false

REM Check common ChromeDriver locations
if exist "chromedriver.exe" (
    echo ✓ ChromeDriver found in project directory
    set CHROMEDRIVER_FOUND=true
) else if exist "chromedriver" (
    echo ✓ ChromeDriver found in project directory
    set CHROMEDRIVER_FOUND=true
) else (
    where chromedriver >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ ChromeDriver found in PATH
        set CHROMEDRIVER_FOUND=true
    )
)

if "%CHROMEDRIVER_FOUND%"=="false" (
    echo ⚠ Warning: ChromeDriver not found
    echo Please download ChromeDriver from: https://chromedriver.chromium.org/
    echo Place it in the project directory or add to PATH
)

echo.
echo 8. Setting up environment variables...
set NODE_OPTIONS=--max-old-space-size=4096

echo.
echo 9. Creating startup script...
echo @echo off > start_app.bat
echo set NODE_OPTIONS=--max-old-space-size=4096 >> start_app.bat
echo echo Starting YouTube Commenter... >> start_app.bat
echo npm start >> start_app.bat
echo ✓ Created start_app.bat script

echo.
echo === Setup Complete! ===
echo.
echo To start the app, run:
echo   start_app.bat
echo.
echo Or directly:
echo   npm start
echo.
echo If you encounter issues:
echo 1. Make sure Chrome is installed
echo 2. Download ChromeDriver and place in project directory
echo 3. Check Python installation and dependencies
echo 4. Run with debug: npm run start-dev
echo.
pause
