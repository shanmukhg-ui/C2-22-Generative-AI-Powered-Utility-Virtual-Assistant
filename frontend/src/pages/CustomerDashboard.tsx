import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestsApi, complaintsApi } from '../services/api';
import { ServiceRequest, Complaint } from '../types';
import { TechnicianTrackerModal } from '../components/TechnicianTrackerModal';
import {
  ClipboardList, Clock, CheckCircle2, AlertCircle, Bot,
  ArrowRight, PlusCircle, AlertTriangle, RefreshCw, Zap,
  Droplets, Flame, PhoneCall, Trash2, ChevronRight, User,
  Truck, Navigation, MapPin
} from 'lucide-react';

interface CustomerDashboardProps {
  onNavigate: (page: string) => void;
  onOpenNewRequest: () => void;
  onOpenNewComplaint: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onNavigate,
  onOpenNewRequest,
  onOpenNewComplaint
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reqRes, compRes] = await Promise.all([
        requestsApi.listRequests({ customer_id: user.user_id, limit: 8 }),
        complaintsApi.listComplaints({ customer_id: user.user_id, limit: 8 })
      ]);
      setRequests(reqRes.requests || reqRes.records || []);
      setComplaints(compRes.complaints || compRes.records || []);
    } catch (err) {
      console.error('Error fetching customer data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Derived KPI Counts
  const totalReqCount = requests.length;
  const activeReqCount = requests.filter(r => r.status !== 'Completed' && r.status !== 'Resolved' && r.status !== 'Rejected').length;
  const resolvedReqCount = requests.filter(r => r.status === 'Completed' || r.status === 'Resolved').length;
  const openComplaintsCount = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;

  const displayRequests = requests.slice(0, 4);
  const displayComplaints = complaints.slice(0, 4);
  const activeTrackingRequest = requests.find(r => (r.technician_status && r.technician_status !== 'Completed') || r.status === 'In Progress');

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('resolve') || s.includes('complete')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Resolved
        </span>
      );
    }
    if (s.includes('progress') || s.includes('assign')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        Open
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header (Matching Reference Screen 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6D28F5] flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#171642] tracking-tight">Customer Dashboard</h1>
            <p className="text-xs text-[#64748B]">Manage your service requests, complaints, and get AI assistance</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenNewRequest}
            className="px-4 py-2 bg-[#6D28F5] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Request</span>
          </button>
          <button
            onClick={onOpenNewComplaint}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#171642] border border-[#E5E7EB] text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>File Complaint</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards (Matching Reference Screen 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Requests */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#171642]">{totalReqCount}</div>
        </div>

        {/* Card 2: Active Requests */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#171642]">{activeReqCount}</div>
        </div>

        {/* Card 3: Resolved Requests */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Resolved Requests</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#171642]">{resolvedReqCount}</div>
        </div>

        {/* Card 4: Open Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Open Complaints</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#171642]">{openComplaintsCount}</div>
        </div>
      </div>

      {/* Live Field Technician GPS Tracking Banner */}
      {activeTrackingRequest && (
        <div className="bg-gradient-to-r from-[#171642] via-[#201B50] to-[#2B1B6D] rounded-3xl p-6 text-white shadow-xl border border-purple-900/50 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(109,40,245,0.25),transparent_70%)] pointer-events-none"></div>
          <div className="flex items-center space-x-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#6D28F5] text-white flex items-center justify-center shadow-lg shadow-purple-600/50 ring-2 ring-purple-400/30 flex-shrink-0">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">Live Field Dispatch Active</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>GPS EN ROUTE</span>
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Technician {activeTrackingRequest.technician_name || 'Assigned Officer'} is en route to your premises
              </h3>
              <p className="text-xs text-purple-200 mt-0.5 font-mono">
                Ticket #{activeTrackingRequest.request_id} {activeTrackingRequest.technician_eta_mins ? `· ETA: ~${activeTrackingRequest.technician_eta_mins} mins` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedTrackingId(activeTrackingRequest.request_id)}
            className="w-full md:w-auto px-5 py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white text-xs font-black rounded-xl shadow-lg shadow-purple-600/40 transition flex items-center justify-center space-x-2 flex-shrink-0 active:scale-95 z-10"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>View Live GPS Telemetry Map</span>
          </button>
        </div>
      )}

      {/* Main Grid: Recent Service Requests & Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Service Requests */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-[#171642] text-sm">Recent Service Requests</h3>
            <button
              onClick={() => onNavigate('requests')}
              className="text-xs font-bold text-[#6D28F5] hover:text-[#5B21B6] transition"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {displayRequests.length > 0 ? (
              displayRequests.map((req, idx) => (
                <div key={req.request_id || idx} className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#171642]">{req.request_id}</span>
                      <span className="text-xs font-medium text-slate-700">{req.request_type}</span>
                    </div>
                    <span className="text-[11px] text-[#6D28F5] font-semibold block mt-0.5">
                      {req.department || (req.utility ? `${req.utility} Department` : 'Electricity Department')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {req.request_id && (
                      <button
                        onClick={() => setSelectedTrackingId(req.request_id)}
                        className="p-1.5 px-2.5 bg-[#F3EEFF] hover:bg-[#EAE2FF] text-[#6D28F5] rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                        title="Live Technician GPS Tracking"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track GPS</span>
                      </button>
                    )}
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No service requests yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Create a new service request to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Complaints */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-[#171642] text-sm">Recent Complaints</h3>
            <button
              onClick={() => onNavigate('complaints')}
              className="text-xs font-bold text-[#6D28F5] hover:text-[#5B21B6] transition"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {displayComplaints.length > 0 ? (
              displayComplaints.map((comp, idx) => (
                <div key={comp.complaint_id || idx} className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#171642]">{comp.complaint_id}</span>
                      <span className="text-xs font-medium text-slate-700">{comp.category}</span>
                    </div>
                    <span className="text-[11px] text-purple-700 font-semibold block mt-0.5">
                      {comp.department || (comp.utility ? `${comp.utility} Department` : 'Electricity Department')}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(comp.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No complaints logged</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Any utility issues reported will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Banner: Need Help? (Matching Reference Screen 3) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#171642]">Need help?</h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Ask our AI Assistant for procedures, status updates, or any utility information.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('chat')}
          className="px-6 py-2.5 bg-[#6D28F5] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center space-x-2 self-start md:self-auto transition transform active:scale-95"
        >
          <span>Chat Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live GPS Telemetry Modal */}
      {selectedTrackingId && (
        <TechnicianTrackerModal
          isOpen={!!selectedTrackingId}
          onClose={() => setSelectedTrackingId(null)}
          requestId={selectedTrackingId}
        />
      )}
    </div>
  );
};
