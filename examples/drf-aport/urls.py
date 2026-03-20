"""URL configuration for DRF + APort example."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from views import (
    health,
    agent_info,
    sensitive_data,
    write_action,
)

urlpatterns = [
    path("health", health, name="health"),
    path("api/agent/info", agent_info, name="agent-info"),
    path("api/data/sensitive", sensitive_data, name="sensitive-data"),
    path("api/action/write", write_action, name="write-action"),
]
