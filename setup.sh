#!/bin/bash

# ============================================================================
# Case Management System - Notification Features Setup Script
# Run this script to set up all dependencies and configurations
# ============================================================================

echo "=================================================="
echo "Case Management System - Notification Setup"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python installation
echo -e "${YELLOW}Checking Python installation...${NC}"
if ! command -v python &> /dev/null; then
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}ERROR: Python is not installed. Please install Python 3.8+${NC}"
        exit 1
    fi
    PYTHON_CMD=python3
else
    PYTHON_CMD=python
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    $PYTHON_CMD -m venv .venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
fi
echo ""

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    source .venv/Scripts/activate
elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    # Linux/Mac
    source .venv/bin/activate
else
    echo -e "${RED}ERROR: Unsupported OS${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

# Install/upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
$PYTHON_CMD -m pip install --upgrade pip -q
echo -e "${GREEN}✓ pip upgraded${NC}"
echo ""

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
echo "This may take a few minutes..."

pip install flask==3.0.0 -q
echo -e "${GREEN}  ✓ Flask${NC}"

pip install flask-cors==4.0.0 -q
echo -e "${GREEN}  ✓ Flask-CORS${NC}"

pip install requests==2.32.3 -q
echo -e "${GREEN}  ✓ Requests${NC}"

pip install beautifulsoup4==4.12.3 -q
echo -e "${GREEN}  ✓ BeautifulSoup4${NC}"

pip install lxml==5.1.0 -q
echo -e "${GREEN}  ✓ lxml${NC}"

pip install twilio==8.10.0 -q
echo -e "${GREEN}  ✓ Twilio${NC}"

pip install supabase==2.3.0 -q
echo -e "${GREEN}  ✓ Supabase${NC}"

pip install apscheduler==3.10.4 -q
echo -e "${GREEN}  ✓ APScheduler${NC}"

pip install python-dotenv==1.0.0 -q
echo -e "${GREEN}  ✓ python-dotenv${NC}"

pip install gunicorn==21.2.0 -q
echo -e "${GREEN}  ✓ Gunicorn${NC}"

echo -e "${GREEN}✓ All Python dependencies installed${NC}"
echo ""

# Check for .env file
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}✓ .env file created${NC}"
        echo -e "${RED}⚠ IMPORTANT: Edit .env file with your credentials!${NC}"
        echo -e "${YELLOW}  Required:${NC}"
        echo "  - TWILIO_ACCOUNT_SID"
        echo "  - TWILIO_AUTH_TOKEN"
        echo "  - SMTP_USER"
        echo "  - SMTP_PASSWORD"
        echo "  - ADMIN_EMAIL"
    else
        echo -e "${RED}ERROR: .env.example not found${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Check Node.js and pnpm
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠ pnpm not found. Installing...${NC}"
    npm install -g pnpm
    echo -e "${GREEN}✓ pnpm installed${NC}"
else
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓ pnpm $PNPM_VERSION found${NC}"
fi
echo ""

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
pnpm install --prefer-offline
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Display next steps
echo "=================================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Configure Environment Variables:"
echo "   ${YELLOW}nano .env${NC}  (or use your preferred editor)"
echo "   Fill in your Twilio and SMTP credentials"
echo ""
echo "2. Run Database Migration:"
echo "   - Open Supabase Dashboard"
echo "   - Go to SQL Editor"
echo "   - Copy contents of database_migration.sql"
echo "   - Run the script"
echo ""
echo "3. Update User Phone Numbers:"
echo "   Run this SQL in Supabase:"
echo "   ${YELLOW}UPDATE users SET phone = '+919876543210' WHERE email = 'your@email.com';${NC}"
echo ""
echo "4. Start the Application:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   ${GREEN}source .venv/Scripts/activate${NC}  # Windows Git Bash"
echo "   ${GREEN}source .venv/bin/activate${NC}      # Linux/Mac"
echo "   ${GREEN}python proxy.py${NC}"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   ${GREEN}pnpm run dev${NC}"
echo ""
echo "5. Test Notifications:"
echo "   - Create a task and assign to a user"
echo "   - Check WhatsApp and Email"
echo "   - View audit logs in case details"
echo ""
echo "=================================================="
echo -e "${YELLOW}Documentation:${NC}"
echo "  - QUICK_START.md (Fast setup guide)"
echo "  - IMPLEMENTATION_GUIDE.md (Complete guide)"
echo "  - FEATURES_SUMMARY.md (Overview)"
echo "=================================================="
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
