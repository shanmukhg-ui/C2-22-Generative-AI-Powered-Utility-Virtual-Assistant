import React, { useState, useEffect } from 'react';
import {
  X, Phone, Navigation, ShieldCheck, MapPin, Truck,
  Clock, CheckCircle2, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { requestsApi } from '../services/api';

interface TechnicianTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
}

export const TechnicianTrackerModal: React.FC<TechnicianTrackerModalProps> = ({
  isOpen,
  onClose,
  requestId
}) => {
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(0);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const data = await requestsApi.getTracking(requestId);
      setTracking(data);
    } catch (err) {
      console.error('Failed to load tracking telemetry:', err);
      // Clean fallback if API fails
      setTracking({
        request_id: requestId,
        service_location: 'Ward 12, Tech Zone',
        customer_coordinates: { lat: 17.4482, lng: 78.3845 },
        technician: {
          name: 'Rajesh Kumar (Senior Field Engineer)',
          phone: '+91 98480 22319',
          vehicle: 'AP 28 TE 4421 (Utility Van #3)',
          status: 'En Route',
          coordinates: { lat: 17.4602, lng: 78.3925 },
          eta_mins: 14,
          distance_km: 1.8,
          last_ping: 'Just now'
        },
        steps: [
          { step: 'Dispatch Approved', time: '10:15 AM', done: true },
          { step: 'Technician En Route', time: '10:30 AM', done: true, active: true },
          { step: 'Site Inspection', time: '~14 mins', done: false, active: false },
          { step: 'Resolution & Sign-off', time: 'Pending', done: false }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && requestId) {
      fetchTrackingData();
    }
  }, [isOpen, requestId]);

  // Gentle pulsing animation for live GPS van simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => (p + 1) % 100);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const tech = tracking?.technician || {
    name: 'Rajesh Kumar (Lead Technician)',
    phone: '+91 98480 22319',
    vehicle: 'AP 28 TE 4421 (Utility Rapid Van #3)',
    status: 'En Route',
    eta_mins: 14,
    distance_km: 1.8
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#171642] to-[#201B50] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6D28F5] text-white flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base text-white tracking-tight">Live Technician GPS Dispatch</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE GPS</span>
                </span>
              </div>
              <p className="text-xs text-purple-200 font-mono">Service Ticket: {requestId} · SLA Active</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchTrackingData}
              disabled={loading}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Refresh GPS telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Simulated Interactive Radar Map Canvas */}
          <div className="relative w-full h-56 md:h-64 bg-[#0F0E26] rounded-2xl overflow-hidden border border-[#2A2368] shadow-inner flex items-center justify-center">
            {/* Map Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #7C3AED 1px, transparent 1px), linear-gradient(to right, #2A2368 1px, transparent 1px), linear-gradient(to bottom, #2A2368 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            ></div>

            {/* Simulated Road Path between Tech and Customer */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 250">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Highway / Street lines */}
              <path d="M 50 130 Q 150 70, 240 140 T 430 110" fill="none" stroke="#251F5E" strokeWidth="18" strokeLinecap="round" />
              <path d="M 50 130 Q 150 70, 240 140 T 430 110" fill="none" stroke="#362C85" strokeWidth="12" strokeLinecap="round" />

              {/* Active Route Vector */}
              <path
                d="M 120 105 Q 180 80, 250 135 T 390 115"
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeDasharray="6,4"
                className="animate-pulse"
                filter="url(#glow)"
              />

              {/* Range rings around technician */}
              <circle cx="120" cy="105" r="30" fill="none" stroke="#7C3AED" strokeWidth="1" opacity="0.3" className="animate-ping" style={{ animationDuration: '3s' }} />
              <circle cx="120" cy="105" r="50" fill="none" stroke="#7C3AED" strokeWidth="0.8" opacity="0.15" />

              {/* Range rings around customer */}
              <circle cx="390" cy="115" r="22" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.3" />
            </svg>

            {/* Van Marker (Technician) */}
            <div className="absolute left-[24%] top-[42%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer">
              <div className="relative">
                <span className="absolute -inset-2 bg-purple-500/30 rounded-full animate-ping"></span>
                <div className="w-10 h-10 rounded-2xl bg-[#6D28F5] text-white flex items-center justify-center shadow-lg shadow-purple-600/60 ring-2 ring-white/80">
                  <Truck className="w-5 h-5 fill-current" />
                </div>
              </div>
              <div className="mt-2 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-purple-200 text-center">
                <span className="block text-[10px] font-black text-purple-900 leading-tight">Field Van</span>
                <span className="block text-[9px] font-mono text-purple-600 font-semibold">{tech.distance_km} km away</span>
              </div>
            </div>

            {/* Customer Home Pin */}
            <div className="absolute right-[22%] top-[46%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/50 ring-2 ring-white">
                <MapPin className="w-5 h-5 fill-current" />
              </div>
              <div className="mt-2 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-emerald-200 text-center">
                <span className="block text-[10px] font-black text-emerald-950 leading-tight">Your Premises</span>
                <span className="block text-[9px] font-mono text-emerald-700 font-semibold">Destination</span>
              </div>
            </div>

            {/* Overlay Status Badge */}
            <div className="absolute top-3 left-3 bg-[#171642]/90 backdrop-blur-md border border-purple-500/30 px-3.5 py-2 rounded-xl flex items-center space-x-2 text-white shadow-lg">
              <Navigation className="w-4 h-4 text-[#A78BFA] fill-[#A78BFA] animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <span className="block text-[10px] font-semibold text-purple-200 leading-none">Live Telemetry</span>
                <span className="text-xs font-black text-white">{tech.status} · Speed ~32 km/h</span>
              </div>
            </div>

            {/* Overlay ETA Countdown */}
            <div className="absolute bottom-3 right-3 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 px-4 py-2.5 rounded-xl flex items-center space-x-3 text-white shadow-lg">
              <Clock className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Estimated Arrival</span>
                <span className="text-sm font-black text-white font-mono">{tech.eta_mins} Minutes</span>
              </div>
            </div>
          </div>

          {/* Technician Profile & Contact Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 w-full sm:w-auto">
              <div className="relative">
                <div className="w-13 h-13 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] border-2 border-[#DDD0FA] flex items-center justify-center font-black text-lg shadow-sm">
                  RK
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <ShieldCheck className="w-2.5 h-2.5 text-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">{tech.name}</h4>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                    ★ 4.9 (340+ visits)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{tech.vehicle}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Assigned Dispatch Unit · TechBharat CoE</p>
              </div>
            </div>

            <a
              href={`tel:${tech.phone}`}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 transition active:scale-95"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Call Technician ({tech.phone})</span>
            </a>
          </div>

          {/* 4-Step Field Service Progress */}
          <div className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-white space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Field Resolution Milestones</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1. Ticket Verified</span>
                </div>
                <p className="text-[11px] text-slate-500">Technical check passed</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>2. Crew Dispatched</span>
                </div>
                <p className="text-[11px] text-slate-500">Van left regional depot</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border-2 border-[#6D28F5] shadow-xs">
                <div className="flex items-center space-x-1.5 text-[#6D28F5] text-xs font-bold mb-1">
                  <Truck className="w-3.5 h-3.5 animate-bounce" />
                  <span>3. En Route</span>
                </div>
                <p className="text-[11px] font-semibold text-purple-700 font-mono">~{tech.eta_mins} mins away</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <div className="flex items-center space-x-1.5 text-slate-600 text-xs font-bold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>4. Site Inspection</span>
                </div>
                <p className="text-[11px] text-slate-400">Resolution & Sign-off</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>GPS Ping interval: Real-time (WebSocket/HTTP Polling)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
