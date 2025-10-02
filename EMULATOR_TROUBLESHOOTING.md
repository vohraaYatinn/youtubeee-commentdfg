# YouTube Commenter - Emulator/VPS Troubleshooting Guide

## Why It Works on PC but Not on Emulator

The app works on your PC but fails on emulator due to several environment differences:

### **🔍 Root Causes:**

1. **Python Environment Differences:**
   - PC: Has Python with virtual environment (`venv` folder)
   - Emulator: Missing Python or different Python setup
   - App calls `spawn('python', ['delete_folder.py', path])` which fails

2. **ChromeDriver Path Issues:**
   - PC: ChromeDriver in specific location
   - Emulator: Different file system structure, missing ChromeDriver

3. **Operating System Differences:**
   - PC: Windows with specific paths
   - Emulator: Linux/Unix with different path separators

4. **Missing Dependencies:**
   - PC: All packages installed locally
   - Emulator: Missing Python packages (Selenium, Unidecode)

## **✅ Solutions Applied:**

### **1. Enhanced Python Fallback (main.js):**
```javascript
// Try different Python commands
const pythonCommands = ['python', 'python3', 'py'];
// Fallback to Node.js fs if Python fails
```

### **2. Cross-Platform Setup Scripts:**
- `setup_emulator.sh` - For Linux/Unix emulators
- `setup_emulator.bat` - For Windows emulators

### **3. Auto-Detection Features:**
- ChromeDriver auto-detection
- Python command detection
- Environment-specific paths

## **🚀 Quick Fix for Emulator:**

### **Step 1: Run Setup Script**
```bash
# For Linux/Unix emulator:
chmod +x setup_emulator.sh
./setup_emulator.sh

# For Windows emulator:
setup_emulator.bat
```

### **Step 2: Install Missing Components**

**If Python is missing:**
```bash
# Ubuntu/Debian:
sudo apt update
sudo apt install python3 python3-pip

# CentOS/RHEL:
sudo yum install python3 python3-pip

# Windows:
# Download from https://python.org/
```

**If ChromeDriver is missing:**
```bash
# Download ChromeDriver matching your Chrome version
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE
# Replace LATEST_RELEASE with actual version
wget https://chromedriver.storage.googleapis.com/VERSION/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
chmod +x chromedriver
sudo mv chromedriver /usr/local/bin/
```

**If Chrome is missing:**
```bash
# Ubuntu/Debian:
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable

# CentOS/RHEL:
sudo yum install google-chrome-stable
```

### **Step 3: Install Python Dependencies**
```bash
pip3 install selenium unidecode
# or
python3 -m pip install selenium unidecode
```

### **Step 4: Start the App**
```bash
npm start
```

## **🔧 Manual Troubleshooting:**

### **Check Environment:**
```bash
# Check Node.js
node --version
npm --version

# Check Python
python3 --version
python --version

# Check Chrome
google-chrome --version
chromium-browser --version

# Check ChromeDriver
chromedriver --version
```

### **Test Python Script:**
```bash
python3 -c "from selenium import webdriver; print('Selenium works!')"
```

### **Test ChromeDriver:**
```bash
python3 -c "from selenium import webdriver; driver = webdriver.Chrome(); print('ChromeDriver works!'); driver.quit()"
```

## **⚠️ Common Issues & Solutions:**

### **Issue: "python: command not found"**
**Solution:** Install Python or use `python3`

### **Issue: "ChromeDriver not found"**
**Solution:** Download ChromeDriver and place in project directory

### **Issue: "selenium module not found"**
**Solution:** `pip3 install selenium`

### **Issue: "Chrome binary not found"**
**Solution:** Install Chrome browser

### **Issue: "Permission denied"**
**Solution:** `chmod +x chromedriver` or run with `sudo`

## **📁 Files Created/Modified:**

- `main.js` - Added Python fallback and error handling
- `setup_emulator.sh` - Linux/Unix setup script
- `setup_emulator.bat` - Windows setup script
- `requirements.txt` - Python dependencies
- `create_new_id.py` - Auto-detection for ChromeDriver

## **🎯 Expected Results:**

After applying fixes:
- ✅ App runs on both PC and emulator
- ✅ Python dependencies handled gracefully
- ✅ ChromeDriver auto-detected
- ✅ Cross-platform compatibility
- ✅ Better error messages for debugging

## **🆘 Still Having Issues?**

1. **Check logs:** Look for specific error messages
2. **Run setup script:** It will diagnose common issues
3. **Test components individually:** Python, Chrome, ChromeDriver
4. **Use debug mode:** `npm run start-dev`
5. **Check file permissions:** Ensure scripts are executable
