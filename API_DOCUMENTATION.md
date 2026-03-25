# Grid Agent REST API Documentation

Base URL: `http://localhost:8000`

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/configure` | Configure Ollama endpoint and model |
| GET | `/agent/config` | Get current agent configuration |
| POST | `/agent/decide` | Request AI decision for grid management |
| GET | `/agent/status` | Get agent status and grid analysis |
| GET | `/health` | Health check |
| GET | `/data` | Get last 20 MQTT readings |
| GET | `/optimize` | Get last optimization result |
| POST | `/set_time` | Set simulation time |

---

## Detailed Endpoints

### 1. POST /agent/configure

Configure the Ollama instance endpoint and model name for the AI agent.

**Request:**
```json
{
  "endpoint": "http://192.168.1.100:11434",
  "model_name": "mistral"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Agent reconfigured successfully",
  "config": {
    "endpoint": "http://192.168.1.100:11434",
    "model": "mistral"
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Failed to reconfigure agent: Connection refused",
  "config": {
    "endpoint": "http://192.168.1.100:11434",
    "model": "mistral"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8000/agent/configure \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "http://192.168.1.100:11434",
    "model_name": "mistral"
  }'
```

---

### 2. GET /agent/config

Get the current agent configuration.

**Response:**
```json
{
  "config": {
    "endpoint": "http://192.168.1.100:11434",
    "model": "mistral"
  },
  "agent_active": true
}
```

**Example cURL:**
```bash
curl http://localhost:8000/agent/config
```

---

### 3. POST /agent/decide

Request the AI agent to make a decision about grid management.

**Request:**
```json
{
  "query": "How should we balance the current 750 MW demand between renewable and non-renewable sources?"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "decision": "Based on current grid conditions, I recommend:\n\n1. **Energy Source Allocation**:\n   - Use 75% renewable energy (525 MW)\n   - Use 25% non-renewable energy (225 MW)\n   - This provides good balance between sustainability and reliability\n\n2. **Specific Recommendations**:\n   - Deploy Hydro Plant (100 MW) - lowest cost ($25/MWh)\n   - Deploy Solar Farm (150 MW) - zero emissions\n   - Deploy Wind Farm (150 MW) - stable output\n   - Use Battery Storage (125 MW) - flexible dispatch\n   - Deploy Gas Turbine (225 MW) - fast response\n\n3. **Cost Analysis**:\n   - Total cost: $33,250\n   - Carbon footprint: 110,250 kg CO2\n   - Renewable efficiency: 70%\n\n4. **Thermal Management**:\n   - Current temperature: 28°C (safe)\n   - Temperature impact of 750 MW load: +6°C\n   - System will stay within safe limits (45°C threshold)\n\n5. **Reserve Status**:\n   - Reserve available: 250 MW\n   - Reserve required: 112.5 MW\n   - Status: ADEQUATE ✓\n\nThis allocation maximizes renewable energy while maintaining reliability and cost efficiency.",
  "grid_context": {
    "temperature_celsius": 28.0,
    "thermal_status": "NORMAL",
    "renewable_available_mw": 800.0,
    "nonrenewable_available_mw": 550.0
  },
  "timestamp": "2026-03-24T10:30:45.123456"
}
```

**Response (Error - Ollama not available):**
```json
{
  "status": "error",
  "error": "Connection refused to http://192.168.1.100:11434",
  "message": "Failed to get decision from Ollama: Connection refused",
  "timestamp": "2026-03-24T10:30:45.123456"
}
```

**Example Queries:**

```bash
# Load balancing
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "How should we balance 750 MW demand efficiently?"}'

# Thermal management
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "System temperature is 50°C. What should we do?"}'

# Peak demand
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "Peak demand reached 900 MW. Options?"}'

# Emergency
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "Reserve dropped below 100 MW! Emergency protocol needed."}'

# Renewable optimization
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"query": "How can we increase renewable energy usage?"}'
```

---

### 4. GET /agent/status

Get the agent status and current grid analysis.

**Response (Agent Active):**
```json
{
  "status": "active",
  "config": {
    "endpoint": "http://192.168.1.100:11434",
    "model": "mistral"
  },
  "latest_optimization": {
    "status_code": "NORMAL",
    "actions": [
      "Grid stable. Charging battery by 50.0 MW."
    ],
    "demand": {
      "hospital": 80.0,
      "school": 110.0,
      "industry": 160.0,
      "residential": 400.0
    },
    "supplied": {
      "hospital": 80.0,
      "school": 110.0,
      "industry": 160.0,
      "residential": 400.0
    },
    "total_demand": 750.0,
    "total_supplied": 750.0,
    "battery_energy": 100.0,
    "battery_delta": 50.0,
    "simulated_hour": 10.5,
    "predicted_loads": {
      "hospital": 85.0,
      "school": 50.0,
      "industry": 140.0,
      "residential": 120.0
    }
  },
  "simulated_hour": 10.5
}
```

**Response (Agent Not Initialized):**
```json
{
  "status": "not_initialized",
  "message": "Agent not initialized"
}
```

**Example cURL:**
```bash
curl http://localhost:8000/agent/status
```

---

## Request/Response Examples by Scenario

### Scenario 1: High Temperature Warning

**Request:**
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Alert: System temperature rising to 48°C (near safe limit of 45°C). Recommend actions to cool the system."
  }'
```

**Expected Agent Response:**
- Reduce load (especially non-critical)
- Activate cooling systems
- Shift to renewable energy (lower heat generation)
- Prepare battery discharge for peak demand
- Recommend load shedding plan (residential first, then commercial)

---

### Scenario 2: Reserve Depletion

**Request:**
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Critical Alert: Spinning reserve dropped to 80 MW (below 100 MW minimum). What should we do immediately?"
  }'
```

**Expected Agent Response:**
- Activate non-spinning reserves immediately
- Begin load shedding (commercial → residential → industry)
- Prepare emergency backup power
- Alert dispatch to reduce demand
- Provide timeline for reserve restoration

---

### Scenario 3: Peak Demand Spike

**Request:**
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Evening peak demand reached 880 MW (97% of 900 MW capacity). All reserves allocated. Next steps?"
  }'
```

**Expected Agent Response:**
- Activate emergency load shedding (commercial first)
- Discharge battery at maximum rate
- Activate all non-renewable backup
- Brief expected load reduction timeline
- Prepare for potential blackouts if demand exceeds capacity

---

### Scenario 4: Renewable Energy Optimization

**Request:**
```bash
curl -X POST http://localhost:8000/agent/decide \
  -H "Content-Type: application/json" \
  -d '{
    "query": "It's noon with clear skies and strong winds. Solar and wind farms at maximum capacity. How should we optimize energy dispatch?"
  }'
```

**Expected Agent Response:**
- Maximize renewable output utilization
- Recommend battery charging schedule
- Calculate optimal time to shift industrial load
- Suggest time-based demand response
- Estimate cost savings and carbon reduction

---

## Status Codes

### Success
- `200 OK` - Request successful
- `success` - Operation completed successfully

### Errors
- `agent_not_initialized` - Configure agent first
- `connection_error` - Cannot reach Ollama endpoint
- `timeout` - Ollama response took too long
- `invalid_query` - Query format invalid

---

## Rate Limiting

No built-in rate limiting. Recommended:
- Max 1 request per second per client
- Cache agent decisions for 30 seconds
- Implement circuit breaker for Ollama failures

---

## Caching Strategy

```javascript
// Frontend implementation
const decisionCache = {};
const CACHE_TTL = 30000; // 30 seconds

async function getAgentDecision(query) {
  const cacheKey = hash(query);
  
  if (decisionCache[cacheKey] && Date.now() - decisionCache[cacheKey].time < CACHE_TTL) {
    return decisionCache[cacheKey].data;
  }
  
  const response = await fetch('/agent/decide', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  decisionCache[cacheKey] = { data, time: Date.now() };
  return data;
}
```

---

## Error Handling

```javascript
async function makeAgentDecision(query) {
  try {
    const response = await fetch('http://localhost:8000/agent/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      console.error('Agent Error:', result.message);
      // Fallback to rule-based decisions
      return fallbackDecision();
    }
    
    return result;
  } catch (error) {
    console.error('Decision Request Failed:', error);
    // Fallback to existing optimizer
    return fallbackDecision();
  }
}
```

---

## Integration Example (Python)

```python
import requests
import json

class GridAgentAPI:
    def __init__(self, base_url='http://localhost:8000'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def configure(self, endpoint, model):
        """Configure agent"""
        return self.session.post(
            f'{self.base_url}/agent/configure',
            json={'endpoint': endpoint, 'model_name': model}
        ).json()
    
    def decide(self, query):
        """Get agent decision"""
        return self.session.post(
            f'{self.base_url}/agent/decide',
            json={'query': query},
            timeout=30
        ).json()
    
    def get_status(self):
        """Get agent status"""
        return self.session.get(f'{self.base_url}/agent/status').json()

# Usage
client = GridAgentAPI()

# Configure
client.configure('http://192.168.1.100:11434', 'mistral')

# Get decision
decision = client.decide('How should we manage the grid efficiently?')
print(decision['decision'])
```

---

## Integration Example (JavaScript)

```javascript
class GridAgentAPI {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async configure(endpoint, modelName) {
    const response = await fetch(`${this.baseUrl}/agent/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, model_name: modelName })
    });
    return response.json();
  }

  async decide(query) {
    const response = await fetch(`${this.baseUrl}/agent/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return response.json();
  }

  async getStatus() {
    const response = await fetch(`${this.baseUrl}/agent/status`);
    return response.json();
  }
}

// Usage
const client = new GridAgentAPI();

// Configure
await client.configure('http://192.168.1.100:11434', 'mistral');

// Get decision
const decision = await client.decide('How should we manage the grid?');
console.log(decision.decision);
```

---

## Performance Considerations

### Response Times
- Cold start (first query): ~2-5 seconds
- Cached decision: <100ms
- Average agent response: 3-4 seconds with mistral model

### Optimization Tips
1. Use lighter models for faster response (mistral > llama2 > dolphin-mixtral)
2. Cache frequently asked questions
3. Implement circuit breaker for Ollama failures
4. Use async/await to avoid blocking UI
5. Consider WebSocket for streaming responses (future)

---

## API Versioning

Current Version: **1.0**

Future versions will maintain backward compatibility with `/agent/*` endpoints.

---

## Support

For issues or questions:
1. Check AGENT_SETUP.md
2. Verify Ollama is running: `curl http://endpoint:11434/api/tags`
3. Check backend logs for detailed errors
4. Test with example_client.py
