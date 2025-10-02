#!/bin/bash

echo "=== YouTube Commenter - Emulator Setup Script ==="
echo "This script will set up the environment for emulator/VPS deployment"
echo ""

# Check if running on Linux/Unix
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Detected Unix-like system"
    IS_UNIX=true
else
    echo "✓ Detected Windows system"
    IS_UNIX=false
fi

echo ""
echo "1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "✓ Node.js is installed: $(node --version)"
else
    echo "✗ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo ""
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "✓ npm is installed: $(npm --version)"
else
    echo "✗ npm is not installed!"
    echo "Please install npm"
    exit 1
fi

echo ""
echo "3. Installing Node.js dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✓ Node.js dependencies installed successfully"
else
    echo "✗ Failed to install Node.js dependencies"
    exit 1
fi

echo ""
echo "4. Checking Python installation..."
if command -v python3 &> /dev/null; then
    echo "✓ Python3 is installed: $(python3 --version)"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    echo "✓ Python is installed: $(python --version)"
    PYTHON_CMD="python"
else
    echo "✗ Python is not installed!"
    echo "Please install Python from https://python.org/"
    exit 1
fi

echo ""
echo "5. Installing Python dependencies..."
$PYTHON_CMD -m pip install --user selenium unidecode
if [ $? -eq 0 ]; then
    echo "✓ Python dependencies installed successfully"
else
    echo "⚠ Warning: Failed to install Python dependencies"
    echo "The app will use fallback methods for folder deletion"
fi

echo ""
echo "6. Checking Chrome installation..."
if command -v google-chrome &> /dev/null; then
    echo "✓ Google Chrome is installed"
elif command -v chromium-browser &> /dev/null; then
    echo "✓ Chromium is installed"
elif command -v chrome &> /dev/null; then
    echo "✓ Chrome is installed"
else
    echo "⚠ Warning: Chrome/Chromium not found in PATH"
    echo "Please install Chrome or Chromium browser"
fi

echo ""
echo "7. Checking ChromeDriver..."
CHROMEDRIVER_FOUND=false

# Check common ChromeDriver locations
CHROMEDRIVER_PATHS=(
    "./chromedriver"
    "./chromedriver.exe"
    "/usr/local/bin/chromedriver"
    "/usr/bin/chromedriver"
    "/opt/chromedriver"
    "chromedriver"
)

for path in "${CHROMEDRIVER_PATHS[@]}"; do
    if command -v "$path" &> /dev/null || [ -f "$path" ]; then
        echo "✓ ChromeDriver found at: $path"
        CHROMEDRIVER_FOUND=true
        break
    fi
done

if [ "$CHROMEDRIVER_FOUND" = false ]; then
    echo "⚠ Warning: ChromeDriver not found"
    echo "Please download ChromeDriver from: https://chromedriver.chromium.org/"
    echo "Place it in the project directory or add to PATH"
fi

echo ""
echo "8. Setting up environment variables..."
export NODE_OPTIONS="--max-old-space-size=4096"

echo ""
echo "9. Creating startup script..."
cat > start_app.sh << 'EOF'
#!/bin/bash
export NODE_OPTIONS="--max-old-space-size=4096"
echo "Starting YouTube Commenter..."
npm start
EOF

chmod +x start_app.sh
echo "✓ Created start_app.sh script"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start the app, run:"
echo "  ./start_app.sh"
echo ""
echo "Or directly:"
echo "  npm start"
echo ""
echo "If you encounter issues:"
echo "1. Make sure Chrome/Chromium is installed"
echo "2. Download ChromeDriver and place in project directory"
echo "3. Check Python installation and dependencies"
echo "4. Run with debug: npm run start-dev"
