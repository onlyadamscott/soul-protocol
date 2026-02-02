"""
Soul Protocol Client SDK for Python
"""

import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from urllib.parse import urljoin, quote


@dataclass
class RegisterResult:
    did: str
    claim_url: str
    verification_code: str
    private_key: Optional[List[int]] = None


@dataclass 
class VerifyResult:
    valid: bool
    checks: Dict[str, Any]


class SoulClient:
    """Client for interacting with Soul Protocol registries."""
    
    def __init__(self, registry_url: str = "https://registry.soulprotocol.dev", timeout: int = 30):
        self.registry_url = registry_url.rstrip("/")
        self.timeout = timeout
    
    def register(
        self,
        name: str,
        base_model: str,
        platform: str,
        public_key: Optional[str] = None,
        charter_hash: Optional[str] = None,
        purpose: Optional[str] = None,
    ) -> RegisterResult:
        """Register a new Soul."""
        payload = {
            "name": name,
            "baseModel": base_model,
            "platform": platform,
        }
        if public_key:
            payload["publicKey"] = public_key
        if charter_hash:
            payload["charterHash"] = charter_hash
        if purpose:
            payload["purpose"] = purpose
        
        response = self._post("/v1/souls/register", payload)
        
        return RegisterResult(
            did=response["soul"]["did"],
            claim_url=response["soul"]["claimUrl"],
            verification_code=response["soul"]["verificationCode"],
            private_key=response.get("privateKey"),
        )
    
    def resolve(self, did: str) -> Optional[Dict[str, Any]]:
        """Resolve a Soul by DID."""
        try:
            return self._get(f"/v1/souls/{quote(did, safe='')}")
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return None
            raise
    
    def claim(self, did: str, operator_did: Optional[str] = None) -> Dict[str, Any]:
        """Claim a Soul."""
        payload = {"did": did}
        if operator_did:
            payload["operatorDid"] = operator_did
        
        response = self._post("/v1/souls/claim", payload)
        return response["soul"]
    
    def verify(self, credential: Dict[str, Any]) -> VerifyResult:
        """Verify a birth certificate."""
        response = self._post("/v1/verify", {"credential": credential})
        return VerifyResult(
            valid=response["valid"],
            checks=response["checks"],
        )
    
    def list(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List all Souls."""
        params = {"limit": str(limit), "offset": str(offset)}
        if status:
            params["status"] = status
        
        return self._get("/v1/souls", params=params)
    
    def stats(self) -> Dict[str, int]:
        """Get registry statistics."""
        response = self._get("/")
        return response["stats"]
    
    def _get(self, path: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make GET request."""
        url = urljoin(self.registry_url, path)
        response = requests.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()
    
    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make POST request."""
        url = urljoin(self.registry_url, path)
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()


def create_client(registry_url: str = "https://registry.soulprotocol.dev") -> SoulClient:
    """Create a Soul Protocol client with default settings."""
    return SoulClient(registry_url=registry_url)
