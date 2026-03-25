"""
test_agent.py - Test script for the AI Grid Agent

Run this to test the agent locally before deploying.
"""

import json
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from agent_orchestrator import (
    create_grid_agent,
    OllamaConfig,
    EnergyPool,
    ThermalManager,
    ReserveManager,
    LoadPrioritizer,
    LoadBalancer,
    ScheduleOptimizer
)

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def test_energy_pool():
    """Test energy pool management"""
    print_section("1. Energy Pool Management")
    pool = EnergyPool()
    status = pool.get_status()
    print(f"Total Capacity: {status['total_capacity']} MW")
    print(f"Total Output: {status['total_output']} MW")
    print(f"Renewable Available: {status['total_renewable_available']} MW")
    print(f"Non-Renewable Available: {status['total_nonrenewable_available']} MW")
    print("\nEnergy Sources:")
    for name, source in status['sources'].items():
        print(f"  {source['name']:20} | Type: {source['source_type']:12} | Capacity: {source['capacity_mw']:6.1f} MW | Output: {source['current_output_mw']:6.1f} MW")

def test_thermal_management():
    """Test thermal management"""
    print_section("2. Thermal Management")
    thermal = ThermalManager()
    status = thermal.get_thermal_status()
    print(f"Current Temperature: {status['current_temp_celsius']}°C")
    print(f"Max Safe: {status['max_safe_temp']}°C")
    print(f"Critical: {status['critical_temp']}°C")
    print(f"Status: {status['status']}")
    print(f"Cooling Capacity: {status['cooling_capacity_mw']} MW")
    
    # Test temperature impact
    print("\nTemperature Impact Calculation:")
    for load in [100, 300, 600]:
        impact = thermal.calculate_temp_impact(load)
        print(f"  {load} MW load → +{impact:.2f}°C increase")

def test_reserve_management():
    """Test reserve management"""
    print_section("3. Reserve and Backup Management")
    reserve = ReserveManager()
    status = reserve.check_reserve_adequacy(800.0, 700.0)
    print(f"Demand: 800 MW | Supply: 700 MW")
    print(f"Deficit: {status['deficit_mw']} MW")
    print(f"Reserve Needed: {status['reserve_needed_mw']} MW")
    print(f"Reserve Available: {status['reserve_available_mw']} MW")
    print(f"Reserve Adequate: {status['reserve_adequate']}")
    print(f"Backup Active: {status['backup_active']}")
    print(f"Fuel Reserve Days: {status['backup_fuel_days']}")

def test_load_prioritization():
    """Test intelligent load prioritization"""
    print_section("4. Load Prioritization")
    prioritizer = LoadPrioritizer()
    
    loads = {
        "hospital": 80.0,
        "school": 110.0,
        "industry": 160.0,
        "residential": 400.0
    }
    
    conditions = {
        "total_demand": sum(loads.values()),
        "thermal_status": {"status": "WARNING", "current_temp_celsius": 50.0},
        "reserve_status": {"reserve_adequate": False}
    }
    
    result = prioritizer.prioritize(loads, conditions)
    print(f"Grid Urgency Level: {result['urgency_level']}")
    print(f"\nActions:")
    for action in result['actions']:
        print(f"  {action}")
    
    print(f"\nLoad Shedding Plan:")
    for entity, shed in result['shedding_plan'].items():
        if shed > 0:
            pct = (shed / loads.get(entity, 1)) * 100
            print(f"  {entity.capitalize():15} → Shed {shed:.1f} MW ({pct:.0f}%)")

def test_load_balancing():
    """Test load balancing across sources"""
    print_section("5. Load Balancing")
    balancer = LoadBalancer()
    pool = EnergyPool()
    
    demand = 750.0
    preferences = {"renewable_preference": 0.70}
    
    result = balancer.balance(demand, pool, preferences)
    print(f"Demand: {demand} MW")
    print(f"Renewable Used: {result['renewable_used_mw']} MW")
    print(f"Non-Renewable Used: {result['nonrenewable_used_mw']} MW")
    print(f"Unmet Demand: {result['unmet_demand_mw']} MW")
    print(f"Renewable Efficiency: {result['efficiency_score']:.1f}%")
    print(f"Total Cost: ${result['total_cost_usd']:.2f}")
    print(f"Total CO2: {result['total_co2_kg']:.0f} kg")

def test_schedule_optimization():
    """Test time-aware schedule optimization"""
    print_section("6. Schedule Optimization")
    
    test_hours = [6, 9, 15, 18, 21]
    for hour in test_hours:
        schedule = ScheduleOptimizer.get_optimal_schedule(hour, 750.0)
        print(f"\nTime: {hour:02d}:00")
        print(f"  Period: {schedule['period']}")
        print(f"  Recommendation: {schedule['recommendation']}")
        print(f"  Optimal Renewable %: {schedule['optimal_renewable_percentage']*100:.0f}%")

def test_agent_configuration():
    """Test agent configuration with remote Ollama"""
    print_section("7. Agent Configuration")
    
    # Get from environment or use defaults
    endpoint = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "mistral")
    
    print(f"Ollama Endpoint: {endpoint}")
    print(f"Model Name: {model}")
    print(f"\nTo use a remote Ollama instance, set environment variables:")
    print(f"  export OLLAMA_ENDPOINT=http://your-laptop-ip:11434")
    print(f"  export OLLAMA_MODEL=mistral")
    
    # Don't actually create agent without Ollama running
    print(f"\nAgent will be initialized when backend starts if Ollama is available.")

def main():
    """Run all tests"""
    print_section("SYNTAXED-IEGMS AI Grid Agent Test Suite")
    
    try:
        test_energy_pool()
        test_thermal_management()
        test_reserve_management()
        test_load_prioritization()
        test_load_balancing()
        test_schedule_optimization()
        test_agent_configuration()
        
        print_section("All Tests Completed Successfully ✓")
        
    except Exception as e:
        print_section("Test Failed ✗")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
