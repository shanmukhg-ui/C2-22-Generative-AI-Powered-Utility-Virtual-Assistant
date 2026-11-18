-- Relational schema for Utility Virtual Assistant synthetic demo dataset
CREATE TABLE customers (customer_id VARCHAR(20) PRIMARY KEY, email VARCHAR(120), display_name VARCHAR(100), city VARCHAR(80), locality VARCHAR(80), account_status VARCHAR(30));
CREATE TABLE staff (staff_id VARCHAR(20) PRIMARY KEY, email VARCHAR(120), staff_name VARCHAR(100), department VARCHAR(80));
CREATE TABLE utilities (utility_id VARCHAR(20) PRIMARY KEY, utility_name VARCHAR(80) UNIQUE);
CREATE TABLE request_types (request_type_id VARCHAR(20) PRIMARY KEY, request_type_name VARCHAR(80));
CREATE TABLE statuses (status_id VARCHAR(20) PRIMARY KEY, status_name VARCHAR(80));
CREATE TABLE priorities (priority_id VARCHAR(20) PRIMARY KEY, priority_name VARCHAR(80));
CREATE TABLE service_requests (
 request_id VARCHAR(20) PRIMARY KEY,
 customer_id VARCHAR(20) NOT NULL REFERENCES customers(customer_id),
 utility_id VARCHAR(20) NOT NULL REFERENCES utilities(utility_id),
 request_type_id VARCHAR(20) NOT NULL REFERENCES request_types(request_type_id),
 status_id VARCHAR(20) NOT NULL REFERENCES statuses(status_id),
 priority_id VARCHAR(20) NOT NULL REFERENCES priorities(priority_id),
 assigned_staff_id VARCHAR(20) REFERENCES staff(staff_id),
 created_at TIMESTAMP, service_location VARCHAR(150), description TEXT
);
CREATE TABLE complaints (
 complaint_id VARCHAR(20) PRIMARY KEY,
 request_id VARCHAR(20) NOT NULL REFERENCES service_requests(request_id),
 customer_id VARCHAR(20) NOT NULL REFERENCES customers(customer_id),
 category VARCHAR(80), status_id VARCHAR(20) NOT NULL REFERENCES statuses(status_id),
 priority_id VARCHAR(20) NOT NULL REFERENCES priorities(priority_id),
 created_date DATE, latest_update TEXT
);
CREATE TABLE operational_incidents (
 incident_id VARCHAR(20) PRIMARY KEY,
 utility_id VARCHAR(20) NOT NULL REFERENCES utilities(utility_id),
 reported_by_staff_id VARCHAR(20) NOT NULL REFERENCES staff(staff_id),
 reported_at TIMESTAMP, incident_type VARCHAR(80), affected_area VARCHAR(100),
 priority_id VARCHAR(20) NOT NULL REFERENCES priorities(priority_id),
 status_id VARCHAR(20) NOT NULL REFERENCES statuses(status_id), summary TEXT
);
CREATE TABLE knowledge_documents (
 document_id VARCHAR(20) PRIMARY KEY,
 utility_id VARCHAR(20) NOT NULL REFERENCES utilities(utility_id),
 document_title VARCHAR(150), document_text TEXT, source_type VARCHAR(100)
);
CREATE TABLE knowledge_faqs (
 faq_id VARCHAR(20) PRIMARY KEY,
 document_id VARCHAR(20) NOT NULL REFERENCES knowledge_documents(document_id),
 utility_id VARCHAR(20) NOT NULL REFERENCES utilities(utility_id),
 question TEXT, answer TEXT, source_note TEXT
);
