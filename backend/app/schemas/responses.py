from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class Citation(BaseModel):
    document_id: str
    document_name: str
    page_number: int = 1
    text_snippet: str
    confidence: float
    scope: str = "public"

class ChatResponse(BaseModel):
    reply: str
    intent: str
    citations: List[Citation] = []
    cards: List[Dict[str, Any]] = []
    action_buttons: List[Dict[str, str]] = []
    confidence: float = 1.0
    latency_ms: int = 0
    session_id: str
    security_alert: bool = False

class UserResponse(BaseModel):
    user_id: str
    firebase_uid: str
    name: str
    email: str
    role: str
    city: Optional[str] = "Vizag"
    department: Optional[str] = "Citizen"
    phone: Optional[str] = None
    dob: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    meter_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = "English"
    notifications: Optional[Dict[str, bool]] = None
    email_verified: bool = True

class ServiceRequestResponse(BaseModel):
    request_id: str
    customer_id: str
    utility: str
    request_type: str
    status: str
    priority: str
    created_at: str
    updated_at: str
    service_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    technician_name: Optional[str] = None
    technician_phone: Optional[str] = None
    technician_status: Optional[str] = None
    technician_lat: Optional[float] = None
    technician_lng: Optional[float] = None
    technician_eta_mins: Optional[int] = None
    technician_distance_km: Optional[float] = None

class ComplaintResponse(BaseModel):
    complaint_id: str
    customer_id: str
    request_id: Optional[str] = None
    category: str
    description: str
    status: str
    priority: str
    created_at: str
    updated_at: str
    service_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class OperationalLogResponse(BaseModel):
    log_id: str
    utility: str
    incident_type: str
    affected_area: str
    severity: str
    description: str
    timestamp: str
    status: str
    reported_by_staff_id: Optional[str] = None

class DocumentResponse(BaseModel):
    document_id: str
    title: str
    scope: str
    utility: str
    page_count: int
    chunk_count: int
    version: str

class AuditLogResponse(BaseModel):
    audit_id: str
    user_id: str
    role: str
    action: str
    timestamp: str
    resource: str
    details: Optional[str] = None
    status: str = "SUCCESS"
