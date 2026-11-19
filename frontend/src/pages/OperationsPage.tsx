import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { operationsApi, requestsApi, complaintsApi } from '../services/api';
import { OperationalLog, ServiceRequest, Complaint } from '../types';
import {
  Activity, MapPin, AlertTriangle, ShieldAlert, Sparkles,
  RefreshCw, Search, Filter, Calendar, Zap, Droplets, Flame,
  PhoneCall, Trash2, CheckCircle2, Info, Truck, Navigation,
  Edit3, Check, Loader2, Clock, ShieldCheck, ClipboardCheck,
  Inbox, FileText, UserCheck, ArrowRight, Shield
} from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'intake' | 'fleet' | 'scada'>('intake');

  // Intake Queue State (Requests & Complaints Acceptance)
  const [intakeType, setIntakeType] = useState<'requests' | 'complaints'>('requests');
  const [intakeStatusFilter, setIntakeStatusFilter] = useState('all');
  const [intakeSearch, setIntakeSearch] = useState('');
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [loadingIntake, setLoadingIntake] = useState(false);

  // Modal State for Accepting/Updating Service Requests
  const [requestModalItem, setRequestModalItem] = useState<ServiceRequest | null>(null);
  const [reqActionStatus, setReqActionStatus] = useState('Assigned');
  const [reqTechnician, setReqTechnician] = useState('Rajesh Kumar (Lead Line Technician)');
  const [reqTechPhone, setReqTechPhone] = useState('+91 98480 22319');
  const [reqScheduledWindow, setReqScheduledWindow] = useState('Tomorrow, 10:00 AM - 1:00 PM');
  const [reqPriority, setReqPriority] = useState('Medium');
  const [reqOperationalNotes, setReqOperationalNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Modal State for Accepting/Resolving Complaints
  const [complaintModalItem, setComplaintModalItem] = useState<Complaint | null>(null);
  const [cmpActionStatus, setCmpActionStatus] = useState('Under Investigation');
  const [cmpOfficer, setCmpOfficer] = useState('Officer V. Raman (Consumer Grievance Cell)');
  const [cmpPriority, setCmpPriority] = useState('Medium');
  const [cmpRemediation, setCmpRemediation] = useState('');
  const [submittingCmp, setSubmittingCmp] = useState(false);

  // Feedback Banner
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // SCADA State
  const [incidents, setIncidents] = useState<OperationalLog[]>([]);
  const [loadingScada, setLoadingScada] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [selectedUtility, setSelectedUtility] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [searchScada, setSearchScada] = useState('');

  // Fleet & Telemetry Modal State
  const [editingFleetItem, setEditingFleetItem] = useState<ServiceRequest | null>(null);
  const [fleetTechName, setFleetTechName] = useState('');
  const [fleetTechPhone, setFleetTechPhone] = useState('');
  const [fleetTechStatus, setFleetTechStatus] = useState('En Route');
  const [fleetEta, setFleetEta] = useState(14);
  const [fleetDistance, setFleetDistance] = useState(1.8);
  const [fleetLat, setFleetLat] = useState(17.4602);
  const [fleetLng, setFleetLng] = useState(78.3925);
  const [fleetNotes, setFleetNotes] = useState('');
  const [capturingGps, setCapturingGps] = useState(false);
  const [savingFleet, setSavingFleet] = useState(false);

  // AI Summary State
  const [summaryDate, setSummaryDate] = useState('2025-02-14');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const fetchIntakeData = async () => {
    setLoadingIntake(true);
    try {
      const [reqRes, cmpRes] = await Promise.all([
        requestsApi.listRequests({ limit: 60 }),
        complaintsApi.listComplaints({ limit: 60 })
      ]);
      setAllRequests(reqRes.requests || reqRes.records || []);
      setAllComplaints(cmpRes.complaints || cmpRes.records || []);
    } catch (err) {
      console.error('Failed to load intake queues:', err);
    } finally {
      setLoadingIntake(false);
    }
  };

  const fetchScadaData = async () => {
    setLoadingScada(true);
    try {
      const data = await operationsApi.getLogs({ limit: 100 });
      setIncidents(data || []);
    } catch (err) {
      console.error('Failed to load operational incidents:', err);
    } finally {
      setLoadingScada(false);
    }
  };

  useEffect(() => {
    fetchIntakeData();
    fetchScadaData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ---------------- Handlers for Request Acceptance ----------------
  const handleOpenRequestAcceptModal = (req: ServiceRequest) => {
    setRequestModalItem(req);
    // If currently Submitted, default next action is "Assigned"
    setReqActionStatus(req.status === 'Submitted' ? 'Assigned' : req.status);
    setReqTechnician(req.technician_name || 'Rajesh Kumar (Lead Line Technician)');
    setReqTechPhone(req.technician_phone || '+91 98480 22319');
    setReqScheduledWindow('Tomorrow, 10:00 AM - 1:00 PM');
    setReqPriority(req.priority || 'Medium');
    setReqOperationalNotes('');
  };

  const handleSaveRequestAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalItem) return;
    setSubmittingReq(true);
    try {
      await requestsApi.updateRequest(requestModalItem.request_id, {
        status: reqActionStatus,
        priority: reqPriority,
        technician_name: reqTechnician,
        technician_phone: reqTechPhone,
        scheduled_window: reqScheduledWindow,
        operational_notes: reqOperationalNotes
      });
      showToast(`Service Request ${requestModalItem.request_id} updated to '${reqActionStatus}' and technician assigned.`);
      setRequestModalItem(null);
      await fetchIntakeData();
    } catch (err: any) {
      alert(`Failed to update service request: ${err.message || 'API error'}`);
    } finally {
      setSubmittingReq(false);
    }
  };

  // ---------------- Handlers for Complaint Acceptance ----------------
  const handleOpenComplaintAcceptModal = (cmp: Complaint) => {
    setComplaintModalItem(cmp);
    setCmpActionStatus(cmp.status === 'Submitted' ? 'Under Investigation' : cmp.status);
    setCmpOfficer('Officer V. Raman (Consumer Grievance Cell)');
    setCmpPriority(cmp.priority || 'Medium');
    setCmpRemediation('');
  };

  const handleSaveComplaintAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintModalItem) return;
    setSubmittingCmp(true);
    try {
      await complaintsApi.updateComplaint(complaintModalItem.complaint_id, {
        status: cmpActionStatus,
        priority: cmpPriority,
        assigned_officer: cmpOfficer,
        remediation_action: cmpRemediation,
        resolution_notes: cmpRemediation
      });
      showToast(`Complaint ${complaintModalItem.complaint_id} updated to '${cmpActionStatus}' on MongoDB Atlas.`);
      setComplaintModalItem(null);
      await fetchIntakeData();
    } catch (err: any) {
      alert(`Failed to update grievance: ${err.message || 'API error'}`);
    } finally {
      setSubmittingCmp(false);
    }
  };

  // ---------------- Handlers for Fleet Telemetry ----------------
  const handleOpenFleetModal = (req: ServiceRequest) => {
    setEditingFleetItem(req);
    setFleetTechName(req.technician_name || 'Rajesh Kumar (Senior Technician)');
    setFleetTechPhone(req.technician_phone || '+91 98480 22319');
    setFleetTechStatus(req.technician_status || 'En Route');
    setFleetEta(req.technician_eta_mins || 14);
    setFleetDistance(req.technician_distance_km || 1.8);
    setFleetLat(req.technician_lat || 17.4602);
    setFleetLng(req.technician_lng || 78.3925);
    setFleetNotes('');
  };

  const handleCaptureTechnicianGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by browser.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFleetLat(parseFloat(pos.coords.latitude.toFixed(4)));
        setFleetLng(parseFloat(pos.coords.longitude.toFixed(4)));
        setCapturingGps(false);
      },
      () => {
        setFleetLat(17.4615);
        setFleetLng(78.3941);
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveFleetDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFleetItem) return;
    setSavingFleet(true);
    try {
      await requestsApi.updateDispatch(editingFleetItem.request_id, {
        technician_name: fleetTechName,
        technician_phone: fleetTechPhone,
        technician_status: fleetTechStatus,
        technician_lat: fleetLat,
        technician_lng: fleetLng,
        technician_eta_mins: Number(fleetEta),
        technician_distance_km: Number(fleetDistance),
        notes: fleetNotes
      });
      showToast(`Technician GPS telemetry updated for ${editingFleetItem.request_id}.`);
      setEditingFleetItem(null);
      await fetchIntakeData();
    } catch (err: any) {
      alert(`Failed to update dispatch: ${err.message || 'API error'}`);
    } finally {
      setSavingFleet(false);
    }
  };

  // ---------------- Handlers for AI Briefing ----------------
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await operationsApi.summarize({
        date: summaryDate,
        role: user?.role || 'Employee'
      });
      setAiSummary(res.reply || res.summary);
    } catch (err: any) {
      setAiSummary(`Error generating operational summary: ${err.message || 'API error'}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Filtered requests in Intake
  const filteredRequests = allRequests.filter((r) => {
    const s = (r.status || '').toLowerCase();
    const matchesFilter =
      intakeStatusFilter === 'all'
        ? true
        : intakeStatusFilter === 'submitted'
        ? s === 'submitted' || s === 'pending' || s === 'open'
        : intakeStatusFilter === 'in_progress'
        ? s === 'in progress' || s === 'assigned'
        : s === 'completed' || s === 'resolved';

    const matchesSearch = intakeSearch
      ? r.request_id.toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (r.service_location || '').toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (r.customer_id || '').toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (r.request_type || '').toLowerCase().includes(intakeSearch.toLowerCase())
      : true;

    return matchesFilter && matchesSearch;
  });

  // Filtered complaints in Intake
  const filteredComplaints = allComplaints.filter((c) => {
    const s = (c.status || '').toLowerCase();
    const matchesFilter =
      intakeStatusFilter === 'all'
        ? true
        : intakeStatusFilter === 'submitted'
        ? s === 'submitted' || s === 'open'
        : intakeStatusFilter === 'in_progress'
        ? s === 'under investigation' || s === 'in progress'
        : s === 'resolved' || s === 'closed';

    const matchesSearch = intakeSearch
      ? c.complaint_id.toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (c.category || '').toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (c.customer_id || '').toLowerCase().includes(intakeSearch.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(intakeSearch.toLowerCase())
      : true;

    return matchesFilter && matchesSearch;
  });

  // KPI Counts for Intake
  const pendingRequestsCount = allRequests.filter(r => (r.status || '').toLowerCase() === 'submitted' || (r.status || '').toLowerCase() === 'pending').length;
  const inProgressRequestsCount = allRequests.filter(r => (r.status || '').toLowerCase() === 'in progress' || (r.status || '').toLowerCase() === 'assigned').length;
  const pendingComplaintsCount = allComplaints.filter(c => (c.status || '').toLowerCase() === 'submitted' || (c.status || '').toLowerCase() === 'open').length;

  // SCADA Grid Prep
  const wards = Array.from({ length: 40 }, (_, i) => `Ward ${i + 1}`);
  const wardIncidentMap: { [ward: string]: OperationalLog[] } = {};
  wards.forEach(w => { wardIncidentMap[w] = []; });
  incidents.forEach(inc => {
    if (wardIncidentMap[inc.affected_area]) {
      wardIncidentMap[inc.affected_area].push(inc);
    }
  });

  const filteredIncidents = incidents.filter(inc => {
    const matchesWard = selectedWard ? inc.affected_area === selectedWard : true;
    const matchesUtility = selectedUtility ? (inc.utility || '').toLowerCase() === selectedUtility.toLowerCase() : true;
    const matchesSeverity = selectedSeverity ? (inc.severity || '').toLowerCase() === selectedSeverity.toLowerCase() : true;
    const matchesSearch = searchScada ? (
      inc.log_id.toLowerCase().includes(searchScada.toLowerCase()) ||
      inc.incident_type.toLowerCase().includes(searchScada.toLowerCase()) ||
      inc.affected_area.toLowerCase().includes(searchScada.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchScada.toLowerCase())
    ) : true;
    return matchesWard && matchesUtility && matchesSeverity && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#171642] text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Primary Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-[#6D28F5] font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Operations Triage & Field Execution System</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Operations Management Console
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Accept incoming citizen requests, assign field technicians, update grievance resolutions, and monitor live telemetry.
          </p>
        </div>

        {/* Primary Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('intake')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'intake'
                ? 'bg-[#6D28F5] text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Ticket Acceptance Queue ({pendingRequestsCount + pendingComplaintsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'fleet'
                ? 'bg-[#6D28F5] text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Field GPS Dispatch ({allRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scada')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'scada'
                ? 'bg-[#6D28F5] text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>SCADA & Wards</span>
          </button>

          <button
            onClick={() => { fetchIntakeData(); fetchScadaData(); }}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loadingIntake || loadingScada ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TICKET INTAKE & ACCEPTANCE QUEUE (PRIMARY OPERATIONAL WORKFLOW)   */}
      {/* ========================================================================= */}
      {activeTab === 'intake' && (
        <div className="space-y-6">
          {/* Intake Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Acceptance</span>
                <div className="mt-1 text-2xl font-black text-amber-600">{pendingRequestsCount + pendingComplaintsCount}</div>
                <span className="text-[10px] text-amber-700 font-semibold">Immediate Action Required</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned / In Progress</span>
                <div className="mt-1 text-2xl font-black text-[#6D28F5]">{inProgressRequestsCount}</div>
                <span className="text-[10px] text-purple-600 font-semibold">Field Crews Operating</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Service Requests</span>
                <div className="mt-1 text-2xl font-black text-slate-900">{allRequests.length}</div>
                <span className="text-[10px] text-slate-400 font-mono">Recorded on Atlas</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Consumer Grievances</span>
                <div className="mt-1 text-2xl font-black text-rose-600">{allComplaints.length}</div>
                <span className="text-[10px] text-rose-500 font-semibold">{pendingComplaintsCount} Pending Review</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Sub-Queue Switcher: Service Requests vs Complaints */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <button
                onClick={() => setIntakeType('requests')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  intakeType === 'requests'
                    ? 'bg-[#171642] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Service Requests Queue ({allRequests.length})</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono">
                    {pendingRequestsCount} new
                  </span>
                )}
              </button>

              <button
                onClick={() => setIntakeType('complaints')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  intakeType === 'complaints'
                    ? 'bg-[#171642] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Consumer Grievances Queue ({allComplaints.length})</span>
                {pendingComplaintsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                    {pendingComplaintsCount} new
                  </span>
                )}
              </button>
            </div>

            {/* Filter pills & search */}
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by ticket ID, ward, or keyword..."
                  value={intakeSearch}
                  onChange={(e) => setIntakeSearch(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6D28F5]"
                />
              </div>

              <select
                value={intakeStatusFilter}
                onChange={(e) => setIntakeStatusFilter(e.target.value)}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Pending Acceptance Only</option>
                <option value="in_progress">In Progress / Assigned</option>
                <option value="completed">Completed / Resolved</option>
              </select>
            </div>
          </div>

          {/* ================= INTAKE TABLE: SERVICE REQUESTS ================= */}
          {intakeType === 'requests' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Incoming Service Applications Awaiting Staff Acceptance ({filteredRequests.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review incoming utility requests, approve feasibility, and dispatch field technicians.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Utility & Type</th>
                      <th className="py-3 px-4">Customer & Ward</th>
                      <th className="py-3 px-4">Description Notes</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Assigned Tech</th>
                      <th className="py-3 px-4 text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingIntake ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D28F5]" />
                          Loading incoming requests...
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                          No service requests match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => {
                        const isPending = (req.status || '').toLowerCase() === 'submitted' || (req.status || '').toLowerCase() === 'pending';
                        return (
                          <tr key={req.request_id} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#6D28F5]">
                              {req.request_id}
                              <span className="block text-[10px] font-sans font-normal text-slate-400">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{req.utility}</span>
                              <span className="text-[11px] text-slate-500">{req.request_type}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-slate-800 block">{req.customer_id}</span>
                              <span className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#6D28F5]" />
                                <span>{req.service_location || 'Ward 12, Green Park'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="text-[11px] text-slate-600 line-clamp-2">{req.description || 'New service connection intake'}</p>
                            </td>

                            <td className="py-3.5 px-4">
                              {isPending ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Acceptance</span>
                                </span>
                              ) : (req.status || '').toLowerCase() === 'completed' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                                  <Truck className="w-3 h-3" />
                                  <span>{req.status}</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {req.technician_name ? (
                                <div>
                                  <span className="text-slate-900 block text-[11px] font-bold">{req.technician_name}</span>
                                  <span className="text-[10px] text-purple-700 font-mono">{req.technician_phone}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <button
                                  onClick={() => handleOpenRequestAcceptModal(req)}
                                  className="px-3.5 py-2 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-black rounded-xl shadow-md shadow-purple-600/30 transition inline-flex items-center space-x-1.5 active:scale-95"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Accept & Assign</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenRequestAcceptModal(req)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center space-x-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Update / Resolve</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= INTAKE TABLE: CONSUMER GRIEVANCES ================= */}
          {intakeType === 'complaints' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Consumer Grievance Queue Awaiting Redressal ({filteredComplaints.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acknowledge customer disputes, assign investigating officers, and commit SLA resolutions.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Grievance ID</th>
                      <th className="py-3 px-4">Department & Category</th>
                      <th className="py-3 px-4">Consumer</th>
                      <th className="py-3 px-4">Linked Ticket</th>
                      <th className="py-3 px-4">Grievance Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Grievance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingIntake ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                          Loading consumer grievances...
                        </td>
                      </tr>
                    ) : filteredComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                          No grievances match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredComplaints.map((cmp) => {
                        const isPending = (cmp.status || '').toLowerCase() === 'submitted' || (cmp.status || '').toLowerCase() === 'open';
                        return (
                          <tr key={cmp.complaint_id} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                              {cmp.complaint_id}
                              <span className="block text-[10px] font-sans font-normal text-slate-400">
                                {new Date(cmp.created_at).toLocaleDateString()}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{cmp.utility || 'Electricity'}</span>
                              <span className="text-[11px] text-slate-500">{cmp.category}</span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {cmp.customer_id}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#6D28F5]">
                              {cmp.request_id || 'N/A'}
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="text-[11px] text-slate-600 line-clamp-2">{cmp.description}</p>
                            </td>

                            <td className="py-3.5 px-4">
                              {isPending ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  <span>Pending Review</span>
                                </span>
                              ) : (cmp.status || '').toLowerCase() === 'resolved' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>Resolved</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                  <Activity className="w-3 h-3" />
                                  <span>{cmp.status}</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <button
                                  onClick={() => handleOpenComplaintAcceptModal(cmp)}
                                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-md shadow-rose-600/30 transition inline-flex items-center space-x-1.5 active:scale-95"
                                >
                                  <Shield className="w-4 h-4" />
                                  <span>Acknowledge & Action</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenComplaintAcceptModal(cmp)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center space-x-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Update / Resolve</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FIELD TECHNICIAN GPS FLEET                                        */}
      {/* ========================================================================= */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-[#6D28F5]" />
                  <span>Field Technician Fleet & Real-Time GPS Tracking</span>
                </h3>
                <p className="text-xs text-slate-500">Live GPS tracking and telemetry broadcast to citizen portals</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Customer & Ward</th>
                    <th className="py-3 px-4">Assigned Technician</th>
                    <th className="py-3 px-4">Dispatch Status</th>
                    <th className="py-3 px-4">Distance & ETA</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRequests.slice(0, 15).map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#6D28F5]">
                        {req.request_id}
                        <span className="block text-[10px] font-sans font-normal text-slate-400">{req.utility}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{req.customer_id}</span>
                        <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#6D28F5]" />
                          <span>{req.service_location || 'Ward 12, Green Park'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {req.technician_name || 'Rajesh Kumar (Senior Line Tech)'}
                        </span>
                        <span className="text-[11px] font-mono text-purple-700">
                          {req.technician_phone || '+91 98480 22319'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          (req.technician_status || 'En Route') === 'Arrived at Site'
                            ? 'bg-amber-100 text-amber-800'
                            : (req.technician_status || 'En Route') === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                          <span>{req.technician_status || 'En Route'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {req.technician_distance_km !== undefined ? `${req.technician_distance_km} km` : '1.8 km'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ETA: {req.technician_eta_mins !== undefined ? `${req.technician_eta_mins} mins` : '14 mins'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenFleetModal(req)}
                          className="px-3 py-1.5 bg-[#F3EEFF] hover:bg-[#EAE2FF] text-[#6D28F5] font-bold rounded-lg transition inline-flex items-center space-x-1.5 active:scale-95 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Update GPS / ETA</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCADA & INCIDENTS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'scada' && (
        <div className="space-y-6">
          {/* AI Daily Summarization Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Autonomous LLM Operational Summarization</span>
                </div>
                <h2 className="text-xl font-bold text-white">Daily Operational Outage Briefing</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Generates an executive briefing aggregating incidents by affected wards, critical hazards, and restoration statuses.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate Summary</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiSummary ? (
              <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs text-indigo-300 border-b border-slate-700/80 pb-2">
                  <span className="font-semibold">AI Generated Executive Incident Briefing • {summaryDate}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono text-[10px]">OpenRouter LLM</span>
                </div>
                <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                  {aiSummary}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                Select a target date and click "Generate Summary" to run the LLM operational briefing agent.
              </div>
            )}
          </div>

          {/* Ward Heatmap / Grid (Ward 1 to 40) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Metropolitan Municipal Ward Outage Grid (Ward 1 - Ward 40)
                </h3>
                <p className="text-xs text-slate-500">Click any ward cell to filter live telemetry logs below</p>
              </div>
              {selectedWard && (
                <button
                  onClick={() => setSelectedWard(null)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200"
                >
                  Clear Filter: {selectedWard} ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {wards.map((ward) => {
                const wardIncidents = wardIncidentMap[ward] || [];
                const count = wardIncidents.length;
                const hasCritical = wardIncidents.some(i => i.severity.toLowerCase() === 'critical');
                const isSelected = selectedWard === ward;

                let bgColor = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200';
                if (count > 0 && hasCritical) {
                  bgColor = 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100';
                } else if (count > 0) {
                  bgColor = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                }

                if (isSelected) {
                  bgColor = 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300';
                }

                return (
                  <button
                    key={ward}
                    onClick={() => setSelectedWard(isSelected ? null : ward)}
                    className={`p-2 rounded-xl border text-center transition-all ${bgColor} flex flex-col items-center justify-center`}
                  >
                    <span className="text-[11px] font-bold">{ward.replace('Ward ', 'W')}</span>
                    <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {count > 0 ? `${count} inc.` : 'Clear'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ACCEPT & PROCESS SERVICE REQUEST (STAFF WORKFLOW)                */}
      {/* ========================================================================= */}
      {requestModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Accept & Process Service Ticket</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ticket: {requestModalItem.request_id} · Consumer: {requestModalItem.customer_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequestModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Ticket Info Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{requestModalItem.utility} — {requestModalItem.request_type}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                  {requestModalItem.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">{requestModalItem.description || 'No description provided.'}</p>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <MapPin className="w-3.5 h-3.5 text-[#6D28F5]" />
                <span>{requestModalItem.service_location || 'Ward 12, Green Park'}</span>
              </div>
            </div>

            <form onSubmit={handleSaveRequestAccept} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Operational Action / Status *</label>
                <select
                  value={reqActionStatus}
                  onChange={(e) => setReqActionStatus(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
                >
                  <option value="Assigned" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>✅ Accept & Assign Technician (Work Order Created)</option>
                  <option value="In Progress" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>🚀 Mark In Progress (Crew Dispatched On-Site)</option>
                  <option value="Completed" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>🎉 Complete & Close Service Request</option>
                  <option value="Rejected" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>❌ Reject Application (Safety / Feasibility Failure)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Assign Lead Field Technician *</label>
                <select
                  value={reqTechnician}
                  onChange={(e) => {
                    setReqTechnician(e.target.value);
                    if (e.target.value.includes('Rajesh')) setReqTechPhone('+91 98480 22319');
                    else if (e.target.value.includes('Suresh')) setReqTechPhone('+91 98480 33412');
                    else if (e.target.value.includes('Anil')) setReqTechPhone('+91 98480 44521');
                    else setReqTechPhone('+91 98480 55634');
                  }}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
                >
                  <option value="Rajesh Kumar (Lead Line Technician)" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Rajesh Kumar (Lead Line Technician — Substation Crew 3)</option>
                  <option value="Suresh Rao (Water Pipeline Specialist)" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Suresh Rao (Water Pipeline Specialist — Ward 12 Team)</option>
                  <option value="Anil Sharma (Gas Infrastructure Lead)" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Anil Sharma (Gas Infrastructure Lead — Safety Wing)</option>
                  <option value="Pooja Varma (Telecom Fiber Tech)" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Pooja Varma (Telecom Fiber Tech — Rapid Ops)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Technician Contact</label>
                  <input
                    type="text"
                    value={reqTechPhone}
                    onChange={(e) => setReqTechPhone(e.target.value)}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">SLA Priority</label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value)}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs"
                  >
                    <option value="Low">Low (Standard 7-Day SLA)</option>
                    <option value="Medium">Medium (3-Day Inspection)</option>
                    <option value="High">High (24-Hour Expedited)</option>
                    <option value="Critical">Critical (Immediate Crew Dispatch)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Scheduled Visit Window</label>
                <input
                  type="text"
                  value={reqScheduledWindow}
                  onChange={(e) => setReqScheduledWindow(e.target.value)}
                  placeholder="e.g. Tomorrow, 10:00 AM - 1:00 PM"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Operational Work Order Notes</label>
                <textarea
                  rows={2}
                  value={reqOperationalNotes}
                  onChange={(e) => setReqOperationalNotes(e.target.value)}
                  placeholder="e.g. Feasibility checked against Ward 12 feeder substation capacity. Dispatched crew with replacement meters."
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setRequestModalItem(null)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="flex-1 py-2.5 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold rounded-xl shadow-md shadow-purple-600/30 transition text-xs disabled:opacity-50"
                >
                  {submittingReq ? 'Saving to Atlas...' : 'Accept & Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ACKNOWLEDGE & RESOLVE COMPLAINT (GRIEVANCE REDRESSAL WORKFLOW)   */}
      {/* ========================================================================= */}
      {complaintModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Grievance Redressal & Action</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Complaint: {complaintModalItem.complaint_id} · Consumer: {complaintModalItem.customer_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComplaintModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Complaint Info Card */}
            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{complaintModalItem.utility} — {complaintModalItem.category}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-200 text-rose-900 rounded">
                  {complaintModalItem.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-700">{complaintModalItem.description}</p>
              {complaintModalItem.request_id && (
                <span className="block font-mono text-[10px] text-purple-700 font-bold">
                  Linked Request: {complaintModalItem.request_id}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveComplaintAccept} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Redressal Action Status *</label>
                <select
                  value={cmpActionStatus}
                  onChange={(e) => setCmpActionStatus(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-xs"
                >
                  <option value="Under Investigation" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>🛡️ Acknowledge & Assign to Investigation Cell</option>
                  <option value="In Progress" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>⚡ In Progress (Corrective Engineering Action Initiated)</option>
                  <option value="Resolved" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>✅ Resolve Grievance (Redressal Approved & Closed)</option>
                  <option value="Rejected" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>❌ Dismiss Grievance (Unsubstantiated / Duplicate)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Assigned Grievance Officer</label>
                  <select
                    value={cmpOfficer}
                    onChange={(e) => setCmpOfficer(e.target.value)}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs"
                  >
                    <option value="Officer V. Raman (Consumer Grievance Cell)">Officer V. Raman (Grievance Cell)</option>
                    <option value="Officer M. Sunita (Billing Dispute Resolution)">Officer M. Sunita (Billing Wing)</option>
                    <option value="Officer D. Prakash (Field Inspection Cell)">Officer D. Prakash (Field Safety)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Grievance Priority</label>
                  <select
                    value={cmpPriority}
                    onChange={(e) => setCmpPriority(e.target.value)}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs"
                  >
                    <option value="Low">Low (Standard SLA)</option>
                    <option value="Medium">Medium (Regular Investigation)</option>
                    <option value="High">High (Critical SLA Escalation)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Remediation Action & Citizen Resolution Summary *</label>
                <textarea
                  rows={3}
                  required
                  value={cmpRemediation}
                  onChange={(e) => setCmpRemediation(e.target.value)}
                  placeholder="State the official action taken, e.g.: Re-tested consumer meter, calibrated voltage regulator, adjusted ₹450 credit voucher in next bill."
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setComplaintModalItem(null)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCmp}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/30 transition text-xs disabled:opacity-50"
                >
                  {submittingCmp ? 'Saving to Atlas...' : 'Commit Grievance Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FLEET TELEMETRY & GPS BROADCAST MODAL                            */}
      {/* ========================================================================= */}
      {editingFleetItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Update Field Telemetry</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ticket: {editingFleetItem.request_id} · Destination: {editingFleetItem.service_location || 'Ward 12'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingFleetItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFleetDispatch} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Technician Name *</label>
                  <input
                    type="text"
                    value={fleetTechName}
                    onChange={(e) => setFleetTechName(e.target.value)}
                    required
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    value={fleetTechPhone}
                    onChange={(e) => setFleetTechPhone(e.target.value)}
                    required
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Dispatch Status *</label>
                <select
                  value={fleetTechStatus}
                  onChange={(e) => setFleetTechStatus(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
                >
                  <option value="Dispatched" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Dispatched (Departed Depot)</option>
                  <option value="En Route" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>En Route (Live GPS Active)</option>
                  <option value="Arrived at Site" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Arrived at Site (Inspection In Progress)</option>
                  <option value="Completed" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Inspection Completed & Resolved</option>
                </select>
              </div>

              <div className="p-3.5 bg-purple-50/70 border border-[#DDD0FA] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-950 flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#6D28F5]" />
                    <span>Technician Live GPS Coordinates</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureTechnicianGps}
                    disabled={capturingGps}
                    className="px-2.5 py-1 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold text-[10px] rounded-lg shadow-xs transition flex items-center space-x-1"
                  >
                    {capturingGps ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Pinging...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3" />
                        <span>Use My Current Device GPS</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="block text-[10px] text-slate-500">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={fleetLat}
                      onChange={(e) => setFleetLat(parseFloat(e.target.value))}
                      style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                      className="w-full p-2 bg-white rounded-lg border border-purple-200 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      value={fleetLng}
                      onChange={(e) => setFleetLng(parseFloat(e.target.value))}
                      style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                      className="w-full p-2 bg-white rounded-lg border border-purple-200 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">ETA (Minutes)</label>
                  <input
                    type="number"
                    value={fleetEta}
                    onChange={(e) => setFleetEta(parseInt(e.target.value) || 0)}
                    min="0"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fleetDistance}
                    onChange={(e) => setFleetDistance(parseFloat(e.target.value) || 0)}
                    min="0"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingFleetItem(null)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFleet}
                  className="flex-1 py-2.5 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold rounded-xl shadow-md shadow-purple-600/30 transition text-xs disabled:opacity-50"
                >
                  {savingFleet ? 'Updating Atlas...' : 'Broadcast Telemetry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
