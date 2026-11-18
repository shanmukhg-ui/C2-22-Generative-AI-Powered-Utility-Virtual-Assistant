from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.security.firebase_auth import get_current_user
from app.security.rbac import UserRole, RBACManager
from app.schemas.requests import ServiceRequestCreate, TechnicianDispatchUpdate, ServiceRequestUpdate
from app.schemas.responses import ServiceRequestResponse
from app.database.mongo import get_database

router = APIRouter(prefix="/requests", tags=["Service Requests"])

@router.get("", response_model=Dict[str, Any])
async def list_service_requests(
    customer_id: Optional[str] = Query(None),
    utility: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_database()
    query: Dict[str, Any] = {}

    # RBAC: Customers can only query their own records
    if current_user["role"] == UserRole.CUSTOMER.value:
        query["customer_id"] = current_user["user_id"]
    elif customer_id:
        query["customer_id"] = customer_id

    if utility:
        query["utility"] = utility
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority
    if q:
        query["$or"] = [
            {"request_id": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"service_location": {"$regex": q, "$options": "i"}}
        ]

    total = db.service_requests.count_documents(query)
    records = list(db.service_requests.find(query).sort("created_at", -1).skip(offset).limit(limit))

    for r in records:
        if "_id" in r:
            del r["_id"]
        if not r.get("department"):
            r["department"] = f"{r.get('utility', 'General')} Department"

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return {
        "total": total,
        "total_pages": total_pages,
        "limit": limit,
        "offset": offset,
        "records": records,
        "requests": records
    }

@router.get("/{request_id}", response_model=Dict[str, Any])
async def get_service_request(request_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    req = db.service_requests.find_one({"request_id": request_id.upper()})
    if not req:
        raise HTTPException(status_code=404, detail=f"Service request '{request_id}' not found.")

    # RBAC Ownership check
    RBACManager.validate_customer_ownership(
        caller_id=current_user["user_id"],
        caller_role=current_user["role"],
        target_customer_id=req.get("customer_id", "")
    )

    if "_id" in req:
        del req["_id"]

    # Linked complaints
    linked_complaints = list(db.complaints.find({"request_id": req.get("request_id")}))
    for c in linked_complaints:
        if "_id" in c:
            del c["_id"]

    req["linked_complaints"] = linked_complaints
    return req

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_service_request(payload: ServiceRequestCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()

    # RBAC check: Customers cannot create tickets on behalf of other customers
    if current_user["role"] == UserRole.CUSTOMER.value:
        payload.customer_id = current_user["user_id"]

    # Generate next SR ID
    latest = db.service_requests.find_one(sort=[("request_id", -1)])
    next_num = 501
    if latest and latest.get("request_id"):
        try:
            num = int(str(latest["request_id"]).replace("SR", ""))
            next_num = num + 1
        except Exception:
            pass

    request_id = f"SR{str(next_num).zfill(6)}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    department = getattr(payload, "department", None) or f"{payload.utility} Department"

    doc = {
        "request_id": request_id,
        "customer_id": payload.customer_id,
        "utility": payload.utility,
        "department": department,
        "request_type": payload.request_type,
        "status": "Submitted",
        "priority": payload.priority,
        "created_at": now,
        "updated_at": now,
        "service_location": payload.service_location,
        "latitude": payload.latitude or 17.4482,
        "longitude": payload.longitude or 78.3845,
        "description": payload.description,
        "assigned_staff_id": "EMP0001",
        "technician_name": "Rajesh Kumar (Lead Technician)",
        "technician_phone": "+91 98480 22319",
        "technician_status": "En Route",
        "technician_lat": (payload.latitude + 0.012) if payload.latitude else 17.4602,
        "technician_lng": (payload.longitude + 0.008) if payload.longitude else 78.3925,
        "technician_eta_mins": 14,
        "technician_distance_km": 1.8
    }

    db.service_requests.insert_one(doc)

    # Log audit
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(datetime.now().timestamp() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": "CREATE_SERVICE_REQUEST",
        "timestamp": now,
        "resource": request_id,
        "details": f"Created {payload.utility} request at {payload.service_location or 'N/A'}",
        "status": "SUCCESS"
    })

    return {
        "success": True,
        "request_id": request_id,
        "message": f"Service request '{request_id}' created successfully."
    }

@router.get("/{request_id}/tracking", response_model=Dict[str, Any])
async def get_service_request_tracking(request_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns real-time GPS telemetry for the assigned field technician and customer destination.
    """
    db = get_database()
    req = db.service_requests.find_one({"request_id": request_id.upper()})
    if not req:
        raise HTTPException(status_code=404, detail=f"Service request '{request_id}' not found.")

    cust_lat = req.get("latitude") or 17.4482
    cust_lng = req.get("longitude") or 78.3845
    tech_lat = req.get("technician_lat") or (cust_lat + 0.012)
    tech_lng = req.get("technician_lng") or (cust_lng + 0.008)

    return {
        "request_id": req.get("request_id"),
        "customer_id": req.get("customer_id"),
        "utility": req.get("utility"),
        "service_location": req.get("service_location"),
        "customer_coordinates": {"lat": cust_lat, "lng": cust_lng},
        "technician": {
            "name": req.get("technician_name", "Rajesh Kumar (Senior Technician)"),
            "phone": req.get("technician_phone", "+91 98480 22319"),
            "vehicle": "AP 28 TE 4421 (Utility Van #3)",
            "status": req.get("technician_status", "En Route"),
            "coordinates": {"lat": tech_lat, "lng": tech_lng},
            "eta_mins": req.get("technician_eta_mins", 14),
            "distance_km": req.get("technician_distance_km", 1.8),
            "last_ping": datetime.now().strftime("%H:%M:%S")
        },
        "steps": [
            {"step": "Dispatch Approved", "time": "10:15 AM", "done": True},
            {"step": "Technician En Route", "time": "10:30 AM", "done": True, "active": req.get("technician_status") == "En Route"},
            {"step": "Site Inspection", "time": f"~{req.get('technician_eta_mins', 14)} mins", "done": req.get("technician_status") in ["Arrived at Site", "Inspection Completed"], "active": req.get("technician_status") == "Arrived at Site"},
            {"step": "Resolution & Sign-off", "time": "Pending", "done": req.get("status") == "Completed"}
        ]
    }

@router.patch("/{request_id}/dispatch", response_model=Dict[str, Any])
async def update_technician_dispatch(
    request_id: str,
    payload: TechnicianDispatchUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Operations endpoint for field technicians and dispatch operators to update live GPS, ETA, and progress.
    """
    db = get_database()
    req = db.service_requests.find_one({"request_id": request_id.upper()})
    if not req:
        raise HTTPException(status_code=404, detail=f"Service request '{request_id}' not found.")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_fields: Dict[str, Any] = {"updated_at": now}

    if payload.technician_name:
        update_fields["technician_name"] = payload.technician_name
    if payload.technician_phone:
        update_fields["technician_phone"] = payload.technician_phone
    if payload.technician_status:
        update_fields["technician_status"] = payload.technician_status
        if payload.technician_status == "Arrived at Site":
            update_fields["technician_eta_mins"] = 0
            update_fields["technician_distance_km"] = 0.0
            update_fields["status"] = "In Progress"
        elif payload.technician_status == "Completed":
            update_fields["status"] = "Completed"
    if payload.technician_lat is not None:
        update_fields["technician_lat"] = payload.technician_lat
    if payload.technician_lng is not None:
        update_fields["technician_lng"] = payload.technician_lng
    if payload.technician_eta_mins is not None:
        update_fields["technician_eta_mins"] = payload.technician_eta_mins
    if payload.technician_distance_km is not None:
        update_fields["technician_distance_km"] = payload.technician_distance_km
    if payload.status:
        update_fields["status"] = payload.status
    if payload.notes:
        update_fields["technician_notes"] = payload.notes

    db.service_requests.update_one({"request_id": request_id.upper()}, {"$set": update_fields})

    # Log audit
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(datetime.now().timestamp() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": "UPDATE_TECHNICIAN_DISPATCH",
        "timestamp": now,
        "resource": request_id.upper(),
        "details": f"Updated dispatch status to {payload.technician_status or 'updated coordinates'}",
        "status": "SUCCESS"
    })

    return {
        "success": True,
        "request_id": request_id.upper(),
        "message": "Technician telemetry updated successfully in Atlas."
    }

@router.patch("/{request_id}", response_model=Dict[str, Any])
@router.put("/{request_id}", response_model=Dict[str, Any])
async def update_service_request(
    request_id: str,
    payload: ServiceRequestUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Operations endpoint for operations staff to Accept, Assign, and Update service requests.
    """
    db = get_database()
    req = db.service_requests.find_one({"request_id": request_id.upper()})
    if not req:
        raise HTTPException(status_code=404, detail=f"Service request '{request_id}' not found.")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_fields: Dict[str, Any] = {"updated_at": now}

    if payload.status:
        update_fields["status"] = payload.status
    if payload.priority:
        update_fields["priority"] = payload.priority
    if payload.technician_name:
        update_fields["technician_name"] = payload.technician_name
    if payload.technician_phone:
        update_fields["technician_phone"] = payload.technician_phone
    if payload.assigned_staff_id:
        update_fields["assigned_staff_id"] = payload.assigned_staff_id
    if payload.scheduled_window:
        update_fields["scheduled_window"] = payload.scheduled_window
    if payload.operational_notes:
        update_fields["operational_notes"] = payload.operational_notes
    if payload.service_location:
        update_fields["service_location"] = payload.service_location

    db.service_requests.update_one({"request_id": request_id.upper()}, {"$set": update_fields})

    # Log audit trail
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(datetime.now().timestamp() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": "OPERATIONS_ACCEPT_REQUEST" if payload.status in ["Assigned", "In Progress"] else "OPERATIONS_UPDATE_REQUEST",
        "timestamp": now,
        "resource": request_id.upper(),
        "details": f"Status updated to '{payload.status or req.get('status')}', Assigned: '{payload.technician_name or req.get('technician_name', 'None')}'",
        "status": "SUCCESS"
    })

    updated_doc = db.service_requests.find_one({"request_id": request_id.upper()})
    if updated_doc and "_id" in updated_doc:
        del updated_doc["_id"]

    return {
        "success": True,
        "request_id": request_id.upper(),
        "message": f"Service request '{request_id}' updated successfully.",
        "request": updated_doc
    }
