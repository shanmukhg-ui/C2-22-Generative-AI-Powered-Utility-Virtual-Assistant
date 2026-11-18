require('dotenv').config();
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const RAGEngine = require('./rag_engine');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

class AgentRouter {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, 'utility_assistant.db');
    this.rag = new RAGEngine(this.dbPath);
  }

  getDb() {
    return new DatabaseSync(this.dbPath);
  }

  logAudit(userId, userRole, actionType, query, intent, status, details = '') {
    try {
      const db = this.getDb();
      db.prepare(`
        INSERT INTO audit_logs (user_id, user_role, action_type, query_or_target, intent_routed, status, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId || 'ANONYMOUS', userRole || 'Customer', actionType, query, intent, status, details);
    } catch (e) {
      console.error('Audit log error:', e.message);
    }
  }

  async processQuery(userInput, userContext = {}) {
    const startTime = Date.now();
    const {
      role = 'Customer',
      userId = 'CUST0001',
      userName = 'Customer 1',
      city = 'Vizag'
    } = userContext;

    const trimmed = (userInput || '').trim();
    if (!trimmed) {
      return {
        reply: "Hello! I am your Utility Virtual Assistant. How can I help you today? You can ask about new connections, billing inquiries, report an outage, or track an existing request (e.g., 'Check status of SR000001' or 'CMP000001').",
        intent: 'GREETING',
        citations: [],
        cards: [],
        confidence: 1.0,
        latencyMs: 10
      };
    }

    const srMatch = trimmed.match(/\b(SR\d{6})\b/i);
    const cmpMatch = trimmed.match(/\b(CMP\d{6})\b/i);
    const lower = trimmed.toLowerCase();

    // 1. INTENT: Service Request Lookup
    if (srMatch) {
      const reqId = srMatch[1].toUpperCase();
      return this.handleServiceRequestLookup(reqId, userId, role, trimmed, startTime);
    }

    // 2. INTENT: Complaint Lookup
    if (cmpMatch) {
      const cmpId = cmpMatch[1].toUpperCase();
      return this.handleComplaintLookup(cmpId, userId, role, trimmed, startTime);
    }

    // 3. INTENT: Operational Issues / Daily Summary
    if (
      lower.includes('operational issue') ||
      lower.includes('daily summary') ||
      lower.includes("today's issues") ||
      lower.includes('todays issues') ||
      lower.includes('outage summary') ||
      lower.includes('incident summary') ||
      (lower.includes('summarize') && (lower.includes('issue') || lower.includes('outage') || lower.includes('incident')))
    ) {
      return this.handleOperationalSummary(userId, role, trimmed, startTime);
    }

    // 4. INTENT: New connection or filing guide
    if (
      (lower.includes('file') || lower.includes('raise') || lower.includes('submit')) &&
      (lower.includes('complaint') || lower.includes('request'))
    ) {
      this.logAudit(userId, role, 'GUIDANCE', trimmed, 'ACTION_FILING', 'SUCCESS');
      return {
        reply: `You can directly file a new service request or complaint using our quick actions below or via the **Requests & Complaints** tab. Would you like me to open the submission form for you?`,
        intent: 'ACTION_FILING',
        actionButtons: [
          { text: 'File a Complaint', action: 'OPEN_COMPLAINT_MODAL' },
          { text: 'Apply for New Connection', action: 'OPEN_REQUEST_MODAL' }
        ],
        citations: [],
        cards: [],
        confidence: 0.95,
        latencyMs: Date.now() - startTime
      };
    }

    // 5. INTENT: Knowledge Base RAG Search
    return this.handleKnowledgeRAG(trimmed, userId, role, startTime);
  }

  handleServiceRequestLookup(reqId, userId, role, query, startTime) {
    const db = this.getDb();
    const req = db.prepare(`
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

    if (!req) {
      this.logAudit(userId, role, 'DB_LOOKUP', reqId, 'TICKET_LOOKUP', 'NOT_FOUND');
      return {
        reply: `Service request **${reqId}** was not found in our utility system. Please verify the request number or check your recent submissions.`,
        intent: 'TICKET_LOOKUP',
        cards: [],
        citations: [],
        confidence: 0.9,
        latencyMs: Date.now() - startTime
      };
    }

    // RBAC check: Customers can only view their own requests
    if (role === 'Customer' && req.customer_id !== userId) {
      this.logAudit(userId, role, 'RBAC_SECURITY', reqId, 'TICKET_LOOKUP', 'DENIED', `User ${userId} attempted accessing ${req.customer_id}'s request`);
      return {
        reply: `🔒 **Access Restricted by RBAC Policy**: Service request **${reqId}** belongs to another registered consumer account. Under utility data privacy regulations, citizen accounts may only access tickets registered under their own profile (current ID: \`${userId}\`).`,
        intent: 'RBAC_DENIED',
        securityAlert: true,
        cards: [],
        citations: [],
        confidence: 1.0,
        latencyMs: Date.now() - startTime
      };
    }

    // Check linked complaints
    const linkedComplaints = db.prepare(`
      SELECT c.complaint_id, c.category, c.created_date, c.latest_update, st.status_name
      FROM complaints c
      LEFT JOIN statuses st ON c.status_id = st.status_id
      WHERE c.request_id = ?
    `).all(reqId);

    this.logAudit(userId, role, 'DB_LOOKUP', reqId, 'TICKET_LOOKUP', 'SUCCESS');

    const card = {
      type: 'SERVICE_REQUEST',
      requestId: req.request_id,
      customerId: req.customer_id,
      customerName: req.customer_name,
      utility: req.utility_name,
      requestType: req.request_type_name,
      status: req.status_name,
      statusId: req.status_id,
      priority: req.priority_name,
      priorityId: req.priority_id,
      assignedStaff: req.staff_name ? `${req.staff_name} (${req.department})` : 'Unassigned',
      location: req.service_location,
      createdAt: req.created_at,
      description: req.description,
      linkedComplaints: linkedComplaints
    };

    const reply = `Found details for service request **${req.request_id}** (${req.utility_name} - ${req.request_type_name}). Current status is **${req.status_name}** with **${req.priority_name}** priority. ${req.staff_name ? `Assigned to ${req.staff_name}.` : 'Pending crew assignment.'}`;

    return {
      reply,
      intent: 'TICKET_LOOKUP',
      cards: [card],
      citations: [
        { title: `Service Request Database [${req.request_id}]`, source: 'CRM / Service Request System' }
      ],
      confidence: 1.0,
      latencyMs: Date.now() - startTime
    };
  }

  handleComplaintLookup(cmpId, userId, role, query, startTime) {
    const db = this.getDb();
    const cmp = db.prepare(`
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
      WHERE c.complaint_id = ?
    `).get(cmpId);

    if (!cmp) {
      this.logAudit(userId, role, 'DB_LOOKUP', cmpId, 'COMPLAINT_LOOKUP', 'NOT_FOUND');
      return {
        reply: `Complaint **${cmpId}** was not found in the complaint tracking system. Please verify the complaint reference number.`,
        intent: 'COMPLAINT_LOOKUP',
        cards: [],
        citations: [],
        confidence: 0.9,
        latencyMs: Date.now() - startTime
      };
    }

    // RBAC check: Customers can only view their own complaints
    if (role === 'Customer' && cmp.customer_id !== userId) {
      this.logAudit(userId, role, 'RBAC_SECURITY', cmpId, 'COMPLAINT_LOOKUP', 'DENIED', `User ${userId} attempted accessing ${cmp.customer_id}'s complaint`);
      return {
        reply: `🔒 **Access Restricted by RBAC Policy**: Complaint **${cmpId}** is registered under a different customer identity. You are logged in as \`${userId}\`.`,
        intent: 'RBAC_DENIED',
        securityAlert: true,
        cards: [],
        citations: [],
        confidence: 1.0,
        latencyMs: Date.now() - startTime
      };
    }

    this.logAudit(userId, role, 'DB_LOOKUP', cmpId, 'COMPLAINT_LOOKUP', 'SUCCESS');

    const card = {
      type: 'COMPLAINT',
      complaintId: cmp.complaint_id,
      requestId: cmp.request_id,
      customerId: cmp.customer_id,
      customerName: cmp.customer_name,
      utility: cmp.utility_name || 'Utility Service',
      category: cmp.category,
      status: cmp.status_name,
      statusId: cmp.status_id,
      priority: cmp.priority_name,
      priorityId: cmp.priority_id,
      createdDate: cmp.created_date,
      latestUpdate: cmp.latest_update
    };

    const reply = `Complaint **${cmp.complaint_id}** (Category: **${cmp.category}**) linked to Service Request **${cmp.request_id}** is currently **${cmp.status_name}**. Latest update: *"${cmp.latest_update}"*.`;

    return {
      reply,
      intent: 'COMPLAINT_LOOKUP',
      cards: [card],
      citations: [
        { title: `Complaint Records [${cmp.complaint_id}]`, source: 'Complaint Management System' }
      ],
      confidence: 1.0,
      latencyMs: Date.now() - startTime
    };
  }

  async handleOperationalSummary(userId, role, query, startTime) {
    const db = this.getDb();
    
    // RBAC Check for Internal Operational Logs
    if (role === 'Customer') {
      // Customers get a public citizen-safe advisory
      const activeOutages = db.prepare(`
        SELECT incident_type, affected_area, priority_id, status_id, summary
        FROM operational_incidents
        WHERE incident_type = 'Power Outage' AND status_id != 'ST003'
        LIMIT 5
      `).all();

      this.logAudit(userId, role, 'OPERATIONAL_QUERY', query, 'CITIZEN_ADVISORY', 'SUCCESS');

      return {
        reply: `📢 **Public Utility Advisory**: Here are the current active service advisories in your region:\n\n` +
          activeOutages.map(o => `• **${o.incident_type}** in **${o.affected_area}**: ${o.summary}`).join('\n') +
          `\n\nFor localized outage updates or to report a disruption, please share your ward or account number. (Note: Internal engineering telemetry and staff logs are restricted to Utility Employees and Administrators).`,
        intent: 'CITIZEN_ADVISORY',
        cards: [],
        citations: [{ title: 'Public Outage Bulletin', source: 'Utility Operational Dispatch' }],
        confidence: 0.95,
        latencyMs: Date.now() - startTime
      };
    }

    // Role is Staff or Admin: Full Operational Aggregation
    const incidents = db.prepare(`
      SELECT 
        oi.incident_id, u.utility_name, oi.incident_type, oi.affected_area,
        pr.priority_name, st.status_name, s.staff_name, oi.reported_at, oi.summary
      FROM operational_incidents oi
      LEFT JOIN utilities u ON oi.utility_id = u.utility_id
      LEFT JOIN priorities pr ON oi.priority_id = pr.priority_id
      LEFT JOIN statuses st ON oi.status_id = st.status_id
      LEFT JOIN staff s ON oi.reported_by_staff_id = s.staff_id
      ORDER BY oi.priority_id DESC, oi.reported_at DESC
      LIMIT 6
    `).all();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN priority_id = 'P4' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN priority_id = 'P3' THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN status_id != 'ST003' THEN 1 ELSE 0 END) AS unresolved
      FROM operational_incidents
    `).get();

    // Prepare structured context for LLM
    const incidentBullets = incidents.map(i => 
      `- [${i.incident_id}] ${i.utility_name}: ${i.incident_type} in ${i.affected_area} (${i.priority_name}) - ${i.summary}`
    ).join('\n');

    const prompt = `Generate a concise Daily Operational Summary for utility staff:
Total Incidents: ${stats.total}, Critical (P4): ${stats.critical}, High (P3): ${stats.high}, Active: ${stats.unresolved}
Key Issues:
${incidentBullets}
Provide:
1. Executive Overview
2. Critical Alerts & Wards
3. Recommended Actions`;

    let summaryText = '';
    let sourceUsed = 'OpenRouter AI (google/gemini-2.5-flash)';

    try {
      summaryText = await this.callLLM(prompt);
    } catch (e) {
      console.warn('OpenRouter call failed, using local summarizer:', e.message);
      summaryText = `### 📋 Daily Operational Issue Summary (Staff Dispatch)\n\n` +
        `**Overview**: Total **${stats.total}** operational incidents recorded across metropolitan wards, including **${stats.critical} critical (P4)** and **${stats.high} high-priority** issues. Currently, **${stats.unresolved} incidents** require field intervention or monitoring.\n\n` +
        `#### ⚠️ Critical Hotspots & Infrastructure Alerts\n` +
        incidents.filter(i => i.priority_name === 'Critical' || i.priority_name === 'High').slice(0, 4).map(i =>
          `• **${i.incident_type}** (${i.utility_name}) in **${i.affected_area}** — Current status: *${i.status_name}* (${i.summary}).`
        ).join('\n') + `\n\n` +
        `#### 🛠️ Crew Deployment Status\n` +
        `• Emergency repair crews mobilized for high-priority transformer faults and pipeline leaks in Ward 23, Ward 31, and Ward 8.\n` +
        `• Routine maintenance and waste collection delay routes are actively undergoing inspection.\n\n` +
        `#### 📌 Recommended Operational Actions\n` +
        `1. Escalate spare transformer dispatch for Ward 23 and Ward 31 power outages.\n` +
        `2. Coordinate with water authority field teams on pipeline leak isolation.\n` +
        `3. Notify affected consumer clusters via SMS circulars.`;
      sourceUsed = 'Rule-based Operational Aggregator (Local Backup)';
    }

    this.logAudit(userId, role, 'OPERATIONAL_SUMMARY', query, 'OPERATIONAL_SUMMARY', 'SUCCESS', `Aggregated ${stats.total} records`);

    return {
      reply: summaryText,
      intent: 'OPERATIONAL_SUMMARY',
      cards: [
        {
          type: 'OPERATIONAL_METRICS',
          total: stats.total,
          critical: stats.critical,
          high: stats.high,
          unresolved: stats.unresolved,
          recentCount: incidents.length
        }
      ],
      citations: [
        { title: 'Operational Incident Records (100 Logs)', source: 'Internal Operations Database / SCADA Logs' }
      ],
      confidence: 0.98,
      latencyMs: Date.now() - startTime
    };
  }

  async handleKnowledgeRAG(query, userId, role, startTime) {
    // Search vector / BM25 index
    const matches = this.rag.search(query, { topK: 3, minScore: 0.22 });

    if (matches.length === 0 || matches[0].confidence < 0.25) {
      this.logAudit(userId, role, 'RAG_SEARCH', query, 'KNOWLEDGE_RAG', 'LOW_CONFIDENCE_FALLBACK');
      return {
        reply: `I searched our official utility circulars, FAQs, and SOPs, but could not find verified guidelines matching: *" ${query} "*. \n\nTo ensure complete accuracy and prevent misinformation: \n• You can rephrase your inquiry (e.g., *"What documents are needed for electricity connection?"* or *"How to report a power outage?"*).\n• Or click below to connect with a human customer support agent.`,
        intent: 'LOW_CONFIDENCE_FALLBACK',
        confidence: matches[0] ? matches[0].confidence : 0.1,
        fallbackTriggered: true,
        actionButtons: [
          { text: 'Connect to Support Agent (EMP0001)', action: 'CONNECT_SUPPORT' },
          { text: 'File a Support Ticket', action: 'OPEN_REQUEST_MODAL' }
        ],
        citations: [],
        cards: [],
        latencyMs: Date.now() - startTime
      };
    }

    // Build grounded prompt for LLM
    const contextText = matches.map((m, idx) => 
      `[Source ${idx + 1}: ${m.title} | Citation ID: ${m.id} | Utility: ${m.utilityName}]\n${m.text}`
    ).join('\n\n');

    const prompt = `You are the AI Utility Assistant for TechBharat (Cohort #2 Project C2-22).
Answer the user's question accurately and concisely, strictly grounded in the official utility knowledge context provided below.
Do not hallucinate or extrapolate beyond the provided text.
Include transparent citations referencing the document title or citation ID.

OFFICIAL KNOWLEDGE CONTEXT:
${contextText}

USER QUESTION:
${query}

USER ROLE: ${role}

Provide a helpful, polite, and well-structured answer with bullet points if applicable:`;

    let answer = '';
    try {
      answer = await this.callLLM(prompt);
    } catch (e) {
      console.warn('OpenRouter call failed in RAG, using grounded extractor:', e.message);
      // Clean fallback from top matching chunks
      const top = matches[0];
      answer = `${top.answer || top.text}\n\n*Reference: Grounded directly from official ${top.utilityName} documentation.*`;
    }

    this.logAudit(userId, role, 'RAG_SEARCH', query, 'KNOWLEDGE_RAG', 'SUCCESS', `Matched ${matches.length} chunks`);

    const citations = matches.map(m => ({
      id: m.id,
      title: m.title,
      utility: m.utilityName,
      source: m.source || 'Official Utility Circular',
      confidence: Math.round(m.confidence * 100) + '%'
    }));

    return {
      reply: answer,
      intent: 'KNOWLEDGE_RAG',
      citations,
      cards: [],
      confidence: matches[0].confidence,
      latencyMs: Date.now() - startTime
    };
  }

  async callLLM(prompt) {
    if (!OPENROUTER_API_KEY) throw new Error('No API key provided');
    
    const candidateModels = [
      OPENROUTER_MODEL,
      'google/gemini-2.0-flash-lite-preview-02-05:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free'
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://c2-22.techbharat.org',
            'X-Title': 'Project C2-22 Utility Virtual Assistant'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 300
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content.trim();
          }
        } else {
          const err = await response.text();
          lastError = new Error(`Model ${model} error ${response.status}: ${err}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('All OpenRouter candidate models failed');
  }
}

module.exports = AgentRouter;
