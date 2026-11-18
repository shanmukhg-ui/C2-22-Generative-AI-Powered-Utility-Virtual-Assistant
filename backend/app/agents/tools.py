from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database.mongo import get_database
from app.rag.vector_store import KnowledgeVectorStore
from app.security.rbac import RBACManager, UserRole

class AgentTools:
    @staticmethod
    def search_knowledge_base(query: str, role: str) -> Dict[str, Any]:
        """
        Tool: Searches approved utility documents and SOPs with role-based filtering.
        """
        vector_store = KnowledgeVectorStore.get_instance()
        results = vector_store.search(query=query, role=role, top_k=3)

        if not results or results[0]["confidence"] < 0.25:
            return {
                "success": False,
                "insufficient_context": True,
                "fallback_message": "I couldn't find sufficient verified information in the approved utility documents. Please contact customer support.",
                "citations": []
            }

        return {
            "success": True,
            "insufficient_context": False,
            "chunks": results,
            "citations": [
                {
                    "document_id": r["document_id"],
                    "document_name": r["document_name"],
                    "page_number": r["page_number"],
                    "text_snippet": r["text_snippet"][:180] + "...",
                    "confidence": r["confidence"],
                    "scope": r["scope"]
                }
                for r in results
            ]
        }

    @staticmethod
    def lookup_service_request(request_id: str, customer_id: str, role: str) -> Dict[str, Any]:
        """
        Tool: Queries MongoDB for service request status and enforces RBAC ownership.
        """
        db = get_database()
        req = db.service_requests.find_one({"request_id": request_id.upper()})

        if not req:
            return {
                "success": False,
                "found": False,
                "message": f"Service request '{request_id}' was not found in the utility system."
            }

        # RBAC Check: Customer can only view their own requests
        if role == UserRole.CUSTOMER.value and req.get("customer_id") != customer_id:
            return {
                "success": False,
                "found": True,
                "rbac_denied": True,
                "security_alert": True,
                "message": f"🔒 Access Restricted by RBAC: Service request '{request_id}' belongs to another registered customer account. Citizen accounts may only access tickets registered under their own profile (current ID: '{customer_id}')."
            }

        # Retrieve linked complaints if any
        linked_complaints = list(db.complaints.find({"request_id": req.get("request_id")}))

        card = {
            "type": "SERVICE_REQUEST",
            "request_id": req.get("request_id"),
            "customer_id": req.get("customer_id"),
            "utility": req.get("utility", "Electricity"),
            "request_type": req.get("request_type", "General Service"),
            "status": req.get("status", "Submitted"),
            "priority": req.get("priority", "Medium"),
            "created_at": req.get("created_at"),
            "updated_at": req.get("updated_at"),
            "service_location": req.get("service_location", "Registered Locality"),
            "description": req.get("description", ""),
            "assigned_staff_id": req.get("assigned_staff_id", "Pending Crew Assignment"),
            "linked_complaints": [
                {
                    "complaint_id": c.get("complaint_id"),
                    "category": c.get("category"),
                    "status": c.get("status")
                }
                for c in linked_complaints
            ]
        }

        return {
            "success": True,
            "found": True,
            "card": card,
            "message": f"Found service request '{req.get('request_id')}' ({req.get('utility')} - {req.get('request_type')}). Current status is '{req.get('status')}' with '{req.get('priority')}' priority."
        }

    @staticmethod
    def lookup_complaint(complaint_id: str, customer_id: str, role: str) -> Dict[str, Any]:
        """
        Tool: Queries MongoDB for complaint status and enforces RBAC ownership.
        """
        db = get_database()
        cmp = db.complaints.find_one({"complaint_id": complaint_id.upper()})

        if not cmp:
            return {
                "success": False,
                "found": False,
                "message": f"Complaint '{complaint_id}' was not found in the complaint tracking registry."
            }

        # RBAC Check
        if role == UserRole.CUSTOMER.value and cmp.get("customer_id") != customer_id:
            return {
                "success": False,
                "found": True,
                "rbac_denied": True,
                "security_alert": True,
                "message": f"🔒 Access Restricted by RBAC: Complaint '{complaint_id}' is registered under a different consumer account. You are logged in as '{customer_id}'."
            }

        card = {
            "type": "COMPLAINT",
            "complaint_id": cmp.get("complaint_id"),
            "customer_id": cmp.get("customer_id"),
            "request_id": cmp.get("request_id"),
            "category": cmp.get("category"),
            "description": cmp.get("description"),
            "status": cmp.get("status"),
            "priority": cmp.get("priority", "Medium"),
            "created_at": cmp.get("created_at"),
            "updated_at": cmp.get("updated_at")
        }

        return {
            "success": True,
            "found": True,
            "card": card,
            "message": f"Found complaint '{cmp.get('complaint_id')}' (Category: {cmp.get('category')}) linked to request '{cmp.get('request_id')}'. Current status is '{cmp.get('status')}'."
        }

    @staticmethod
    def get_daily_operational_summary(date: Optional[str], role: str) -> Dict[str, Any]:
        """
        Tool: Aggregates operational incidents and generates executive briefing.
        """
        db = get_database()

        # If role is Customer: public advisory only
        if role == UserRole.CUSTOMER.value:
            outages = list(db.operational_logs.find({"incident_type": "Power Outage"}).limit(4))
            items = [f"• **{o.get('incident_type')}** in **{o.get('affected_area')}**: {o.get('description')}" for o in outages]
            return {
                "success": True,
                "is_public_advisory": True,
                "message": "📢 **Public Utility Advisory**:\n" + "\n".join(items) + "\n\n*(Detailed engineering logs and SCADA dispatch are restricted to Utility Employees and Administrators)*",
                "citations": [{"document_id": "OPS_DISPATCH", "document_name": "Public Outage Dispatch", "page_number": 1, "text_snippet": "Active Municipal Outages", "confidence": 0.95, "scope": "public"}]
            }

        # Staff or Admin: Full Operational Aggregation
        total = db.operational_logs.count_documents({})
        critical = db.operational_logs.count_documents({"severity": "Critical"})
        high = db.operational_logs.count_documents({"severity": "High"})
        active = db.operational_logs.count_documents({"status": {"$ne": "Resolved"}})

        recent_logs = list(db.operational_logs.find().sort("timestamp", -1).limit(6))

        return {
            "success": True,
            "is_public_advisory": False,
            "total_incidents": total,
            "critical": critical,
            "high": high,
            "active": active,
            "recent_logs": recent_logs
        }
