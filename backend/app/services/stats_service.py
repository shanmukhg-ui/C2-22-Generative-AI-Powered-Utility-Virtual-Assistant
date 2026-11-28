"""
StatsService: Single Source of Truth for UtilityAI operational metrics,
dashboard KPIs, AI summaries, and chatbot responses.
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
import re
from app.database.mongo import get_database

class StatsService:
    # -------------------------------------------------------------
    # Shared Canonical Status & Severity Definitions
    # -------------------------------------------------------------
    STATUS_AWAITING_ACCEPTANCE = ["Submitted", "Pending", "Open", "submitted", "pending", "open"]
    STATUS_ASSIGNED_IN_PROGRESS = [
        "Assigned", "In Progress", "assigned", "in progress", 
        "Under Investigation", "Crew assigned", "Inspection started", 
        "Monitoring ongoing", "under investigation"
    ]
    STATUS_RESOLVED = [
        "Resolved", "Completed", "Repair completed", "Closed",
        "resolved", "completed", "closed"
    ]
    SEVERITY_CRITICAL = ["Critical", "critical", "P4"]

    @classmethod
    def get_database(cls):
        return get_database()

    @classmethod
    def get_all_stats(cls) -> Dict[str, Any]:
        """
        Unified computation returning synchronized KPIs for dashboards,
        the AI summary generator, and the chatbot.
        """
        db = cls.get_database()
        today_date = datetime.now().strftime("%d %b %Y")
        today_iso = datetime.now().strftime("%Y-%m-%d")

        # 1. Operational Incidents
        total_incidents = db.operational_logs.count_documents({})
        active_outages = db.operational_logs.count_documents({
            "status": {"$nin": cls.STATUS_RESOLVED}
        })
        critical_incidents = db.operational_logs.count_documents({
            "severity": {"$in": ["Critical", "critical"]},
            "status": {"$nin": cls.STATUS_RESOLVED}
        })
        resolved_today = db.operational_logs.count_documents({
            "status": {"$in": cls.STATUS_RESOLVED}
        })

        # 2. Service Requests
        total_requests = db.service_requests.count_documents({})
        requests_awaiting = db.service_requests.count_documents({
            "status": {"$in": cls.STATUS_AWAITING_ACCEPTANCE}
        })
        requests_assigned = db.service_requests.count_documents({
            "status": {"$in": cls.STATUS_ASSIGNED_IN_PROGRESS}
        })
        requests_resolved = db.service_requests.count_documents({
            "status": {"$in": cls.STATUS_RESOLVED}
        })

        # 3. Complaints
        total_complaints = db.complaints.count_documents({})
        complaints_awaiting = db.complaints.count_documents({
            "status": {"$in": cls.STATUS_AWAITING_ACCEPTANCE}
        })
        complaints_assigned = db.complaints.count_documents({
            "status": {"$in": cls.STATUS_ASSIGNED_IN_PROGRESS}
        })
        complaints_resolved = db.complaints.count_documents({
            "status": {"$in": cls.STATUS_RESOLVED}
        })

        return {
            "date": today_date,
            "iso_date": today_iso,
            "incidents": {
                "total": total_incidents,
                "active_outages": active_outages,
                "critical": critical_incidents,
                "resolved_today": resolved_today
            },
            "service_requests": {
                "total": total_requests,
                "awaiting_acceptance": requests_awaiting,
                "assigned_in_progress": requests_assigned,
                "resolved": requests_resolved
            },
            "complaints": {
                "total": total_complaints,
                "awaiting_acceptance": complaints_awaiting,
                "assigned_in_progress": complaints_assigned,
                "resolved": complaints_resolved
            }
        }

    @classmethod
    def execute_dynamic_query(cls, user_message: str, user_id: str, role: str) -> Optional[Dict[str, Any]]:
        """
        Extracts entity, status, severity, ward, utility, and staff filters from
        the user message and queries MongoDB. Returns structured table/cards.
        """
        db = cls.get_database()
        msg = user_message.strip()
        lower = msg.lower()

        # Check if the query is asking to list or show data
        data_query_keywords = [
            "list", "show", "get", "display", "fetch", "find", "view",
            "what are", "how many", "all complaints", "all cases", "all requests",
            "all incidents", "pending", "resolved", "assigned", "critical"
        ]
        
        # Determine target collection / entity
        is_complaint = any(k in lower for k in ["complaint", "grievance", "grievances", "complaints"])
        is_request = any(k in lower for k in ["service request", "service requests", "requests", "request"])
        is_incident = any(k in lower for k in ["incident", "incidents", "outage", "outages"])
        is_generic_case = any(k in lower for k in ["case", "cases"])

        if not (is_complaint or is_request or is_incident or is_generic_case):
            return None

        # Build mongo filter
        mongo_filter: Dict[str, Any] = {}

        # 1. Status Filter - check unresolved/pending BEFORE resolved to avoid substring match
        status_label = None
        if any(k in lower for k in ["unresolved", "pending", "awaiting", "open", "submitted", "not resolved"]):
            if is_incident:
                mongo_filter["status"] = {"$nin": cls.STATUS_RESOLVED}
            else:
                mongo_filter["status"] = {"$in": cls.STATUS_AWAITING_ACCEPTANCE}
            status_label = "Pending / Unresolved"
        elif any(k in lower for k in ["successfully resolved", "resolved", "closed", "completed", "repaired"]):
            mongo_filter["status"] = {"$in": cls.STATUS_RESOLVED}
            status_label = "Resolved"
        elif any(k in lower for k in ["assigned", "in progress", "investigation", "under investigation"]):
            mongo_filter["status"] = {"$in": cls.STATUS_ASSIGNED_IN_PROGRESS}
            status_label = "Assigned / In Progress"

        # 2. Severity / Priority Filter
        severity_label = None
        if "critical" in lower:
            if is_incident:
                mongo_filter["severity"] = {"$in": ["Critical", "critical"]}
            else:
                mongo_filter["priority"] = {"$in": ["Critical", "critical"]}
            severity_label = "Critical"
        elif "high" in lower or "major" in lower:
            if is_incident:
                mongo_filter["severity"] = {"$in": ["High", "high", "Major", "major"]}
            else:
                mongo_filter["priority"] = {"$in": ["High", "high"]}
            severity_label = "High"

        # 3. Utility Filter
        utility_label = None
        if any(k in lower for k in ["electricity", "power"]):
            utility_label = "Electricity"
            regex_pat = r"(Electricity|Power|Voltage|Outage|Surge|Wire|Transformer)"
            if is_complaint:
                mongo_filter["$or"] = [
                    {"utility": {"$regex": r"^(Electricity|Power)", "$options": "i"}},
                    {"category": {"$regex": regex_pat, "$options": "i"}},
                    {"description": {"$regex": regex_pat, "$options": "i"}}
                ]
            else:
                mongo_filter["utility"] = {"$regex": r"^(Electricity|Power)", "$options": "i"}
        elif "water" in lower:
            utility_label = "Water"
            regex_pat = r"(Water|Supply|Pipe|Leakage|Pressure|Drain)"
            if is_complaint:
                mongo_filter["$or"] = [
                    {"utility": {"$regex": r"^Water", "$options": "i"}},
                    {"category": {"$regex": regex_pat, "$options": "i"}},
                    {"description": {"$regex": regex_pat, "$options": "i"}}
                ]
            else:
                mongo_filter["utility"] = {"$regex": r"^Water", "$options": "i"}
        elif "gas" in lower:
            utility_label = "Gas"
            regex_pat = r"(Gas|Pipeline|LPG|Odor|Cylinder)"
            if is_complaint:
                mongo_filter["$or"] = [
                    {"utility": {"$regex": r"^Gas", "$options": "i"}},
                    {"category": {"$regex": regex_pat, "$options": "i"}},
                    {"description": {"$regex": regex_pat, "$options": "i"}}
                ]
            else:
                mongo_filter["utility"] = {"$regex": r"^Gas", "$options": "i"}
        elif any(k in lower for k in ["telecom", "broadband", "fiber", "network", "internet"]):
            utility_label = "Telecom"
            regex_pat = r"(Telecom|Broadband|Fiber|Network|Internet|Cable)"
            if is_complaint:
                mongo_filter["$or"] = [
                    {"utility": {"$regex": r"^Telecom", "$options": "i"}},
                    {"category": {"$regex": regex_pat, "$options": "i"}},
                    {"description": {"$regex": regex_pat, "$options": "i"}}
                ]
            else:
                mongo_filter["utility"] = {"$regex": r"^Telecom", "$options": "i"}
        elif any(k in lower for k in ["waste", "sanitation", "garbage", "trash"]):
            utility_label = "Solid Waste"
            regex_pat = r"(Waste|Solid Waste|Sanitation|Garbage|Trash|Bin)"
            if is_complaint:
                mongo_filter["$or"] = [
                    {"utility": {"$regex": r"^(Waste|Solid Waste|Sanitation)", "$options": "i"}},
                    {"category": {"$regex": regex_pat, "$options": "i"}},
                    {"description": {"$regex": regex_pat, "$options": "i"}}
                ]
            else:
                mongo_filter["utility"] = {"$regex": r"^(Waste|Solid Waste|Sanitation)", "$options": "i"}

        # 4. Ward Filter (e.g., "Ward 11", "Ward 3")
        ward_match = re.search(r'\bward\s*(\d+)\b', lower)
        if ward_match:
            ward_num = ward_match.group(1)
            ward_str = f"Ward {ward_num}"
            if is_incident:
                mongo_filter["affected_area"] = {"$regex": rf"Ward\s*{ward_num}\b", "$options": "i"}
            else:
                mongo_filter["service_location"] = {"$regex": rf"Ward\s*{ward_num}\b", "$options": "i"}

        # 5. Assigned Staff / Person Name (e.g. "Rajesh Kumar", "Priya Singh")
        name_match = re.search(r'(?:for|assigned to|technician)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', msg, re.IGNORECASE)
        matched_staff_name = None
        if name_match:
            candidate_name = name_match.group(1).strip()
            # If the user literally typed "a particular technician" or similar generic prompt
            if candidate_name.lower() in ["a particular", "particular", "particular technician", "technician"]:
                mongo_filter["status"] = {"$in": cls.STATUS_ASSIGNED_IN_PROGRESS}
                if not status_label:
                    status_label = "Assigned / In Progress"
            else:
                matched_staff_name = candidate_name
                existing_or = mongo_filter.get("$or", [])
                staff_or = [
                    {"technician_name": {"$regex": candidate_name, "$options": "i"}},
                    {"assigned_staff_id": {"$regex": candidate_name, "$options": "i"}},
                    {"reported_by_staff_id": {"$regex": candidate_name, "$options": "i"}}
                ]
                if existing_or:
                    mongo_filter["$and"] = [{"$or": existing_or}, {"$or": staff_or}]
                    del mongo_filter["$or"]
                else:
                    mongo_filter["$or"] = staff_or

        # 6. Role-Based Access Isolation (RBAC):
        # Customer role can ONLY view their own complaints / requests
        if role == "Customer":
            if is_complaint:
                mongo_filter["customer_id"] = user_id
            elif is_request:
                mongo_filter["customer_id"] = user_id
            elif is_incident:
                # Incidents: public ward filter allowed
                pass

        # Select collection
        if is_incident or (is_generic_case and not is_complaint and not is_request and (severity_label or "outage" in lower)):
            collection_name = "operational_logs"
            collection = db.operational_logs
            id_field = "log_id"
            desc_field = "description"
            title = "Operational Incidents & Outages"
            endpoint = "/api/operations/logs"
        elif is_complaint:
            collection_name = "complaints"
            collection = db.complaints
            id_field = "complaint_id"
            desc_field = "description"
            title = "Citizen Grievances & Complaints"
            endpoint = "/api/complaints"
        else: # is_request or generic case
            collection_name = "service_requests"
            collection = db.service_requests
            id_field = "request_id"
            desc_field = "description"
            title = "Service Requests"
            endpoint = "/api/requests"

        total_matching = collection.count_documents(mongo_filter)
        records = list(collection.find(mongo_filter).sort("created_at", -1).limit(15))

        # Build clean formatted text and table
        applied_desc = []
        if status_label: applied_desc.append(f"Status: **{status_label}**")
        if severity_label: applied_desc.append(f"Severity: **{severity_label}**")
        if utility_label: applied_desc.append(f"Utility: **{utility_label}**")
        if ward_match: applied_desc.append(f"Location: **Ward {ward_match.group(1)}**")
        if matched_staff_name: applied_desc.append(f"Staff: **{matched_staff_name}**")
        elif name_match and not matched_staff_name: applied_desc.append("Status: **Assigned Cases**")

        filter_summary_str = f" ({', '.join(applied_desc)})" if applied_desc else ""

        if total_matching == 0:
            return {
                "reply": f"No records found matching your criteria{filter_summary_str} in the **{title}** registry. All numbers are verified strictly against live database records.",
                "intent": "DYNAMIC_QUERY_EMPTY",
                "citations": [{"document_id": collection_name.upper(), "document_name": f"MongoDB {collection_name}", "page_number": 1, "text_snippet": f"Filter: {mongo_filter}", "confidence": 1.0, "scope": "db"}],
                "cards": [],
                "total_count": 0,
                "showing_count": 0
            }

        shown_count = len(records)
        is_count_query = "how many" in lower
        lines = [
            f"### 📋 {title} Query Results",
        ]
        if is_count_query:
            lines.append(f"There are currently **{total_matching}** record(s){filter_summary_str} verified directly from the database.\n")
        lines.append(f"Found **{total_matching}** record(s){filter_summary_str}. Showing **{shown_count} of {total_matching}** records:\n")

        table_rows = []
        for r in records:
            tid = r.get(id_field) or r.get("incident_id") or r.get("complaint_id") or r.get("request_id", "N/A")
            util = r.get("utility") or r.get("incident_type") or "Utility"
            st = r.get("status", "Open")
            sev = r.get("severity") or r.get("priority", "Medium")
            loc = r.get("affected_area") or r.get("service_location", "")
            assigned = r.get("technician_name") or r.get("assigned_staff_id") or r.get("reported_by_staff_id", "Unassigned")
            desc = r.get(desc_field) or r.get("summary", "")
            
            lines.append(f"• **{tid}** [{util}] — **{st}** (Priority: {sev}) | Location: {loc} | Staff: {assigned}")
            if desc:
                lines.append(f"  *Details:* {desc[:120]}")

            table_rows.append({
                "id": tid,
                "utility": util,
                "status": st,
                "priority": sev,
                "location": loc,
                "assignee": assigned,
                "description": desc
            })

        lines.append(f"\n*Source: Verified live MongoDB `{collection_name}` records | Endpoint: `{endpoint}`*")

        return {
            "reply": "\n".join(lines),
            "intent": "DYNAMIC_DATA_QUERY",
            "citations": [
                {
                    "document_id": collection_name.upper(),
                    "document_name": f"MongoDB {collection_name}",
                    "page_number": 1,
                    "text_snippet": f"Live query returned {total_matching} records",
                    "confidence": 1.0,
                    "scope": "live_db"
                }
            ],
            "cards": [
                {
                    "type": "DATA_TABLE",
                    "collection": collection_name,
                    "title": title,
                    "total_count": total_matching,
                    "showing_count": shown_count,
                    "filter_summary": ", ".join(applied_desc) if applied_desc else "All Records",
                    "rows": table_rows
                }
            ],
            "total_count": total_matching,
            "showing_count": shown_count
        }
