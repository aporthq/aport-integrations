# Production Deployment Guide

This guide provides instructions for deploying the LangGraph APort Integration in a production environment.

## Prerequisites

### System Requirements
- Python 3.8 or higher
- Linux/Unix-based operating system (recommended)
- Minimum 2GB RAM, 1 CPU core
- Network access to APort API endpoints

### Dependencies
- LangGraph 0.2.0+
- APort SDK for Python
- Production database (PostgreSQL/MySQL for checkpoint storage)
- Redis (optional, for caching)

## Installation

### 1. Environment Setup

```bash
# Create dedicated user for the service
sudo useradd -r -s /bin/false aport-service

# Create application directory
sudo mkdir -p /opt/aport-langgraph
sudo chown aport-service:aport-service /opt/aport-langgraph

# Create log directories
sudo mkdir -p /var/log/aport
sudo chown aport-service:aport-service /var/log/aport
```

### 2. Application Installation

```bash
# Clone the repository
cd /opt/aport-langgraph
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations/examples/agent-frameworks/langgraph

# Install dependencies
pip install -r requirements.txt

# Install production APort SDK
pip install aporthq-sdk-python
```

### 3. Configuration

```bash
# Copy production configuration
cp .env.production .env

# Edit configuration with your values
sudo nano .env
```

Required configuration:
- `APORT_API_KEY`: Your production APort API key
- `APORT_BASE_URL`: APort API endpoint
- `LOG_LEVEL`: Set to INFO or WARNING for production
- `STRICT_MODE`: Set to true for production security

## Security Configuration

### 1. API Key Management

```bash
# Store API key securely
echo "APORT_API_KEY=your_key_here" | sudo tee /etc/aport/credentials
sudo chmod 600 /etc/aport/credentials
sudo chown aport-service:aport-service /etc/aport/credentials
```

### 2. File Permissions

```bash
# Set proper file permissions
sudo chown -R aport-service:aport-service /opt/aport-langgraph
sudo chmod -R 755 /opt/aport-langgraph
sudo chmod 600 /opt/aport-langgraph/.env
```

### 3. Network Security

- Configure firewall to allow only necessary ports
- Use HTTPS for all API communications
- Implement rate limiting for API requests
- Set up monitoring for suspicious activities

## Service Configuration

### 1. Systemd Service

Create `/etc/systemd/system/aport-langgraph.service`:

```ini
[Unit]
Description=APort LangGraph Integration Service
After=network.target

[Service]
Type=simple
User=aport-service
Group=aport-service
WorkingDirectory=/opt/aport-langgraph/aport-integrations/examples/agent-frameworks/langgraph
Environment=PYTHONPATH=/opt/aport-langgraph/aport-integrations/examples/agent-frameworks/langgraph/src
EnvironmentFile=/etc/aport/credentials
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable aport-langgraph
sudo systemctl start aport-langgraph
sudo systemctl status aport-langgraph
```

## Monitoring and Logging

### 1. Log Configuration

Configure structured logging in your application:

```python
import logging
import json
from datetime import datetime

class ProductionFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        return json.dumps(log_entry)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler('/var/log/aport/langgraph-integration.log'),
        logging.StreamHandler()
    ]
)

for handler in logging.getLogger().handlers:
    handler.setFormatter(ProductionFormatter())
```

### 2. Health Check Endpoint

Implement health checks for monitoring:

```python
async def health_check():
    """Health check endpoint for load balancers."""
    try:
        # Test APort connectivity
        client = APortClient()
        # Perform a lightweight verification test
        return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### 3. Metrics Collection

Monitor key metrics:
- Verification success/failure rates
- Response times
- Error rates
- Resource usage (CPU, memory)

## Performance Optimization

### 1. Connection Pooling

Configure connection pooling for better performance:

```python
# In your APort client configuration
client = APortClient(
    api_key=os.getenv("APORT_API_KEY"),
    connection_pool_size=10,
    timeout=30
)
```

### 2. Caching

Implement verification result caching:

```python
import redis
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_verification(ttl=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"verification:{hash(str(args) + str(kwargs))}"
            cached_result = redis_client.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result)
            
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator
```

### 3. Async Optimization

Use async/await properly for better performance:

```python
# Batch verification requests
async def verify_batch(verifications):
    tasks = [
        client.verify_checkpoint(**verification)
        for verification in verifications
    ]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Backup and Recovery

### 1. Configuration Backup

```bash
# Backup configuration
sudo tar -czf /backup/aport-config-$(date +%Y%m%d).tar.gz \
    /opt/aport-langgraph/.env \
    /etc/aport/ \
    /etc/systemd/system/aport-langgraph.service
```

### 2. Checkpoint Data Backup

If using persistent checkpoint storage:

```bash
# Backup checkpoint database
pg_dump langgraph_checkpoints > /backup/checkpoints-$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

1. **Connection timeouts**
   - Check network connectivity to APort API
   - Verify firewall rules
   - Increase timeout values if needed

2. **Authentication failures**
   - Verify API key is correct and active
   - Check API key permissions in APort dashboard
   - Ensure proper environment variable loading

3. **Memory issues**
   - Monitor memory usage with `htop` or `ps`
   - Implement proper cleanup in long-running processes
   - Consider increasing available memory

### Debug Mode

For troubleshooting, temporarily enable debug mode:

```bash
# Set debug environment variables
export DEBUG=true
export LOG_LEVEL=DEBUG

# Restart service
sudo systemctl restart aport-langgraph
```

### Log Analysis

```bash
# View recent logs
sudo tail -f /var/log/aport/langgraph-integration.log

# Search for errors
sudo grep -i error /var/log/aport/langgraph-integration.log

# Analyze verification patterns
sudo grep "verification" /var/log/aport/langgraph-integration.log | jq .
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancers to distribute traffic
- Implement stateless design for easy scaling
- Consider container deployment with Docker/Kubernetes

### Database Scaling

- Use read replicas for checkpoint storage
- Implement connection pooling
- Consider sharding for large datasets

### Caching Strategy

- Implement distributed caching with Redis Cluster
- Use CDN for static resources
- Cache verification results appropriately

## Security Best Practices

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Implement automated security scanning

2. **Access Control**
   - Use principle of least privilege
   - Implement proper authentication
   - Regular access reviews

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Use TLS for all communications
   - Implement proper data retention policies

4. **Monitoring**
   - Set up security event monitoring
   - Implement anomaly detection
   - Regular security audits

## Maintenance

### Regular Tasks

- Monitor system resources
- Review and rotate logs
- Update dependencies
- Backup configurations
- Test disaster recovery procedures

### Performance Reviews

- Analyze verification patterns
- Review response times
- Optimize slow queries
- Update caching strategies

This deployment guide ensures your LangGraph APort Integration runs securely and efficiently in production environments.