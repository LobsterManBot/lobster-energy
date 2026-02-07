#!/bin/bash

# Lobster Energy 🦞⚡ - Startup Script

echo "🦞 Starting Lobster Energy..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 not found. Please install Python 3.10+${NC}"
    exit 1
fi

# Check Node
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Setup backend
echo "📦 Setting up backend..."
cd backend

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt -q

# Initialize database
python3 -c "from services.database import init_db; init_db()"

# Start backend in background
echo "🚀 Starting backend on :8000..."
python3 main.py &
BACKEND_PID=$!

cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    npm install
fi

# Start frontend
echo "🚀 Starting frontend on :3000..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}✅ Lobster Energy is running!${NC}"
echo ""
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait
wait
