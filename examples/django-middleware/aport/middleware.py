"""
APort Django Middleware Package

Django middleware for APort verification.
"""

import os
import logging
from django.http import JsonResponse
from django.conf import settings

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger(__name__)


class APortMiddleware:
    """
    Django middleware for APort verification.
    
    Add to settings.py:
    
    MIDDLEWARE = [
        ...
        'aport.middleware.APortMiddleware',
    ]
    
    APORT = {
        'API_KEY': 'your-api-key',
        'PROJECT_ID': 'default',
        'ENABLED': True,
        'EXEMPT_URLS': ['/health/', '/admin/login/'],
    }
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.api_key = None
        self.project_id = 'default'
        self.enabled = True
        self.exempt_urls = []
        
        # Load configuration from settings
        if hasattr(settings, 'APORT'):
            config = settings.APORT
            self.api_key = config.get('API_KEY', os.environ.get('APORT_API_KEY'))
            self.project_id = config.get('PROJECT_ID', 'default')
            self.enabled = config.get('ENABLED', True)
            self.exempt_urls = config.get('EXEMPT_URLS', [])
    
    def __call__(self, request):
        # Skip if disabled
        if not self.enabled:
            return self.get_response(request)
        
        # Skip exempt URLs
        if self._is_exempt(request.path):
            return self.get_response(request)
        
        # Skip admin
        if request.path.startswith('/admin/'):
            return self.get_response(request)
        
        # Verify with APort
        result = self._verify(request)
        
        if not result.get('allow', True):
            return JsonResponse({
                'error': 'Access Denied',
                'reasons': result.get('reasons', [])
            }, status=403)
        
        return self.get_response(request)
    
    def _is_exempt(self, path):
        """Check if URL is exempt from verification"""
        for exempt_url in self.exempt_urls:
            if path.startswith(exempt_url):
                return True
        return False
    
    def _verify(self, request):
        """Verify request with APort"""
        if not self.api_key:
            logger.warning('APort API key not configured, allowing request')
            return {'allow': True, 'reasons': ['No API key']}
        
        if requests is None:
            logger.warning('requests library not installed, allowing request')
            return {'allow': True, 'reasons': ['requests not available']}
        
        # Prepare request data
        actor = {
            'id': self._get_user_id(request),
            'name': self._get_user_name(request),
            'owner': 'django'
        }
        
        context = {
            'method': request.method,
            'path': request.path,
            'ip': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200]
        }
        
        try:
            response = requests.post(
                'https://api.aport.io/verify',
                json={
                    'action': f'django_{request.method.lower()}',
                    'actor': actor,
                    'context': {'data': context},
                    'projectId': self.project_id
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                },
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f'APort API error: {response.status_code}')
                return {'allow': True, 'reasons': ['API error, allowing']}
                
        except requests.Timeout:
            logger.error('APort request timeout')
            return {'allow': True, 'reasons': ['Timeout, allowing']}
        except Exception as e:
            logger.error(f'APort verification error: {e}')
            return {'allow': True, 'reasons': ['Verification failed']}
    
    def _get_user_id(self, request):
        """Get user ID from request"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            return str(request.user.id)
        return f'anonymous_{self._get_client_ip(request)}'
    
    def _get_user_name(self, request):
        """Get user name from request"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            return request.user.username
        return 'anonymous'
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


def aport_verify(action, actor_id, actor_name, context, api_key=None, project_id='default'):
    """
    Standalone function for APort verification.
    
    Usage:
        from aport import aport_verify
        
        result = aport_verify(
            action='custom_action',
            actor_id='user-123',
            actor_name='john',
            context={'key': 'value'}
        )
    """
    if api_key is None:
        api_key = os.environ.get('APORT_API_KEY')
        if not api_key:
            return {'allow': True, 'reasons': ['No API key']}
    
    if requests is None:
        return {'allow': True, 'reasons': ['requests not installed']}
    
    try:
        response = requests.post(
            'https://api.aport.io/verify',
            json={
                'action': action,
                'actor': {
                    'id': str(actor_id),
                    'name': str(actor_name),
                    'owner': 'django'
                },
                'context': {'data': context},
                'projectId': project_id
            },
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        return {'allow': True, 'reasons': [f'API error: {response.status_code}']}
        
    except Exception as e:
        return {'allow': True, 'reasons': [str(e)]}


# For backwards compatibility
APortVerifyMixin = APortMiddleware
