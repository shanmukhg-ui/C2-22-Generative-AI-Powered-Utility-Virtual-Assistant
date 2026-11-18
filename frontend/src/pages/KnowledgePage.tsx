import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { knowledgeApi } from '../services/api';
import { KnowledgeDocument, Citation } from '../types';
import {
  BookOpen, Search, UploadCloud, Trash2, CheckCircle2,
  Lock, Globe, Sparkles, RefreshCw, FileText, ChevronRight, X, AlertCircle
} from 'lucide-react';

interface KnowledgePageProps {
  onOpenUploadDoc: () => void;
}

export const KnowledgePage: React.FC<KnowledgePageProps> = ({ onOpenUploadDoc }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Search testbench
  const [testQuery, setTestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Citation[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load knowledge documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || searching) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await knowledgeApi.search(testQuery, 4);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (user?.role !== 'Administrator') {
      alert('Action unauthorized: Only Administrators can delete knowledge documents.');
      return;
    }
    if (confirm(`Are you sure you want to delete document ${id} from the knowledge base?`)) {
      try {
        await knowledgeApi.delete(id);
        fetchDocuments();
      } catch (err: any) {
        alert(`Failed to delete document: ${err.message || 'Error'}`);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>ChromaDB Vector Store & PDF Ingestion Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Knowledge Base & RAG Repository
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Standard Operating Procedures (SOPs), citizen circulars, and internal technical documents indexed with embeddings.
          </p>
        </div>
        {user?.role === 'Administrator' && (
          <button
            onClick={onOpenUploadDoc}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start md:self-auto"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingest Document (PDF)</span>
          </button>
        )}
      </div>

      {/* RAG Search Testbench */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-6 shadow-md border border-indigo-900/60">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Interactive Vector Semantic Search Testbench</span>
          </div>
          <h2 className="text-lg font-bold">Query the Document Chunks with Similarity Scoring</h2>
          <p className="text-slate-300 text-xs mt-1">
            Test the RAG retriever directly to preview the chunk snippets and page citations provided to the LLM.
          </p>
        </div>

        <form onSubmit={handleTestSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="e.g. What documents are required for electricity connection? or low water pressure"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
          >
            {searching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Search Chunks</span>
            )}
          </button>
        </form>

        {hasSearched && (
          <div className="mt-5 space-y-3">
            <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Retrieved Context Chunks ({searchResults.length})
            </h4>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No matching document chunks found above similarity threshold.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((r, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-blue-300">{r.document_id} — Page {r.page_number}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 font-mono text-[10px]">
                        Score: {Math.round((r.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-200 text-xs">{r.document_name}</div>
                    <p className="text-slate-300 text-[11px] font-sans leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50 line-clamp-3">
                      "{r.text_snippet}"
                    </p>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Scope: <span className={r.scope === 'public' ? 'text-emerald-400' : 'text-rose-400'}>{r.scope}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingested Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Indexed Knowledge Documents ({documents.length})</h3>
            <p className="text-xs text-slate-500">Official verified documents in the vector index</p>
          </div>
          <button
            onClick={fetchDocuments}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Utility Domain</th>
                <th className="py-3 px-4">Access Scope</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Version</th>
                {user?.role === 'Administrator' && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Fetching knowledge documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No documents found in knowledge base.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.document_id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      {doc.document_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {doc.utility}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.scope === 'public'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {doc.scope === 'public' ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                        {doc.scope}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {doc.chunk_count} chunks
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      v{doc.version}
                    </td>
                    {user?.role === 'Administrator' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteDoc(doc.document_id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
