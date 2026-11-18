import csv
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "datasets")
KB_PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base", "public")
KB_INTERNAL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base", "internal")

os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(KB_PUBLIC_DIR, exist_ok=True)
os.makedirs(KB_INTERNAL_DIR, exist_ok=True)

def generate_users():
    users = []
    # 1. Staff users (Employees and Admin)
    staff_file = os.path.join(DATA_DIR, "staff.csv")
    if os.path.exists(staff_file):
        with open(staff_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                role = "Administrator" if row["staff_id"] == "ADM0001" else "Employee"
                users.append({
                    "user_id": row["staff_id"],
                    "firebase_uid": f"firebase_{row['staff_id'].lower()}",
                    "name": row["staff_name"],
                    "email": row["email"],
                    "role": role,
                    "city": "Vizag",
                    "department": row["department"]
                })

    # 2. Customer users
    cust_file = os.path.join(DATA_DIR, "customers.csv")
    if os.path.exists(cust_file):
        with open(cust_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                users.append({
                    "user_id": row["customer_id"],
                    "firebase_uid": f"firebase_{row['customer_id'].lower()}",
                    "name": row["display_name"],
                    "email": row["email"],
                    "role": "Customer",
                    "city": row["city"],
                    "department": "Citizen"
                })

    out_file = os.path.join(DATASETS_DIR, "users.csv")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["user_id", "firebase_uid", "name", "email", "role", "city", "department"])
        writer.writeheader()
        writer.writerows(users)
    print(f"Generated {len(users)} users in {out_file}")

def generate_service_requests():
    status_map = {"ST001": "Submitted", "ST002": "In Progress", "ST003": "Resolved", "ST004": "Rejected", "ST005": "On Hold"}
    priority_map = {"P1": "Low", "P2": "Medium", "P3": "High", "P4": "Critical"}
    req_type_map = {
        "RT001": "New Connection", "RT002": "Billing Issue", "RT003": "Meter Complaint",
        "RT004": "Outage Report", "RT005": "Water Supply", "RT006": "Waste Collection", "RT007": "Telecom Service"
    }
    util_map = {"UT001": "Electricity", "UT002": "Water", "UT003": "Gas", "UT004": "Telecom", "UT005": "Waste Management"}

    records = []
    sr_file = os.path.join(DATA_DIR, "service_requests.csv")
    if os.path.exists(sr_file):
        with open(sr_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append({
                    "request_id": row["request_id"],
                    "customer_id": row["customer_id"],
                    "utility": util_map.get(row["utility_id"], "Utility"),
                    "request_type": req_type_map.get(row["request_type_id"], "General Service"),
                    "status": status_map.get(row["status_id"], "Submitted"),
                    "priority": priority_map.get(row["priority_id"], "Medium"),
                    "created_at": row["created_at"],
                    "updated_at": row["created_at"],
                    "service_location": row["service_location"],
                    "description": row["description"],
                    "assigned_staff_id": row["assigned_staff_id"]
                })

    out_file = os.path.join(DATASETS_DIR, "service_requests.csv")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        fields = ["request_id", "customer_id", "utility", "request_type", "status", "priority", "created_at", "updated_at", "service_location", "description", "assigned_staff_id"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {len(records)} service requests in {out_file}")

def generate_complaints():
    status_map = {"ST001": "Submitted", "ST002": "In Progress", "ST003": "Resolved", "ST004": "Rejected", "ST005": "On Hold"}
    priority_map = {"P1": "Low", "P2": "Medium", "P3": "High", "P4": "Critical"}

    records = []
    cmp_file = os.path.join(DATA_DIR, "complaints.csv")
    if os.path.exists(cmp_file):
        with open(cmp_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append({
                    "complaint_id": row["complaint_id"],
                    "customer_id": row["customer_id"],
                    "request_id": row["request_id"],
                    "category": row["category"],
                    "description": row["latest_update"],
                    "status": status_map.get(row["status_id"], "Submitted"),
                    "priority": priority_map.get(row["priority_id"], "Medium"),
                    "created_at": row["created_date"],
                    "updated_at": row["created_date"]
                })

    out_file = os.path.join(DATASETS_DIR, "complaints.csv")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        fields = ["complaint_id", "customer_id", "request_id", "category", "description", "status", "priority", "created_at", "updated_at"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {len(records)} complaints in {out_file}")

def generate_operational_logs():
    status_map = {"ST001": "Inspection started", "ST002": "Crew assigned", "ST003": "Monitoring ongoing", "ST004": "Repair completed", "ST005": "Resolved"}
    priority_map = {"P1": "Low", "P2": "Medium", "P3": "High", "P4": "Critical"}
    util_map = {"UT001": "Electricity", "UT002": "Water", "UT003": "Gas", "UT004": "Telecom", "UT005": "Waste Management"}

    records = []
    inc_file = os.path.join(DATA_DIR, "operational_incidents.csv")
    if os.path.exists(inc_file):
        with open(inc_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append({
                    "log_id": row["incident_id"],
                    "utility": util_map.get(row["utility_id"], "Utility"),
                    "incident_type": row["incident_type"],
                    "affected_area": row["affected_area"],
                    "severity": priority_map.get(row["priority_id"], "Medium"),
                    "description": row["summary"],
                    "timestamp": row["reported_at"],
                    "status": status_map.get(row["status_id"], "Active"),
                    "reported_by_staff_id": row["reported_by_staff_id"]
                })

    out_file = os.path.join(DATASETS_DIR, "operational_logs.csv")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        fields = ["log_id", "utility", "incident_type", "affected_area", "severity", "description", "timestamp", "status", "reported_by_staff_id"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {len(records)} operational logs in {out_file}")

def create_knowledge_base_pdfs_and_text():
    # Write official utility text files and PDFs for RAG ingestion
    docs = [
        {
            "filename": "DOC001_Electricity_New_Connection_Guide.txt",
            "pdf_name": "DOC001_Electricity_New_Connection_Guide.pdf",
            "scope": "public",
            "title": "Electricity New Connection Guidelines and SOP (DOC001)",
            "content": """TECHBHARAT ELECTRICITY DISTRIBUTION CORPORATION
STANDARD OPERATING PROCEDURE: NEW DOMESTIC & COMMERCIAL ELECTRICITY CONNECTION
Document ID: DOC001 | Version: 2026.1 | Scope: Public / Citizen Access

1. ELIGIBILITY & SCOPE
Any lawful owner or occupier of a premises requiring low-tension (LT) or high-tension (HT) electricity supply is eligible to apply online or via authorized utility virtual assistant channels.

2. MANDATORY DOCUMENTS REQUIRED
To apply for a new single-phase or three-phase electricity connection, the applicant must provide verified copies of:
a) Proof of Identity: Government-issued Photo ID (Aadhaar Card, Passport, Voter ID Card, or PAN Card).
b) Proof of Address / Ownership: Registered Sale Deed, Title Deed, Property Tax Receipt, or Valid Lease / Tenancy Agreement with Owner NOC.
c) Occupancy Proof: Recent municipal assessment order or building permit approval certificate.
d) Formal Application Form: Duly filled online application along with test report from an authorized licensed electrical contractor.

3. SITE INSPECTION & FEASIBILITY REVIEW
Upon receiving the complete application and fee deposit:
- Technical inspection is scheduled within 48 to 72 business hours.
- Field engineers verify meter cabin accessibility, earthing installations, and load feasibility.
- If deviations or safety deficiencies are found, an inspection notice is issued via SMS/Email with 7 days rectification time.

4. TARIFF SLABS & ESTIMATE DEPOSITS
- Domestic LT-I: Fixed service charge + variable consumption slabs (0-100 units, 101-200 units, 201+ units).
- Security Deposit: Refundable consumer security deposit calculated based on connected electrical load in kW.
- Metering: Smart electronic dual-source meters installed by utility-authorized technicians only.

5. ESCALATION & GRIEVANCE REDRESSAL
Applicants can track application status using their registered Service Request ID (e.g., SRXXXXXX). If an application remains pending beyond 7 working days post-inspection, it is automatically escalated to the Divisional Engineer."""
        },
        {
            "filename": "DOC002_Electricity_Billing_FAQ_and_Disputes.txt",
            "pdf_name": "DOC002_Electricity_Billing_FAQ_and_Disputes.pdf",
            "scope": "public",
            "title": "Electricity Billing FAQ & Dispute Resolution SOP (DOC002)",
            "content": """TECHBHARAT ELECTRICITY BOARD
BILLING GRIEVANCE REDRESSAL & METER COMPLAINT SOP
Document ID: DOC002 | Version: 2026.1 | Scope: Public / Citizen Access

1. WHAT TO DO IF YOUR BILL IS INCORRECT
If a customer notices sudden bill inflation, wrong meter readings, or tariff miscalculation:
a) Retain your latest physical bill and note down the current 6-digit cumulative kWh reading directly from your physical meter LCD display.
b) Register a formal billing complaint through the Utility Virtual Assistant or online portal, specifying your Service Request ID or Consumer Number.
c) A provisional freeze on late payment surcharge is applied while the dispute undergoes review by a designated Billing Officer (EMP0003).

2. METER DEFECTS & BURNT METER REPLACEMENT
- If the meter display is blank, blinking unusually, or suspected to be running fast, file a 'Meter Complaint'.
- An authorized field inspection crew is dispatched within 3 business days.
- If the meter is verified defective or burnt due to voltage surge, it is replaced free of charge provided no unauthorized seal tampering is observed.

3. PAYMENT CHANNELS & DUE DATES
- Payments can be made via UPI, Net Banking, or offline utility collection counters.
- A grace period of 15 days from bill generation date is provided before notice of disconnection."""
        },
        {
            "filename": "DOC003_Water_Connection_and_Supply_Guide.txt",
            "pdf_name": "DOC003_Water_Connection_and_Supply_Guide.pdf",
            "scope": "public",
            "title": "Municipal Water Supply Connection SOP (DOC003)",
            "content": """MUNICIPAL WATER & SEWERAGE BOARD
STANDARD OPERATING PROCEDURE: TAP CONNECTION & LOW PRESSURE GRIEVANCES
Document ID: DOC003 | Version: 2026.1 | Scope: Public / Citizen Access

1. REQUESTING A NEW WATER CONNECTION
Citizens can submit a water connection application via the Utility Virtual Assistant:
- Submit ownership proof (Property Tax Assessment), municipal building plan, and road-cutting permission if pipeline trenching is required.
- Feasibility review: Municipal engineers inspect water main pressure in your ward (Ward 1 to Ward 40) within 5 working days.
- Road restoration charges apply if asphalt excavation is necessitated.

2. LOW WATER PRESSURE & CONTAMINATION REPORTING
- Report low supply or pipeline leaks immediately with your ward and street name.
- Crew dispatch priority: Low supply complaints are investigated within 24 hours.
- If water appears discolored, do not consume; municipal pipeline flushing teams are deployed upon complaint registration."""
        },
        {
            "filename": "DOC004_Power_Outage_Reporting_and_Safety.txt",
            "pdf_name": "DOC004_Power_Outage_Reporting_and_Safety.pdf",
            "scope": "public",
            "title": "Power Outage Reporting and Emergency Protocols (DOC004)",
            "content": """TECHBHARAT ELECTRICITY GRID OPERATIONS
CITIZEN OUTAGE REPORTING & EMERGENCY SAFETY INSTRUCTIONS
Document ID: DOC004 | Version: 2026.1 | Scope: Public / Citizen Access

1. REPORTING A POWER OUTAGE
When experiencing a localized blackout or phase drop:
- First check whether neighborhood streetlights or adjacent houses have power to identify if it is an individual fuse blowout or feeder trip.
- Report the affected ward and locality through the virtual assistant. You will receive an immediate Complaint ID (CMPXXXXXX) for tracking.
- Do not touch fallen overhead cables or damaged distribution boxes. Keep a safe distance of at least 10 meters.

2. ESTIMATED RESTORATION TIMELINES
- Local 11kV Feeder Trips: Restored within 1 to 2 hours via secondary substation switching.
- Distribution Transformer (DTR) Failures: Replacement and oil testing typically requires 4 to 8 hours.
- Scheduled Maintenance: Prior circulars are broadcast via SMS and public advisories 24 hours in advance."""
        },
        {
            "filename": "SOP_INTERNAL_001_Substation_Switching_Protocol.txt",
            "pdf_name": "SOP_INTERNAL_001_Substation_Switching_Protocol.pdf",
            "scope": "internal",
            "title": "Internal SOP: Substation Switching & High-Voltage Maintenance (INTERNAL-SOP-001)",
            "content": """CONFIDENTIAL // INTERNAL UTILITY STAFF ONLY
TECHBHARAT ELECTRICAL ENGINEERING DEPARTMENT
STANDARD OPERATING PROCEDURE: SUBSTATION SWITCHING & PERMIT-TO-WORK (PTW)
Document ID: INTERNAL-SOP-001 | Classification: RESTRICTED / INTERNAL STAFF ONLY

1. APPLICABILITY & RBAC
This SOP is strictly restricted to Utility Supervisors (EMP0004), Field Technicians (EMP0002), and Grid Control Engineers. Citizen accounts are strictly barred from accessing switching diagrams or breaker configurations.

2. PERMIT-TO-WORK (PTW) ISSUANCE
Before any maintenance crew touches 33kV/11kV transformers:
- The Senior Operations Supervisor must issue an authorized digital PTW number.
- Both upstream circuit breaker and downstream isolator switches must be physically locked and tagged (LOTO protocol).
- Grounding leads must be attached to discharge residual capacitive charges.

3. SCADA DISPATCH LOGGING
All feeder trips in Wards 1 through 40 must be logged in the operational_incidents database with timestamp, trip current, and fault impedance.
Restoration must not be initiated without positive confirmation from the on-site field engineer."""
        },
        {
            "filename": "SOP_INTERNAL_002_Pipeline_Burst_Isolation_Protocol.txt",
            "pdf_name": "SOP_INTERNAL_002_Pipeline_Burst_Isolation_Protocol.pdf",
            "scope": "internal",
            "title": "Internal SOP: Water Trunk Main Burst Isolation & Emergency Dewatering (INTERNAL-SOP-002)",
            "content": """CONFIDENTIAL // INTERNAL UTILITY STAFF ONLY
MUNICIPAL WATER INFRASTRUCTURE DIVISION
EMERGENCY SHUTOFF & SLUICE VALVE CONTROL SOP
Document ID: INTERNAL-SOP-002 | Classification: RESTRICTED / INTERNAL STAFF ONLY

1. PURPOSE & RBAC
Restricted to municipal hydraulic engineers and field operations crew. Details sluice valve coordinates and pipeline isolation sequences across Ward pumping stations.

2. EMERGENCY BURST RESPONSE
- Step 1: Identify burst zone using telemetry flow sensors or customer complaint concentration in Ward clusters.
- Step 2: Close upstream sluice valves SV-14A and SV-14B within 15 minutes of burst detection to prevent roadway subsidence.
- Step 3: Deploy trailer-mounted diesel dewatering pumps to clear valve chambers.
- Step 4: Notify the control room to reroute gravity water feed from secondary reservoirs."""
        }
    ]

    import fitz # PyMuPDF

    for doc in docs:
        dest_dir = KB_PUBLIC_DIR if doc["scope"] == "public" else KB_INTERNAL_DIR
        txt_path = os.path.join(dest_dir, doc["filename"])
        pdf_path = os.path.join(dest_dir, doc["pdf_name"])

        # Write text
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(doc["content"])

        # Generate real multi-page PDF using PyMuPDF
        doc_pdf = fitz.open()
        page = doc_pdf.new_page()
        page.insert_text((50, 50), doc["title"], fontsize=14, color=(0.1, 0.2, 0.6))
        page.insert_text((50, 80), doc["content"], fontsize=10, color=(0.1, 0.1, 0.1))
        doc_pdf.save(pdf_path)
        doc_pdf.close()
        print(f"Created {doc['scope']} document and PDF: {pdf_path}")

if __name__ == "__main__":
    generate_users()
    generate_service_requests()
    generate_complaints()
    generate_operational_logs()
    create_knowledge_base_pdfs_and_text()
    print("All synthetic datasets and knowledge base documents successfully generated!")
