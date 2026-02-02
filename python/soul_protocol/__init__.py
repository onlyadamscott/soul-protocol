"""
Soul Protocol - The birth certificate for AI agents

Verifiable identity for the agent ecosystem.
"""

from .client import SoulClient, create_client
from .types import Soul, BirthCertificate, DIDDocument

__version__ = "0.1.0"
__all__ = [
    "SoulClient",
    "create_client",
    "Soul",
    "BirthCertificate",
    "DIDDocument",
]
