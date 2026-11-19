from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.schemas.requests import ChatRequest
from app.schemas.responses import ChatResponse, Citation
from app.security.firebase_auth import get_current_user, require_verified_user
from app.agents.router import AgentQueryRouter
from app.database.mongo import get_database

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
@router.post("/message", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest, current_user: Dict[str, Any] = Depends(require_verified_user)):
    user_id = current_user["user_id"]
    role = current_user["role"]

    # Execute query routing
    res = AgentQueryRouter.route_and_execute(query=payload.message, user_id=user_id, role=role)
    session_id = payload.session_id or f"session_{user_id}_{int(datetime.now().timestamp())}"

    # Save to MongoDB conversation_history
    try:
        db = get_database()
        db.conversation_history.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "timestamp": datetime.now().isoformat(),
            "user_message": payload.message,
            "assistant_reply": res["reply"],
            "intent": res["intent"],
            "confidence": res["confidence"]
        })
    except Exception as e:
        print(f"Failed to save chat history: {e}")

    # Map citations
    citations = [
        Citation(
            document_id=c.get("document_id", "DOC"),
            document_name=c.get("document_name", "Document"),
            page_number=c.get("page_number", 1),
            text_snippet=c.get("text_snippet", ""),
            confidence=float(c.get("confidence", 1.0)),
            scope=c.get("scope", "public")
        )
        for c in res.get("citations", [])
    ]

    return ChatResponse(
        reply=res["reply"],
        intent=res["intent"],
        citations=citations,
        cards=res.get("cards", []),
        action_buttons=res.get("action_buttons", []),
        confidence=res.get("confidence", 1.0),
        latency_ms=res.get("latency_ms", 0),
        session_id=session_id,
        security_alert=res.get("security_alert", False)
    )

@router.get("/history")
async def get_chat_history(
    session_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_verified_user)
):
    db = get_database()
    query = {"user_id": current_user["user_id"]}
    if session_id:
        query["session_id"] = session_id

    records = list(db.conversation_history.find(query).sort("timestamp", -1).limit(50))
    for r in records:
        if "_id" in r:
            del r["_id"]
    return {"history": records}
