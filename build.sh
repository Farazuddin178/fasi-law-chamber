#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing pnpm..."
npm install -g pnpm

echo "Installing Node.js dependencies..."
pnpm install

echo "Building frontend..."
pnpm run build

echo "Build complete!"
