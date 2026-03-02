#!/bin/bash
# Setup script for COMP4117 Inventory Management System
# This script helps configure environment variables and validate setup

set -e

echo ""
echo "========================================"
echo "COMP4117 Inventory System - Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the project root directory${NC}"
    exit 1
fi

# Check node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo ""

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env template for configuration..."
    echo ""
    
    # Create template .env - user must fill in their own values
    cat > backend/.env << 'EOF'
# =============================================================
# REQUIRED: Replace the values below with your own credentials
# =============================================================
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h
PORT=5001
NODE_ENV=development
FRONTEND_PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5001
EOF
    
    echo -e "${GREEN}✓ Created backend/.env${NC}"
    echo ""
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
    echo ""
fi

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo -e "${GREEN}✓ Environment configuration ready${NC}"
echo ""
echo "Next Steps:"
echo "==========="
echo ""
echo "1️⃣  Start the backend server (Terminal 1):"
echo "   cd backend && npm install && npm run dev"
echo ""
echo "2️⃣  Start the frontend (Terminal 2):"
echo "   cd frontend && npm install && npm run dev"
echo ""
echo "3️⃣  Open browser:"
echo "   http://localhost:3000"
echo ""
echo "4️⃣  (Optional) Seed demo data:"
echo "   cd backend && npm run seed"
echo ""
echo "========================================"
echo "Demo Credentials (after seeding):"
echo "========================================"
echo "Admin:    admin / admin123"
echo "Operator: operator / operator123"
echo "User:     user / user123"
echo ""
echo "========================================"
echo "For Production Deployment:"
echo "========================================"
echo ""
echo "Update backend/.env with:"
echo ""
echo "1. Your production MongoDB URI:"
echo "   MONGODB_URI=mongodb+srv://..."
echo ""
echo "2. A strong JWT_SECRET (generate below):"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "3. Production settings:"
echo "   NODE_ENV=production"
echo "   CORS_ORIGINS=https://yourdomain.com"
echo ""
echo "Then deploy: npm start"
echo ""

