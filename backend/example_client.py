"""
example_client.py - Example client for testing the AI Grid Agent API

Run this after starting the backend to test agent decision making.
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BACKEND_URL = "http://localhost:8000"
OLLAMA_ENDPOINT = "http://localhost:11434"  # Change to your remote Ollama IP
OLLAMA_MODEL = "gemma3:1b"


class GridAgentClient:
    """Client for interacting with the Grid Agent API"""
    
    def __init__(self, backend_url: str = BACKEND_URL):
        self.backend_url = backend_url.rstrip('/')
        self.session = requests.Session()
    
    def configure_agent(self, endpoint: str, model_name: str) -> Dict[str, Any]:
        """Configure the agent with a new Ollama endpoint and model"""
        url = f"{self.backend_url}/agent/configure"
        payload = {
            "endpoint": endpoint,
            "model_name": model_name
        }
        response = self.session.post(url, json=payload)
        return response.json()
    
    def get_config(self) -> Dict[str, Any]:
        """Get current agent configuration"""
        url = f"{self.backend_url}/agent/config"
        response = self.session.get(url)
        return response.json()
    
    def make_decision(self, query: str) -> Dict[str, Any]:
        """Ask the agent to make a decision"""
        url = f"{self.backend_url}/agent/decide"
        payload = {"query": query}
        response = self.session.post(url, json=payload)
        return response.json()
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        url = f"{self.backend_url}/agent/status"
        response = self.session.get(url)
        return response.json()
    
    def health_check(self) -> Dict[str, Any]:
        """Health check"""
        url = f"{self.backend_url}/health"
        response = self.session.get(url)
        return response.json()


def print_section(title: str):
    """Print formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def main():
    """Run example client"""
    client = GridAgentClient(BACKEND_URL)
    
    # Step 1: Health check
    print_section("Step 1: Health Check")
    try:
        health = client.health_check()
        print(f"✓ Backend Status: {health['status']}")
        print(f"  Simulated Hour: {health.get('simulated_hour', 'N/A')}")
    except Exception as e:
        print(f"✗ Backend not reachable: {e}")
        print("  Make sure to run: python -m uvicorn main:app --reload")
        return
    
    # Step 2: Get current config
    print_section("Step 2: Get Current Configuration")
    try:
        config = client.get_config()
        print(f"Current Config:")
        print(json.dumps(config, indent=2))
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Step 3: Configure agent (optional)
    print_section("Step 3: Configure Agent (Optional)")
    print(f"Current endpoint: {OLLAMA_ENDPOINT}")
    print(f"Current model: {OLLAMA_MODEL}")
    print("\nTo configure agent with remote Ollama:")
    print(f'  client.configure_agent("{OLLAMA_ENDPOINT}", "{OLLAMA_MODEL}")')
    
    # Step 4: Example queries
    queries = [
        "What is the current grid status?",
        "How should we balance the load efficiently?",
        "What renewable energy strategy do you recommend?",
        "How can we manage the thermal constraints?",
        "Is our reserve adequate for peak demand?"
    ]
    
    print_section("Step 4: Example Agent Queries")
    
    for i, query in enumerate(queries[:2], 1):  # Only run 2 to save time
        print(f"\nQuery {i}: {query}")
        print("-" * 80)
        
        try:
            result = client.make_decision(query)
            
            if result.get('status') == 'success':
                print("✓ Agent Decision:")
                decision = result.get('decision', '')
                if len(decision) > 500:
                    print(decision[:500] + "...\n[Output truncated]")
                else:
                    print(decision)
                
                grid_context = result.get('grid_context', {})
                if grid_context:
                    print(f"\nGrid Context:")
                    print(f"  Temperature: {grid_context.get('temperature_celsius', 'N/A')}°C ({grid_context.get('thermal_status', 'N/A')})")
                    print(f"  Renewable Available: {grid_context.get('renewable_available_mw', 'N/A')} MW")
                    print(f"  Non-Renewable Available: {grid_context.get('nonrenewable_available_mw', 'N/A')} MW")
            else:
                print(f"✗ Error: {result.get('message', 'Unknown error')}")
                print(f"  Make sure Ollama is running and accessible at {OLLAMA_ENDPOINT}")
        
        except Exception as e:
            print(f"✗ Request failed: {e}")
        
        time.sleep(1)  # Rate limiting
    
    # Step 5: Get agent status
    print_section("Step 5: Agent Status")
    try:
        status = client.get_status()
        if status.get('status') == 'active':
            print("✓ Agent is Active")
            print(f"  Config: {status.get('config', {})}")
            print(f"  Simulated Hour: {status.get('simulated_hour', 'N/A')}")
        else:
            print(f"✗ Agent Status: {status.get('message', 'Not initialized')}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print_section("Test Complete")
    print("""
Next Steps:
1. Start the backend if not already running
2. Configure with your remote Ollama endpoint
3. Modify queries in this script to test your use cases
4. Integrate agent decisions into your frontend

For more information, see AGENT_SETUP.md
    """)


if __name__ == "__main__":
    main()
