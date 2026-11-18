const { DatabaseSync } = require('node:sqlite');
const path = require('path');

class RAGEngine {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, 'utility_assistant.db');
    this.chunks = [];
    this.idf = {};
    this.avgDocLength = 0;
    this.init();
  }

  init() {
    const db = new DatabaseSync(this.dbPath);
    
    // Load documents
    const docs = db.prepare('SELECT * FROM knowledge_documents').all();
    const faqs = db.prepare('SELECT * FROM knowledge_faqs').all();
    const utilities = db.prepare('SELECT * FROM utilities').all();
    const utilityMap = {};
    utilities.forEach(u => utilityMap[u.utility_id] = u.utility_name);

    this.chunks = [];

    // Chunk documents
    docs.forEach(doc => {
      this.chunks.push({
        id: doc.document_id,
        type: 'DOCUMENT',
        utilityId: doc.utility_id,
        utilityName: utilityMap[doc.utility_id] || 'Utility',
        title: doc.document_title,
        text: doc.document_text,
        source: doc.source_type,
        tokens: this.tokenize(doc.document_title + ' ' + doc.document_text + ' ' + (utilityMap[doc.utility_id] || ''))
      });
    });

    // Chunk FAQs
    faqs.forEach(faq => {
      const doc = docs.find(d => d.document_id === faq.document_id);
      this.chunks.push({
        id: faq.faq_id,
        docId: faq.document_id,
        type: 'FAQ',
        utilityId: faq.utility_id,
        utilityName: utilityMap[faq.utility_id] || 'Utility',
        title: (doc ? doc.document_title : 'FAQ') + ' - ' + faq.question,
        question: faq.question,
        answer: faq.answer,
        text: faq.question + ' ' + faq.answer,
        source: faq.source_note,
        tokens: this.tokenize(faq.question + ' ' + faq.answer + ' ' + (utilityMap[faq.utility_id] || ''))
      });
    });

    this.buildIndex();
  }

  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  buildIndex() {
    const N = this.chunks.length;
    let totalLen = 0;
    const docFreq = {};

    this.chunks.forEach(chunk => {
      totalLen += chunk.tokens.length;
      const seen = new Set(chunk.tokens);
      seen.forEach(term => {
        docFreq[term] = (docFreq[term] || 0) + 1;
      });
    });

    this.avgDocLength = totalLen / (N || 1);
    this.idf = {};
    for (const term in docFreq) {
      this.idf[term] = Math.log(1 + (N - docFreq[term] + 0.5) / (docFreq[term] + 0.5));
    }
  }

  search(query, options = {}) {
    const { topK = 4, utilityFilter = null, minScore = 0.25 } = options;
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const k1 = 1.5;
    const b = 0.75;

    const scores = this.chunks.map(chunk => {
      if (utilityFilter && chunk.utilityId !== utilityFilter && chunk.utilityName.toLowerCase() !== utilityFilter.toLowerCase()) {
        return { chunk, score: 0 };
      }

      let score = 0;
      const docLen = chunk.tokens.length;
      const termFreqs = {};
      chunk.tokens.forEach(t => termFreqs[t] = (termFreqs[t] || 0) + 1);

      queryTokens.forEach(term => {
        const tf = termFreqs[term] || 0;
        if (tf > 0) {
          const idf = this.idf[term] || 0.5;
          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + b * (docLen / this.avgDocLength));
          score += idf * (numerator / denominator);
        }
      });

      // Bonus for title or question matching exact phrases
      const lowerQuery = query.toLowerCase();
      if (chunk.title.toLowerCase().includes(lowerQuery)) score += 2.0;
      if (chunk.question && chunk.question.toLowerCase().includes(lowerQuery)) score += 3.0;

      return { chunk, rawScore: score };
    });

    // Normalize scores
    const maxScore = Math.max(...scores.map(s => s.rawScore), 1);
    const results = scores
      .map(s => ({
        ...s.chunk,
        confidence: Math.min(1.0, (s.rawScore / maxScore) * 0.95 + (s.rawScore > 0 ? 0.05 : 0)),
        score: s.rawScore
      }))
      .filter(s => s.score > 0 && s.confidence >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  addCustomDocument(title, text, utilityId = 'UT001', sourceType = 'User Upload') {
    const db = new DatabaseSync(this.dbPath);
    const docId = 'DOC' + String(Date.now()).slice(-6);
    db.prepare('INSERT INTO knowledge_documents (document_id, utility_id, document_title, document_text, source_type) VALUES (?, ?, ?, ?, ?)')
      .run(docId, utilityId, title, text, sourceType);

    // Re-index
    this.init();
    return docId;
  }
}

module.exports = RAGEngine;

