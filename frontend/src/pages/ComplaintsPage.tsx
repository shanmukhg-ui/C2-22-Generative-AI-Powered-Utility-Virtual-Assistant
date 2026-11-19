import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { complaintsApi } from '../services/api';
import { Complaint } from '../types';
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, RefreshCw, Eye, X
} from 'lucide-react';

interface ComplaintsPageProps {
  onOpenNewComplaint: () => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ onOpenNewComplaint }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 12
      };
      if (user?.role === 'Customer') {
        params.customer_id = user.user_id;
      }
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const data = await complaintsApi.listComplaints(params);
      setComplaints(data.complaints || data.records || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, categoryFilter, statusFilter, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('resolve') || s.includes('close')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />{status}</span>;
    }
    if (s.includes('progress') || s.includes('investigat')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3 mr-1" />{status}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">{status}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Citizen Grievances & Complaints (CMP)</h1>
          <p className="text-slate-500 text-xs mt-1">
            {user?.role === 'Customer'
              ? `Personal grievances filed under citizen ID ${user.user_id}.`
              : `Centralized registry of 250 customer complaints across metropolitan utilities.`}
          </p>
        </div>
        <button
          onClick={onOpenNewComplaint}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Lodge Grievance</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Complaint ID (e.g. CMP000001), keywords, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="Billing Dispute">Billing Dispute</option>
            <option value="Service Outage">Service Outage</option>
            <option value="Low Pressure">Low Pressure</option>
            <option value="Frequent Disconnection">Frequent Disconnection</option>
            <option value="Meter Tampering">Meter Issue</option>
            <option value="Voltage Fluctuation">Voltage Fluctuation</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <button
            onClick={fetchComplaints}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Logged Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading grievance logs...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No complaints found matching the criteria.
                  </td>
                </tr>
              ) : (
                complaints.map((comp) => (
                  <tr key={comp.complaint_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {comp.complaint_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{comp.category}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                          {comp.department || (comp.utility ? `${comp.utility} Dept` : 'Electricity Dept')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{comp.description}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {comp.customer_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        comp.priority.toLowerCase() === 'high' || comp.priority.toLowerCase() === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : comp.priority.toLowerCase() === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {comp.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(comp.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(comp.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedComplaint(comp)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{complaints.length}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> total grievances
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Slide-Over */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grievance Ticket</span>
                <h2 className="text-xl font-extrabold text-rose-600 font-mono mt-0.5">{selectedComplaint.complaint_id}</h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px]">Category</label>
                <p className="text-slate-800 font-bold text-sm mt-0.5">{selectedComplaint.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority</span>
                  <span className="font-bold text-slate-700 capitalize mt-1 block">{selectedComplaint.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Citizen ID</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">{selectedComplaint.customer_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Linked Request</span>
                  <span className="font-mono text-slate-700 mt-1 block">{selectedComplaint.request_id || 'None'}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px]">Grievance Narrative</label>
                <p className="text-slate-700 mt-0.5 p-3.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed font-normal">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="pt-2 border-t text-[11px] text-slate-400 space-y-1">
                <div>Logged: {new Date(selectedComplaint.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(selectedComplaint.updated_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
