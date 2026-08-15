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

# Belt-and-braces: env config outranks every .npmrc / pnpm-workspace.yaml,
# so the minimum-release-age policy stays off whichever pnpm ends up running.
export npm_config_minimum_release_age=0
export NPM_CONFIG_MINIMUM_RELEASE_AGE=0

echo "Step 2: Installing pnpm..."
npm install -g pnpm@9 --quiet
# Call the pnpm we just installed by absolute path. Render's image ships its
# own (newer) pnpm that otherwise wins on PATH, which is what actually ran the
# supply-chain check that broke the last build.
PNPM="$(npm root -g)/pnpm/bin/pnpm.cjs"
if [ -f "$PNPM" ]; then
  pnpm_run() { node "$PNPM" "$@"; }
else
  echo "! pnpm.cjs not found at $PNPM, falling back to PATH"
  pnpm_run() { pnpm "$@"; }
fi
echo "✓ pnpm installed: $(pnpm_run --version)"
echo ""

echo "Step 3: Installing Node.js dependencies..."
pnpm_run install --frozen-lockfile
echo "✓ Node.js dependencies installed"
echo ""

echo "Step 4: Building frontend..."
pnpm_run run build
echo "✓ Frontend built successfully"
echo ""

echo "=========================================="
echo "✓ BUILD COMPLETE"
echo "=========================================="
