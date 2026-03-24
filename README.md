# ⚡ Syntaxed-IEGMS (Intelligent Energy Grid Management System)

> **Quantexera Hackathon 2026** · Real-time grid monitoring + ML prediction + optimization dashboard + **AI Agent**

### Team members:
- Prashant Goundadkar
- Hussain Shaikh
- Abhishek A Pillai
- Jagadeesh Kadlimatti
- Yashsai Dessai

---

## 🎯 What's New: AI Agent

We've added an **Ollama + LangChain-powered AI agent** for intelligent grid management! 

✨ **New Features:**
- 🤖 **Intelligent Load Prioritization** - AI-driven critical vs non-critical decisions
- ♻️ **Renewable Energy Optimization** - Smart allocation between green and traditional sources
- 🌡️ **Temperature-Aware Management** - Proactive thermal constraint handling
- 📊 **Real-time Load Balancing** - Efficient distribution across 6 energy sources
- 🔄 **Reserve & Backup Management** - Emergency power planning
- ⏰ **Time-Aware Scheduling** - Period-optimized grid operations

See **[AGENT_SETUP.md](AGENT_SETUP.md)** and **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** for details.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│   ┌─────────────────────┐          ┌──────────────────────────────┐ │
│   │   IoT Simulator     │ MQTT     │    FastAPI Backend           │ │
│   │   simulator.py      │─────────►│    main.py                   │ │
│   │                     │          │    mqtt_client.py            │ │
│   └─────────────────────┘          │    ml_model.py               │ │
│                                     │    optimizer.py              │ │
│                                     └──────────┬───────────────────┘ │
│                                                │                      │
│                      ┌─────────────────────────┼──────────────────┐  │
│                      │                         │                  │  │
│                      ▼                         ▼                  ▼  │
│        ┌───────────────────────┐  ┌──────────────────────┐ REST API │
│        │   AI Grid Agent       │  │   Data Endpoints     │ (/agent) │
│        │ (agent_orchestrator)  │  │ (/health, /data...)  │          │
│        │                       │  │                      │          │
│        │ ┌─ Load Prioritizer  │  └──────────────────────┘          │
│        │ ├─ Load Balancer     │              │                     │
│        │ ├─ Thermal Manager   │              ▼                     │
│        │ ├─ Reserve Manager   │      ┌──────────────────┐          │
│        │ ├─ Energy Pool       │      │   Frontend       │          │
│        │ └─ Schedule Optimizer│      │ (Dashboard UI)   │          │
│        │        ▲              │      │ (Chart.js)       │          │
│        │        │              │      └──────────────────┘          │
│        │     (Ollama LLM)      │                                     │
│        │     Remote Instance   │                                     │
│        └───────────────────────┘                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 Folder Structure

```
project-root/
├── backend/
│   ├── main.py                   ← FastAPI server (with AI agent endpoints)
│   ├── agent_orchestrator.py     ← ⭐ NEW: AI Grid Agent (684 lines)
│   ├── mqtt_client.py            ← MQTT subscriber + in-memory store
│   ├── ml_model.py               ← Linear regression load predictor
│   ├── optimizer.py              ← Peak load optimization logic
│   ├── test_agent.py             ← ⭐ NEW: Test suite (all tests pass ✓)
│   ├── example_client.py         ← ⭐ NEW: Example API client
│   ├── requirements.txt           ← Updated with langchain, ollama
│   ├── .env.example              ← ⭐ NEW: Configuration template
│   └── quick_start.sh            ← ⭐ NEW: Quick start script
├── simulator/
│   └── simulator.py              ← IoT load data publisher (MQTT)
├── frontend/
│   ├── index.html                ← Dashboard UI
│   ├── app.js                    ← Chart.js + API polling
│   └── style.css                 ← Dark-mode glassmorphism design
├── AGENT_SETUP.md                ← ⭐ NEW: Detailed agent setup guide
├── API_DOCUMENTATION.md          ← ⭐ NEW: Complete REST API docs
├── IMPLEMENTATION_SUMMARY.md     ← ⭐ NEW: Technical summary
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Ollama (Remote Laptop)

On the laptop with Ollama:
```bash
ollama serve
# In another terminal:
ollama pull mistral
```

Get your laptop's IP: `ifconfig | grep "inet "`

### 3. Set Environment Variables

Create `backend/.env`:
```env
OLLAMA_ENDPOINT=http://192.168.1.100:11434  # Your laptop IP
OLLAMA_MODEL=mistral
```

### 4. Start Backend

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The agent initializes automatically! ✅

### 5. Test the Agent

```bash
python test_agent.py              # Local tests (no Ollama needed)
python example_client.py          # Test API with Ollama
```

### 6. Open Frontend

```bash
cd frontend
python -m http.server 3000
# Visit http://localhost:3000
```

---

## 🔌 API Endpoints

### Grid Management (Original)
| Method | Endpoint      | Description                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/health`     | Health check                                 |
| GET    | `/data`       | Last 20 MQTT grid readings                   |
| GET    | `/optimize`   | Grid optimization result                     |
| POST   | `/set_time`   | Set simulation time                          |

### AI Agent (New)
| Method | Endpoint           | Description                                  |
|--------|-------------------|----------------------------------------------|
| POST   | `/agent/configure` | Configure Ollama endpoint & model            |
| GET    | `/agent/config`    | Get agent configuration                      |
| POST   | `/agent/decide`    | Request AI decision                          |
| GET    | `/agent/status`    | Get agent status & analysis                  |

---

## 🤖 Agent Decision Examples

### Query: Load Balancing
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "How should we balance 750 MW demand efficiently?"}'
```

### Query: Thermal Management
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "System temperature is 50°C. What actions should we take?"}'
```

### Query: Emergency Response
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "Reserve dropped below 100 MW. Emergency protocol?"}'
```

---

## 📊 Agent Capabilities

### Energy Management
- 6 energy sources (Solar, Wind, Hydro, Coal, Gas, Battery)
- Renewable vs non-renewable optimization
- Cost and carbon footprint tracking

### Load Prioritization
- 6-level priority hierarchy
- Hospital → Emergency Services (cannot shed)
- Water Treatment (essential)
- School → Industry → Residential → Commercial

### Thermal Constraints
- Real-time temperature monitoring
- Safety (45°C) and critical (55°C) thresholds
- Cooling capacity management

### Reserve Management
- Spinning and non-spinning reserves
- 15% minimum reserve enforcement
- Emergency backup planning

### Time-Aware Scheduling
- Morning peak, daytime, evening peak, night periods
- Period-specific optimization recommendations
- Renewable penetration targets by time

---

## 📚 Documentation

- **[AGENT_SETUP.md](AGENT_SETUP.md)** - Complete setup guide, troubleshooting, customization
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Full REST API reference with examples
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical overview, architecture, results

---

## ✅ Test Results

All components tested and working:

```
✓ Energy Pool Management (6 sources, 1400 MW capacity)
✓ Thermal Management (Temperature tracking, thresholds)
✓ Reserve Management (250 MW available, 120 MW required)
✓ Load Prioritization (Cascade-based shedding)
✓ Load Balancing (70% renewable efficiency)
✓ Schedule Optimization (Time-aware decisions)
✓ Agent Configuration (Remote Ollama ready)
```

---

## 🎯 Use Cases

### 1. Peak Demand Management
Agent recommends load shedding by priority, battery discharge, and non-renewable activation

### 2. Thermal Safety
Detects rising temperature and suggests load reduction, cooling activation, renewable prioritization

### 3. Emergency Response
Handles reserve depletion with immediate actions: backup activation, load shedding cascade

### 4. Renewable Optimization
Analyzes wind/solar availability, recommends battery charging windows, cost/CO2 optimization

### 5. Real-time Decision Support
Provides context-aware analysis combining temperature, reserves, demand, renewable availability

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Ollama** - Local LLM inference (remote instance)
- **LangChain** - Agent framework
- **MQTT** - Real-time data streaming
- **Pydantic** - Data validation

### AI Agent
- Decision tree with 8+ specialized tools
- Context-aware LLM prompting
- Real-time grid constraint analysis
- Configurable model and endpoint

### Frontend
- **Three.js** - 3D grid visualization
- **Chart.js** - Real-time metrics
- **REST API** - Dynamic updates

---

## 🔄 Integration with Existing System

The agent seamlessly integrates with:
- ✅ MQTT data stream (reads actual loads)
- ✅ ML predictions (incorporates forecasts)
- ✅ Existing optimizer (complements decisions)
- ✅ Frontend dashboard (displays agent recommendations)

---

## 📈 Performance

- **Agent Response Time**: 3-4 seconds (mistral model)
- **Load Balancing Efficiency**: 70% renewable target
- **Thermal Constraint**: Proactive at 45°C threshold
- **Reserve Adequacy**: 15% minimum maintained

---

## 💡 Next Steps

1. ✅ Configure remote Ollama instance
2. ✅ Set environment variables (endpoint, model)
3. ✅ Run backend with agent auto-initialization
4. ✅ Test with `test_agent.py` and `example_client.py`
5. ✅ Integrate agent endpoints into frontend
6. ✅ Monitor logs and adjust parameters

---

## 🆘 Troubleshooting

**Agent not responding?**
```bash
# Check Ollama is accessible
curl http://your-ollama-ip:11434/api/tags

# Check environment variables
env | grep OLLAMA
```

**Slow responses?**
```bash
# Use faster model (mistral) or reduce temperature
# See AGENT_SETUP.md for performance tuning
```

For detailed troubleshooting, see **AGENT_SETUP.md**.

---

## 📞 Support

- See **AGENT_SETUP.md** for setup and troubleshooting
- See **API_DOCUMENTATION.md** for API reference
- See **IMPLEMENTATION_SUMMARY.md** for technical details
- Run `test_agent.py` to verify installation

---

**Status**: ✅ Complete & Tested  
**Version**: 2.0 (with AI Agent)  
**Date**: March 24, 2026

---

## 🤖 ML Model

- **Algorithm**: Linear regression (`numpy.polyfit`-style pure python implementation)
- **Input**: Rolling window of up to 20 recent load readings
- **Output**: Predicted next load value (MW)
- **Rationale**: Simple, fast, explainable — ideal for a hackathon demo

---

## ⚡ Optimization Logic

| Condition                        | Status              | Action                                  |
|----------------------------------|---------------------|-----------------------------------------|
| Load ≤ 120 MW                    | ✅ Normal           | No intervention needed                  |
| 120 MW < Load ≤ 150 MW           | ⚠️ High Load        | Activate demand response / reduce load  |
| Load > 150 MW                    | 🚨 Critical Overload | Shed load + discharge battery storage   |

**Cost saving estimate** = excess load × $0.12/unit

---

## 🎯 Demo Script (For Judges)

1. **Open the dashboard** — show the live load graph updating in real-time
2. **Point out the ML prediction** — the dashed yellow line forecasts the next reading
3. **Wait for or explain a spike** — the simulator has a ~12% chance of a spike per reading
4. **Show the alert banner** — appears automatically when load exceeds 120 MW
5. **Highlight the optimization decision** — explains the exact action the grid should take
6. **Cost savings card** — quantifies the economic benefit of the intervention

---

## 🛠️ Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Backend       | Python 3.11+, FastAPI, Uvicorn    |
| ML            | Python custom linear regression   |
| IoT Transport | MQTT via paho-mqtt                |
| MQTT Broker   | broker.hivemq.com (public)        |
| Frontend      | HTML5, Vanilla JS, Chart.js 4     |
| Styling       | Vanilla CSS (dark glassmorphism)  |
| Storage       | In-memory deque (no DB required)  |
