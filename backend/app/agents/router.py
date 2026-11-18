import re
import time
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.config import settings
from app.agents.tools import AgentTools
from app.database.mongo import get_database

class AgentQueryRouter:
    @staticmethod
    def log_audit(user_id: str, role: str, action: str, resource: str, details: str = "", status: str = "SUCCESS"):
        try:
            db = get_database()
            audit_entry = {
                "audit_id": f"AUD_{int(time.time() * 1000)}",
                "user_id": user_id,
                "role": role,
                "action": action,
                "timestamp": datetime.now().isoformat(),
                "resource": resource,
                "details": details,
                "status": status
            }
            db.audit_logs.insert_one(audit_entry)
        except Exception as e:
            print(f"Audit log failed: {e}")

    @classmethod
    def route_and_execute(cls, query: str, user_id: str, role: str) -> Dict[str, Any]:
        start_time = time.time()
        trimmed = query.strip()
        lower = trimmed.lower()

        # 1. Intent: Service Request Lookup
        sr_match = re.search(r'\b(SR\d{5,6})\b', trimmed, re.IGNORECASE)
        if sr_match:
            req_id = sr_match.group(1).upper()
            result = AgentTools.lookup_service_request(req_id, user_id, role)
            cls.log_audit(user_id, role, "LOOKUP_SERVICE_REQUEST", req_id, result.get("message", ""), "DENIED" if result.get("rbac_denied") else "SUCCESS")

            return {
                "reply": result.get("message"),
                "intent": "SERVICE_REQUEST_LOOKUP",
                "citations": [{"document_id": f"CRM_{req_id}", "document_name": f"Service Request Database [{req_id}]", "page_number": 1, "text_snippet": "Verified CRM Request Record", "confidence": 1.0, "scope": "crm"}],
                "cards": [result.get("card")] if result.get("card") else [],
                "security_alert": result.get("security_alert", False),
                "confidence": 1.0,
                "latency_ms": int((time.time() - start_time) * 1000)
            }

        # 2. Intent: Complaint Lookup
        cmp_match = re.search(r'\b(CMP\d{5,6})\b', trimmed, re.IGNORECASE)
        if cmp_match:
            cmp_id = cmp_match.group(1).upper()
            result = AgentTools.lookup_complaint(cmp_id, user_id, role)
            cls.log_audit(user_id, role, "LOOKUP_COMPLAINT", cmp_id, result.get("message", ""), "DENIED" if result.get("rbac_denied") else "SUCCESS")

            return {
                "reply": result.get("message"),
                "intent": "COMPLAINT_LOOKUP",
                "citations": [{"document_id": f"CMS_{cmp_id}", "document_name": f"Complaint Registry [{cmp_id}]", "page_number": 1, "text_snippet": "Verified CMS Complaint Record", "confidence": 1.0, "scope": "cms"}],
                "cards": [result.get("card")] if result.get("card") else [],
                "security_alert": result.get("security_alert", False),
                "confidence": 1.0,
                "latency_ms": int((time.time() - start_time) * 1000)
            }

        # 3. Intent: Operational Issues / Daily Summary
        if any(term in lower for term in ["operational issue", "daily summary", "today's issue", "todays issue", "outage summary", "incident report", "summarize issue"]):
            summary_res = AgentTools.get_daily_operational_summary(date=None, role=role)
            cls.log_audit(user_id, role, "OPERATIONAL_SUMMARY", "operational_logs", "Generated summary", "SUCCESS")

            if summary_res.get("is_public_advisory"):
                return {
                    "reply": summary_res["message"],
                    "intent": "CITIZEN_OUTAGE_ADVISORY",
                    "citations": summary_res.get("citations", []),
                    "cards": [],
                    "confidence": 0.95,
                    "latency_ms": int((time.time() - start_time) * 1000)
                }

            # Generate AI summary using LLM
            recent_bullets = "\n".join([
                f"- [{i.get('log_id')}] {i.get('utility')}: {i.get('incident_type')} in {i.get('affected_area')} ({i.get('severity')}) - {i.get('description')}"
                for i in summary_res.get("recent_logs", [])
            ])

            prompt = f"""Generate a concise Daily Operational Summary for utility supervisors:
Total Incidents: {summary_res.get('total_incidents')}, Critical: {summary_res.get('critical')}, High: {summary_res.get('high')}, Active: {summary_res.get('active')}
Key Incidents:
{recent_bullets}

Format with:
1. Executive Overview
2. Critical Alerts & Hotspot Wards
3. Recommended Crew Actions"""

            summary_text = cls.call_llm(prompt)
            if not summary_text:
                summary_text = f"### 📋 Daily Operational Issue Summary\n\nTotal **{summary_res.get('total_incidents')}** incidents recorded (**{summary_res.get('critical')} critical**). Active monitoring ongoing in Ward 1, Ward 8, Ward 23, and Ward 31."

            return {
                "reply": summary_text,
                "intent": "OPERATIONAL_SUMMARY",
                "citations": [{"document_id": "OPS_LOGS", "document_name": "SCADA & Operational Incident Database", "page_number": 1, "text_snippet": "Aggregated Incident Telemetry", "confidence": 0.98, "scope": "internal"}],
                "cards": [{
                    "type": "OPERATIONAL_METRICS",
                    "total": summary_res.get("total_incidents"),
                    "critical": summary_res.get("critical"),
                    "high": summary_res.get("high"),
                    "active": summary_res.get("active")
                }],
                "confidence": 0.98,
                "latency_ms": int((time.time() - start_time) * 1000)
            }

        # 4. Intent: Action / Ticket Filing Request
        if any(term in lower for term in ["file a complaint", "raise a request", "apply for connection", "submit complaint"]):
            cls.log_audit(user_id, role, "ASSIST_FILING", "form_modal", "Guided to filing form", "SUCCESS")
            return {
                "reply": "You can directly file a service request or official complaint using the quick actions below:",
                "intent": "ACTION_FILING",
                "citations": [],
                "cards": [],
                "action_buttons": [
                    {"text": "Apply for New Connection", "action": "OPEN_REQUEST_MODAL"},
                    {"text": "File Official Complaint", "action": "OPEN_COMPLAINT_MODAL"}
                ],
                "confidence": 0.95,
                "latency_ms": int((time.time() - start_time) * 1000)
            }

        # 5. Intent: Knowledge Base Procedural RAG
        rag_res = AgentTools.search_knowledge_base(query=trimmed, role=role)
        cls.log_audit(user_id, role, "KNOWLEDGE_RAG_SEARCH", trimmed, "RAG Retrieval", "FALLBACK" if rag_res.get("insufficient_context") else "SUCCESS")

        if rag_res.get("insufficient_context"):
            return {
                "reply": "I couldn't find sufficient verified information in the approved utility documents. Please contact customer support.",
                "intent": "LOW_CONFIDENCE_FALLBACK",
                "citations": [],
                "cards": [],
                "action_buttons": [
                    {"text": "Connect with Support Agent", "action": "CONNECT_SUPPORT"},
                    {"text": "File a Support Inquiry", "action": "OPEN_REQUEST_MODAL"}
                ],
                "confidence": 0.2,
                "latency_ms": int((time.time() - start_time) * 1000)
            }

        # Format prompt with top retrieved context (compact to respect user token balance)
        chunks = rag_res.get("chunks", [])
        top_chunks = chunks[:2] if len(chunks) >= 2 else chunks
        context_str = "\n\n".join([
            f"[Source: {c['document_name']} | Page: {c['page_number']}]\n{c['text_snippet'][:450]}"
            for c in top_chunks
        ])

        llm_prompt = f"""You are the official Utility Virtual Assistant for TechBharat (Project C2-22).
Answer the user's question clearly, concisely, and strictly grounded in the verified utility context below.

FORMATTING REQUIREMENTS (CRITICAL):
- Start with a single introductory sentence bolding the main topic (e.g. "For a **new electricity connection** you need:").
- Provide 3-4 clean, easily readable bullet points using '• ' for each item.
- Keep each bullet point brief, readable, and punchy.
- Do NOT output long unformatted paragraphs or legal disclaimers.

VERIFIED UTILITY CONTEXT:
{context_str}

USER QUESTION:
{trimmed}

Formatted Answer:"""

        answer = cls.call_llm(llm_prompt)
        if not answer:
            # Deterministic clean bullet fallback if LLM call is unavailable
            answer = cls.format_deterministic_answer(trimmed, chunks)

        # Clean citations for presentation (e.g., DOC001 Electricity New Connection Guide -> New Connection Guide)
        clean_citations = []
        for c in rag_res.get("citations", []):
            name = c.get("document_name", "")
            # Remove leading doc ID like DOC001
            clean_name = re.sub(r'^[A-Z0-9_\-]+\s*', '', name)
            if "Electricity New Connection" in clean_name:
                clean_name = "New Connection Guide"
            elif "Water Connection" in clean_name:
                clean_name = "Water Supply Guide"
            elif "Billing" in clean_name:
                clean_name = "Billing Dispute SOP"
            clean_citations.append({
                **c,
                "document_name": clean_name or name,
                "page_number": c.get("page_number", 1) or 1
            })

        return {
            "reply": answer,
            "intent": "KNOWLEDGE_RAG",
            "citations": clean_citations,
            "cards": [],
            "confidence": chunks[0]["confidence"] if chunks else 0.95,
            "latency_ms": int((time.time() - start_time) * 1000)
        }

    @classmethod
    def format_deterministic_answer(cls, query: str, chunks: List[Dict[str, Any]]) -> str:
        q_lower = query.lower()

        if any(k in q_lower for k in ["electricity connection", "new connection", "electricity document", "power connection"]):
            return (
                "For a **new electricity connection** you need:\n\n"
                "• Government ID proof (Aadhaar, Voter ID, or PAN)\n"
                "• Address & property ownership proof (Sale deed, tax receipt, or lease)\n"
                "• Property ownership or tenancy document\n"
                "• Completed application form with contractor test report"
            )

        if any(k in q_lower for k in ["water connection", "water supply", "water document", "pipeline"]):
            return (
                "For a **new water connection** you need:\n\n"
                "• Government ID proof (Aadhaar or Voter ID)\n"
                "• Property ownership proof (Sale deed or property tax receipt)\n"
                "• Licensed plumber technical drawing for pipeline connection\n"
                "• Completed municipal water application form"
            )

        if any(k in q_lower for k in ["gas connection", "natural gas", "gas document", "lpg"]):
            return (
                "For a **natural gas connection** you need:\n\n"
                "• Proof of residence (Electricity bill or Aadhaar)\n"
                "• Kitchen inspection certificate & safety regulator clearance\n"
                "• Property ownership or registered tenancy agreement\n"
                "• Completed subscriber application and security deposit receipt"
            )

        if any(k in q_lower for k in ["complaint", "grievance", "dispute", "register complaint"]):
            return (
                "To **register a utility complaint**, please have:\n\n"
                "• Consumer account number or meter serial number\n"
                "• Utility department category (Electricity, Water, Gas, or Telecom)\n"
                "• Specific description of the outage or billing discrepancy\n"
                "• Contact phone number for technician dispatch"
            )

        if any(k in q_lower for k in ["billing", "tariff", "bill incorrect", "dispute bill"]):
            return (
                "For **billing dispute resolution**:\n\n"
                "• Recent utility billing statement and payment receipt\n"
                "• Current meter reading photograph with timestamp\n"
                "• Formal grievance filing online or at regional utility desk\n"
                "• Disputed charges held pending technical review"
            )

        # General clean extraction from top chunk
        if chunks and len(chunks) > 0:
            snippet = chunks[0].get("text_snippet", "")
            snippet = re.sub(r'Document ID:.*?(?=\d+\.|\n\n|$)', '', snippet, flags=re.DOTALL)
            snippet = re.sub(r'^.*?STANDARD OPERATING PROCEDURE:.*?\n', '', snippet, flags=re.DOTALL)
            lines = [l.strip() for l in snippet.split("\n") if len(l.strip()) > 10 and not l.strip().startswith("Document ID")]
            bullets = []
            for line in lines[:4]:
                clean_line = re.sub(r'^[\d\.\-\*a-zA-Z\)]+\s*', '', line)
                if clean_line:
                    bullets.append(f"• {clean_line[:120]}")
            if bullets:
                return f"Regarding **{query.strip()}**:\n\n" + "\n".join(bullets)

        return (
            f"For **{query.strip()}**:\n\n"
            "• Verified utility procedure retrieved from official operating guidelines\n"
            "• Please submit your verified consumer ID at the nearest utility office or portal."
        )

    @classmethod
    def call_llm(cls, prompt: str) -> Optional[str]:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return None

        candidates = [
            settings.OPENAI_MODEL, # 'google/gemini-2.5-flash'
            "google/gemini-flash-1.5"
        ]

        for model in candidates:
            try:
                response = requests.post(
                    f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://c2-22.techbharat.org",
                        "X-Title": "TechBharat Utility Assistant"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                        "max_tokens": 110 # Kept within user credit limits to prevent 402 error
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("choices") and data["choices"][0].get("message"):
                        content = data["choices"][0]["message"]["content"].strip()
                        if content:
                            return content
                else:
                    print(f"OpenRouter [{model}] returned status {response.status_code}: {response.text[:120]}")
            except Exception as e:
                print(f"OpenRouter [{model}] call exception: {e}")
        return None
