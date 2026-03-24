# AI Grid Agent Setup Guide

## Overview

The AI Grid Agent is an intelligent Ollama + LangChain system that manages:
- ✅ Load prioritization based on grid conditions
- ✅ Efficient load balancing across renewable/non-renewable sources  
- ✅ Temperature-aware power management
- ✅ Reserve pool and backup power management
- ✅ Time-aware operational scheduling
- ✅ Real-time grid decision making

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (main.py)                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              AI Grid Agent (agent_orchestrator.py)            │   │
│  │                                                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│  │  │   Ollama    │  │  LangChain  │  │   Tools    │          │   │
│  │  │   LLM       │→ │   Agents    │→ │  Framework │          │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │
│  │         ↑                                    ↓                │   │
│  │         │                                    │                │   │
│  │  ┌──────────────────────────────────────────────────┐       │   │
│  │  │        Grid Management Components                │       │   │
│  │  ├─ Energy Pool (Renewable/Non-renewable)           │       │   │
│  │  ├─ Thermal Manager (Temperature tracking)          │       │   │
│  │  ├─ Reserve Manager (Backup power)                  │       │   │
│  │  ├─ Load Prioritizer (Criticality-aware shedding)   │       │   │
│  │  ├─ Load Balancer (Efficient distribution)          │       │   │
│  │  └─ Schedule Optimizer (Time-aware decisions)       │       │   │
│  │  └──────────────────────────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            ↓                                         │
│           REST API Endpoints (New /agent/* endpoints)               │
└─────────────────────────────────────────────────────────────────────┘
         ↓                              ↓
    (Remote)                     (IoT Data)
    Ollama Instance              MQTT Stream
    on Other Laptop
```

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `fastapi` & `uvicorn` - Web framework
- `paho-mqtt` - MQTT client
- `langchain>=0.1.0` - Agent framework
- `langchain-community>=0.0.1` - Community tools
- `ollama>=0.1.0` - Ollama Python client
- `pydantic>=2.0.0` - Data validation
- `python-dotenv>=1.0.0` - Environment variables

### 2. Set Up Remote Ollama on Your Other Laptop

On the laptop with Ollama:

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server (listens on 0.0.0.0:11434)
ollama serve

# In another terminal, pull a model
ollama pull mistral
# or: ollama pull llama2
# or: ollama pull neural-chat
```

To make it accessible from other machines, expose the port:
```bash
# On the laptop running Ollama
ollama serve --host 0.0.0.0:11434
```

Get your laptop's IP address:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 3. Configure Endpoint and Model

**Option A: Via Environment Variables**

Create a `.env` file in the `backend/` directory:

```bash
OLLAMA_ENDPOINT=http://192.168.1.100:11434  # Replace with your laptop's IP
OLLAMA_MODEL=mistral                        # or llama2, neural-chat, etc.
```

**Option B: Via API Endpoint (Runtime)**

```bash
curl -X POST http://localhost:8000/agent/configure \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "http://192.168.1.100:11434",
    "model_name": "mistral"
  }'
```

**Option C: Default (Local Ollama)**

If Ollama is running locally:
```bash
# Default endpoint: http://localhost:11434
# Default model: mistral
```

### 4. Run the Backend

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
1. Initialize MQTT connection
2. Create the AI Grid Agent with configured Ollama endpoint
3. Start the simulation loop

### 5. Test the Agent

Run the test suite:
```bash
python test_agent.py
```

This tests all components without requiring Ollama:
- Energy pool management
- Thermal management
- Reserve management  
- Load prioritization
- Load balancing
- Schedule optimization

## API Endpoints

### Agent Configuration

**Configure Ollama endpoint and model:**
```bash
POST /agent/configure
Content-Type: application/json

{
  "endpoint": "http://192.168.1.100:11434",
  "model_name": "mistral"
}
```

**Get current configuration:**
```bash
GET /agent/config
```

### Agent Decision Making

**Ask agent to make a decision:**
```bash
POST /agent/decide
Content-Type: application/json

{
  "query": "What should we do to manage the grid efficiently right now? Consider thermal constraints and renewable energy."
}
```

**Get agent status:**
```bash
GET /agent/status
```

### Example Queries

```bash
# Load management
"How should we balance the current 750 MW demand between renewable and non-renewable sources?"

# Thermal management
"The system temperature is rising. What should we do?"

# Emergency situations
"We're experiencing peak demand of 900 MW. What are our options?"

# Time-based optimization
"What's the optimal strategy for managing the grid at this time of day?"

# Energy mix optimization
"How can we increase renewable energy usage while maintaining reliability?"
```

## Environment Variables

Create a `.env` file in `backend/`:

```env
# Ollama Configuration (required for agent)
OLLAMA_ENDPOINT=http://192.168.1.100:11434
OLLAMA_MODEL=mistral

# MQTT Configuration (optional)
MQTT_BROKER=broker.hivemq.com
MQTT_PORT=1883
```

## Supported Ollama Models

Popular models that work well for grid management decisions:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| mistral | 7B | Fast | Good |
| llama2 | 7B | Medium | Good |
| neural-chat | 7B | Medium | Good |
| openchat | 7B | Fast | Good |
| dolphin-mixtral | 8x7B | Slow | Excellent |

Install a model with:
```bash
ollama pull mistral
```

## Component Details

### Energy Pool
- Manages 6 energy sources (Solar, Wind, Hydro, Coal, Gas, Battery)
- Tracks renewable vs non-renewable availability
- Calculates cost and carbon footprint per allocation

### Thermal Manager
- Monitors system temperature
- Sets safety (45°C) and critical (55°C) thresholds
- Calculates cooling requirements
- Adjusts grid behavior based on thermal state

### Reserve Manager
- Maintains spinning (instant) and non-spinning (minutes) reserves
- Ensures 15% minimum reserve of peak demand
- Manages backup fuel (30-day reserve)
- Activates emergency backup when needed

### Load Prioritizer
- 6 priority levels: Hospital (1) → Commercial (6)
- Criticality-aware load shedding cascade
- Responds to thermal, reserve, and demand urgencies
- Protects critical services (hospital, water treatment)

### Load Balancer
- Distributes demand across energy sources
- Prioritizes renewable energy (70% target)
- Minimizes cost and carbon footprint
- Reports efficiency metrics

### Schedule Optimizer
- Time-of-day aware decisions
- Identifies grid periods (morning peak, daytime, evening peak, night)
- Provides period-specific recommendations
- Optimizes renewable penetration by time

## Troubleshooting

### Agent initialization fails
```
Error: Connection refused to http://localhost:11434
```
Solution: Check that Ollama is running and accessible
```bash
curl http://your-ollama-endpoint:11434/api/tags
```

### CORS issues with Ollama
Ollama might not be accessible from frontend. Use backend as proxy (already handled in main.py).

### Slow response times
- Use a lighter model: `ollama pull mistral` instead of larger models
- Reduce agent iterations in `agent_orchestrator.py` (line: `max_iterations=10`)

### Model not found
```bash
ollama list              # List available models
ollama pull mistral      # Download a model
```

## Performance Tuning

Edit `agent_orchestrator.py`:

```python
# Line ~420: Reduce iterations for faster responses
self.agent_executor = AgentExecutor.from_agent_and_tools(
    agent=self.agent,
    tools=tools,
    verbose=True,
    max_iterations=5  # Reduce from 10 to 5 for faster decisions
)

# Adjust temperature for more/less creative responses
self.llm = Ollama(
    base_url=self.config.endpoint,
    model=self.config.model_name,
    temperature=0.3  # Lower = more deterministic, Higher = more creative
)
```

## Integration with Frontend

The frontend can call the agent via:

```javascript
// Configure agent
await fetch('http://localhost:8000/agent/configure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'http://192.168.1.100:11434',
    model_name: 'mistral'
  })
});

// Get agent decision
const response = await fetch('http://localhost:8000/agent/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What should we do now?'
  })
});

const decision = await response.json();
console.log(decision.decision);
```

## Advanced Features

### Custom Tools
Add new tools to the agent by creating functions with `@tool` decorator:

```python
@tool
def your_custom_tool(param: str) -> str:
    """Description of what this tool does"""
    # Your implementation
    return json.dumps(result, indent=2)
```

Then add to the `tools` list in `GridAgent._initialize_agent()`.

### Custom Prompt Engineering
Modify the system prompt in `GridAgent._initialize_agent()` to change agent behavior.

### Persistence
Add database storage for decisions, temperature logs, and energy allocations.

## Security Considerations

- Ollama endpoint should be secured (firewall rules)
- API endpoints should be authenticated in production
- Consider rate limiting on `/agent/decide` endpoint
- Store sensitive configuration in environment variables, not code

## Next Steps

1. ✅ Install dependencies
2. ✅ Set up Ollama on remote laptop
3. ✅ Configure endpoint and model via `.env` or API
4. ✅ Run backend: `python -m uvicorn main:app --reload`
5. ✅ Test agent: `python test_agent.py`
6. ✅ Integrate with frontend
7. ✅ Monitor logs and adjust parameters

## Support

For issues or questions:
- Check Ollama logs: `ollama serve`
- Check backend logs: Terminal output from uvicorn
- Test connectivity: `curl http://ollama-endpoint:11434/api/tags`
