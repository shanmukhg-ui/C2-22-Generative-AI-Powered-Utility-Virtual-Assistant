const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (line.trim() === '' && !insideQuotes) continue;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (!insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += '\n';
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] !== undefined ? row[c].replace(/^"|"$/g, '') : null;
    }
    records.push(obj);
  }
  return records;
}

function seedDatabase() {
  const dbPath = path.join(__dirname, '..', 'utility_assistant.db');
  const db = new DatabaseSync(dbPath);

  console.log('Seeding database from data CSVs...');

  const files = [
    { table: 'utilities', file: 'utilities.csv', cols: ['utility_id', 'utility_name'] },
    { table: 'statuses', file: 'statuses.csv', cols: ['status_id', 'status_name'] },
    { table: 'priorities', file: 'priorities.csv', cols: ['priority_id', 'priority_name'] },
    { table: 'request_types', file: 'request_types.csv', cols: ['request_type_id', 'request_type_name'] },
    { table: 'staff', file: 'staff.csv', cols: ['staff_id', 'email', 'staff_name', 'department'] },
    { table: 'customers', file: 'customers.csv', cols: ['customer_id', 'email', 'display_name', 'city', 'locality', 'account_status'] },
    { table: 'knowledge_documents', file: 'knowledge_documents.csv', cols: ['document_id', 'utility_id', 'document_title', 'document_text', 'source_type'] },
    { table: 'knowledge_faqs', file: 'knowledge_faqs.csv', cols: ['faq_id', 'document_id', 'utility_id', 'question', 'answer', 'source_note'] },
    { table: 'service_requests', file: 'service_requests.csv', cols: ['request_id', 'customer_id', 'utility_id', 'request_type_id', 'status_id', 'priority_id', 'assigned_staff_id', 'created_at', 'service_location', 'description'] },
    { table: 'complaints', file: 'complaints.csv', cols: ['complaint_id', 'request_id', 'customer_id', 'category', 'status_id', 'priority_id', 'created_date', 'latest_update'] },
    { table: 'operational_incidents', file: 'operational_incidents.csv', cols: ['incident_id', 'utility_id', 'reported_by_staff_id', 'reported_at', 'incident_type', 'affected_area', 'priority_id', 'status_id', 'summary'] }
  ];

  for (const item of files) {
    const csvPath = path.join(__dirname, '..', 'data', item.file);
    if (!fs.existsSync(csvPath)) {
      console.warn(`File not found: ${csvPath}`);
      continue;
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(content);

    const placeholders = item.cols.map(() => '?').join(', ');
    const insertSql = `INSERT OR REPLACE INTO ${item.table} (${item.cols.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(insertSql);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const rec of records) {
        const values = item.cols.map(col => rec[col] !== undefined ? rec[col] : null);
        stmt.run(...values);
      }
      db.exec('COMMIT;');
      console.log(`Seeded ${records.length} records into ${item.table}`);
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error(`Error seeding ${item.table}:`, err);
    }
  }

  // Create audit_logs table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id VARCHAR(50),
      user_role VARCHAR(30),
      action_type VARCHAR(50),
      query_or_target TEXT,
      intent_routed VARCHAR(50),
      status VARCHAR(30),
      details TEXT
    );
  `);

  console.log('Database seeding complete!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, parseCSV };

