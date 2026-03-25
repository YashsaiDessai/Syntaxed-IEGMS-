"""
optimizer.py - V2 AI Orchestrator Logic

Time-aware load management:
  - Per-entity schedule caps (school off after 17:00, industry overnight, etc.)
  - Power redistribution from inactive to active high-priority zones
  - Proactive peak-hour battery boost (morning 08-09, evening 18-21)
  - Standard priority shedding as last resort
"""

# Grid constraints (MW)
BATTERY_MAX_CHARGE = 400.0
BATTERY_MAX_RATE = 100.0   # Max charge/discharge per cycle
PEAK_BATTERY_BOOST_MW = 80.0  # Proactive discharge during peaks

PRIORITY = ["hospital", "industry", "school", "residential"]

# ── Time-Aware Schedule Policy ────────────────────────────────────────────────

# Each entity has a list of (start_hour, end_hour, cap_fraction) windows.
# Outside the active window, demand is capped at `inactive_cap` fraction.
ENTITY_SCHEDULES = {
    "hospital": {
        "label": "Hospital",
        "always_on": True,
        "active_hours": (0, 24),   # 24/7 — never reduce
        "active_cap": 1.0,
        "inactive_cap": 1.0,
        "inactive_reason": "Hospital operates 24/7 — no reduction."
    },
    "school": {
        "label": "School",
        "always_on": False,
        "active_hours": (7, 17),   # 07:00–17:00
        "active_cap": 1.0,
        "inactive_cap": 0.05,      # 5% standby (security lights, HVAC minimum)
        "inactive_reason": "School is closed — reduced to 5% standby power."
    },
    "industry": {
        "label": "Industry",
        "always_on": False,
        "active_hours": (5, 19),   # 05:00–19:00
        "active_cap": 1.0,
        "inactive_cap": 0.10,      # 10% overnight (minimal machinery, security)
        "inactive_reason": "Industrial zone is off-shift — reduced to 10% standby."
    },
    "residential": {
        "label": "Residential",
        "always_on": False,
        "active_hours": (0, 24),   # Always gets power, but priority shifts by time
        "active_cap": 1.0,
        "inactive_cap": 0.50,      # 50% off-peak (early morning low demand)
        "inactive_reason": "Residential off-peak hours — reduced to 50%."
    }
}

# Residential gets a "surge" window — treated as active (full cap) during peak
RESIDENTIAL_PEAK_HOURS = (17, 23)  # 17:00–23:00 evening surge


def _is_peak_hour(hour: float) -> bool:
    """Peak hours: morning rush (08–09) and evening surge (18–21)."""
    return (8.0 <= hour < 9.0) or (18.0 <= hour < 21.0)


def _is_entity_active(entity: str, hour: float) -> tuple[bool, str]:
    """
    Returns (is_active, reason).
    Special rule: residential is 'active' during evening surge.
    """
    hour = hour % 24.0
    sched = ENTITY_SCHEDULES[entity]

    if sched["always_on"]:
        return True, "Always active."

    start, end = sched["active_hours"]

    # Residential special case
    if entity == "residential":
        pk_start, pk_end = RESIDENTIAL_PEAK_HOURS
        if pk_start <= hour < pk_end:
            return True, "Residential evening peak — full power priority."
        if start <= hour < end:
            return True, "Residential daytime — normal operation."
        return False, sched["inactive_reason"]

    if start <= hour < end:
        return True, f"{sched['label']} active hours ({start:02.0f}:00–{end:02.0f}:00)."
    return False, sched["inactive_reason"]


def get_entity_schedule_status(hour: float) -> dict:
    """
    Returns per-entity schedule status at the given hour.
    Used by /agent/schedule endpoint and LLM context.
    """
    result = {}
    for entity in PRIORITY:
        sched = ENTITY_SCHEDULES[entity]
        active, reason = _is_entity_active(entity, hour)
        cap = sched["active_cap"] if active else sched["inactive_cap"]
        result[entity] = {
            "active": active,
            "cap_fraction": cap,
            "cap_pct": int(cap * 100),
            "reason": reason
        }
    return result


def apply_time_caps(demand: dict, hour: float) -> tuple[dict, float, list]:
    """
    Apply schedule-based caps to demand.
    Returns (capped_demand, total_freed_mw, notes).
    """
    capped = {}
    total_freed = 0.0
    notes = []

    for entity in PRIORITY:
        sched = ENTITY_SCHEDULES[entity]
        active, reason = _is_entity_active(entity, hour)
        cap = sched["active_cap"] if active else sched["inactive_cap"]
        original = demand.get(entity, 0.0)
        capped_val = original * cap
        freed = original - capped_val
        capped[entity] = capped_val
        if freed > 0.5:
            total_freed += freed
            notes.append(
                f"[TIME] {sched['label']}: capped to {int(cap*100)}% "
                f"(-{round(freed,1)} MW freed). {reason}"
            )
    return capped, total_freed, notes


def redistribute_freed_power(capped_demand: dict, freed_mw: float, hour: float) -> tuple[dict, list]:
    """
    Redistribute freed MW to highest-priority active entities that want more power.
    Returns (boosted_demand, redistribution_notes).
    """
    boosted = {k: v for k, v in capped_demand.items()}
    notes = []
    remaining = freed_mw

    # Redistribute in priority order (hospital first, residential last)
    for entity in PRIORITY:
        if remaining < 0.5:
            break
        active, _ = _is_entity_active(entity, hour)
        if not active:
            continue
        sched = ENTITY_SCHEDULES[entity]
        # How much more could this entity use? (up to 20% above its normal demand as a boost)
        uncapped = capped_demand.get(entity, 0.0)
        headroom = uncapped * 0.20  # allow up to +20% boost
        if headroom < 0.5:
            continue
        boost = min(headroom, remaining)
        boosted[entity] += boost
        remaining -= boost
        notes.append(
            f"[REDIR] +{round(boost,1)} MW redistributed to {sched['label']} "
            f"(active, priority {PRIORITY.index(entity)+1})."
        )

    return boosted, notes


# ── Main Optimizer ────────────────────────────────────────────────────────────

def optimize_grid(actual_loads: dict, predicted_loads: dict,
                  battery_energy: float, hour: float = 12.0, plants: dict = None, manual_loads: dict = None) -> dict:
    """
    Time-aware grid optimizer. Steps:
      1. Apply time-based demand caps (school closed, industry off-shift, etc.)
      2. Redistribute freed power to active high-priority zones
      3. Check for peak hours — proactively engage battery boost
      4. Standard deficit/surplus balancing with priority shedding
    """
    # --- Step 0: raw demand (max of actual vs predicted) ---
    raw_demand = {}
    for entity in PRIORITY:
        act = actual_loads.get(entity, 0.0)
        pred = predicted_loads.get(entity, 0.0)
        raw_demand[entity] = max(act, pred)

    # --- Step 1: Apply time caps ---
    capped_demand, freed_mw, cap_notes = apply_time_caps(raw_demand, hour)

    # --- Step 2: Redistribute freed power ---
    demand, redir_notes = redistribute_freed_power(capped_demand, freed_mw, hour)

    total_demand = sum(demand.values())

    supplied = {entity: demand[entity] for entity in PRIORITY}
    battery_delta = 0.0
    deficit = 0.0
    actions = list(cap_notes) + list(redir_notes)

    # --- Step 3: Peak-hour proactive battery boost ---
    peak_boost_active = False
    if _is_peak_hour(hour) and battery_energy > PEAK_BATTERY_BOOST_MW:
        boost = min(PEAK_BATTERY_BOOST_MW, battery_energy * 0.3)
        battery_delta -= boost
        peak_boost_active = True
        # Increase residential supply during evening, industry in morning
        if 18.0 <= hour < 21.0:
            supplied["residential"] = min(supplied["residential"] + boost,
                                          raw_demand["residential"] * 1.15)
            actions.append(
                f"[PEAK] Evening peak (18-21h): battery discharging "
                f"{round(boost,1)} MW -> Residential boost."
            )
        elif 8.0 <= hour < 9.0:
            supplied["industry"] = min(supplied["industry"] + boost,
                                       raw_demand["industry"] * 1.15)
            actions.append(
                f"[PEAK] Morning peak (08-09h): battery discharging "
                f"{round(boost,1)} MW -> Industry boost."
            )

    # --- Step 4: Standard surplus/deficit balancing ---
    # Setup dynamic MAX_GRID_CAPACITY based on active plants
    if plants is None:
        plants = {"plant1": {"active": True, "capacity": 300.0}, "plant2": {"active": True, "capacity": 300.0}}
        
    dynamic_max_capacity = sum(p["capacity"] for p in plants.values() if p["active"])
    if dynamic_max_capacity == 0:
        actions.insert(0, "🚨 ALL Grid Generation OFFLINE 🚨")
    elif dynamic_max_capacity < 600.0:
        actions.insert(0, f"Grid capacity reduced to {dynamic_max_capacity} MW.")

    current_total = sum(supplied.values())

    if current_total <= dynamic_max_capacity:
        excess = dynamic_max_capacity - current_total
        to_charge = min(excess, BATTERY_MAX_RATE, BATTERY_MAX_CHARGE - battery_energy)
        if battery_delta == 0 and to_charge > 1.0:
            battery_delta = to_charge
            actions.append(f"Grid stable. Charging battery by {round(to_charge,1)} MW.")
        elif battery_delta == 0:
            actions.append("Grid stable. Battery full.")
    else:
        deficit = current_total - dynamic_max_capacity

        # Try battery discharge first (if not already in peak boost)
        if battery_delta >= 0:
            from_battery = min(deficit, BATTERY_MAX_RATE, battery_energy)
            if from_battery > 0:
                battery_delta = -from_battery
                deficit -= from_battery
                actions.append(
                    f"Discharging battery {round(from_battery,1)} MW to bridge deficit."
                )

        # Priority shedding as last resort
        for entity in reversed(PRIORITY):
            if deficit <= 0.01:
                break
            if entity == "hospital":
                actions.append("CRITICAL: Cannot shed Hospital. Grid overload!")
                break
            can_shed = supplied[entity]
            if can_shed > 0:
                shed = min(can_shed, deficit)
                supplied[entity] -= shed
                deficit -= shed
                pct = int((shed / demand[entity]) * 100) if demand[entity] > 0 else 0
                actions.append(
                    f"Shedding {pct}% ({round(shed,1)} MW) from "
                    f"{ENTITY_SCHEDULES[entity]['label']}."
                )

    # --- Status code ---
    if deficit > 0.1:
        status_code = "CRITICAL"
    elif battery_delta < 0 or any("Shedding" in a for a in actions):
        status_code = "WARNING"
    elif peak_boost_active:
        status_code = "PEAK"
    else:
        status_code = "NORMAL"

    new_battery = min(BATTERY_MAX_CHARGE, max(0.0, battery_energy + battery_delta))

    # Calculate generation split per plant based on total supplied from grid
    # Grid supply = total supplied - battery discharge
    grid_supply = current_total
    if battery_delta < 0:
        grid_supply = current_total + battery_delta  # + because delta is negative
        
    generation = {"plant1": 0.0, "plant2": 0.0}
    active_plants = [pid for pid, p in plants.items() if p["active"]]
    if active_plants:
        split = grid_supply / len(active_plants)
        for pid in active_plants:
            generation[pid] = round(split, 2)

    return {
        "status_code": status_code,
        "actions": actions,
        "demand": {k: round(v, 2) for k, v in demand.items()},
        "supplied": {k: round(v, 2) for k, v in supplied.items()},
        "total_demand": round(sum(demand.values()), 2),
        "total_supplied": round(sum(supplied.values()), 2),
        "battery_energy": round(new_battery, 2),
        "battery_delta": round(battery_delta, 2),
        "generation": generation,
        "peak_boost_active": peak_boost_active,
        "freed_mw": round(freed_mw, 2),
        "schedule_status": get_entity_schedule_status(hour),
        "simulated_hour": round(hour, 2),
    }
