import os
import re
from typing import List, Dict, Any
from pathlib import Path
import fitz # PyMuPDF

class PDFIngestionPipeline:
    @staticmethod
    def extract_text_with_pages(pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text from each page of a PDF document using PyMuPDF.
        """
        doc = fitz.open(pdf_path)
        pages_content = []
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text("text")
            cleaned_text = PDFIngestionPipeline.clean_text(text)
            if cleaned_text:
                pages_content.append({
                    "page_number": page_idx + 1,
                    "text": cleaned_text
                })
        doc.close()
        return pages_content

    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        # Remove repeated whitespace and null bytes
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
        words = text.split()
        if len(words) <= chunk_size:
            return [text]

        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

    @classmethod
    def process_pdf(cls, file_path: str, doc_id: str, title: str, scope: str = "public", utility: str = "Electricity", version: str = "2026.1") -> List[Dict[str, Any]]:
        pages = cls.extract_text_with_pages(file_path)
        all_chunks = []

        for p in pages:
            chunks = cls.chunk_text(p["text"])
            for idx, c in enumerate(chunks):
                all_chunks.append({
                    "chunk_id": f"{doc_id}_p{p['page_number']}_c{idx+1}",
                    "document_id": doc_id,
                    "document_name": title,
                    "page_number": p["page_number"],
                    "scope": scope,
                    "utility": utility,
                    "version": version,
                    "text": c
                })
        return all_chunks
