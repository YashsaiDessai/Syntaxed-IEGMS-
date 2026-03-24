"""
optimizer.py - V2 AI Orchestrator Logic

Handles real-time priority load shedding and battery management.
Entities priority: Hospital > School > Industry > Residential.
"""

# Grid constraints (MW)
MAX_GRID_CAPACITY = 500.0  
BATTERY_MAX_CHARGE = 400.0
BATTERY_MAX_RATE = 100.0  # Max charge/discharge per iteration

PRIORITY = ["hospital", "school", "industry", "residential"]


def optimize_grid(actual_loads: dict, predicted_loads: dict, battery_energy: float, current_hour: float = 12.0) -> dict:
    """
    Given the current and predicted loads of the 4 entities, balance the grid
    by charging/discharging the battery and shedding load by priority.
    After 17:00, reduce power to schools (not used at night).
    """
    # Use the max of actual vs predicted to be safe
    demand = {}
    total_demand = 0.0
    for entity in PRIORITY:
        act = actual_loads.get(entity, 0.0)
        pred = predicted_loads.get(entity, 0.0)
        safe_val = max(act, pred)
        
        # After 17:00 (5 PM), reduce school demand by 70% (schools close)
        if entity == "school" and current_hour >= 17.0:
            safe_val = safe_val * 0.3  # Keep only 30% for maintenance/security
        
        demand[entity] = safe_val
        total_demand += safe_val

    supplied = {entity: 0.0 for entity in PRIORITY}
    battery_delta = 0.0
    deficit = 0.0
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
                supplied[entity] -= shed_ based on supply availability
    total_supplied = sum(supplied.values())
    supply_ratio = total_supplied / total_demand if total_demand > 0 else 1.0
    
    if deficit > 0.1:
        status_code = "CRITICAL"
        supply_status = "red"  # No supply - critical
    elif supply_ratio < 0.6:
        status_code = "WARNING"
        supply_status = "red"  # No supply - very low
    elif supply_ratio < 0.9:
        status_code = "WARNING"
        supply_status = "yellow"  # Low supply
    else:
        status_code = "NORMAL"
        supply_status = "green"  # Normal supply

    new_battery = min(BATTERY_MAX_CHARGE, max(0.0, battery_energy + battery_delta))

    return {
        "status_code": status_code,
        "supply_status": supply_status,
        "actions": actions,
        "demand": {k: round(v, 2) for k, v in demand.items()},
        "supplied": {k: round(v, 2) for k, v in supplied.items()},
        "total_demand": round(total_demand, 2),
        "total_supplied": round(total_supplied
        "actions": actions,
        "demand": {k: round(v, 2) for k, v in demand.items()},
        "supplied": {k: round(v, 2) for k, v in supplied.items()},
        "total_demand": round(total_demand, 2),
        "total_supplied": round(sum(supplied.values()), 2),
        "battery_energy": round(new_battery, 2),
        "battery_delta": round(battery_delta, 2)
    }
