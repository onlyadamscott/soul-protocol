"""
Soul Protocol type definitions
"""

from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime


@dataclass
class VerificationMethod:
    id: str
    type: str
    controller: str
    public_key_multibase: str


@dataclass
class ServiceEndpoint:
    id: str
    type: str
    service_endpoint: str


@dataclass
class DIDDocument:
    context: List[str]
    id: str
    controller: str
    verification_method: List[VerificationMethod]
    authentication: List[str]
    service: Optional[List[ServiceEndpoint]] = None


@dataclass
class Proof:
    type: str
    created: str
    verification_method: str
    proof_purpose: str
    proof_value: str


@dataclass
class SoulCredentialSubject:
    id: str
    soul_name: str
    birth_timestamp: str
    base_model: str
    platform: str
    operator: Optional[str] = None
    lineage: Optional[str] = None
    charter_hash: Optional[str] = None
    purpose: Optional[str] = None


@dataclass
class BirthCertificate:
    context: List[str]
    type: List[str]
    issuer: str
    issuance_date: str
    credential_subject: SoulCredentialSubject
    proof: Proof


@dataclass
class Soul:
    did: str
    did_document: DIDDocument
    birth_certificate: BirthCertificate
    status: str
    created_at: str
    claimed_at: Optional[str] = None
    revoked_at: Optional[str] = None
