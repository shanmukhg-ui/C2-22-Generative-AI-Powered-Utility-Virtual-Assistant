import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Activity, MapPin, AlertTriangle, Clock, CheckCircle2, Save } from 'lucide-react';

export const OperationsPrefsSettings: React.FC = () => {
  const { userPrefs, updateUserPrefs } = useSettings();

  const [region, setRegion] = useState(userPrefs.defaultRegionFilter || 'All Wards');
  const [severity, setSeverity] = useState(userPrefs.defaultSeverityFilter || 'All Severities');
  const [timeRange, setTimeRange] = useState(userPrefs.defaultSummaryTimeRange || 'Today');
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserPrefs({
      defaultRegionFilter: region,
      defaultSeverityFilter: severity,
      defaultSummaryTimeRange: timeRange
    });
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Operations & Dispatch Filters</h2>
        <p className="text-xs text-content-muted">Configure default telemetry filters and incident grids for field dispatch personnel.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl text-xs">
        {/* Default Region */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Default Ward / Municipal Region</span>
          </label>
          <select
            value={region}
            onChange={(e) => { setRegion(e.target.value); setIsDirty(true); }}
            className="w-full p-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="All Wards">All Metropolitan Wards (Full Grid)</option>
            <option value="Ward 1 - Riverside">Ward 1 - Riverside Sector</option>
            <option value="Ward 2 - Lakeview">Ward 2 - Lakeview District</option>
            <option value="Ward 3 - Green Park">Ward 3 - Green Park Estate</option>
            <option value="Ward 4 - Central Substation">Ward 4 - Central Substation Zone</option>
          </select>
        </div>

        {/* Default Severity */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5 flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-primary" />
            <span>Initial Severity Filter</span>
          </label>
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setIsDirty(true); }}
            className="w-full p-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="All Severities">All Severities (Critical, Major, Minor)</option>
            <option value="Critical Only">Critical & Major Outages Only</option>
            <option value="P4 Immediate Dispatch">P4 Immediate Field Dispatch</option>
          </select>
        </div>

        {/* Default Time Range */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>AI Operational Summary Default Window</span>
          </label>
          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value); setIsDirty(true); }}
            className="w-full p-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="Today">Today (Past 24 Hours)</option>
            <option value="48 Hours">Past 48 Hours</option>
            <option value="Current Shift (8 Hours)">Current Shift (8 Hours)</option>
          </select>
        </div>

        <div className="pt-3 flex items-center space-x-3">
          <button
            type="submit"
            disabled={!isDirty}
            className={`px-5 py-2.5 rounded-input font-bold transition flex items-center space-x-2 ${
              isDirty
                ? 'bg-primary hover:bg-primary-hover text-white shadow-subtle'
                : 'bg-surface-border text-content-muted cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Operational Defaults</span>
          </button>

          {isSaved && (
            <span className="flex items-center space-x-1 text-status-success font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved!</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

