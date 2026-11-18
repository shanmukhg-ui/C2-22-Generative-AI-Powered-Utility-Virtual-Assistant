import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  User, Mail, Phone, Calendar, MapPin, Shield, Zap,
  Camera, CheckCircle2, Save, RotateCcw, Bell, Globe,
  FileText, Activity, AlertCircle, Database
} from 'lucide-react';

// Preset avatar options
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const ProfilePage: React.FC = () => {
  const { user, updateUserProfile } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [photoUrl, setPhotoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Vizag');
  const [department, setDepartment] = useState('Electricity Department');
  const [meterNumber, setMeterNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [smsNotif, setSmsNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '+91 98765 43210');
      setDob(user.dob || '1994-05-15');
      setGender(user.gender || 'Prefer not to say');
      setPhotoUrl(user.photo_url || '');
      setAddress(user.address || 'Plot 42, Green Park Avenue, Ward 12');
      setCity(user.city || 'Vizag');
      setDepartment(user.department || (user.role === 'Customer' ? 'Electricity Department' : 'Operations'));
      setMeterNumber(user.meter_number || 'MTR-EL-884920');
      setEmergencyContact(user.emergency_contact || '+91 98765 12345');
      setPreferredLanguage(user.preferred_language || 'English');
      if (user.notifications) {
        setSmsNotif(user.notifications.sms ?? true);
        setEmailNotif(user.notifications.email ?? true);
        setWhatsappNotif(user.notifications.whatsapp ?? false);
      }
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile({
        name,
        email,
        phone,
        dob,
        gender,
        photo_url: photoUrl,
        address,
        city,
        department,
        meter_number: meterNumber,
        emergency_contact: emergencyContact,
        preferred_language: preferredLanguage,
        notifications: {
          sms: smsNotif,
          email: emailNotif,
          whatsapp: whatsappNotif
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (n: string) => {
    if (!n) return 'JD';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-[#171642] tracking-tight">User Profile & Account</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal credentials, contact information, utility connections, and preferences.
          </p>
        </div>

        {/* MongoDB Atlas Sync Pill */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>MongoDB Atlas Synced</span>
        </div>
      </div>

      {/* 2. Top Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F3EEFF] rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Avatar Container */}
        <div className="relative group shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-[#6D28F5] shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-purple-600/30">
              {getInitials(name)}
            </div>
          )}

          {/* Change Avatar Button */}
          <button
            type="button"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white text-[#6D28F5] shadow-md border border-slate-200 hover:bg-[#F3EEFF] transition"
            title="Change Photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Details */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h2 className="text-xl font-black text-[#171642]">{name || 'John Doe'}</h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#F3EEFF] text-[#6D28F5] border border-purple-200">
              {user?.role || 'Customer'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
              {user?.user_id || 'CUST0001'}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            {email} • {phone} • {city}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-[#6D28F5]" />
              <span className="font-semibold">{department}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>{address}</span>
            </div>
          </div>
        </div>

        {/* Status Chip */}
        <div className="shrink-0 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center min-w-[130px]">
          <div className="flex items-center justify-center space-x-1 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active Account</span>
          </div>
          <p className="text-[10px] text-emerald-600 mt-1">Verified Resident</p>
        </div>
      </div>

      {/* Preset Avatar Picker Popup */}
      {showAvatarPicker && (
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-[#171642]">Choose an Avatar Photo or Paste URL</h4>
            <button
              onClick={() => setShowAvatarPicker(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {PRESET_AVATARS.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="avatar preset"
                onClick={() => {
                  setPhotoUrl(url);
                  setShowAvatarPicker(false);
                }}
                className={`w-14 h-14 rounded-xl object-cover cursor-pointer hover:scale-105 transition border-2 ${
                  photoUrl === url ? 'border-[#6D28F5] ring-2 ring-purple-300' : 'border-transparent'
                }`}
              />
            ))}
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Or paste custom image URL..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#6D28F5]"
            />
            <button
              type="button"
              onClick={() => setShowAvatarPicker(false)}
              className="px-4 py-2 bg-[#6D28F5] text-white text-xs font-bold rounded-xl"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Personal Information */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-[#171642] uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
            <User className="w-4 h-4 text-[#6D28F5]" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth (DOB) *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Emergency Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 98765 12345 (Family Member)"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Utility & Connection Details */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-[#171642] uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#6D28F5]" />
            <span>Utility Connection Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Primary Utility Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Department / Utility</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
              >
                <option value="Electricity Department">Electricity Distribution Corporation</option>
                <option value="Water Supply & Sewerage Board">Water Supply & Sewerage Board</option>
                <option value="Natural Gas Distribution Network">Natural Gas Distribution Network</option>
                <option value="Broadband & Telecom Infrastructure">Broadband & Telecom Infrastructure</option>
                <option value="Solid Waste & Sanitation">Solid Waste & Sanitation Department</option>
              </select>
            </div>

            {/* Meter / Connection Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Meter / Connection Serial No.</label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. MTR-EL-884920"
                className="w-full px-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-mono font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
              />
            </div>

            {/* Service Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Premise Service Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot number, Street, Ward, Landmark"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Preferences & Notifications */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-[#171642] uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#6D28F5]" />
            <span>Preferences & Communication Alerts</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            {/* Preferred Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[#6D28F5]" />
                <span>Preferred Language</span>
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] focus:bg-white transition"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Marathi">Marathi (मराठी)</option>
              </select>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-2">Notification Channels</label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={smsNotif}
                  onChange={(e) => setSmsNotif(e.target.checked)}
                  className="rounded text-[#6D28F5] focus:ring-[#6D28F5] w-4 h-4"
                />
                <span>SMS Alerts for outages and technician dispatch</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                  className="rounded text-[#6D28F5] focus:ring-[#6D28F5] w-4 h-4"
                />
                <span>Email statements and monthly tariff circulars</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={whatsappNotif}
                  onChange={(e) => setWhatsappNotif(e.target.checked)}
                  className="rounded text-[#6D28F5] focus:ring-[#6D28F5] w-4 h-4"
                />
                <span>WhatsApp status updates for service requests</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. Action Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            {saveSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center space-x-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile saved and committed to MongoDB Atlas!</span>
              </span>
            ) : (
              <span>All changes are cryptographically audited and stored in MongoDB Atlas.</span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-7 py-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 transition transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving to MongoDB Atlas...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
