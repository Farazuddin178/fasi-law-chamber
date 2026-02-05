#!/bin/bash
set -e

echo "=========================================="
echo "TSHC Causelist - Build Script for Render"
echo "=========================================="
echo ""

echo "Step 1: Installing Python dependencies..."
pip install -r requirements.txt --quiet
echo "✓ Python dependencies installed"
echo ""

echo "Step 2: Installing pnpm..."
npm install -g pnpm --quiet
echo "✓ pnpm installed"
echo ""

echo "Step 3: Installing Node.js dependencies..."
pnpm install --frozen-lockfile
echo "✓ Node.js dependencies installed"
echo ""

echo "Step 4: Building frontend..."
pnpm run build
echo "✓ Frontend built successfully"
echo ""

echo "=========================================="
echo "✓ BUILD COMPLETE"
echo "=========================================="
