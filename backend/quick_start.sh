#!/bin/bash
# quick_start.sh - Quick start guide for the AI Grid Agent

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Syntaxed-IEGMS AI Grid Agent - Quick Start                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Configure Ollama Endpoint${NC}"
echo "On your remote laptop with Ollama:"
echo "  1. Make sure Ollama is running: ollama serve"
echo "  2. Get your laptop's IP: ifconfig | grep 'inet '"
echo "  3. Pull a model: ollama pull mistral"
echo ""

echo -e "${YELLOW}Step 2: Set Environment Variables${NC}"
echo "Option A - Create .env file in backend/:"
cat > .env << 'EOF'
OLLAMA_ENDPOINT=http://192.168.1.100:11434  # Replace with your laptop IP
OLLAMA_MODEL=mistral
EOF
echo "  ✓ .env file created"
echo ""
echo "Option B - Export environment variables:"
echo "  export OLLAMA_ENDPOINT=http://192.168.1.100:11434"
echo "  export OLLAMA_MODEL=mistral"
echo ""

echo -e "${YELLOW}Step 3: Install Dependencies${NC}"
cd backend
pip install -r requirements.txt
echo "  ✓ Dependencies installed"
echo ""

echo -e "${YELLOW}Step 4: Run Tests (No Ollama Required)${NC}"
python test_agent.py
echo ""

echo -e "${YELLOW}Step 5: Start Backend${NC}"
echo "  Run: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""

echo -e "${GREEN}✓ All set! The backend will auto-initialize the AI agent when it starts.${NC}"
echo ""
echo "API Endpoints:"
echo "  GET  http://localhost:8000/health               - Health check"
echo "  GET  http://localhost:8000/agent/config         - Get agent config"
echo "  POST http://localhost:8000/agent/configure      - Configure agent"
echo "  POST http://localhost:8000/agent/decide         - Ask agent for decision"
echo "  GET  http://localhost:8000/agent/status         - Get agent status"
echo ""
echo "Example Decision Query:"
echo '  curl -X POST http://localhost:8000/agent/decide \'
echo '    -H "Content-Type: application/json" \'
echo '    -d "{\"query\": \"How should we manage the grid efficiently right now?\"}"'
