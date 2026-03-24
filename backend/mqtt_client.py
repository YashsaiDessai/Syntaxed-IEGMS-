"""
mqtt_client.py - V2 Backend MQTT Connection

Handles subscriptions to simulated data and allows main.py to publish 
the master time sync back to the simulator.
"""

import json
import threading
import time
from collections import deque

import paho.mqtt.client as mqtt

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_DATA = "iegms/syntaxed/grid/data"
TOPIC_SYNC = "iegms/syntaxed/grid/time_sync"
MAX_RECORDS = 500
RETRY_INTERVAL = 10

data_store: deque = deque(maxlen=MAX_RECORDS)
_lock = threading.Lock()
_connected = False

# We'll need a global client reference so main can publish
_global_client = None

def on_connect(client, userdata, flags, reason_code, properties):
    global _connected
    if reason_code == 0:
        _connected = True
        print(f"[MQTT] Connected to {BROKER}. Subscribing to '{TOPIC_DATA}' …")
        client.subscribe(TOPIC_DATA)
    else:
        print(f"[MQTT] Connection refused – reason_code={reason_code}")

def on_disconnect(client, userdata, flags, reason_code, properties):
    global _connected
    _connected = False
    print(f"[MQTT] Disconnected (reason_code={reason_code}).")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        # Only store the V2 multi-entity payloads
        if "loads" in payload:
            with _lock:
                data_store.append(payload)
    except json.JSONDecodeError:
        pass

def get_recent(n: int = 1) -> list:
    with _lock:
        return list(data_store)[-n:]

def publish_time_sync(simulated_hour: float):
    """Called by main loop to broadcast the master clock to the simulator."""
    global _global_client, _connected
    if _connected and _global_client:
        payload = json.dumps({"simulated_hour": round(simulated_hour, 2)})
        _global_client.publish(TOPIC_SYNC, payload)


def _run_mqtt():
    global _global_client
    _global_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    _global_client.on_connect    = on_connect
    _global_client.on_disconnect = on_disconnect
    _global_client.on_message    = on_message

    while True:
        try:
            print(f"[MQTT] Connecting to {BROKER}:{PORT} …")
            _global_client.connect(BROKER, PORT, keepalive=60)
            _global_client.loop_forever()
        except Exception as exc:
            print(f"[MQTT] Down ({exc}). Retrying in {RETRY_INTERVAL}s …")
            time.sleep(RETRY_INTERVAL)


def start_mqtt() -> None:
    thread = threading.Thread(target=_run_mqtt, daemon=True, name="mqtt-listener")
    thread.start()
    print("[MQTT] Background listener thread started.")
