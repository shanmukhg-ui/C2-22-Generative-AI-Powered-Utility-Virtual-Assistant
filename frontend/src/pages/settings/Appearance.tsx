import React from 'react';
import { useTheme, Theme, Density } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useIntroPreference, IntroMode } from '../../hooks/useIntroPreference';
import { Sun, Moon, Laptop, LayoutGrid, Check, Sparkles, PlayCircle } from 'lucide-react';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme, density, setDensity } = useTheme();
  const { userPrefs, updateUserPrefs } = useSettings();
  const { introPref, setIntroPref } = useIntroPreference();

  const handleLandingPageChange = (page: string) => {
    updateUserPrefs({ defaultLandingPage: page });
  };

  const handleIntroPrefChange = (mode: IntroMode) => {
    try {
      setIntroPref(mode);
      updateUserPrefs({ intro_mode: mode });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Appearance & Display</h2>
        <p className="text-xs text-content-muted">Customize your interface theme, density, and startup experience.</p>
      </div>

      <div className="space-y-6 max-w-xl text-xs">
        {/* Theme Selector */}
        <div>
          <label className="block font-semibold text-content-main mb-2">Interface Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {/* Light */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-card border text-left flex flex-col justify-between space-y-3 transition ${
                theme === 'light'
                  ? 'border-primary bg-primary-light/40 ring-2 ring-primary text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sun className="w-5 h-5" />
                {theme === 'light' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <span className="font-bold text-xs block">Light</span>
                <span className="text-[10px] text-content-muted">Crisp white & lavender</span>
              </div>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-card border text-left flex flex-col justify-between space-y-3 transition ${
                theme === 'dark'
                  ? 'border-primary bg-primary-light/40 ring-2 ring-primary text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon className="w-5 h-5" />
                {theme === 'dark' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <span className="font-bold text-xs block">Dark</span>
                <span className="text-[10px] text-content-muted">Deep indigo contrast</span>
              </div>
            </button>

            {/* System */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-card border text-left flex flex-col justify-between space-y-3 transition ${
                theme === 'system'
                  ? 'border-primary bg-primary-light/40 ring-2 ring-primary text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <Laptop className="w-5 h-5" />
                {theme === 'system' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <span className="font-bold text-xs block">System</span>
                <span className="text-[10px] text-content-muted">Sync with device OS</span>
              </div>
            </button>
          </div>
        </div>

        {/* Display Density */}
        <div>
          <label className="block font-semibold text-content-main mb-2">Information Density</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`p-3 rounded-card border text-left flex items-center justify-between transition ${
                density === 'comfortable'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card text-content-main'
              }`}
            >
              <div>
                <span className="text-xs block">Comfortable</span>
                <span className="text-[10px] text-content-muted font-normal">Spacious cards & generous padding</span>
              </div>
              {density === 'comfortable' && <Check className="w-4 h-4 text-primary" />}
            </button>

            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`p-3 rounded-card border text-left flex items-center justify-between transition ${
                density === 'compact'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card text-content-main'
              }`}
            >
              <div>
                <span className="text-xs block">Compact</span>
                <span className="text-[10px] text-content-muted font-normal">Tighter tables & dense metrics</span>
              </div>
              {density === 'compact' && <Check className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>

        {/* Play Intro Preference */}
        <div>
          <label className="block font-semibold text-content-main mb-2">Play Intro Screen</label>
          <p className="text-[11px] text-content-muted mb-2.5">
            Configure when the full-screen AI Engine Loading intro is shown on the public portal.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {/* Always */}
            <button
              type="button"
              onClick={() => handleIntroPrefChange('always')}
              className={`p-3 rounded-card border text-left flex flex-col justify-between space-y-2 transition ${
                introPref === 'always'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">Always</span>
                {introPref === 'always' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-[10px] text-content-muted font-normal">Every visit to portal</span>
            </button>

            {/* Once per session */}
            <button
              type="button"
              onClick={() => handleIntroPrefChange('session')}
              className={`p-3 rounded-card border text-left flex flex-col justify-between space-y-2 transition ${
                introPref === 'session'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">Once / Session</span>
                {introPref === 'session' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-[10px] text-content-muted font-normal">Default (once per tab)</span>
            </button>

            {/* Never */}
            <button
              type="button"
              onClick={() => handleIntroPrefChange('never')}
              className={`p-3 rounded-card border text-left flex flex-col justify-between space-y-2 transition ${
                introPref === 'never'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card hover:border-primary/50 text-content-main'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">Never</span>
                {introPref === 'never' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-[10px] text-content-muted font-normal">Skip directly to portal</span>
            </button>
          </div>
        </div>

        {/* Default Startup View */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5">Default Startup Destination</label>
          <select
            value={userPrefs.defaultLandingPage || 'dashboard'}
            onChange={(e) => handleLandingPageChange(e.target.value)}
            className="w-full p-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="dashboard">Role Dashboard (Customer / Staff / Admin)</option>
            <option value="chat">AI Utility Copilot</option>
            <option value="landing">Public Portal Home</option>
          </select>
        </div>
      </div>
    </div>
  );
};

