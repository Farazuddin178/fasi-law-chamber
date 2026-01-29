#!/bin/bash

# Court Scraper + React App - Full Startup Script
# This starts both the Python backend and the React frontend

echo "🚀 Starting Court Case Tracker System..."
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js"
    exit 1
fi

echo "✅ Python and npm found"
echo ""

# Start Python backend
echo "📦 Installing Python dependencies..."
cd court-scraper-integration/backend
pip install -r requirements.txt --quiet
echo "✅ Python dependencies installed"
echo ""

echo "🔧 Starting Python API Server on http://localhost:5000..."
python app.py &
PYTHON_PID=$!
sleep 3
echo "✅ Python API Server started (PID: $PYTHON_PID)"
echo ""

# Go back to root
cd ../..

# Start React app
echo "⚛️ Starting React Frontend on http://localhost:5173..."
echo "📦 Installing npm dependencies..."
npm install --quiet
echo "✅ npm dependencies installed"
echo ""

echo "🎉 Starting development server..."
npm run dev &
REACT_PID=$!

echo ""
echo "=========================================="
echo "✅ SYSTEM STARTED"
echo "=========================================="
echo "🔗 Frontend:  http://localhost:5173"
echo "🔗 Python API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "=========================================="
echo ""

# Wait for both processes
wait
