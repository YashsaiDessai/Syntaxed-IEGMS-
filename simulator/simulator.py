"""
simulator.py - IoT load data simulator (paho-mqtt 2.x compatible).

Publishes a random grid load reading every 2 seconds to:
    broker : test.mosquitto.org
    topic  : grid/data

Payload format:
    {"timestamp": "...", "load": 95.4, "source": "simulator", "reading_no": 1}

Load pattern: base + noise + occasional spikes to trigger the alert.
"""

import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "grid/data"
PUBLISH_INTERVAL = 2  # seconds

BASE_LOAD = 90.0       # MW base demand
NOISE_RANGE = 30.0     # ± noise
SPIKE_CHANCE = 0.12    # 12 % chance of a spike per reading
SPIKE_EXTRA = 60.0     # Extra load during a spike


def generate_load() -> float:
    noise = random.uniform(-NOISE_RANGE, NOISE_RANGE)
    spike = SPIKE_EXTRA if random.random() < SPIKE_CHANCE else 0.0
    return round(max(10.0, BASE_LOAD + noise + spike), 2)


# paho-mqtt 2.x callbacks
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[SIM] Connected to {BROKER}. Publishing to '{TOPIC}' every {PUBLISH_INTERVAL}s …")
    else:
        print(f"[SIM] Connection failed (reason_code={reason_code}). Retrying…")


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect

    print("[SIM] Smart Grid IoT Simulator starting...")
    while True:
        try:
            client.connect(BROKER, PORT, keepalive=60)
            break
        except (OSError, TimeoutError, ConnectionRefusedError) as e:
            print(f"[SIM] Connection failed ({e}). Retrying in 5s...")
            time.sleep(5)
            
    client.loop_start()

    print("[SIM] Smart Grid IoT Simulator connected. Press Ctrl+C to stop.")

    reading_no = 0
    try:
        while True:
            load = generate_load()
            reading_no += 1
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "load": load,
                "source": "simulator",
                "reading_no": reading_no,
            }
            client.publish(TOPIC, json.dumps(payload))
            print(f"[SIM] Published #{reading_no}: load={load} MW")
            time.sleep(PUBLISH_INTERVAL)
    except KeyboardInterrupt:
        print("\n[SIM] Stopped.")
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
