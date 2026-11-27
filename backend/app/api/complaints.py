from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.security.firebase_auth import get_current_user, require_verified_user, require_role
from app.security.rbac import UserRole, RBACManager
from app.schemas.requests import ComplaintCreate, ComplaintUpdate
from app.database.mongo import get_database

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def infer_complaint_dept(cat: str, desc: str, util: str = None) -> tuple:
    if util:
        return util, f"{util} Department"
    text = f"{cat} {desc}".lower()
    if any(k in text for k in ["water", "sewage", "leak", "pipe", "pressure", "tap"]):
        return "Water", "Water Supply Department"
    if any(k in text for k in ["gas", "cylinder", "pipeline", "lpg"]):
        return "Gas", "Natural Gas Department"
    if any(k in text for k in ["telecom", "broadband", "fiber", "internet", "network", "line"]):
        return "Telecom", "Telecom & Connectivity"
    if any(k in text for k in ["waste", "garbage", "trash", "sanitation", "clean"]):
        return "Solid Waste", "Sanitation & Waste Dept"
    return "Electricity", "Electricity Department"

@router.get("", response_model=Dict[str, Any])
async def list_complaints(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    customer_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_database()
    effective_offset = offset if offset > 0 else (page - 1) * limit
    query: Dict[str, Any] = {}

    # RBAC: Customers can only query their own complaints
    if current_user["role"] == UserRole.CUSTOMER.value:
        query["customer_id"] = current_user["user_id"]
    elif customer_id:
        query["customer_id"] = customer_id

    if category:
        query["category"] = category
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority
    if q:
        query["$or"] = [
            {"complaint_id": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"request_id": {"$regex": q, "$options": "i"}}
        ]

    total = db.complaints.count_documents(query)
    records = list(db.complaints.find(query).sort("created_at", -1).skip(effective_offset).limit(limit))

    for r in records:
        if "_id" in r:
            del r["_id"]
        if not r.get("utility") or not r.get("department"):
            u, dept = infer_complaint_dept(r.get("category", ""), r.get("description", ""), r.get("utility"))
            r["utility"] = r.get("utility") or u
            r["department"] = r.get("department") or dept

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return {
        "total": total,
        "total_pages": total_pages,
        "limit": limit,
        "offset": effective_offset,
        "records": records,
        "complaints": records
    }

@router.get("/{complaint_id}", response_model=Dict[str, Any])
async def get_complaint(complaint_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    cmp = db.complaints.find_one({"complaint_id": complaint_id.upper()})
    if not cmp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    # RBAC Ownership check
    RBACManager.validate_customer_ownership(
        caller_id=current_user["user_id"],
        caller_role=current_user["role"],
        target_customer_id=cmp.get("customer_id", "")
    )

    if "_id" in cmp:
        del cmp["_id"]

    return cmp

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_complaint(payload: ComplaintCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()

    # RBAC check: Customers cannot create complaints on behalf of other customers
    if current_user["role"] == UserRole.CUSTOMER.value or not payload.customer_id:
        payload.customer_id = current_user["user_id"]

    # Atomic sequence generation from counters collection with fallback
    seq_doc = db.counters.find_one_and_update(
        {"_id": "complaint_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    next_num = seq_doc.get("seq", 251)
    latest = db.complaints.find_one(sort=[("complaint_id", -1)])
    if latest and latest.get("complaint_id"):
        try:
            num = int(str(latest["complaint_id"]).replace("CMP", ""))
            if num >= next_num:
                next_num = num + 1
                db.counters.update_one({"_id": "complaint_id"}, {"$set": {"seq": next_num}})
        except Exception:
            pass

    complaint_id = f"CMP{str(next_num).zfill(6)}"
    today = datetime.now().strftime("%Y-%m-%d")

    # If request_id not provided, find customer's latest request
    req_id = payload.request_id
    if not req_id:
        user_req = db.service_requests.find_one({"customer_id": payload.customer_id}, sort=[("created_at", -1)])
        req_id = user_req.get("request_id", "SR000001") if user_req else "SR000001"

    utility = getattr(payload, "utility", None) or "Electricity"
    department = getattr(payload, "department", None) or f"{utility} Department"

    doc = {
        "complaint_id": complaint_id,
        "customer_id": payload.customer_id,
        "request_id": req_id,
        "utility": utility,
        "department": department,
        "category": payload.category,
        "description": payload.description,
        "status": "Submitted",
        "priority": payload.priority,
        "created_at": today,
        "updated_at": today,
        "service_location": payload.service_location,
        "latitude": payload.latitude or 17.4482,
        "longitude": payload.longitude or 78.3845
    }

    db.complaints.insert_one(doc)

    # Log audit
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(datetime.now().timestamp() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": "FILE_COMPLAINT",
        "timestamp": today,
        "resource": complaint_id,
        "details": f"Complaint for {req_id}",
        "status": "SUCCESS"
    })

    return {
        "success": True,
        "complaint_id": complaint_id,
        "message": f"Complaint '{complaint_id}' registered successfully."
    }

@router.patch("/{complaint_id}", response_model=Dict[str, Any])
@router.put("/{complaint_id}", response_model=Dict[str, Any])
async def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.EMPLOYEE, UserRole.ADMINISTRATOR]))
):
    """
    Operations endpoint for operations staff to Acknowledge, Investigate, and Resolve consumer complaints.
    """
    db = get_database()
    cmp = db.complaints.find_one({"complaint_id": complaint_id.upper()})
    if not cmp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    today = datetime.now().strftime("%Y-%m-%d")
    now_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_fields: Dict[str, Any] = {"updated_at": today}

    if payload.status:
        update_fields["status"] = payload.status
    if payload.priority:
        update_fields["priority"] = payload.priority
    if payload.assigned_officer:
        update_fields["assigned_officer"] = payload.assigned_officer
    if payload.resolution_notes:
        update_fields["resolution_notes"] = payload.resolution_notes
    if payload.remediation_action:
        update_fields["remediation_action"] = payload.remediation_action

    db.complaints.update_one({"complaint_id": complaint_id.upper()}, {"$set": update_fields})

    # Log audit trail
    action_type = "OPERATIONS_RESOLVE_COMPLAINT" if payload.status == "Resolved" else "OPERATIONS_ACCEPT_COMPLAINT"
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(datetime.now().timestamp() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": action_type,
        "timestamp": now_ts,
        "resource": complaint_id.upper(),
        "details": f"Grievance status changed to '{payload.status or cmp.get('status')}', Officer: '{payload.assigned_officer or 'Assigned Staff'}'",
        "status": "SUCCESS"
    })

    updated_doc = db.complaints.find_one({"complaint_id": complaint_id.upper()})
    if updated_doc and "_id" in updated_doc:
        del updated_doc["_id"]

    return {
        "success": True,
        "complaint_id": complaint_id.upper(),
        "message": f"Complaint '{complaint_id}' updated successfully.",
        "complaint": updated_doc
    }
