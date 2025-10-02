# Test script for VPS deployment

echo "Testing YouTube Commenter app..."

# Check if Node.js is installed
node --version
if [ $? -ne 0 ]; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
npm --version
if [ $? -ne 0 ]; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the app
echo "Starting the app..."
npm start
