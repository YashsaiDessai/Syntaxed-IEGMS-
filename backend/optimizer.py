"""
optimizer.py - Peak load optimization logic for the smart grid.

Decision rules:
    load > CRITICAL_THRESHOLD  → Emergency: shed load + discharge battery
    load > HIGH_THRESHOLD      → Warning:   reduce non-essential load
    load <= HIGH_THRESHOLD     → Normal operation
"""

HIGH_THRESHOLD = 120.0      # MW / arbitrary load units
CRITICAL_THRESHOLD = 150.0  # MW / arbitrary load units
COST_PER_UNIT = 0.12        # USD per load unit above threshold


def optimize(current_load: float, predicted_load: float) -> dict:
    """
    Determine the optimal operation mode and cost-saving estimate.

    Args:
        current_load:   Most recent measured load value.
        predicted_load: ML-predicted next load value.

    Returns:
        Dict with keys:
            status      - Human-readable operational status
            action      - Recommended action string
            alert       - Boolean, True when load is above HIGH_THRESHOLD
            savings_usd - Estimated cost savings from intervention (USD)
            threshold   - The threshold used for comparison
    """
    # Use the higher of current or predicted load for proactive decisions
    effective_load = max(current_load, predicted_load)

    if effective_load > CRITICAL_THRESHOLD:
        action = "🚨 EMERGENCY: Shed non-critical load & discharge battery storage"
        status = "Critical Overload"
        alert = True
        excess = effective_load - CRITICAL_THRESHOLD
    elif effective_load > HIGH_THRESHOLD:
        action = "⚠️  WARNING: Reduce non-essential load & activate demand response"
        status = "High Load - Intervention Required"
        alert = True
        excess = effective_load - HIGH_THRESHOLD
    else:
        action = "✅ Normal operation – grid is stable"
        status = "Normal"
        alert = False
        excess = 0.0

    savings_usd = round(excess * COST_PER_UNIT, 2)

    return {
        "status": status,
        "action": action,
        "alert": alert,
        "savings_usd": savings_usd,
        "threshold": HIGH_THRESHOLD,
        "current_load": round(current_load, 2),
        "predicted_load": round(predicted_load, 2),
        "effective_load": round(effective_load, 2),
    }
