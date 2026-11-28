export type Role = 'Customer' | 'Employee' | 'Administrator';

export interface User {
  user_id: string;
  firebase_uid?: string;
  name: string;
  email: string;
  role: Role;
  city?: string;
  department?: string;
  phone?: string;
  dob?: string;
  photo_url?: string;
  gender?: string;
  address?: string;
  meter_number?: string;
  emergency_contact?: string;
  preferred_language?: string;
  notifications?: {
    sms?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
  email_verified?: boolean;
  is_active?: boolean;
  status?: string;
  created_at?: string;
}

export interface Citation {
  document_id: string;
  document_name: string;
  page_number: number;
  text_snippet: string;
  confidence: number;
  scope: 'public' | 'internal' | 'crm' | 'cms';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  intent?: string;
  citations?: Citation[];
  cards?: any[];
  action_buttons?: { text: string; action: string }[];
  security_alert?: boolean;
  confidence?: number;
  latency_ms?: number;
}

export interface ServiceRequest {
  request_id: string;
  customer_id: string;
  utility: string;
  department?: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  service_location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  assigned_staff_id?: string;
  technician_name?: string;
  technician_phone?: string;
  technician_status?: string;
  technician_lat?: number;
  technician_lng?: number;
  technician_eta_mins?: number;
  technician_distance_km?: number;
  linked_complaints?: Complaint[];
}

export interface Complaint {
  complaint_id: string;
  customer_id: string;
  request_id?: string;
  utility?: string;
  department?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  service_location?: string;
  latitude?: number;
  longitude?: number;
}

export interface OperationalLog {
  log_id: string;
  utility: string;
  incident_type: string;
  affected_area: string;
  severity: string;
  description: string;
  timestamp: string;
  status: string;
  reported_by_staff_id?: string;
}

export interface KnowledgeDocument {
  document_id: string;
  title: string;
  scope: string;
  utility: string;
  version: string;
  chunk_count: number;
  page_count: number;
  filename?: string;
  category?: string;
  visibility?: string;
}

export interface AuditLog {
  audit_id: string;
  user_id: string;
  role: string;
  action: string;
  timestamp: string;
  resource: string;
  details?: string;
  status: string;
  log_id?: string;
}
