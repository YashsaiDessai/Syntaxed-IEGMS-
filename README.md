# Syntaxed-IEGMS (Intelligent Energy Grid Management System)

> **Quantexera Hackathon 2026** · Real-time grid monitoring + ML prediction + optimization dashboard + **AI Agent**

### Team members:
- Prashant Goundadkar
- Hussain Shaikh
- Abhishek A Pillai
- Jagadeesh Kadlimatti
- Yashsai Dessai

---

##  Architecture

```
┌─────────────────────┐     MQTT (broker.hivemq.com)      ┌─────────────────────┐
│   IoT Simulator     │  ──────────────────────────────►  │   FastAPI Backend   │
│  simulator.py       │   topic: iegms/syntaxed/grid/data  │   main.py           │
│  (publishes every   │                                    │   mqtt_client.py    │
│   2 seconds)        │ ◄───────────────────────────────   │   ml_model.py       │
│                     │   topic: .../time_sync             │   optimizer.py      │
└─────────────────────┘                                    │   agent_orchestrator│
                                                           └──────────┬──────────┘
                                                                      │ REST API
                                                                      │ (HTTP polling)
                                                           ┌──────────▼──────────┐
                                                           │   Frontend (3D)     │
                                                           │   index.html        │
                                                           │   app.js / style.css│
                                                           │   Three.js          │
                                                           └─────────────────────┘
```

## Folder Structure

```
project-root/
├── backend/
│   ├── main.py                   ← FastAPI server (with AI agent endpoints)
│   ├── agent_orchestrator.py     ← AI Grid Agent (Ollama/LangChain, optional)
│   ├── mqtt_client.py            ← MQTT subscriber + in-memory store
│   ├── ml_model.py               ← Linear interpolation load predictor
│   ├── optimizer.py              ← Priority load shedding + battery logic
│   ├── test_agent.py             ← AI agent test suite
│   ├── example_client.py         ← Example API client
│   ├── requirements.txt          ← Dependencies
│   └── .env.example              ← Configuration template
├── simulator/
│   └── simulator.py              ← IoT load data publisher (MQTT)
├── frontend/
│   ├── index.html                ← 3D Simulation UI
│   ├── app.js                    ← Three.js scene + API polling
│   └── style.css                 ← Dark-mode glassmorphism design
└── README.md
```

---

## How to Run

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend (Terminal 1)

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### 3. Start the IoT Simulator (Terminal 2)

```bash
cd simulator
python simulator.py
```

The simulator publishes a new grid reading every **2 seconds** via MQTT.

### 4. Open the Frontend

```bash
cd frontend
python -m http.server 3000
# Visit http://localhost:3000
```

The dashboard auto-refreshes every 2 seconds.

---

##AI Agent (Optional)

An **Ollama + LangChain-powered AI agent** is included for intelligent grid management decisions.

### Setup

1. Install optional dependencies:
```bash
pip install langchain langchain-community ollama
```

2. Run Ollama on a machine (locally or remote):
```bash
ollama serve
ollama pull gemma3:1b
```

3. Configure the endpoint:
```env
# backend/.env
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=mistral
```

### AI Agent Endpoints

| Method | Endpoint           | Description                     |
|--------|-------------------|---------------------------------|
| POST   | `/agent/configure` | Configure Ollama endpoint/model |
| GET    | `/agent/config`    | Get agent configuration         |
| POST   | `/agent/decide`    | Request AI grid decision        |
| GET    | `/agent/status`    | Get agent status & analysis     |

---

## 🔌 Grid API Endpoints

| Method | Endpoint      | Description                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/health`     | Health check                                 |
| GET    | `/data`       | Last 20 MQTT grid readings                   |
| GET    | `/optimize`   | Optimization decision + battery/shed status  |
| POST   | `/set_time`   | Jump simulation to a specific hour           |
| GET    | `/docs`       | Interactive Swagger UI                       |

---

## Optimization Logic

| Condition                     | Status          | Action                                  |
|-------------------------------|------------------|-----------------------------------------|
| Load ≤ 900 MW                 | ✅ Normal        | Charge battery with excess              |
| Load > 900 MW (battery helps) | ⚠️ Warning       | Discharge battery, alert                |
| Load > 900 MW (still deficit) | 🚨 Critical      | Shed by priority (Residential → School) |

**Priority**: Hospital > School > Industry > Residential

---

## Demo Script (For Judges)

1. **Open the 3D dashboard** — live voxel city with real-time telemetry
2. **Drag the Time Slider** — watch buildings light up/dim as day turns to night
3. **Power Plants** — two plants feed the grid battery via blue supply lines
4. **Orchestrator Log** — AI takes live shedding decisions every 2 seconds
5. **Battery Meter** — charges when excess grid power, discharges on peak demand
6. **Status badge** — NORMAL → WARNING → CRITICAL as load increases

---

## 🛠️ Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Backend       | Python 3.11+, FastAPI, Uvicorn    |
| ML            | Custom time-interpolation model   |
| AI Agent      | LangChain + Ollama (optional)     |
| IoT Transport | MQTT via paho-mqtt                |
| MQTT Broker   | broker.hivemq.com (public)        |
| Frontend 3D   | HTML5, Three.js r128              |
| Styling       | Vanilla CSS (dark glassmorphism)  |
| Storage       | In-memory deque (no DB required)  |
