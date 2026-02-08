#!/bin/bash

# University Inventory System - Setup and Run Script

echo "================================"
echo "University Inventory System"
echo "COMP Department"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 Starting development server..."
echo "   The application will open at: http://localhost:3000"
echo ""
echo "Demo Credentials:"
echo "   Admin:    admin / admin123"
echo "   Operator: operator / operator123"
echo "   User:     user / user123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
