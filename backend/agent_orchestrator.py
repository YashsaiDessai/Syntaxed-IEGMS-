"""
agent_orchestrator.py - AI Agent for Smart Grid Management

Advanced Ollama + LangChain agent that handles:
- Intelligent load prioritization based on grid conditions
- Efficient load balancing across resources
- Temperature-aware power management
- Renewable vs non-renewable energy optimization
- Reserve pool and backup power management
- Time-aware scheduling decisions

Configuration: Endpoint and model name can be set via environment variables
or passed at initialization.
"""

import json
import os
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_core.tools import tool, BaseTool
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

class OllamaConfig(BaseModel):
    """Configuration for remote Ollama instance"""
    endpoint: str = Field(default_factory=lambda: os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434"))
    model_name: str = Field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "mistral"))
    
    def update(self, endpoint: Optional[str] = None, model_name: Optional[str] = None):
        """Update configuration at runtime"""
        if endpoint:
            self.endpoint = endpoint
        if model_name:
            self.model_name = model_name


# ─────────────────────────────────────────────────────────────────────────────
# Energy Source Management
# ─────────────────────────────────────────────────────────────────────────────

class EnergySource(BaseModel):
    """Represents an energy source in the grid"""
    name: str
    source_type: str  # "renewable" or "non-renewable"
    capacity_mw: float
    current_output_mw: float
    efficiency: float  # 0-1
    is_available: bool = True
    maintenance_due: bool = False
    co2_per_mwh: float  # Carbon footprint
    cost_per_mwh: float


class EnergyPool:
    """Manages renewable and non-renewable energy sources"""
    
    def __init__(self):
        self.sources: Dict[str, EnergySource] = {
            "solar_farm": EnergySource(
                name="Solar Farm",
                source_type="renewable",
                capacity_mw=200.0,
                current_output_mw=0.0,
                efficiency=0.95,
                co2_per_mwh=0.0,
                cost_per_mwh=30.0
            ),
            "wind_farm": EnergySource(
                name="Wind Farm",
                source_type="renewable",
                capacity_mw=150.0,
                current_output_mw=0.0,
                efficiency=0.92,
                co2_per_mwh=0.0,
                cost_per_mwh=35.0
            ),
            "hydro_plant": EnergySource(
                name="Hydro Plant",
                source_type="renewable",
                capacity_mw=100.0,
                current_output_mw=0.0,
                efficiency=0.90,
                co2_per_mwh=0.0,
                cost_per_mwh=25.0
            ),
            "coal_plant": EnergySource(
                name="Coal Plant",
                source_type="non-renewable",
                capacity_mw=300.0,
                current_output_mw=0.0,
                efficiency=0.88,
                co2_per_mwh=820.0,
                cost_per_mwh=50.0
            ),
            "gas_turbine": EnergySource(
                name="Gas Turbine",
                source_type="non-renewable",
                capacity_mw=250.0,
                current_output_mw=0.0,
                efficiency=0.95,
                co2_per_mwh=490.0,
                cost_per_mwh=60.0
            ),
            "battery_storage": EnergySource(
                name="Battery Storage",
                source_type="renewable",
                capacity_mw=400.0,
                current_output_mw=50.0,
                efficiency=0.85,
                co2_per_mwh=0.0,
                cost_per_mwh=80.0
            )
        }
    
    def get_available_renewable(self) -> float:
        """Get total available renewable capacity"""
        total = 0.0
        for source in self.sources.values():
            if source.source_type == "renewable" and source.is_available:
                available = source.capacity_mw - source.current_output_mw
                total += available
        return total
    
    def get_available_nonrenewable(self) -> float:
        """Get total available non-renewable capacity"""
        total = 0.0
        for source in self.sources.values():
            if source.source_type == "non-renewable" and source.is_available:
                available = source.capacity_mw - source.current_output_mw
                total += available
        return total
    
    def get_status(self) -> Dict[str, Any]:
        """Get complete energy pool status"""
        return {
            "sources": {k: v.dict() for k, v in self.sources.items()},
            "total_renewable_available": self.get_available_renewable(),
            "total_nonrenewable_available": self.get_available_nonrenewable(),
            "total_capacity": sum(s.capacity_mw for s in self.sources.values()),
            "total_output": sum(s.current_output_mw for s in self.sources.values())
        }


# ─────────────────────────────────────────────────────────────────────────────
# Temperature Management
# ─────────────────────────────────────────────────────────────────────────────

class ThermalManager:
    """Manages system temperature and thermal constraints"""
    
    def __init__(self):
        self.current_temp_celsius = 28.0
        self.max_safe_temp = 45.0
        self.critical_temp = 55.0
        self.cooling_capacity_mw = 150.0  # Power available for cooling
        self.cooling_efficiency = 0.92
    
    def get_thermal_status(self) -> Dict[str, Any]:
        """Get thermal management status"""
        temp_ratio = self.current_temp_celsius / self.max_safe_temp
        status = "NORMAL"
        
        if self.current_temp_celsius >= self.critical_temp:
            status = "CRITICAL"
        elif self.current_temp_celsius >= self.max_safe_temp:
            status = "WARNING"
        
        return {
            "current_temp_celsius": self.current_temp_celsius,
            "max_safe_temp": self.max_safe_temp,
            "critical_temp": self.critical_temp,
            "temp_ratio": round(temp_ratio, 2),
            "status": status,
            "cooling_capacity_mw": self.cooling_capacity_mw,
            "cooling_efficiency": self.cooling_efficiency
        }
    
    def update_temperature(self, delta: float):
        """Update system temperature"""
        self.current_temp_celsius = max(0, self.current_temp_celsius + delta)
    
    def calculate_temp_impact(self, load_mw: float) -> float:
        """Calculate temperature increase from load"""
        # Every 100MW of load increases temp by ~1°C
        return (load_mw / 100.0) * 0.8


# ─────────────────────────────────────────────────────────────────────────────
# Reserve and Backup Management
# ─────────────────────────────────────────────────────────────────────────────

class ReserveManager:
    """Manages reserve pools and backup power"""
    
    def __init__(self):
        self.spinning_reserve_mw = 100.0  # Ready to deploy in seconds
        self.non_spinning_reserve_mw = 150.0  # Ready in minutes
        self.min_reserve_percentage = 0.15  # 15% of peak demand
        self.backup_fuel_days = 30  # Days of backup fuel
        self.is_backup_active = False
    
    def check_reserve_adequacy(self, demand_mw: float, supply_mw: float) -> Dict[str, Any]:
        """Check if reserves are adequate"""
        deficit = max(0, demand_mw - supply_mw)
        reserve_needed = demand_mw * self.min_reserve_percentage
        total_available = self.spinning_reserve_mw + self.non_spinning_reserve_mw
        
        reserve_adequate = total_available >= reserve_needed
        
        return {
            "deficit_mw": round(deficit, 2),
            "reserve_needed_mw": round(reserve_needed, 2),
            "reserve_available_mw": round(total_available, 2),
            "reserve_adequate": reserve_adequate,
            "backup_fuel_days": self.backup_fuel_days,
            "backup_active": self.is_backup_active
        }
    
    def activate_backup(self) -> str:
        """Activate emergency backup power"""
        self.is_backup_active = True
        return "Backup power activated. Fuel reserves: {} days".format(self.backup_fuel_days)
    
    def deactivate_backup(self) -> str:
        """Deactivate backup power"""
        self.is_backup_active = False
        return "Backup power deactivated."


# ─────────────────────────────────────────────────────────────────────────────
# Load Prioritization
# ─────────────────────────────────────────────────────────────────────────────

class LoadPrioritizer:
    """Intelligent load prioritization based on grid conditions"""
    
    PRIORITY_LEVELS = {
        "hospital": 1,  # Highest - critical life support
        "emergency_services": 1,
        "water_treatment": 2,  # High - essential services
        "school": 3,  # Medium-high
        "industry": 4,  # Medium
        "residential": 5,  # Lower - can tolerate some shedding
        "commercial": 6,  # Lowest - can tolerate shedding
    }
    
    def prioritize(self, loads: Dict[str, float], conditions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prioritize loads based on grid conditions and entity importance.
        
        Args:
            loads: Dict of entity loads
            conditions: Grid conditions (temp, reserve, demand, etc.)
        
        Returns:
            Prioritization decisions
        """
        temp_status = conditions.get("thermal_status", {})
        reserve_status = conditions.get("reserve_status", {})
        demand_mw = conditions.get("total_demand", 0)
        
        actions = []
        shedding_plan = {}
        
        # Determine urgency level
        urgency = "NORMAL"
        if temp_status.get("status") == "CRITICAL":
            urgency = "CRITICAL_THERMAL"
        elif not reserve_status.get("reserve_adequate"):
            urgency = "RESERVE_LOW"
        elif demand_mw > 800:  # High demand
            urgency = "HIGH_DEMAND"
        
        # Build shedding cascade based on urgency
        if urgency == "NORMAL":
            actions.append("✅ All loads can be satisfied.")
            shedding_plan = {entity: 0.0 for entity in loads.keys()}
        
        elif urgency == "HIGH_DEMAND":
            actions.append("⚠️ Reducing non-critical loads.")
            shedding_plan = self._calculate_shedding(loads, 0.05)  # 5% reduction
        
        elif urgency == "RESERVE_LOW":
            actions.append("⚠️ Reserve low. Moderate load reduction required.")
            shedding_plan = self._calculate_shedding(loads, 0.10)  # 10% reduction
        
        elif urgency == "CRITICAL_THERMAL":
            actions.append("🚨 Critical thermal condition. Aggressive shedding activated.")
            shedding_plan = self._calculate_shedding(loads, 0.25)  # 25% reduction
        
        return {
            "urgency_level": urgency,
            "actions": actions,
            "shedding_plan": shedding_plan,
            "priority_order": sorted(
                loads.items(),
                key=lambda x: self.PRIORITY_LEVELS.get(x[0], 99)
            )
        }
    
    def _calculate_shedding(self, loads: Dict[str, float], percentage: float) -> Dict[str, float]:
        """Calculate load shedding by priority"""
        shedding = {}
        remaining_to_shed = sum(loads.values()) * percentage
        
        # Sort by priority (highest first)
        sorted_entities = sorted(
            loads.items(),
            key=lambda x: self.PRIORITY_LEVELS.get(x[0], 99),
            reverse=True  # Shed lowest priority first
        )
        
        for entity, load in loads.items():
            shedding[entity] = 0.0
        
        for entity, load in sorted_entities:
            if remaining_to_shed <= 0:
                break
            
            if self.PRIORITY_LEVELS.get(entity, 99) <= 2:
                # Don't shed critical services
                continue
            
            shed_amount = min(load, remaining_to_shed)
            shedding[entity] = shed_amount
            remaining_to_shed -= shed_amount
        
        return shedding


# ─────────────────────────────────────────────────────────────────────────────
# Load Balancing
# ─────────────────────────────────────────────────────────────────────────────

class LoadBalancer:
    """Efficient load distribution across available resources"""
    
    def balance(self, demand: float, energy_pool: EnergyPool, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Efficiently balance load across renewable and non-renewable sources.
        
        Prioritizes renewable energy while respecting cost and efficiency constraints.
        """
        renewable_available = energy_pool.get_available_renewable()
        nonrenewable_available = energy_pool.get_available_nonrenewable()
        
        renewable_used = 0.0
        nonrenewable_used = 0.0
        
        # Preference for renewable
        renewable_preference = preferences.get("renewable_preference", 0.70)  # 70% renewable
        renewable_target = demand * renewable_preference
        
        # Use available renewable first
        renewable_used = min(renewable_target, renewable_available)
        remaining_demand = demand - renewable_used
        
        # Fill remaining with non-renewable
        nonrenewable_used = min(remaining_demand, nonrenewable_available)
        
        unmet_demand = max(0, demand - renewable_used - nonrenewable_used)
        
        allocation = {}
        
        # Allocate renewable in priority order
        renewable_order = ["hydro_plant", "solar_farm", "wind_farm", "battery_storage"]
        remaining_renewable = renewable_used
        for source_name in renewable_order:
            if source_name not in energy_pool.sources or remaining_renewable <= 0:
                continue
            source = energy_pool.sources[source_name]
            allocate = min(remaining_renewable, source.capacity_mw - source.current_output_mw)
            allocation[source_name] = allocate
            remaining_renewable -= allocate
        
        # Allocate non-renewable
        nonrenewable_order = ["gas_turbine", "coal_plant"]
        remaining_nonrenewable = nonrenewable_used
        for source_name in nonrenewable_order:
            if source_name not in energy_pool.sources or remaining_nonrenewable <= 0:
                continue
            source = energy_pool.sources[source_name]
            allocate = min(remaining_nonrenewable, source.capacity_mw - source.current_output_mw)
            allocation[source_name] = allocate
            remaining_nonrenewable -= allocate
        
        cost = sum(
            allocation.get(name, 0) * energy_pool.sources[name].cost_per_mwh
            for name in energy_pool.sources
        )
        
        co2 = sum(
            allocation.get(name, 0) * energy_pool.sources[name].co2_per_mwh
            for name in energy_pool.sources
        )
        
        return {
            "allocation": allocation,
            "renewable_used_mw": round(renewable_used, 2),
            "nonrenewable_used_mw": round(nonrenewable_used, 2),
            "unmet_demand_mw": round(unmet_demand, 2),
            "total_cost_usd": round(cost, 2),
            "total_co2_kg": round(co2, 2),
            "efficiency_score": round((renewable_used / demand * 100) if demand > 0 else 0, 2)
        }


# ─────────────────────────────────────────────────────────────────────────────
# Time-Aware Scheduling
# ─────────────────────────────────────────────────────────────────────────────

class ScheduleOptimizer:
    """Optimizes grid operations based on time of day"""
    
    @staticmethod
    def get_optimal_schedule(hour: float, predicted_load: float) -> Dict[str, Any]:
        """Get optimal operational schedule for the given time"""
        
        if 6 <= hour < 9:
            period = "MORNING_PEAK"
            recommendation = "Increase renewable production. High demand expected."
        elif 9 <= hour < 17:
            period = "DAYTIME"
            recommendation = "Maximize solar and wind utilization."
        elif 17 <= hour < 21:
            period = "EVENING_PEAK"
            recommendation = "Critical period. Prepare all reserves."
        elif 21 <= hour < 6:
            period = "NIGHT"
            recommendation = "Use battery discharge. Reduce non-renewable."
        else:
            period = "TRANSITION"
            recommendation = "Balanced approach."
        
        return {
            "period": period,
            "hour": round(hour, 2),
            "predicted_load_mw": round(predicted_load, 2),
            "recommendation": recommendation,
            "optimal_renewable_percentage": 0.75 if period == "DAYTIME" else 0.50
        }


# ─────────────────────────────────────────────────────────────────────────────
# LangChain Tools
# ─────────────────────────────────────────────────────────────────────────────

# Global instances for agent tools
energy_pool = EnergyPool()
thermal_mgr = ThermalManager()
reserve_mgr = ReserveManager()
load_prioritizer = LoadPrioritizer()
load_balancer = LoadBalancer()


@tool
def check_energy_sources() -> str:
    """Check availability of renewable and non-renewable energy sources"""
    status = energy_pool.get_status()
    return json.dumps(status, indent=2)


@tool
def check_thermal_status() -> str:
    """Check current system temperature and thermal constraints"""
    status = thermal_mgr.get_thermal_status()
    return json.dumps(status, indent=2)


@tool
def check_reserves() -> str:
    """Check reserve pools and backup power status"""
    reserve_status = reserve_mgr.check_reserve_adequacy(800.0, 700.0)  # example
    return json.dumps(reserve_status, indent=2)


@tool
def prioritize_loads(loads_json: str, conditions_json: str) -> str:
    """
    Prioritize loads based on grid conditions.
    Takes JSON strings of loads and grid conditions.
    """
    loads = json.loads(loads_json)
    conditions = json.loads(conditions_json)
    result = load_prioritizer.prioritize(loads, conditions)
    return json.dumps(result, indent=2)


@tool
def balance_loads(demand: float, renewable_preference: float = 0.70) -> str:
    """
    Balance load distribution across energy sources.
    Prioritizes renewable energy.
    """
    preferences = {"renewable_preference": renewable_preference}
    result = load_balancer.balance(demand, energy_pool, preferences)
    return json.dumps(result, indent=2)


@tool
def optimize_schedule(hour: float, predicted_load: float) -> str:
    """
    Get optimal operational schedule for given time of day.
    """
    schedule = ScheduleOptimizer.get_optimal_schedule(hour, predicted_load)
    return json.dumps(schedule, indent=2)


@tool
def activate_emergency_backup() -> str:
    """Activate emergency backup power when critical"""
    return reserve_mgr.activate_backup()


@tool
def deactivate_emergency_backup() -> str:
    """Deactivate emergency backup power"""
    return reserve_mgr.deactivate_backup()


@tool
def calculate_cooling_requirement(load_mw: float) -> str:
    """Calculate cooling requirement based on load"""
    temp_impact = thermal_mgr.calculate_temp_impact(load_mw)
    return json.dumps({
        "load_mw": load_mw,
        "temperature_increase_celsius": round(temp_impact, 2),
        "cooling_requirement_mw": round(temp_impact * thermal_mgr.cooling_efficiency, 2)
    }, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Grid Agent
# ─────────────────────────────────────────────────────────────────────────────

class GridAgent:
    """AI Agent for Smart Grid Management using Ollama"""
    
    def __init__(self, ollama_config: OllamaConfig):
        self.config = ollama_config
        self.llm = None
        self._initialize_agent()
    
    def _initialize_agent(self):
        """Initialize the Ollama LLM"""
        try:
            self.llm = Ollama(
                base_url=self.config.endpoint,
                model=self.config.model_name,
                temperature=0.3  # Lower temp for deterministic decisions
            )
            print(f"✓ Grid Agent initialized with {self.config.model_name} at {self.config.endpoint}")
        except Exception as e:
            print(f"✗ Failed to initialize Grid Agent: {e}")
            self.llm = None
    
    def reconfigure(self, endpoint: Optional[str] = None, model_name: Optional[str] = None):
        """Reconfigure endpoint and/or model at runtime"""
        self.config.update(endpoint, model_name)
        self._initialize_agent()
    
    def _build_context(self, grid_state: Dict[str, Any]) -> str:
        """Build a comprehensive context string for the LLM"""
        thermal_status = thermal_mgr.get_thermal_status()
        energy_status = energy_pool.get_status()
        reserve_status = reserve_mgr.check_reserve_adequacy(
            grid_state.get("total_demand", 0),
            grid_state.get("total_supply", 0)
        )
        
        context = f"""
CURRENT GRID STATE:
==================
Temperature: {thermal_status['current_temp_celsius']}°C (Max Safe: {thermal_status['max_safe_temp']}°C)
Status: {thermal_status['status']}

Energy Sources:
- Renewable Available: {energy_status['total_renewable_available']:.1f} MW
- Non-Renewable Available: {energy_status['total_nonrenewable_available']:.1f} MW
- Total Capacity: {energy_status['total_capacity']:.1f} MW
- Current Output: {energy_status['total_output']:.1f} MW

Demand & Supply:
- Current Demand: {grid_state.get('total_demand', 0):.1f} MW
- Current Supply: {grid_state.get('total_supply', 0):.1f} MW
- Predicted Demand: {grid_state.get('predicted_demand', 0):.1f} MW

Reserves:
- Reserve Needed: {reserve_status['reserve_needed_mw']:.1f} MW
- Reserve Available: {reserve_status['reserve_available_mw']:.1f} MW
- Reserve Adequate: {reserve_status['reserve_adequate']}
- Backup Fuel: {reserve_status['backup_fuel_days']} days
"""
        return context
    
    def make_decision(self, grid_state: Dict[str, Any], query: str) -> Dict[str, Any]:
        """
        Make an intelligent decision based on grid state and query using Ollama LLM.
        
        Args:
            grid_state: Current grid conditions
            query: The question/task for the agent
        
        Returns:
            Decision and reasoning from the agent
        """
        if not self.llm:
            return {
                "status": "error",
                "message": "Agent not initialized. Configure Ollama endpoint and model.",
                "timestamp": datetime.now().isoformat()
            }
        
        context = self._build_context(grid_state)
        
        prompt = f"""{context}

TASK:
{query}

Please provide a detailed analysis and recommendation for managing the grid. Consider:
1. Current thermal constraints
2. Energy source availability and efficiency
3. Reserve adequacy
4. Load prioritization based on criticality
5. Environmental impact (CO2)
6. Cost optimization

Provide your response in a structured format with clear recommendations."""
        
        try:
            # Call Ollama LLM
            response = self.llm.invoke(prompt)
            
            return {
                "status": "success",
                "decision": response,
                "grid_context": {
                    "temperature_celsius": thermal_mgr.get_thermal_status()['current_temp_celsius'],
                    "thermal_status": thermal_mgr.get_thermal_status()['status'],
                    "renewable_available_mw": energy_pool.get_available_renewable(),
                    "nonrenewable_available_mw": energy_pool.get_available_nonrenewable()
                },
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to get decision from Ollama: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }


# ─────────────────────────────────────────────────────────────────────────────
# Initialization
# ─────────────────────────────────────────────────────────────────────────────

def create_grid_agent(endpoint: Optional[str] = None, model_name: Optional[str] = None) -> GridAgent:
    """Factory function to create a GridAgent with optional config"""
    config = OllamaConfig(
        endpoint=endpoint or os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434"),
        model_name=model_name or os.getenv("OLLAMA_MODEL", "mistral")
    )
    return GridAgent(config)


if __name__ == "__main__":
    # Example usage
    config = OllamaConfig()
    agent = GridAgent(config)
    
    grid_state = {
        "total_demand": 750.0,
        "total_supply": 700.0,
        "predicted_demand": 820.0
    }
    
    decision = agent.make_decision(
        grid_state,
        "What should we do to manage the grid efficiently right now? Consider thermal constraints and renewable energy."
    )
    
    print("\n" + "="*80)
    print("AGENT DECISION")
    print("="*80)
    print(json.dumps(decision, indent=2))
