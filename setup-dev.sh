#!/bin/bash

# ==========================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# ==========================================
# This script sets up the development environment

set -e

echo "=========================================="
echo "TSHC Causelist App - Development Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "⚠ pnpm not found. Installing globally..."
    npm install -g pnpm
fi

echo "✓ All prerequisites installed"
echo ""

# Setup Python environment
echo "✓ Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

# Activate virtual environment
if [ "$OSTYPE" = "msys" ] || [ "$OSTYPE" = "win32" ]; then
    source .venv/Scripts/activate
else
    source .venv/bin/activate
fi

echo "✓ Virtual environment activated"
echo ""

# Install Python dependencies
echo "✓ Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✓ Python dependencies installed"
echo ""

# Install Node dependencies
echo "✓ Installing Node.js dependencies..."
pnpm install

echo "✓ Node.js dependencies installed"
echo ""

# Build frontend
echo "✓ Building frontend..."
pnpm run build

echo "✓ Frontend built successfully"
echo ""

echo "=========================================="
echo "✓ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Make sure .venv/Scripts/activate is sourced"
echo "2. Run: python proxy.py"
echo "3. Open: http://localhost:5001"
echo ""
echo "For deployment, see DEPLOYMENT_GUIDE.md"
echo "=========================================="
