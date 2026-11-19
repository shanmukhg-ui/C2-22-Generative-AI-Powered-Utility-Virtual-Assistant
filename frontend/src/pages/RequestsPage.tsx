import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestsApi } from '../services/api';
import { ServiceRequest } from '../types';
import { TechnicianTrackerModal } from '../components/TechnicianTrackerModal';
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, AlertCircle, RefreshCw, Eye, X, ShieldAlert,
  Zap, Droplets, Flame, PhoneCall, Trash2, Truck
} from 'lucide-react';

interface RequestsPageProps {
  onOpenNewRequest: () => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({ onOpenNewRequest }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 12
      };
      if (user?.role === 'Customer') {
        params.customer_id = user.user_id;
      }
      if (utilityFilter) params.utility = utilityFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const data = await requestsApi.listRequests(params);
      setRequests(data.requests || data.records || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, utilityFilter, statusFilter, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const getUtilityIcon = (utility: string) => {
    switch ((utility || '').toLowerCase()) {
      case 'electricity': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'water': return <Droplets className="w-4 h-4 text-cyan-500" />;
      case 'gas': return <Flame className="w-4 h-4 text-rose-500" />;
      case 'telecom': return <PhoneCall className="w-4 h-4 text-indigo-500" />;
      case 'waste': case 'solid waste': return <Trash2 className="w-4 h-4 text-emerald-500" />;
      default: return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('resolve')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />{status}</span>;
    }
    if (s.includes('progress') || s.includes('assign')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3 mr-1" />{status}</span>;
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">{status}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">{status}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Service Requests (SR)</h1>
          <p className="text-slate-500 text-xs mt-1">
            {user?.role === 'Customer'
              ? `Authorized view for ${user.user_id}: Viewing personal applications.`
              : `Enterprise registry of 500 multi-utility service applications across city wards.`}
          </p>
        </div>
        <button
          onClick={onOpenNewRequest}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for New Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Request ID (e.g. SR000110), keyword, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={utilityFilter}
            onChange={(e) => { setUtilityFilter(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Utilities</option>
            <option value="Electricity">Electricity</option>
            <option value="Water">Water</option>
            <option value="Gas">Gas</option>
            <option value="Telecom">Telecom</option>
            <option value="Solid Waste">Solid Waste</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={fetchRequests}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Utility & Type</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching live service requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No service requests match the given filters.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {req.request_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getUtilityIcon(req.utility)}
                        <span className="font-semibold text-slate-800">{req.request_type}</span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold">{req.department || (req.utility + ' Department')}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {req.customer_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.priority.toLowerCase() === 'high' || req.priority.toLowerCase() === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : req.priority.toLowerCase() === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setTrackingRequestId(req.request_id)}
                          className="px-2 py-1 text-xs font-bold text-[#6D28F5] bg-[#F3EEFF] hover:bg-[#EAE2FF] rounded-lg transition inline-flex items-center space-x-1"
                          title="Live Technician GPS Tracking"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track GPS</span>
                        </button>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>
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
            Showing <span className="font-bold text-slate-800">{requests.length}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> total applications
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

      {/* Details Slide-Over Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Request Details</span>
                <h2 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{selectedRequest.request_id}</h2>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px]">Application Type</label>
                <p className="text-slate-800 font-bold text-sm mt-0.5">{selectedRequest.request_type}</p>
                <span className="text-blue-600 font-medium">{selectedRequest.utility} Department</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority</span>
                  <span className="font-bold text-slate-700 capitalize mt-1 block">{selectedRequest.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer ID</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">{selectedRequest.customer_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Staff</span>
                  <span className="font-mono text-slate-700 mt-1 block">{selectedRequest.assigned_staff_id || 'Auto-Dispatch'}</span>
                </div>
              </div>

              {selectedRequest.service_location && (
                <div>
                  <label className="text-slate-400 font-semibold uppercase text-[10px]">Service Location</label>
                  <p className="text-slate-700 font-medium mt-0.5">{selectedRequest.service_location}</p>
                </div>
              )}

              {selectedRequest.description && (
                <div>
                  <label className="text-slate-400 font-semibold uppercase text-[10px]">Description</label>
                  <p className="text-slate-600 mt-0.5 p-3 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t text-[11px] text-slate-400 space-y-1">
                <div>Created: {new Date(selectedRequest.created_at).toLocaleString()}</div>
                <div>Last Updated: {new Date(selectedRequest.updated_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-4 border-t flex space-x-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Technician GPS Tracker Modal */}
      {trackingRequestId && (
        <TechnicianTrackerModal
          isOpen={!!trackingRequestId}
          onClose={() => setTrackingRequestId(null)}
          requestId={trackingRequestId}
        />
      )}
    </div>
  );
};
