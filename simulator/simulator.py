"""
simulator.py - V2 IoT Simulator (Multi-Entity + Time Sync)

Publishes data for 4 entities (hospital, school, industry, residential).
Subscribes to `grid/time_sync` to stay perfectly in sync with the backend's
global 24-minute clock. Even if the user drags the time slider, the simulator
instantly adjusts its published loads.
"""

import json
import random
import threading
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_PUB = "iegms/syntaxed/grid/data"
TOPIC_SYNC = "iegms/syntaxed/grid/time_sync"
PUBLISH_INTERVAL = 2  # seconds

# Global simulated time in hours (0.0 to 24.0)
simulated_hour = 0.0
_lock = threading.Lock()

# Define the base curves so the simulator generates realistic noise around the expected ML value
PROFILES = {
    "hospital": {0: 80, 6: 85, 12: 100, 18: 95, 24: 80},
    "school": {0: 1, 6: 5, 8: 90, 12: 110, 15: 85, 18: 15, 24: 1},
    "industry": {0: 5, 5: 15, 7: 150, 12: 160, 17: 140, 19: 30, 24: 5},
    "residential": {0: 40, 6: 70, 9: 50, 15: 60, 18: 150, 21: 180, 24: 40}
}

def _interpolate(hour: float, curve: dict) -> float:
    hour = hour % 24.0
    times = sorted(curve.keys())
    for i in range(len(times) - 1):
        t1, t2 = times[i], times[i+1]
        if t1 <= hour <= t2:
            return curve[t1] + ((hour - t1) / (t2 - t1)) * (curve[t2] - curve[t1])
    return curve[times[0]]

def generate_loads(hour: float) -> dict:
    """Generate loads for all 4 entities with +/- 5% random IoT noise."""
    loads = {}
    for entity, curve in PROFILES.items():
        base = _interpolate(hour, curve)
        noise = base * random.uniform(-0.05, 0.05)
        # 2% chance of an unexpected machine spike
        spike = base * 0.4 if random.random() < 0.02 else 0.0 
        loads[entity] = round(max(0.0, base + noise + spike), 2)
    return loads


# ── MQTT Callbacks ───────────────────────────────────────────────────────────

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[SIM] Connected to {BROKER}. Subscribing to '{TOPIC_SYNC}'...")
        client.subscribe(TOPIC_SYNC)
    else:
        print(f"[SIM] Connection failed ({reason_code}). Retrying...")

def on_message(client, userdata, msg):
    """Listen for time syncs from the backend."""
    global simulated_hour
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        if "simulated_hour" in payload:
            with _lock:
                simulated_hour = float(payload["simulated_hour"])
            print(f"[SIM] Time sync received: {simulated_hour:.2f}h")
    except Exception:
        pass


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"[SIM] Starting IoT Simulator... Connecting to {BROKER}")
    while True:
        try:
            client.connect(BROKER, PORT, keepalive=60)
            break
        except Exception as e:
            print(f"[SIM] Couldn't connect ({e}). Retrying in 5s...")
            time.sleep(5)
            
    client.loop_start()

    try:
        while True:
            with _lock:
                current_hr = simulated_hour
            
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "simulated_hour": round(current_hr, 2),
                "loads": generate_loads(current_hr),
                "source": "simulator_v2"
            }
            client.publish(TOPIC_PUB, json.dumps(payload))
            print(f"[SIM] Published at {current_hr:.2f}h -> {payload['loads']}")
            time.sleep(PUBLISH_INTERVAL)
    except KeyboardInterrupt:
        print("\n[SIM] Stopped.")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
