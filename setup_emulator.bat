@echo off
echo Setting up YouTube Commenter for emulator...

echo Installing Python dependencies...
pip install -r requirements.txt

echo Checking ChromeDriver...
python -c "from selenium import webdriver; from selenium.webdriver.chrome.service import Service; print('Selenium installed successfully')"

echo Setup complete!
echo.
echo To run the app:
echo 1. Make sure ChromeDriver is installed and in PATH
echo 2. Run: npm start
echo.
pause
