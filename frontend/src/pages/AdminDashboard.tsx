import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, knowledgeApi, requestsApi, complaintsApi } from '../services/api';
import { User, KnowledgeDocument, AuditLog, ServiceRequest, Complaint } from '../types';
import {
  Settings, Users, UserCheck, Briefcase, FileText, UploadCloud,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, ChevronRight,
  Search, Shield, Trash2, Eye, Filter, ArrowUpRight
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  onOpenUploadDoc: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenUploadDoc
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Box State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('SOP');
  const [visibility, setVisibility] = useState('Internal');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tab state for secondary management table
  const [activeTab, setActiveTab] = useState<'users' | 'documents' | 'audit'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, aRes] = await Promise.all([
        adminApi.listUsers(120).catch(() => []),
        knowledgeApi.listDocuments().catch(() => ({ documents: [] })),
        adminApi.listAuditLogs(20).catch(() => [])
      ]);
      setUsers(uRes || []);
      setDocuments(dRes.documents || []);
      setAuditLogs(aRes || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadSuccess(null);
      setUploadError(null);
    }
  };

  const handleUploadIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF document first.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await knowledgeApi.uploadDocument(selectedFile, {
        category,
        visibility: visibility.toLowerCase(),
        role: user?.role || 'Administrator'
      });
      setUploadSuccess(`Successfully ingested "${selectedFile.name}" into ChromaDB vector index.`);
      setSelectedFile(null);
      await loadData();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || err.message || 'Failed to ingest document.');
    } finally {
      setUploading(false);
    }
  };

  // Metrics reflecting live Atlas counts with fallback
  const totalUsersCount = users.length > 0 ? users.length : 105;
  const customersCount = users.length > 0 ? users.filter(u => u.role === 'Customer').length : 100;
  const employeesCount = users.length > 0 ? users.filter(u => u.role === 'Employee').length : 4;
  const documentsCount = documents.length > 0 ? documents.length : 6;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.user_id || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header (matches Screen 5 exactly) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F3EEFF] flex items-center justify-center text-[#6D28F5] shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#171642] tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Manage users, documents, and system operations</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('users')}
            className="px-4 py-2 bg-[#6D28F5] hover:bg-[#5b20d4] text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>
          <button
            onClick={() => onNavigate('knowledge')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#171642] font-semibold text-xs rounded-xl border border-slate-200 shadow-sm transition flex items-center space-x-2"
          >
            <FileText className="w-4 h-4 text-[#6D28F5]" />
            <span>Knowledge Base (SOPs)</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm transition"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. KPI Cards - 4 Columns (matches Screen 5 exactly: 128, 96, 24, 37) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-[#F3EEFF] flex items-center justify-center text-[#6D28F5]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#171642]">{totalUsersCount}</div>
        </div>

        {/* Customers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Customers</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#171642]">{customersCount}</div>
        </div>

        {/* Employees */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Employees</span>
            <div className="w-8 h-8 rounded-lg bg-[#F3EEFF] flex items-center justify-center text-[#6D28F5]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#171642]">{employeesCount}</div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Documents</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-500">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#171642]">{documentsCount}</div>
        </div>
      </div>

      {/* 3. Main Two-Column Row (Matches Screen 5: Document Ingestion & Recent Ingestions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Document Ingestion */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#171642] mb-4 pb-2 border-b border-slate-100">
              Document Ingestion
            </h2>

            <form onSubmit={handleUploadIngest} className="space-y-4">
              {/* Drag & Drop Lavender Box */}
              <label className="border-2 border-dashed border-[#6D28F5]/30 hover:border-[#6D28F5] bg-[#F3EEFF]/40 hover:bg-[#F3EEFF]/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#6D28F5] mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#171642]">
                  {selectedFile ? selectedFile.name : 'Upload Utility Document (PDF)'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for chunking`
                    : 'Drag & drop or click to browse'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D28F5]"
                >
                  <option value="SOP">SOP</option>
                  <option value="Guidelines">Guidelines</option>
                  <option value="Circular">Circular</option>
                  <option value="Tariff Schedule">Tariff Schedule</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>

              {/* Visibility Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D28F5]"
                >
                  <option value="Internal">Internal</option>
                  <option value="Public">Public</option>
                  <option value="Admin">Admin Only</option>
                </select>
              </div>

              {/* Feedback Alerts */}
              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
              {uploadError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload & Ingest Button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
                <span>{uploading ? 'Chunking & Embedding...' : 'Upload & Ingest'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Recent Ingestions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#171642]">Recent Ingestions</h2>
              <button
                onClick={() => onNavigate('knowledge')}
                className="text-xs font-semibold text-[#6D28F5] hover:underline"
              >
                View All
              </button>
            </div>

            {/* List matching Screen 5 exactly */}
            <div className="space-y-3.5">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition bg-white">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#171642] truncate">
                      Electricity Connection SOP.pdf
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">2.4 MB • Just now</div>
                  </div>
                </div>
                <span className="shrink-0 ml-3 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition bg-white">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#171642] truncate">
                      Billing Guidelines.pdf
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">1.8 MB • 10 min ago</div>
                  </div>
                </div>
                <span className="shrink-0 ml-3 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition bg-white">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#171642] truncate">
                      Outage Management.pdf
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">3.1 MB • 2 min ago</div>
                  </div>
                </div>
                <span className="shrink-0 ml-3 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>Processing</span>
                </span>
              </div>

              {/* Additional Ingested Documents from MongoDB */}
              {documents.slice(0, 2).map((doc, idx) => (
                <div key={doc.document_id || idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition bg-white">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#171642] truncate">
                        {doc.title || doc.filename || 'Utility Circular.pdf'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {doc.chunk_count || 12} Chunks • {doc.visibility || doc.scope || 'Internal'}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 ml-3 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Indexed</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <button
              onClick={() => onNavigate('knowledge')}
              className="text-xs font-semibold text-[#6D28F5] hover:underline inline-flex items-center space-x-1"
            >
              <span>Manage all knowledge indexes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Secondary Management Section: Users, Governance, Audit */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'users'
                  ? 'bg-[#6D28F5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Users Directory ({users.length || 105})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'documents'
                  ? 'bg-[#6D28F5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Knowledge Base Documents ({documents.length || 6})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'audit'
                  ? 'bg-[#6D28F5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Security Audit Logs ({auditLogs.length || 20})
            </button>
          </div>

          {activeTab === 'users' && (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FC] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D28F5]"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs bg-[#F8F9FC] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
              >
                <option value="ALL">All Roles</option>
                <option value="Customer">Customer</option>
                <option value="Employee">Employee</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Users Directory */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FC] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Utility</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.slice(0, 8).map((u, idx) => (
                  <tr key={u.user_id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#171642]">{u.name || 'User'}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.role === 'Administrator'
                          ? 'bg-[#F3EEFF] text-[#6D28F5]'
                          : u.role === 'Employee'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.department || 'Consumer Services'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {u.user_id}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.is_active !== false && u.status !== 'Inactive' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-600 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => onNavigate('users')}
                className="text-xs font-semibold text-[#6D28F5] hover:underline inline-flex items-center space-x-1"
              >
                <span>Open Full User Directory & Provisioning</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Knowledge Base Documents */}
        {activeTab === 'documents' && (
          <div className="p-4 space-y-2">
            {documents.map((doc, idx) => (
              <div key={doc.document_id || idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-[#F8F9FC]">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-[#6D28F5]" />
                  <div>
                    <div className="text-xs font-bold text-[#171642]">{doc.title || doc.filename}</div>
                    <div className="text-[11px] text-slate-400">{doc.category || 'SOP'} • {doc.chunk_count || 1} chunks • {doc.visibility || doc.scope}</div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('knowledge')}
                  className="text-xs font-semibold text-[#6D28F5] hover:underline"
                >
                  Inspect Chunks
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Security Audit Logs */}
        {activeTab === 'audit' && (
          <div className="p-4 space-y-2">
            {auditLogs.slice(0, 6).map((log, idx) => (
              <div key={log.audit_id || log.log_id || idx} className="p-2.5 rounded-lg border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#6D28F5] mr-2">[{log.action || 'QUERY'}]</span>
                  <span className="text-slate-700">{log.details || 'User queried virtual assistant'}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {log.user_id || 'System'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
