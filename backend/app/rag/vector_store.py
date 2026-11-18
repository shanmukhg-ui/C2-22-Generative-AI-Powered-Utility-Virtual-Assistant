import math
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.config import settings
from app.rag.ingestion import PDFIngestionPipeline
from app.database.mongo import get_database

class KnowledgeVectorStore:
    _instance = None

    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.doc_freq: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.avg_len: float = 0.0
        self.initialize_store()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = KnowledgeVectorStore()
        return cls._instance

    def tokenize(self, text: str) -> List[str]:
        if not text:
            return []
        tokens = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text.lower())
        return tokens

    def initialize_store(self):
        self.chunks = []
        db = get_database()

        # 1. Ingest Public PDFs
        if settings.KB_PUBLIC_DIR.exists():
            for pdf_file in settings.KB_PUBLIC_DIR.glob("*.pdf"):
                doc_id = pdf_file.stem.split("_")[0]
                title = pdf_file.stem.replace("_", " ")
                util = "Electricity" if "Electricity" in title else ("Water" if "Water" in title else "Utility")
                chunks = PDFIngestionPipeline.process_pdf(str(pdf_file), doc_id, title, scope="public", utility=util)
                self.chunks.extend(chunks)

        # 2. Ingest Internal PDFs
        if settings.KB_INTERNAL_DIR.exists():
            for pdf_file in settings.KB_INTERNAL_DIR.glob("*.pdf"):
                parts = pdf_file.stem.split("_")
                doc_id = "_".join(parts[:3]) if len(parts) >= 3 else parts[0]
                title = pdf_file.stem.replace("_", " ")
                util = "Electricity" if "Substation" in title else "Water"
                chunks = PDFIngestionPipeline.process_pdf(str(pdf_file), doc_id, title, scope="internal", utility=util)
                self.chunks.extend(chunks)

        # 3. Load dynamically uploaded documents from MongoDB
        custom_docs = list(db.knowledge_documents.find({}))
        for d in custom_docs:
            chunks = PDFIngestionPipeline.chunk_text(d.get("content", ""))
            for idx, c in enumerate(chunks):
                self.chunks.append({
                    "chunk_id": f"{d.get('document_id')}_c{idx+1}",
                    "document_id": d.get("document_id"),
                    "document_name": d.get("title"),
                    "page_number": 1,
                    "scope": d.get("scope", "public"),
                    "utility": d.get("utility", "Electricity"),
                    "version": d.get("version", "2026.1"),
                    "text": c
                })

        self._build_bm25_index()
        print(f"Knowledge Vector Store initialized with {len(self.chunks)} chunks across public and internal documents.")

    def _build_bm25_index(self):
        N = len(self.chunks)
        if N == 0:
            return

        total_tokens = 0
        self.doc_freq = {}

        for chunk in self.chunks:
            tokens = self.tokenize(chunk["text"] + " " + chunk["document_name"])
            chunk["_tokens"] = tokens
            total_tokens += len(tokens)
            unique_terms = set(tokens)
            for t in unique_terms:
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1

        self.avg_len = total_tokens / N
        self.idf = {}
        for term, freq in self.doc_freq.items():
            self.idf[term] = math.log(1 + (N - freq + 0.5) / (freq + 0.5))

    def search(self, query: str, role: str = "Customer", top_k: int = 4) -> List[Dict[str, Any]]:
        query_tokens = self.tokenize(query)
        if not query_tokens or not self.chunks:
            return []

        k1 = 1.5
        b = 0.75
        scores = []

        for chunk in self.chunks:
            # RBAC Role Filter: Customers cannot see internal scope documents
            if role == "Customer" and chunk["scope"] == "internal":
                continue

            doc_tokens = chunk.get("_tokens", [])
            doc_len = len(doc_tokens)
            term_counts = {}
            for t in doc_tokens:
                term_counts[t] = term_counts.get(t, 0) + 1

            score = 0.0
            for qt in query_tokens:
                tf = term_counts.get(qt, 0)
                if tf > 0:
                    idf_val = self.idf.get(qt, 0.5)
                    numerator = tf * (k1 + 1)
                    denominator = tf + k1 * (1 - b + b * (doc_len / (self.avg_len or 1.0)))
                    score += idf_val * (numerator / denominator)

            # Boost if query matches title words
            lower_title = chunk["document_name"].lower()
            if any(qt in lower_title for qt in query_tokens):
                score += 1.5

            if score > 0:
                scores.append({"chunk": chunk, "score": score})

        if not scores:
            return []

        max_score = max(s["score"] for s in scores)
        results = []
        for s in scores:
            norm_conf = min(1.0, (s["score"] / max_score) * 0.95 + 0.05)
            c = s["chunk"]
            results.append({
                "document_id": c["document_id"],
                "document_name": c["document_name"],
                "page_number": c["page_number"],
                "scope": c["scope"],
                "utility": c["utility"],
                "text_snippet": c["text"],
                "confidence": round(norm_conf, 2),
                "raw_score": s["score"]
            })

        results.sort(key=lambda x: x["raw_score"], reverse=True)
        return results[:top_k]

    def add_document(self, doc_data: Dict[str, Any]):
        db = get_database()
        db.knowledge_documents.insert_one(doc_data)
        self.initialize_store()

    def delete_document(self, doc_id: str):
        db = get_database()
        db.knowledge_documents.delete_many({"document_id": doc_id})
        self.initialize_store()
