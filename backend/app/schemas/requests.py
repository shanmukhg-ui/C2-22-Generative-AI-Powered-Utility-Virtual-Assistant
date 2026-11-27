from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    message: str = Field(..., description="Natural language query from user")
    session_id: Optional[str] = Field(None, description="Conversation session ID")
    role: Optional[str] = Field(None, description="User role (extracted from verified token claims)")
    user_id: Optional[str] = Field(None, description="User identifier (extracted from verified token claims)")
    history: Optional[List[Dict[str, Any]]] = Field(None, description="Recent conversation history")
    stream: Optional[bool] = Field(False, description="Whether to stream response via SSE")

class ServiceRequestCreate(BaseModel):
    customer_id: Optional[str] = None
    utility: str = "Electricity"
    department: Optional[str] = "Electricity Department"
    request_type: str = "New Connection"
    priority: str = "Medium"
    service_location: Optional[str] = "Municipal Ward 1"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str

class ComplaintCreate(BaseModel):
    customer_id: Optional[str] = None
    request_id: Optional[str] = None
    utility: Optional[str] = "Electricity"
    department: Optional[str] = "Electricity Department"
    category: str = "Billing Dispute"
    priority: str = "Medium"
    service_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str

class TechnicianDispatchUpdate(BaseModel):
    technician_name: Optional[str] = None
    technician_phone: Optional[str] = None
    technician_status: Optional[str] = None  # Assigned, Dispatched, En Route, Arrived at Site, Completed
    technician_lat: Optional[float] = None
    technician_lng: Optional[float] = None
    technician_eta_mins: Optional[int] = None
    technician_distance_km: Optional[float] = None
    status: Optional[str] = None  # In Progress, Completed, etc.
    notes: Optional[str] = None

class ServiceRequestUpdate(BaseModel):
    status: Optional[str] = None  # Assigned, In Progress, Completed, Rejected
    priority: Optional[str] = None
    technician_name: Optional[str] = None
    technician_phone: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    scheduled_window: Optional[str] = None
    operational_notes: Optional[str] = None
    service_location: Optional[str] = None

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None  # Under Investigation, In Progress, Resolved, Escalated, Rejected
    priority: Optional[str] = None
    assigned_officer: Optional[str] = None
    resolution_notes: Optional[str] = None
    remediation_action: Optional[str] = None

class DocumentIngestRequest(BaseModel):
    title: str
    content: str
    scope: str = "public" # public or internal
    utility: str = "Electricity"
    version: str = "2026.1"

class SearchQueryRequest(BaseModel):
    query: str
    role: str = "Customer"
    top_k: int = 4

class SummarizeRequest(BaseModel):
    date: Optional[str] = None
    role: str = "Employee"
    area: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    department: Optional[str] = None
    meter_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = None
    notifications: Optional[Dict[str, bool]] = None

class AdminCreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name of the new user")
    email: str = Field(..., min_length=5, max_length=150, description="Valid official email address")
    department: Optional[str] = Field("Customer Service", description="Department or organizational unit")
    phone: Optional[str] = Field(None, description="Optional phone number")
    city: Optional[str] = Field(None, description="City or primary work location")
    user_id: Optional[str] = Field(None, description="Optional custom user identifier")
    password: Optional[str] = Field(None, min_length=6, description="Optional initial temporary password")

class AdminUserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Whether the user account is active")
    reason: Optional[str] = Field(None, description="Reason for deactivation or reactivation")
    status: Optional[str] = Field(None, description="Optional explicit status string ('Active' or 'Inactive')")
