"""Settings helpers for the APort Django integration."""

from __future__ import annotations

from importlib import import_module
from typing import Any, Dict, Type

from django.conf import settings

from .client import MockAPortClient


DEFAULTS: Dict[str, Any] = {
    "API_KEY": None,
    "BASE_URL": "https://api.aport.io",
    "DEFAULT_POLICY": None,
    "PROTECTED_PATHS": {},
    "STRICT": True,
    "CLIENT_CLASS": "aport_django.client.MockAPortClient",
}


def get_aport_setting(name: str) -> Any:
    """Read an APORT_* setting with package defaults."""
    return getattr(settings, f"APORT_{name}", DEFAULTS[name])


def get_client_class() -> Type[MockAPortClient]:
    """Resolve the configured client class from a dotted import path."""
    client_class = get_aport_setting("CLIENT_CLASS")
    if not isinstance(client_class, str):
        return client_class

    module_name, _, class_name = client_class.rpartition(".")
    if not module_name:
        raise ImportError("APORT_CLIENT_CLASS must be a dotted import path")

    module = import_module(module_name)
    return getattr(module, class_name)
