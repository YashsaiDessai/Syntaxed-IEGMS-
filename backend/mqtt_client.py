"""
mqtt_client.py - Non-blocking, auto-retrying MQTT subscriber (paho-mqtt 2.x).

The client connects in a background daemon thread with automatic reconnection
so start_mqtt() returns immediately and never blocks FastAPI startup.

Topic: grid/data  |  Broker: test.mosquitto.org
"""

import json
import threading
import time
from collections import deque

import paho.mqtt.client as mqtt

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "grid/data"
MAX_RECORDS = 500
RETRY_INTERVAL = 10  # seconds between reconnect attempts

data_store: deque = deque(maxlen=MAX_RECORDS)
_lock = threading.Lock()
_connected = False


# ── Callbacks (paho-mqtt 2.x / CallbackAPIVersion.VERSION2) ────────────────

def on_connect(client, userdata, flags, reason_code, properties):
    global _connected
    if reason_code == 0:
        _connected = True
        print(f"[MQTT] Connected to {BROKER}. Subscribing to '{TOPIC}' …")
        client.subscribe(TOPIC)
    else:
        print(f"[MQTT] Connection refused – reason_code={reason_code}")


def on_disconnect(client, userdata, flags, reason_code, properties):
    global _connected
    _connected = False
    print(f"[MQTT] Disconnected (reason_code={reason_code}).")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        with _lock:
            data_store.append(payload)
        print(f"[MQTT] Received: {payload}")
    except json.JSONDecodeError as exc:
        print(f"[MQTT] Bad payload ({exc}): {msg.payload}")


# ── Public helpers ──────────────────────────────────────────────────────────

def get_recent(n: int = 20) -> list:
    with _lock:
        return list(data_store)[-n:]


def get_loads() -> list:
    with _lock:
        return [r["load"] for r in data_store if "load" in r]


# ── Resilient background connection ────────────────────────────────────────

def _run_mqtt():
    """Connect with automatic retry so transient network errors are handled."""
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message

    while True:
        try:
            print(f"[MQTT] Connecting to {BROKER}:{PORT} …")
            client.connect(BROKER, PORT, keepalive=60)
            client.loop_forever()           # blocks until disconnect
        except (OSError, TimeoutError, ConnectionRefusedError) as exc:
            print(f"[MQTT] Could not connect ({exc}). Retrying in {RETRY_INTERVAL}s …")
            time.sleep(RETRY_INTERVAL)
        except Exception as exc:
            print(f"[MQTT] Unexpected error ({exc}). Retrying in {RETRY_INTERVAL}s …")
            time.sleep(RETRY_INTERVAL)


def start_mqtt() -> None:
    """Spawn the MQTT client as a daemon thread. Returns immediately."""
    thread = threading.Thread(target=_run_mqtt, daemon=True, name="mqtt-listener")
    thread.start()
    print("[MQTT] Background listener thread started.")
