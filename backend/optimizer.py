"""
optimizer.py - V2 AI Orchestrator Logic

Handles real-time priority load shedding and battery management.
Entities priority: Hospital > School > Industry > Residential.
"""

# Grid constraints (MW)
MAX_GRID_CAPACITY = 350.0  
BATTERY_MAX_CHARGE = 200.0
BATTERY_MAX_RATE = 50.0  # Max charge/discharge per iteration

PRIORITY = ["hospital", "school", "industry", "residential"]


def optimize_grid(actual_loads: dict, predicted_loads: dict, battery_energy: float) -> dict:
    """
    Given the current and predicted loads of the 4 entities, balance the grid
    by charging/discharging the battery and shedding load by priority.
    """
    # Use the max of actual vs predicted to be safe
    demand = {}
    total_demand = 0.0
    for entity in PRIORITY:
        act = actual_loads.get(entity, 0.0)
        pred = predicted_loads.get(entity, 0.0)
        safe_val = max(act, pred)
        demand[entity] = safe_val
        total_demand += safe_val

    supplied = {entity: 0.0 for entity in PRIORITY}
    battery_delta = 0.0
    actions = []

    # 1. Provide power exactly according to demand (optimistic baseline)
    for entity in PRIORITY:
        supplied[entity] = demand[entity]

    # 2. Check Deficit vs Excess
    if total_demand <= MAX_GRID_CAPACITY:
        # EXCESS POWER: Charge battery
        excess = MAX_GRID_CAPACITY - total_demand
        to_charge = min(excess, BATTERY_MAX_RATE, BATTERY_MAX_CHARGE - battery_energy)
        if to_charge > 0:
            battery_delta = to_charge
            actions.append(f"Grid stable. Charging battery by {round(to_charge, 1)} MW.")
        else:
            actions.append("Grid stable. Battery full.")
    else:
        # DEFICIT POWER: Need to shed or use battery
        deficit = total_demand - MAX_GRID_CAPACITY
        
        # Try battery first
        from_battery = min(deficit, BATTERY_MAX_RATE, battery_energy)
        if from_battery > 0:
            battery_delta = -from_battery
            deficit -= from_battery
            actions.append(f"Discharging battery by {round(from_battery, 1)} MW to bridge gap.")
            
        # If still deficit, start shedding lowest priority (reverse of PRIORITY list)
        for entity in reversed(PRIORITY):
            if deficit <= 0.01:
                break
                
            if entity == "hospital":
                actions.append("🚨 CRITICAL: Cannot shed Hospital. Grid overload imminent!")
                break
            
            can_shed = supplied[entity]
            if can_shed > 0:
                shed_amount = min(can_shed, deficit)
                supplied[entity] -= shed_amount
                deficit -= shed_amount
                pct = int((shed_amount / demand[entity]) * 100) if demand[entity] > 0 else 0
                actions.append(f"⚠️ Shedding {pct}% ({round(shed_amount, 1)} MW) from {entity.capitalize()}.")

    # Determine status color for frontend
    if deficit > 0.1:
        status_code = "CRITICAL"
    elif battery_delta < 0 or any("Shedding" in a for a in actions):
        status_code = "WARNING"
    else:
        status_code = "NORMAL"

    new_battery = min(BATTERY_MAX_CHARGE, max(0.0, battery_energy + battery_delta))

    return {
        "status_code": status_code,
        "actions": actions,
        "demand": {k: round(v, 2) for k, v in demand.items()},
        "supplied": {k: round(v, 2) for k, v in supplied.items()},
        "total_demand": round(total_demand, 2),
        "total_supplied": round(sum(supplied.values()), 2),
        "battery_energy": round(new_battery, 2),
        "battery_delta": round(battery_delta, 2)
    }
