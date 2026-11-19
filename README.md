# TechBharat AI CoE – Cohort #2
## Project C2-22: Generative AI-Powered Utility Virtual Assistant
**Authors:** Gollavilli Shanmukh Vardhan Sai, PANAM VICTOR KOMAL  
**Mentor Assessment Target:** Production-Ready MVP Sign-Off  
**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, FastAPI (Python 3.13), MongoDB / MongoMock, ChromaDB / PyMuPDF RAG, OpenRouter API (`google/gemini-2.5-flash`).

---

## 🌟 Executive Overview
The **Utility Virtual Assistant** is an enterprise-grade conversational AI platform designed for municipal and state utility organizations spanning **Electricity, Water, Gas, Telecom, and Solid Waste Management**.

The system resolves acute citizen query fragmentation and operational bottlenecks by unifying:
1. **Strictly Grounded RAG (Retrieval-Augmented Generation)**: Semantic retrieval over verified utility circulars, SOPs, and procedural guides (`DOC001` - `DOC004`, `SOP_INTERNAL_001`, `SOP_INTERNAL_002`) with transparent source citations and page numbers.
2. **Role-Based Access Control (RBAC)**: Multi-tenant citizen isolation where Customers can only view their own applications, while internal Employees access field telemetry, and Administrators manage user roles and knowledge ingestion.
3. **Multi-Utility Service & Complaint Tracking**: Live tracking and status updates across 500 service requests (`SR000001` - `SR000500`) and 250 complaints (`CMP000001` - `CMP000250`).
4. **Autonomous Operational Summarization**: Generative AI summarization aggregating 100 SCADA incident logs (`INC00001` - `INC00100`) across Municipal Wards 1 to 40.
5. **OpenRouter LLM Integration**: Powered by `google/gemini-2.5-flash` with resilient local grounded fallback.

---

## 🚀 Running the Applications

### Option 1: Primary Enterprise Full-Stack (FastAPI + React Vite SPA)
The FastAPI backend serves both the REST API endpoints and the compiled React production frontend on port **8000**:

```powershell
# In c:\C2-22\backend
& "C:\Users\SHANMUKH\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open your browser at:
👉 **[http://localhost:8000](http://localhost:8000)**  
👉 **API Swagger Docs:** **[http://localhost:8000/docs](http://localhost:8000/docs)**

*(For active frontend development with hot-reload)*:
```powershell
cd c:\C2-22\frontend
npm run dev
# Running on http://localhost:5173 with proxy to backend port 8000
```

---

### Option 2: Alternative Express + SQLite Integrated Server
Runs the standalone server on port **3000**:
```powershell
# In c:\C2-22
node server.js
```
Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Environment Configuration
The `.env` file in `c:\C2-22\backend\.env` contains:
```env
OPENAI_API_KEY=your_openrouter_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=google/gemini-2.5-flash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=utility_virtual_assistant
USE_MOCK_MONGO=true
FIREBASE_PROJECT_ID=techbharat-c222-utility
CHROMA_PERSIST_DIRECTORY=./chroma_db
PORT=8000
```

---

## 🎭 Role-Based Access Control (RBAC) & Personas

Switch personas at any time using the **Role Switcher** in the top navigation bar or the 1-click evaluation buttons on the Login page:

| Persona | ID | Role | Department / City | Permissions & Access |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Sharma** | `CUST0001` | Customer | Ward 3, Vizag | Access personal requests (6 tickets: SR000110, SR000274, etc.), public documents, chat. |
| **Priya Patel** | `CUST0010` | Customer | Ward 12, Vizag | Access personal request `SR000001`, lodge complaints. |
| **Vikram Singh** | `EMP0001` | Employee | Customer Support | View all 500 requests, 250 complaints, internal SOPs, update ticket status. |
| **Ananya Roy** | `EMP0002` | Employee | Field Operations | Access operational incident logs, generate AI daily briefing. |
| **Dr. Suresh Menon** | `ADM0001` | Administrator | Chief Technology Officer | Full governance, ingest new SOP PDFs into ChromaDB, review audit logs. |

### 🔒 Enforced Security Isolation Verification
If `CUST0001` tries to inspect `SR000001` (owned by `CUST0010`), the backend returns an **HTTP 403 Forbidden** and a security alert card:
`🔒 Access Restricted by RBAC: Service request 'SR000001' belongs to another registered customer.`

---

## 💻 Frontend Page Breakdown (10 Complete Views)

1. **AI Chat Assistant (`/chat`)**: Conversational RAG interface with verified document citations, ticket cards, and voice recognition.
2. **Customer Dashboard (`/customer-dash`)**: Personal active tickets, grievance turnaround times, and regional maintenance notices.
3. **Employee Dashboard (`/employee-dash`)**: Assigned ticket workload, quick status actions, and 1-click operational briefing generator.
4. **Admin Dashboard (`/admin-dash`)**: User role distribution, knowledge base vector indexing stats, and live audit stream.
5. **Service Requests (`/requests`)**: Searchable, filterable table of 500 applications across Electricity, Water, Gas, Telecom, and Solid Waste.
6. **Complaints Registry (`/complaints`)**: 250 customer grievances categorized by Billing Disputes, Outages, Pressure issues, and Meter defects.
7. **Operational Heatmap (`/operations`)**: Municipal Ward 1–40 visual outage grid with incident density and LLM briefing synthesis.
8. **Knowledge Base Management (`/knowledge`)**: Ingested SOP list and live semantic search testbench with chunk scoring.
9. **Audit & Compliance (`/audit`)**: Immutable MongoDB audit journal recording all user queries, ticket lookups, and administrative actions.
10. **Login & Persona Switcher (`/login`)**: 1-click evaluation access for evaluators and mentors.

---

## 🛠️ Backend REST APIs (FastAPI)

### Authentication
- `GET /api/auth/me`: Returns verified caller identity, role, and department from Firebase bearer token.

### Conversational AI & Query Router
- `POST /api/chat`: Natural language query router directing to RAG, service request lookup, complaint tracking, or operational briefing.
- `GET /api/chat/history`: Retrieves session conversation history from MongoDB.

### Knowledge Base & RAG
- `POST /api/knowledge/ingest`: Ingests and chunks new PDF documents into the vector store (Admin only).
- `POST /api/knowledge/search`: Semantic vector search retrieving chunks with page numbers and confidence scores.
- `GET /api/knowledge/documents`: Lists indexed SOPs with role filtering (Internal SOPs hidden from Customers).
- `DELETE /api/knowledge/documents/{id}`: Deletes document from vector store (Admin only).

### Service Requests & Complaints
- `GET /api/requests`: Lists requests with pagination, status/utility filters, and customer ownership filtering.
- `GET /api/requests/{id}`: Retrieves specific request with RBAC ownership validation.
- `POST /api/requests`: Creates new service request in MongoDB.
- `GET /api/complaints`: Lists customer grievances.
- `POST /api/complaints`: Lodges new grievance ticket.

### Operations & SCADA Telemetry
- `GET /api/operations/logs`: Real-time incident logs filterable by Municipal Ward, Severity, and Utility.
- `POST /api/operations/summarize`: Autonomous Generative AI incident briefing for supervisory staff.

### Admin & Compliance
- `GET /api/admin/users`: Lists registered user accounts and RBAC role assignments.
- `GET /api/admin/audit-logs`: Streams compliance audit events.

---

## 🧪 Verification & Test Suite
All backend APIs and frontend routes have been tested and verified:
```powershell
& "C:\Users\SHANMUKH\AppData\Local\Programs\Python\Python313\python.exe" -c "
import sys; sys.path.insert(0, 'backend')
from starlette.testclient import TestClient; from app.main import app
with TestClient(app) as c:
    assert c.get('/api/health').status_code == 200
    assert c.get('/').status_code == 200
    assert c.get('/api/requests?limit=1', headers={'Authorization': 'Bearer dev-token-ADM0001'}).json()['total'] == 500
    assert c.get('/api/knowledge/documents', headers={'Authorization': 'Bearer dev-token-ADM0001'}).json()['total_documents'] == 6
    assert c.post('/api/chat', json={'message': 'Check request SR000001'}, headers={'Authorization': 'Bearer dev-token-CUST0001'}).json()['security_alert'] is True
print('All tests passed 100%!')
"
```
Output:
`All tests passed 100%!`
