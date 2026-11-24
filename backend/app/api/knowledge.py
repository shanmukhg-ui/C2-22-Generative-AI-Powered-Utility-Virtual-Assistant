import time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List
from app.security.firebase_auth import get_current_user, require_verified_user, require_role
from app.security.rbac import UserRole
from app.schemas.requests import DocumentIngestRequest, SearchQueryRequest
from app.rag.vector_store import KnowledgeVectorStore
from app.database.mongo import get_database

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & RAG"])

@router.post("/ingest", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def ingest_document(
    payload: DocumentIngestRequest,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Ingests a new utility circular or SOP document into ChromaDB / Vector Store.
    Restricted to Administrator role.
    """
    vector_store = KnowledgeVectorStore.get_instance()
    doc_id = f"DOC_ING_{int(time.time())}"

    doc_entry = {
        "document_id": doc_id,
        "title": payload.title,
        "content": payload.content,
        "scope": payload.scope,
        "utility": payload.utility,
        "version": payload.version,
        "uploaded_by": current_user["user_id"]
    }

    vector_store.add_document(doc_entry)

    # Log audit
    db = get_database()
    db.audit_logs.insert_one({
        "audit_id": f"AUD_{int(time.time() * 1000)}",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "action": "INGEST_KNOWLEDGE_DOC",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "resource": doc_id,
        "details": f"Ingested {payload.title} ({payload.scope})",
        "status": "SUCCESS"
    })

    return {
        "success": True,
        "document_id": doc_id,
        "message": f"Document '{payload.title}' successfully tokenized, chunked, and indexed into the vector store."
    }

@router.post("/search", response_model=Dict[str, Any])
async def search_knowledge(
    payload: SearchQueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes semantic similarity search over the knowledge base with role-filtered context.
    """
    vector_store = KnowledgeVectorStore.get_instance()
    # Enforce role from authenticated user token
    results = vector_store.search(query=payload.query, role=current_user["role"], top_k=payload.top_k)

    return {
        "query": payload.query,
        "role_applied": current_user["role"],
        "total_results": len(results),
        "results": results
    }

@router.get("/documents", response_model=Dict[str, Any])
async def list_documents(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns list of all official utility documents and ingestion status.
    """
    vector_store = KnowledgeVectorStore.get_instance()
    doc_map: Dict[str, Dict[str, Any]] = {}

    for c in vector_store.chunks:
        # Hide internal documents from customers
        if current_user["role"] == UserRole.CUSTOMER.value and c["scope"] == "internal":
            continue

        doc_id = c["document_id"]
        if doc_id not in doc_map:
            doc_map[doc_id] = {
                "document_id": doc_id,
                "title": c["document_name"],
                "scope": c["scope"],
                "utility": c["utility"],
                "version": c.get("version", "2026.1"),
                "chunk_count": 0,
                "pages": set()
            }
        doc_map[doc_id]["chunk_count"] += 1
        doc_map[doc_id]["pages"].add(c["page_number"])

    docs = []
    for d in doc_map.values():
        docs.append({
            "document_id": d["document_id"],
            "title": d["title"],
            "scope": d["scope"],
            "utility": d["utility"],
            "version": d["version"],
            "chunk_count": d["chunk_count"],
            "page_count": len(d["pages"])
        })

    return {
        "total_documents": len(docs),
        "total_vector_chunks": len(vector_store.chunks),
        "documents": docs
    }

@router.delete("/documents/{document_id}", response_model=Dict[str, Any])
async def delete_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Deletes an uploaded document from the vector store and database.
    """
    vector_store = KnowledgeVectorStore.get_instance()
    vector_store.delete_document(document_id)
    return {"success": True, "message": f"Document '{document_id}' removed from knowledge base."}
