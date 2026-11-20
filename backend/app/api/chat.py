import asyncio
import json
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas.requests import ChatRequest
from app.schemas.responses import ChatResponse, Citation
from app.security.firebase_auth import require_verified_user
from app.agents.router import AgentQueryRouter
from app.database.mongo import get_database

router = APIRouter(prefix="/chat", tags=["Chat"])

# In-memory sliding window for rate limiting (max 30 requests / 60 seconds per user)
user_rate_limits = defaultdict(list)

def check_rate_limit(user_id: str, max_requests: int = 30, window_secs: int = 60) -> bool:
    now = time.time()
    valid_timestamps = [t for t in user_rate_limits[user_id] if now - t < window_secs]
    user_rate_limits[user_id] = valid_timestamps
    if len(valid_timestamps) >= max_requests:
        return False
    user_rate_limits[user_id].append(now)
    return True

@router.post("", response_model=None)
@router.post("/message", response_model=None)
async def chat_endpoint(
    request: Request,
    payload: ChatRequest,
    current_user: Dict[str, Any] = Depends(require_verified_user)
):
    user_id = current_user["user_id"]
    # Strict server-side role verification (ignoring any role from request payload)
    role = current_user.get("role", "Customer")

    # 1. Rate Limiting Check
    if not check_rate_limit(user_id, max_requests=30, window_secs=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 30 queries per minute permitted."
        )

    # 2. Execute query routing with role-based visibility filter
    res = AgentQueryRouter.route_and_execute(
        query=payload.message,
        user_id=user_id,
        role=role
    )
    session_id = payload.session_id or f"session_{user_id}_{int(time.time())}"

    # 3. Save to MongoDB conversation_history
    try:
        db = get_database()
        db.conversation_history.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "timestamp": datetime.now().isoformat(),
            "user_message": payload.message,
            "assistant_reply": res["reply"],
            "intent": res.get("intent", "CHAT"),
            "confidence": res.get("confidence", 1.0)
        })
    except Exception as e:
        print(f"Failed to persist chat history: {e}")

    # 4. Map citations
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

    response_data = {
        "reply": res["reply"],
        "intent": res["intent"],
        "citations": [c.dict() for c in citations],
        "cards": res.get("cards", []),
        "action_buttons": res.get("action_buttons", []),
        "confidence": res.get("confidence", 1.0),
        "latency_ms": res.get("latency_ms", 0),
        "session_id": session_id,
        "security_alert": res.get("security_alert", False)
    }

    # 5. Check if streaming response is requested
    is_stream_request = payload.stream or "text/event-stream" in request.headers.get("accept", "")
    if is_stream_request:
        async def event_generator():
            full_text = res["reply"]
            words = full_text.split(" ")
            for i in range(0, len(words), 3):
                chunk = " ".join(words[i:i+3]) + (" " if i + 3 < len(words) else "")
                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
                await asyncio.sleep(0.015)

            # Final payload containing metadata
            yield f"data: {json.dumps({'done': True, **response_data})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    return ChatResponse(**response_data)

@router.get("/history")
async def get_chat_history(
    session_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_verified_user)
):
    db = get_database()
    query: Dict[str, Any] = {"user_id": current_user["user_id"]}
    if session_id:
        query["session_id"] = session_id

    records = list(db.conversation_history.find(query).sort("timestamp", -1).limit(50))
    for r in records:
        if "_id" in r:
            del r["_id"]
    return {"history": records}
