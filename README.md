# ⚡ Syntaxed-IEGMS (Intelligent Energy Grid Management System)

> **Quantexera Hackathon 2026** · Real-time grid monitoring + ML prediction + optimization dashboard

### Team members:
- Prashant Goundadkar
- Hussain Shaikh
- Abhishek A Pillai
- Jagadeesh Kadlimatti
- Yashsai Dessai

---

## 🏗️ Architecture

```
┌─────────────────────┐     MQTT (test.mosquitto.org)     ┌─────────────────────┐
│   IoT Simulator     │  ──────────────────────────────►  │   FastAPI Backend   │
│  simulator.py       │      topic: grid/data              │   main.py           │
│  (publishes every   │                                    │   mqtt_client.py    │
│   2 seconds)        │                                    │   ml_model.py       │
└─────────────────────┘                                    │   optimizer.py      │
                                                           └──────────┬──────────┘
                                                                      │ REST API
                                                                      │ (HTTP polling)
                                                           ┌──────────▼──────────┐
                                                           │   Frontend          │
                                                           │   index.html        │
                                                           │   app.js / style.css│
                                                           │   Chart.js          │
                                                           └─────────────────────┘
```

## 📁 Folder Structure

```
project-root/
├── backend/
│   ├── main.py          ← FastAPI server (API endpoints)
│   ├── mqtt_client.py   ← MQTT subscriber + in-memory store
│   ├── ml_model.py      ← Linear regression load predictor
│   ├── optimizer.py     ← Peak load optimization logic
│   └── requirements.txt
├── simulator/
│   └── simulator.py     ← IoT load data publisher (MQTT)
├── frontend/
│   ├── index.html       ← Dashboard UI
│   ├── app.js           ← Chart.js + API polling
│   └── style.css        ← Dark-mode glassmorphism design
└── README.md
```

---

## 🚀 How to Run

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

Simply open `frontend/index.html` in your browser, or run `. . . /frontend> python -m http.server 3000` and visit `http://localhost:3000`.

The dashboard auto-refreshes every 2 seconds.

---

## 🔌 API Endpoints

| Method | Endpoint      | Description                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/health`     | Health check                                 |
| GET    | `/data`       | Last 20 MQTT grid readings                   |
| GET    | `/prediction` | ML-predicted next load value                 |
| GET    | `/optimize`   | Optimization decision + cost-saving estimate |
| GET    | `/docs`       | Interactive Swagger UI                       |

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
