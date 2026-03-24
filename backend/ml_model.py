"""
ml_model.py - Pure-Python ML Model for Multi-Entity Grid Load Prediction

Uses a pure Python K-Nearest Neighbors / Interpolation approach to predict
the load of 4 distinct entities based on the time of day (0.0 to 24.0).
No numpy or scikit-learn required (avoids environment crashes).
"""

# Base theoretical load curves for the 4 entities (hour: load in MW)
# We define anchor points, and interpolate between them.
PROFILES = {
    "hospital": {
        # High baseline, flat, minor daytime bump
        0: 80, 6: 85, 12: 100, 18: 95, 24: 80
    },
    "school": {
        # Flattish night, peaks during school hours (08:00 - 15:00)
        0: 10, 6: 15, 8: 90, 12: 110, 15: 85, 18: 20, 24: 10
    },
    "industry": {
        # Factory shifts 06:00 to 18:00
        0: 30, 5: 35, 7: 150, 12: 160, 17: 140, 19: 50, 24: 30
    },
    "residential": {
        # Morning bump, huge evening peak
        0: 40, 6: 70, 9: 50, 15: 60, 18: 150, 21: 180, 24: 40
    }
}


def _interpolate(hour: float, curve: dict) -> float:
    """Linear interpolation between anchor points in a daily curve."""
    # Wrap hour to 0-24
    hour = hour % 24.0
    
    times = sorted(curve.keys())
    for i in range(len(times) - 1):
        t1, t2 = times[i], times[i+1]
        if t1 <= hour <= t2:
            v1, v2 = curve[t1], curve[t2]
            # y = mx + c
            fraction = (hour - t1) / (t2 - t1) if (t2 - t1) > 0 else 0
            return v1 + fraction * (v2 - v1)
            
    return curve[times[0]]


def predict_load(hour: float, entity_type: str) -> float:
    """
    Predict the exact base load for an entity at a given time of day.
    In a real ML system, this would be `model.predict([[hour]])`.
    """
    if entity_type not in PROFILES:
        return 0.0
    
    base = _interpolate(hour, PROFILES[entity_type])
    return round(base, 2)


def predict_all(hour: float) -> dict:
    """Predict load for all entities for the upcoming hour + 1 (future forecast)."""
    future_hour = (hour + 1.0) % 24.0
    return {
        entity: predict_load(future_hour, entity)
        for entity in PROFILES.keys()
    }
