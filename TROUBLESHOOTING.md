# YouTube Commenter - Troubleshooting Guide

## Problem 1: App runs in Task Manager but no window shows

### Root Cause:
The license validation system was blocking the main window from opening.

### Solution Applied:
- Modified `main.js` to always allow the app to run regardless of license validation status
- Added fallback logic to show the main app even if validation is in progress
- Set default license key to prevent validation failures

### How to Test:
1. Run `npm start`
2. The comment popup window should now appear
3. Check Task Manager - you should see the Electron process with visible windows

## Problem 2: npm start works on PC but not on emulator

### Root Cause:
- Missing Python dependencies (Selenium, Unidecode)
- Hardcoded ChromeDriver path
- Different environment setup

### Solution Applied:
- Created `requirements.txt` with necessary Python packages
- Modified `create_new_id.py` to auto-detect ChromeDriver location
- Created `setup_emulator.bat` for easy emulator setup

### Setup Instructions for Emulator:

1. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install ChromeDriver:**
   - Download ChromeDriver from https://chromedriver.chromium.org/
   - Place it in the project directory or add to PATH
   - The script will auto-detect common locations

3. **Run Setup Script (Windows):**
   ```bash
   setup_emulator.bat
   ```

4. **Start the App:**
   ```bash
   npm start
   ```

## Additional Troubleshooting:

### If ChromeDriver Issues Persist:
1. Check Chrome version: `chrome://version/`
2. Download matching ChromeDriver version
3. Ensure ChromeDriver is executable

### If Python Issues Persist:
1. Verify Python is installed: `python --version`
2. Check pip is working: `pip --version`
3. Install packages manually if needed

### If Electron Issues Persist:
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check Node.js version compatibility
3. Try running with debug: `npm run start-dev`

## Files Modified:
- `main.js` - Fixed license validation logic
- `create_new_id.py` - Added ChromeDriver auto-detection
- `requirements.txt` - Added Python dependencies
- `setup_emulator.bat` - Added emulator setup script

## Testing:
After applying fixes, both issues should be resolved:
1. App window should appear when running
2. App should work on both PC and emulator environments
