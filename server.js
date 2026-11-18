require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const AgentRouter = require('./agent_router');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'utility_assistant.db');
const router = new AgentRouter(dbPath);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getDb() {
  return new DatabaseSync(dbPath);
}

// 1. Health check & Meta
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), project: 'C2-22 Generative AI Utility Virtual Assistant' });
});

app.get('/api/meta', (req, res) => {
  try {
    const db = getDb();
    const utilities = db.prepare('SELECT * FROM utilities').all();
    const statuses = db.prepare('SELECT * FROM statuses').all();
    const priorities = db.prepare('SELECT * FROM priorities').all();
    const requestTypes = db.prepare('SELECT * FROM request_types').all();
    const staff = db.prepare('SELECT * FROM staff').all();
    const sampleCustomers = db.prepare('SELECT * FROM customers LIMIT 15').all();

    res.json({
      utilities,
      statuses,
      priorities,
      requestTypes,
      staff,
      sampleCustomers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Chat endpoint (Agent Router + RAG + RBAC + DB lookup + LLM)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userContext } = req.body;
    const result = await router.processQuery(message, userContext);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      reply: 'An error occurred while processing your request. Please try again.',
      error: err.message,
      intent: 'ERROR',
      citations: [],
      cards: [],
      confidence: 0
    });
  }
});

// 3. Service Requests API
app.get('/api/requests', (req, res) => {
  try {
    const db = getDb();
    const { customer_id, utility_id, status_id, priority_id, q, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        sr.request_id, sr.customer_id, sr.utility_id, u.utility_name,
        sr.request_type_id, rt.request_type_name,
        sr.status_id, st.status_name,
        sr.priority_id, pr.priority_name,
        sr.assigned_staff_id, s.staff_name, s.department,
        sr.created_at, sr.service_location, sr.description,
        c.display_name AS customer_name, c.email AS customer_email, c.city, c.locality
      FROM service_requests sr
      LEFT JOIN utilities u ON sr.utility_id = u.utility_id
      LEFT JOIN request_types rt ON sr.request_type_id = rt.request_type_id
      LEFT JOIN statuses st ON sr.status_id = st.status_id
      LEFT JOIN priorities pr ON sr.priority_id = pr.priority_id
      LEFT JOIN staff s ON sr.assigned_staff_id = s.staff_id
      LEFT JOIN customers c ON sr.customer_id = c.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      sql += ' AND sr.customer_id = ?';
      params.push(customer_id);
    }
    if (utility_id) {
      sql += ' AND sr.utility_id = ?';
      params.push(utility_id);
    }
    if (status_id) {
      sql += ' AND sr.status_id = ?';
      params.push(status_id);
    }
    if (priority_id) {
      sql += ' AND sr.priority_id = ?';
      params.push(priority_id);
    }
    if (q) {
      sql += ' AND (sr.request_id LIKE ? OR sr.description LIKE ? OR sr.service_location LIKE ? OR c.display_name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const records = db.prepare(sql).all(...params);
    
    // Total count query
    let countSql = `SELECT COUNT(*) AS total FROM service_requests sr LEFT JOIN customers c ON sr.customer_id = c.customer_id WHERE 1=1`;
    const countParams = params.slice(0, -2);
    if (customer_id) countSql += ' AND sr.customer_id = ?';
    if (utility_id) countSql += ' AND sr.utility_id = ?';
    if (status_id) countSql += ' AND sr.status_id = ?';
    if (priority_id) countSql += ' AND sr.priority_id = ?';
    if (q) countSql += ' AND (sr.request_id LIKE ? OR sr.description LIKE ? OR sr.service_location LIKE ? OR c.display_name LIKE ?)';
    
    const countResult = db.prepare(countSql).get(...countParams);

    res.json({
      total: countResult ? countResult.total : records.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests/:id', (req, res) => {
  try {
    const db = getDb();
    const reqId = req.params.id;
    const record = db.prepare(`
      SELECT 
        sr.request_id, sr.customer_id, sr.utility_id, u.utility_name,
        sr.request_type_id, rt.request_type_name,
        sr.status_id, st.status_name,
        sr.priority_id, pr.priority_name,
        sr.assigned_staff_id, s.staff_name, s.department,
        sr.created_at, sr.service_location, sr.description,
        c.display_name AS customer_name, c.email AS customer_email, c.city, c.locality
      FROM service_requests sr
      LEFT JOIN utilities u ON sr.utility_id = u.utility_id
      LEFT JOIN request_types rt ON sr.request_type_id = rt.request_type_id
      LEFT JOIN statuses st ON sr.status_id = st.status_id
      LEFT JOIN priorities pr ON sr.priority_id = pr.priority_id
      LEFT JOIN staff s ON sr.assigned_staff_id = s.staff_id
      LEFT JOIN customers c ON sr.customer_id = c.customer_id
      WHERE sr.request_id = ?
    `).get(reqId);

    if (!record) return res.status(404).json({ error: 'Request not found' });

    const linkedComplaints = db.prepare(`
      SELECT c.*, st.status_name, pr.priority_name
      FROM complaints c
      LEFT JOIN statuses st ON c.status_id = st.status_id
      LEFT JOIN priorities pr ON c.priority_id = pr.priority_id
      WHERE c.request_id = ?
    `).all(reqId);

    res.json({ ...record, linkedComplaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', (req, res) => {
  try {
    const db = getDb();
    const { customer_id, utility_id, request_type_id, priority_id, service_location, description } = req.body;

    if (!customer_id || !utility_id || !request_type_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-generate next request_id
    const maxRow = db.prepare("SELECT request_id FROM service_requests WHERE request_id LIKE 'SR%' ORDER BY request_id DESC LIMIT 1").get();
    let nextNum = 501;
    if (maxRow && maxRow.request_id) {
      const parsed = parseInt(maxRow.request_id.replace('SR', ''));
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const requestId = 'SR' + String(nextNum).padStart(6, '0');

    // Default staff assignment (round-robin staff)
    const staffList = db.prepare("SELECT staff_id FROM staff WHERE staff_id LIKE 'EMP%'").all();
    const assignedStaffId = staffList.length > 0 ? staffList[Math.floor(Math.random() * staffList.length)].staff_id : 'EMP0001';

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      INSERT INTO service_requests (
        request_id, customer_id, utility_id, request_type_id, status_id, priority_id,
        assigned_staff_id, created_at, service_location, description
      ) VALUES (?, ?, ?, ?, 'ST001', ?, ?, ?, ?, ?)
    `).run(
      requestId,
      customer_id,
      utility_id,
      request_type_id,
      priority_id || 'P2',
      assignedStaffId,
      now,
      service_location || 'Registered Customer Locality',
      description || 'Submitted via Utility Virtual Assistant'
    );

    router.logAudit(customer_id, 'Customer', 'CREATE_SERVICE_REQUEST', requestId, 'ACTION_FILING', 'SUCCESS', `Created ${requestId}`);

    res.status(201).json({
      success: true,
      requestId,
      message: `Service request ${requestId} created successfully.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Complaints API
app.get('/api/complaints', (req, res) => {
  try {
    const db = getDb();
    const { customer_id, status_id, priority_id, q, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        c.complaint_id, c.request_id, c.customer_id, c.category,
        c.status_id, st.status_name,
        c.priority_id, pr.priority_name,
        c.created_date, c.latest_update,
        cust.display_name AS customer_name, cust.city, cust.locality,
        sr.utility_id, u.utility_name
      FROM complaints c
      LEFT JOIN statuses st ON c.status_id = st.status_id
      LEFT JOIN priorities pr ON c.priority_id = pr.priority_id
      LEFT JOIN customers cust ON c.customer_id = cust.customer_id
      LEFT JOIN service_requests sr ON c.request_id = sr.request_id
      LEFT JOIN utilities u ON sr.utility_id = u.utility_id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      sql += ' AND c.customer_id = ?';
      params.push(customer_id);
    }
    if (status_id) {
      sql += ' AND c.status_id = ?';
      params.push(status_id);
    }
    if (priority_id) {
      sql += ' AND c.priority_id = ?';
      params.push(priority_id);
    }
    if (q) {
      sql += ' AND (c.complaint_id LIKE ? OR c.category LIKE ? OR c.latest_update LIKE ? OR c.request_id LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY c.created_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const records = db.prepare(sql).all(...params);

    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', (req, res) => {
  try {
    const db = getDb();
    const { request_id, customer_id, category, priority_id, latest_update } = req.body;

    if (!customer_id || !category) {
      return res.status(400).json({ error: 'Customer ID and Category are required' });
    }

    // Auto-generate next complaint_id
    const maxRow = db.prepare("SELECT complaint_id FROM complaints WHERE complaint_id LIKE 'CMP%' ORDER BY complaint_id DESC LIMIT 1").get();
    let nextNum = 251;
    if (maxRow && maxRow.complaint_id) {
      const parsed = parseInt(maxRow.complaint_id.replace('CMP', ''));
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const complaintId = 'CMP' + String(nextNum).padStart(6, '0');

    // If request_id not provided, find or link to customer's latest request
    let linkedRequestId = request_id;
    if (!linkedRequestId) {
      const userReq = db.prepare("SELECT request_id FROM service_requests WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1").get(customer_id);
      linkedRequestId = userReq ? userReq.request_id : 'SR000001';
    }

    const today = new Date().toISOString().substring(0, 10);

    db.prepare(`
      INSERT INTO complaints (
        complaint_id, request_id, customer_id, category, status_id, priority_id, created_date, latest_update
      ) VALUES (?, ?, ?, ?, 'ST001', ?, ?, ?)
    `).run(
      complaintId,
      linkedRequestId,
      customer_id,
      category,
      priority_id || 'P2',
      today,
      latest_update || 'Complaint registered through Virtual Assistant'
    );

    router.logAudit(customer_id, 'Customer', 'FILE_COMPLAINT', complaintId, 'ACTION_FILING', 'SUCCESS', `Complaint for ${linkedRequestId}`);

    res.status(201).json({
      success: true,
      complaintId,
      message: `Complaint ${complaintId} registered successfully.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Staff ticket update endpoint
app.patch('/api/tickets/update', (req, res) => {
  try {
    const db = getDb();
    const { ticketType, ticketId, statusId, priorityId, assignedStaffId, note, staffId } = req.body;

    if (ticketType === 'SERVICE_REQUEST') {
      let sql = 'UPDATE service_requests SET ';
      const updates = [];
      const params = [];

      if (statusId) { updates.push('status_id = ?'); params.push(statusId); }
      if (priorityId) { updates.push('priority_id = ?'); params.push(priorityId); }
      if (assignedStaffId) { updates.push('assigned_staff_id = ?'); params.push(assignedStaffId); }
      if (note) { updates.push('description = description || ?'); params.push(` | Update [${new Date().toISOString().substring(0, 10)}]: ${note}`); }

      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

      sql += updates.join(', ') + ' WHERE request_id = ?';
      params.push(ticketId);

      db.prepare(sql).run(...params);
      router.logAudit(staffId || 'STAFF', 'Employee', 'UPDATE_TICKET', ticketId, 'TICKET_MANAGEMENT', 'SUCCESS', `Updated status: ${statusId}`);
    } else if (ticketType === 'COMPLAINT') {
      let sql = 'UPDATE complaints SET ';
      const updates = [];
      const params = [];

      if (statusId) { updates.push('status_id = ?'); params.push(statusId); }
      if (priorityId) { updates.push('priority_id = ?'); params.push(priorityId); }
      if (note) { updates.push('latest_update = ?'); params.push(note); }

      sql += updates.join(', ') + ' WHERE complaint_id = ?';
      params.push(ticketId);

      db.prepare(sql).run(...params);
      router.logAudit(staffId || 'STAFF', 'Employee', 'UPDATE_COMPLAINT', ticketId, 'TICKET_MANAGEMENT', 'SUCCESS', `Updated: ${note || statusId}`);
    }

    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Operational Incidents API
app.get('/api/incidents', (req, res) => {
  try {
    const db = getDb();
    const { utility_id, incident_type, area, status_id } = req.query;

    let sql = `
      SELECT 
        oi.incident_id, oi.utility_id, u.utility_name,
        oi.reported_by_staff_id, s.staff_name, s.department,
        oi.reported_at, oi.incident_type, oi.affected_area,
        oi.priority_id, pr.priority_name,
        oi.status_id, st.status_name, oi.summary
      FROM operational_incidents oi
      LEFT JOIN utilities u ON oi.utility_id = u.utility_id
      LEFT JOIN staff s ON oi.reported_by_staff_id = s.staff_id
      LEFT JOIN priorities pr ON oi.priority_id = pr.priority_id
      LEFT JOIN statuses st ON oi.status_id = st.status_id
      WHERE 1=1
    `;
    const params = [];

    if (utility_id) { sql += ' AND oi.utility_id = ?'; params.push(utility_id); }
    if (incident_type) { sql += ' AND oi.incident_type = ?'; params.push(incident_type); }
    if (area) { sql += ' AND oi.affected_area LIKE ?'; params.push(`%${area}%`); }
    if (status_id) { sql += ' AND oi.status_id = ?'; params.push(status_id); }

    sql += ' ORDER BY oi.reported_at DESC';
    const incidents = db.prepare(sql).all(...params);

    res.json({ incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operational summary generator
app.post('/api/incidents/summarize', async (req, res) => {
  try {
    const { role = 'Employee', userId = 'EMP0004' } = req.body;
    const summaryResult = await router.handleOperationalSummary(userId, role, "Generate daily operational summary", Date.now());
    res.json(summaryResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Knowledge Base Documents & Ingestion API
app.get('/api/documents', (req, res) => {
  try {
    const db = getDb();
    const docs = db.prepare(`
      SELECT kd.*, u.utility_name, COUNT(kf.faq_id) AS faq_count
      FROM knowledge_documents kd
      LEFT JOIN utilities u ON kd.utility_id = u.utility_id
      LEFT JOIN knowledge_faqs kf ON kd.document_id = kf.document_id
      GROUP BY kd.document_id
    `).all();

    const sampleFaqs = db.prepare(`
      SELECT kf.*, u.utility_name, kd.document_title
      FROM knowledge_faqs kf
      LEFT JOIN utilities u ON kf.utility_id = u.utility_id
      LEFT JOIN knowledge_documents kd ON kf.document_id = kd.document_id
      LIMIT 30
    `).all();

    res.json({
      totalDocuments: docs.length,
      totalFaqs: router.rag.chunks.filter(c => c.type === 'FAQ').length,
      documents: docs,
      sampleFaqs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', (req, res) => {
  try {
    const { title, text, utilityId, sourceType, staffId } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'Title and text required' });

    const docId = router.rag.addCustomDocument(title, text, utilityId || 'UT001', sourceType || 'Admin Upload');
    router.logAudit(staffId || 'ADMIN', 'Administrator', 'INGEST_DOCUMENT', docId, 'KNOWLEDGE_BASE', 'SUCCESS', `Ingested SOP: ${title}`);

    res.status(201).json({
      success: true,
      docId,
      message: `Document ${docId} indexed into live RAG knowledge vector store.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Semantic RAG tester endpoint
app.get('/api/rag/test', (req, res) => {
  try {
    const q = req.query.q || 'new connection documents';
    const matches = router.rag.search(q, { topK: 5, minScore: 0.1 });
    res.json({ query: q, matchCount: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Audit Logs API
app.get('/api/audit-logs', (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 100').all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Metrics & Analytics API
app.get('/api/metrics', (req, res) => {
  try {
    const db = getDb();

    const counts = {
      requests: db.prepare('SELECT COUNT(*) AS c FROM service_requests').get().c,
      complaints: db.prepare('SELECT COUNT(*) AS c FROM complaints').get().c,
      incidents: db.prepare('SELECT COUNT(*) AS c FROM operational_incidents').get().c,
      customers: db.prepare('SELECT COUNT(*) AS c FROM customers').get().c,
      staff: db.prepare('SELECT COUNT(*) AS c FROM staff').get().c,
      documents: db.prepare('SELECT COUNT(*) AS c FROM knowledge_documents').get().c,
      faqs: db.prepare('SELECT COUNT(*) AS c FROM knowledge_faqs').get().c
    };

    const requestsByUtility = db.prepare(`
      SELECT u.utility_name, COUNT(*) AS count
      FROM service_requests sr
      JOIN utilities u ON sr.utility_id = u.utility_id
      GROUP BY u.utility_name
    `).all();

    const requestsByStatus = db.prepare(`
      SELECT st.status_name, COUNT(*) AS count
      FROM service_requests sr
      JOIN statuses st ON sr.status_id = st.status_id
      GROUP BY st.status_name
    `).all();

    const priorityBreakdown = db.prepare(`
      SELECT pr.priority_name, COUNT(*) AS count
      FROM service_requests sr
      JOIN priorities pr ON sr.priority_id = pr.priority_id
      GROUP BY pr.priority_name
    `).all();

    const topIncidentWards = db.prepare(`
      SELECT affected_area, COUNT(*) AS count
      FROM operational_incidents
      GROUP BY affected_area
      ORDER BY count DESC
      LIMIT 6
    `).all();

    res.json({
      counts,
      requestsByUtility,
      requestsByStatus,
      priorityBreakdown,
      topIncidentWards
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Project C2-22 Utility Virtual Assistant Server Live`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`👥 Authors: Gollavilli Shanmukh Vardhan Sai, PANAM VICTOR KOMAL`);
  console.log(`📦 TechBharat AI CoE - Cohort #2`);
  console.log(`=======================================================`);
});
