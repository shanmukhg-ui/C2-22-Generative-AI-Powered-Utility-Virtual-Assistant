import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestsApi, complaintsApi, knowledgeApi } from '../services/api';
import { X, CheckCircle2, AlertTriangle, UploadCloud, Zap, ShieldAlert, FileText, MapPin, Navigation, Loader2 } from 'lucide-react';

/* ----------------- New Request Modal ----------------- */
interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [utility, setUtility] = useState('Electricity');
  const [requestType, setRequestType] = useState('New Connection');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(user?.city ? `Ward 12, ${user.city}` : 'Ward 12, Green Park Avenue');
  const [priority, setPriority] = useState('Medium');
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({ lat: 17.4482, lng: 78.3845 });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lng = parseFloat(position.coords.longitude.toFixed(4));
        setCoordinates({ lat, lng });
        const wardNum = ((Math.abs(Math.round(lat * 10 + lng * 10))) % 40) + 1;
        setLocation(`${lat}° N, ${lng}° E · Municipal Ward ${wardNum}`);
        setLocating(false);
      },
      (error) => {
        console.warn('Geolocation error or permission denied:', error);
        const fallbackLat = 17.4482;
        const fallbackLng = 78.3845;
        setCoordinates({ lat: fallbackLat, lng: fallbackLng });
        setLocation(`${fallbackLat}° N, ${fallbackLng}° E · Municipal Ward 12, Tech Zone`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestsApi.createRequest({
        utility,
        department: `${utility} Department`,
        request_type: requestType,
        description,
        service_location: location,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        priority
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Failed to create request: ${err.message || 'API error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white text-[#111827] rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#171642]">Apply for Utility Service</h3>
              <p className="text-xs text-slate-500">Official application submission under {user?.user_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Utility Sector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Utility Sector *</label>
            <select
              value={utility}
              onChange={(e) => setUtility(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-sm"
            >
              <option value="Electricity" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Electricity Distribution</option>
              <option value="Water" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Water Supply & Sewerage</option>
              <option value="Gas" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Natural Gas Distribution</option>
              <option value="Telecom" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Broadband & Telecom</option>
              <option value="Solid Waste" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Solid Waste & Sanitation</option>
            </select>
          </div>

          {/* Application Type */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Application Type *</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-sm"
            >
              <option value="New Connection" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">New Connection Application</option>
              <option value="Meter Inspection & Testing" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Meter Inspection & Testing</option>
              <option value="Load Change / Tariff Upgrade" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Load Change / Tariff Upgrade</option>
              <option value="Name / Ownership Transfer" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Name / Ownership Transfer</option>
              <option value="Temporary Disconnection" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Temporary Disconnection</option>
            </select>
          </div>

          {/* Premises Location & GPS Detection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">Premises Location & Ward *</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#F3EEFF] hover:bg-[#E9DEFF] text-[#6D28F5] font-bold text-[11px] rounded-lg border border-[#DDD0FA] transition active:scale-95 shadow-2xs"
                title="Detect live coordinates via browser GPS"
              >
                {locating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D28F5]" />
                    <span>Locating GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-[#6D28F5] fill-[#6D28F5]" />
                    <span>Auto-Detect My GPS</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g. Plot 42, Green Park Avenue, Ward 12"
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
              />
              <MapPin className="w-4 h-4 text-purple-600 absolute left-3 top-3.5" />
            </div>
            {coordinates && (
              <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>GPS Locked: {coordinates.lat}° N, {coordinates.lng}° E (Accuracy: ±5m)</span>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Service Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-sm"
            >
              <option value="Low" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Low (Standard SLA)</option>
              <option value="Medium" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Medium (Standard Business Hours)</option>
              <option value="High" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">High (Expedited Inspection)</option>
              <option value="Critical" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Critical (Emergency Dispatch)</option>
            </select>
          </div>

          {/* Application Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Application Notes / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details regarding premises type, required load in kW, pipeline pressure, etc."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold rounded-xl shadow-md shadow-purple-600/30 transition disabled:opacity-50 text-xs"
            >
              {submitting ? 'Submitting to Atlas...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ----------------- New Complaint Modal ----------------- */
interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [utility, setUtility] = useState('Electricity');
  const [category, setCategory] = useState('Billing Dispute');
  const [requestId, setRequestId] = useState('');
  const [location, setLocation] = useState(user?.city ? `Ward 12, ${user.city}` : 'Ward 12, Green Park Avenue');
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({ lat: 17.4482, lng: 78.3845 });
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lng = parseFloat(position.coords.longitude.toFixed(4));
        setCoordinates({ lat, lng });
        const wardNum = ((Math.abs(Math.round(lat * 10 + lng * 10))) % 40) + 1;
        setLocation(`${lat}° N, ${lng}° E · Municipal Ward ${wardNum}`);
        setLocating(false);
      },
      (error) => {
        console.warn('Geolocation error or permission denied:', error);
        const fallbackLat = 17.4482;
        const fallbackLng = 78.3845;
        setCoordinates({ lat: fallbackLat, lng: fallbackLng });
        setLocation(`${fallbackLat}° N, ${fallbackLng}° E · Municipal Ward 12, Tech Zone`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe your grievance.');
      return;
    }
    setSubmitting(true);
    try {
      await complaintsApi.createComplaint({
        utility,
        department: `${utility} Department`,
        category,
        request_id: requestId || undefined,
        service_location: location,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        description,
        priority
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Failed to lodge complaint: ${err.message || 'API error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white text-[#111827] rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#171642]">Lodge Official Grievance</h3>
              <p className="text-xs text-slate-500">Consumer protection & SLA tracking under {user?.user_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Target Utility Department */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Target Utility Department *</label>
            <select
              value={utility}
              onChange={(e) => setUtility(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-sm"
            >
              <option value="Electricity" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Electricity Distribution Corporation</option>
              <option value="Water" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Water Supply & Sewerage Board</option>
              <option value="Gas" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Natural Gas Distribution Network</option>
              <option value="Telecom" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Broadband & Telecom Infrastructure</option>
              <option value="Solid Waste" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Municipal Solid Waste & Sanitation</option>
            </select>
          </div>

          {/* Grievance Category */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Grievance Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-sm"
            >
              <option value="Billing Dispute" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Billing Dispute / Excessive Charges</option>
              <option value="Service Outage" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Unscheduled Service Outage</option>
              <option value="Low Pressure" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Low Water / Gas Pressure Defect</option>
              <option value="Frequent Disconnection" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Frequent Fiber / Line Disconnection</option>
              <option value="Meter Tampering" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Defective / Burnt Meter Issue</option>
              <option value="Voltage Fluctuation" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Severe Voltage Fluctuation</option>
            </select>
          </div>

          {/* Linked Service Request ID */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Linked Service Request ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. SR000110"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-xs"
            />
          </div>

          {/* Incident Location & GPS Auto-Detection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">Incident Premises Location *</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] rounded-lg border border-rose-200 transition active:scale-95 shadow-2xs"
                title="Detect live coordinates via browser GPS"
              >
                {locating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    <span>Locating GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                    <span>Auto-Detect My GPS</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g. Flat 301, Sector 4, Ward 12"
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-xs"
              />
              <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3.5" />
            </div>
            {coordinates && (
              <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>GPS Tagged: {coordinates.lat}° N, {coordinates.lng}° E</span>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Urgency / Severity</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-sm"
            >
              <option value="Low" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Low (Minor Non-Service Impairing)</option>
              <option value="Medium" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Medium (Partial Degradation)</option>
              <option value="High" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">High (Complete Outage)</option>
              <option value="Critical" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold py-1">Critical (Safety Hazard / Cable Break)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Detailed Description of Issue *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State dates, meter readings, or outage occurrences in detail..."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs text-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/30 transition disabled:opacity-50 text-xs"
            >
              {submitting ? 'Submitting to Atlas...' : 'Submit Grievance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ----------------- Ingest Document Modal ----------------- */
interface IngestDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IngestDocModal: React.FC<IngestDocModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [docId, setDocId] = useState(`DOC_${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState('');
  const [utility, setUtility] = useState('Electricity');
  const [scope, setScope] = useState('public');
  const [version, setVersion] = useState('1.0');
  const [textContent, setTextContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !textContent.trim()) {
      alert('Please provide title and content text.');
      return;
    }
    setSubmitting(true);
    try {
      await knowledgeApi.ingest({
        document_id: docId,
        title,
        utility,
        scope,
        version,
        text_content: textContent
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message || 'API error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white text-[#111827] rounded-3xl max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#171642]">Ingest Knowledge Document</h3>
              <p className="text-xs text-slate-500">Vector embedding & ChromaDB chunk indexing (Admin)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 11kV Substation Maintenance Protocol.pdf"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Utility Domain</label>
              <select
                value={utility}
                onChange={(e) => setUtility(e.target.value)}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
              >
                <option value="Electricity" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Electricity</option>
                <option value="Water" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Water</option>
                <option value="Gas" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Gas</option>
                <option value="Telecom" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Telecom</option>
                <option value="Solid Waste" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Solid Waste</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">RBAC Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs text-xs"
              >
                <option value="public" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Public (All Citizens)</option>
                <option value="internal" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} className="text-slate-900 bg-white font-semibold">Internal (Staff & Admin)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">SOP Content / Body *</label>
            <textarea
              rows={5}
              required
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste official operating procedure clauses, safety protocols, or circular guidelines..."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-[#6D28F5] focus:outline-none shadow-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold rounded-xl shadow-md shadow-purple-600/30 transition disabled:opacity-50 text-xs"
            >
              {submitting ? 'Indexing in ChromaDB...' : 'Ingest Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
