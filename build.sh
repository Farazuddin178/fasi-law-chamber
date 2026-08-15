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

# Env config outranks .npmrc and pnpm-workspace.yaml, so these hold no matter
# which pnpm Render ends up running:
#   minimum_release_age  - don't reject deps published in the last 24 h
#   strict_dep_builds    - ignored build scripts warn, never fail the install
export npm_config_minimum_release_age=0
export npm_config_strict_dep_builds=false

echo "Step 2: Installing pnpm..."
# Render's image ships its own pnpm that wins on PATH regardless of what we
# install here, so don't pretend to pin a version — just report what actually
# runs, so the build log identifies it when something breaks.
npm install -g pnpm@9 --quiet || echo "! global pnpm install failed, using preinstalled pnpm"
echo "✓ pnpm in use: $(pnpm --version)"
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
