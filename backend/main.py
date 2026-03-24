"""
main.py - V2 FastAPI Engine

Handles the 24-minute global clock simulation, coordinates the ML predictions,
runs the optimizer, and serves the dashboard.
"""

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from mqtt_client import start_mqtt, get_recent, publish_time_sync
from ml_model import predict_all
from optimizer import optimize_grid, BATTERY_MAX_CHARGE

app = FastAPI(title="Smart Grid Optimizer V2 Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Simulation State ──────────────────────────────────────────────────
class AppState:
    simulated_hour = 6.0          # Start at 06:00
    battery_energy = 50.0         # Start with 50 MW in battery
    latest_opt = {}               # Cache of the last optimization result


# ── Background Engine Loop ───────────────────────────────────────────────────
async def simulation_loop():
    """Runs every 2 seconds. Advances time, runs optimization, updates battery."""
    while True:
        await asyncio.sleep(2)
        
        # Advance time: 2 real seconds = 2 simulated minutes (2/60 hours)
        AppState.simulated_hour = (AppState.simulated_hour + (2.0 / 60.0)) % 24.0
        
        # Broadcast time to IoT simulator
        publish_time_sync(AppState.simulated_hour)
        
        # Run optimization cycle
        predicted = predict_all(AppState.simulated_hour)
        recent = get_recent(1)
        actuals = recent[0].get("loads", {}) if recent else {}
        
        # Only run optimizer if we have actual data from the simulator
        if actuals:
            result = optimize_grid(actuals, predicted, AppState.battery_energy, AppState.simulated_hour)
            AppState.battery_energy = result["battery_energy"]
            
            # Enrich result for the frontend
            result["simulated_hour"] = round(AppState.simulated_hour, 2)
            result["predicted_loads"] = predicted
            AppState.latest_opt = result


@app.on_event("startup")
async def startup_event():
    start_mqtt()
    asyncio.create_task(simulation_loop())


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "simulated_hour": round(AppState.simulated_hour, 2)}

@app.get("/data")
def get_data():
    """Return the raw telemetry feed from MQTT."""
    records = get_recent(20)
    return {"count": len(records), "readings": records}

@app.get("/optimize")
def get_optimize():
    """Return the pre-calculated grid state (battery, loads, shedding actions)."""
    return AppState.latest_opt

class TimeRequest(BaseModel):
    hour: float

@app.post("/set_time")
def set_time(req: TimeRequest):
    """Allow the frontend slider to jump to a specific time of day."""
    val = max(0.0, min(24.0, req.hour))
    AppState.simulated_hour = val
    if isinstance(AppState.latest_opt, dict):
        AppState.latest_opt["simulated_hour"] = val
    return {"status": "success", "simulated_hour": val}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
