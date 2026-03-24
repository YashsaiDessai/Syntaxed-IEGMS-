"""
ml_model.py - Pure-Python ML Model for Multi-Entity Grid Load Prediction

Uses a pure Python K-Nearest Neighbors / Interpolation approach to predict
the load of 4 distinct entities based on the time of day (0.0 to 24.0).
Incorporates time-based activity patterns:
  - Hospital: 24/7 operations (constant high baseline)
  - School: Active 8 AM - 5 PM (8:00-17:00), heavy morning/afternoon peak
  - Industry: Active 6 AM - 6 PM (6:00-18:00), two shifts with peaks
  - Residential: Night heavy (6 PM - 11 PM), morning rush (6 AM - 8 AM), sleeping (11 PM - 6 AM)
"""

# Base theoretical load curves for the 4 entities (hour: load in MW)
# We define anchor points, and interpolate between them.
# These reflect realistic daily patterns with time-based activities
PROFILES = {
    "hospital": {
        # High baseline, constant 24/7 operations
        # Minor peaks during day, slightly reduces night staff
        0: 78, 6: 82, 12: 105, 18: 95, 24: 78
    },
    "school": {
        # Dormant at night, rapid increase at 8 AM (classes start)
        # Peak during school hours (8 AM - 3 PM)
        # Drops sharply after 5 PM (closure)
        0: 8, 6: 12, 7: 15, 8: 95, 12: 125, 15: 100, 17: 25, 18: 20, 24: 8
    },
    "industry": {
        # Two work shifts: 6 AM - 12 PM and 12 PM - 6 PM
        # Heavy machinery operation during these hours
        # Minimal overnight (security/maintenance only)
        0: 25, 5: 30, 6: 140, 12: 165, 13: 155, 18: 60, 19: 40, 24: 25
    },
    "residential": {
        # Sleeping low load (0 AM - 6 AM)
        # Morning rush peak (6 AM - 8 AM) - breakfast, showers, AC
        # Daytime lower (most people at work/school)
        # Evening peak (6 PM - 10 PM) - cooking, heating, entertainment
        # Late night drops (10 PM onwards)
        0: 35, 6: 65, 8: 70, 9: 50, 15: 50, 18: 155, 21: 190, 23: 80, 24: 35
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
    Takes into account time-based activity patterns (school hours, work shifts, etc.)
    """
    if entity_type not in PROFILES:
        return 0.0
    
    base = _interpolate(hour, PROFILES[entity_type])
    
    # Apply activity modifiers based on entity type and time
    multiplier = 1.0
    
    if entity_type == "school":
        # School load is 0 when closed (5 PM - 8 AM next day)
        if hour >= 17 or hour < 8:
            multiplier = 0.1  # Minimal load after hours (security, HVAC)
        elif hour >= 8 and hour < 17:
            multiplier = 1.0  # Full load during school hours
        
    elif entity_type == "industry":
        # Factory load is minimal outside work hours
        if hour >= 18 or hour < 6:
            multiplier = 0.3  # Minimum load for security and maintenance
        elif hour >= 6 and hour < 18:
            multiplier = 1.0  # Full production during work hours
    
    elif entity_type == "residential":
        # Sleeping loads are minimal
        if hour >= 23 or hour < 6:
            multiplier = 0.4 if hour >= 23 or hour < 6 else 1.0  # Sleeping is very low load
        elif hour >= 6 and hour < 8:
            multiplier = 1.2  # Morning rush - breakfast, showers, AC
        elif hour >= 18 and hour < 22:
            multiplier = 1.1  # Evening peak - cooking, heating
    
    return round(base * multiplier, 2)


def predict_all(hour: float) -> dict:
    """Predict load for all entities for the upcoming hour + 1 (future forecast)."""
    future_hour = (hour + 1.0) % 24.0
    return {
        entity: predict_load(future_hour, entity)
        for entity in PROFILES.keys()
    }
