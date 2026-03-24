"""
main.py - FastAPI backend for the AI-Powered Smart Grid Optimizer.

Endpoints:
    GET /data        → last 20 MQTT readings
    GET /prediction  → ML-predicted next load value
    GET /optimize    → optimization decision + cost-saving estimate
    GET /health      → health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mqtt_client import start_mqtt, get_recent, get_loads
from ml_model import predict_load
from optimizer import optimize

app = FastAPI(
    title="Smart Grid Optimizer API",
    description="DERMS simulation backend with MQTT ingestion and ML prediction",
    version="1.0.0",
)

# Allow all origins so the HTML file can call the API from the filesystem or any dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Connect to MQTT broker when the server starts."""
    start_mqtt()


# ──────────────────────────────────────────
# Routes
# ──────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/data")
def get_data():
    """Return the last 20 grid readings received over MQTT."""
    records = get_recent(20)
    return {
        "count": len(records),
        "readings": records,
    }


@app.get("/prediction")
def get_prediction():
    """Run the ML model and return a predicted load value."""
    loads = get_loads()
    predicted = predict_load(loads)
    return {
        "predicted_load": predicted,
        "based_on_samples": len(loads),
    }


@app.get("/optimize")
def get_optimize():
    """Return the optimization decision and estimated cost savings."""
    records = get_recent(20)
    loads = get_loads()

    if records:
        current_load = records[-1].get("load", 0.0)
    else:
        current_load = 0.0

    predicted = predict_load(loads)
    result = optimize(current_load, predicted)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
