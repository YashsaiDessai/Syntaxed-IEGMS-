# Deployment Checklist - AI Grid Agent

## Pre-Deployment

- [ ] Ollama installed on remote laptop
- [ ] Model downloaded (ollama pull mistral)
- [ ] Ollama accessible on network (port 11434)
- [ ] Remote laptop IP address noted
- [ ] Python 3.10+ available on development machine
- [ ] Git repository cloned

## Setup Phase

- [ ] Navigate to backend/ directory
- [ ] Create virtual environment: python -m venv venv
- [ ] Activate venv: source venv/bin/activate
- [ ] Install dependencies: pip install -r requirements.txt
- [ ] Create .env file with Ollama endpoint and model
- [ ] Verify .env contents (no sensitive info in git)

## Testing Phase

- [ ] Run unit tests: python test_agent.py
- [ ] Verify all tests pass
- [ ] Check agent import: python -c "from agent_orchestrator import GridAgent"
- [ ] Test Ollama connectivity: curl http://<IP>:11434/api/tags

## Backend Startup

- [ ] Start backend: python -m uvicorn main:app --reload
- [ ] Verify startup message includes "Grid Agent initialized"
- [ ] Check health endpoint: curl http://localhost:8000/health
- [ ] Access API docs: http://localhost:8000/docs

## Agent Configuration

- [ ] Get current config: curl http://localhost:8000/agent/config
- [ ] Verify config shows correct endpoint and model
- [ ] Test reconfiguration endpoint (if needed)

## API Testing

- [ ] Test health check: GET /health
- [ ] Test agent status: GET /agent/status
- [ ] Test simple query: POST /agent/decide with test query
- [ ] Verify response format and content
- [ ] Check grid_context in response

## Frontend Integration

- [ ] Update frontend to call /agent/decide endpoint
- [ ] Display agent decision in UI
- [ ] Handle error responses gracefully
- [ ] Test with agent configuration dialog
- [ ] Verify CORS headers are correct

## Production Deployment

- [ ] Remove debug flags (--reload)
- [ ] Set environment variables securely
- [ ] Configure HTTPS/TLS for API
- [ ] Implement authentication/authorization
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting
- [ ] Implement circuit breaker for Ollama failures
- [ ] Set up backup/failover strategy

## Success Criteria

✓ Agent initializes successfully at backend startup
✓ All endpoints respond correctly
✓ Agent can make decisions with Ollama
✓ Response times are acceptable (<5s)
✓ Error handling is graceful
✓ Documentation is complete
✓ Team understands deployment
✓ Monitoring is in place

---

Last Updated: March 24, 2026
Version: 1.0
