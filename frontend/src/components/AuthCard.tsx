import React, { useState } from 'react';
import { useAuth, PRESET_USERS, DemoPersona } from '../contexts/AuthContext';
import {
  ShieldCheck, Lock, User, Mail, ArrowRight, CheckCircle2,
  Zap, KeyRound, AlertCircle, RefreshCw, X, HelpCircle
} from 'lucide-react';

export interface AuthCardProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  initialPersonaId?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccess,
  isModal = false,
  onClose,
  title,
  subtitle,
  initialPersonaId
}) => {
  const {
    user,
    firebaseUser,
    isEmailVerified,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    sendVerificationEmail,
    switchPersona
  } = useAuth();

  // Mode: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Demo Persona Password Modal State
  const [selectedDemo, setSelectedDemo] = useState<DemoPersona | null>(() => {
    if (initialPersonaId) {
      return PRESET_USERS.find(p => p.id === initialPersonaId) || null;
    }
    return null;
  });
  const [demoPasswordInput, setDemoPasswordInput] = useState('');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  React.useEffect(() => {
    if (initialPersonaId) {
      const match = PRESET_USERS.find(p => p.id === initialPersonaId);
      if (match) {
        setSelectedDemo(match);
        setDemoPasswordInput('');
        setDemoError(null);
      }
    }
  }, [initialPersonaId]);

  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In was closed before completing.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Please wait a moment and try again.';
      default:
        return err?.message || 'An unexpected authentication error occurred.';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(fullName, email, password);
      setSuccessMessage('Account registered successfully! A verification email has been sent to your inbox. Please verify before accessing protected services.');
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Please enter your registered email address to receive a password reset link.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage(`Password reset link sent to ${email}. Please check your inbox.`);
      setMode('signin');
    } catch (err: any) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (demo: DemoPersona) => {
    setError(null);
    setDemoError(null);
    setSelectedDemo(demo);
    setDemoPasswordInput('');
  };

  const handleDemoPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDemo || !demoPasswordInput) return;

    setDemoLoading(true);
    setDemoError(null);

    const result = await switchPersona(selectedDemo.id, demoPasswordInput);
    setDemoLoading(false);

    if (result.success) {
      setSelectedDemo(null);
      if (onSuccess) onSuccess();
    } else {
      setDemoError(result.message || 'Authentication failed. Please verify the demo password in Firebase Console.');
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      setSuccessMessage('Verification email resent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(formatFirebaseError(err));
    }
  };

  return (
    <div className="bg-slate-800/95 py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-700/80 backdrop-blur-md space-y-6 text-slate-100 relative">
      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Modal Header if configured */}
      {title && (
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <h3 className="text-lg font-extrabold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}

      {/* 1. Quick Demo Persona Selector (3 Preserved Personas with genuine Firebase Auth) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <KeyRound className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            Select Demo Persona
          </span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Firebase Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESET_USERS.map((demo) => {
            const isSelected = user?.user_id === demo.id;
            return (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleDemoSelect(demo)}
                disabled={loading || demoLoading}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-400'
                    : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/50 hover:border-blue-400/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition">
                    {demo.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      demo.role === 'Administrator'
                        ? 'bg-purple-900 text-purple-300'
                        : demo.role === 'Employee'
                        ? 'bg-indigo-900 text-indigo-300'
                        : 'bg-blue-900 text-blue-300'
                    }`}
                  >
                    {demo.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">
                  {demo.dept || demo.city}
                </div>
                <div className="text-[9px] font-mono text-blue-400 mt-1 flex items-center justify-between">
                  <span>ID: {demo.id}</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
          Clicking a persona prompts for its secure Firebase credentials
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-800 px-3 text-slate-400 font-semibold tracking-wider">
            Or Firebase Authentication
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{successMessage}</span>
        </div>
      )}

      {/* Email Verification Banner (if logged in but unverified) */}
      {firebaseUser && !isEmailVerified && (
        <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Email Verification Required</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            A verification link was sent to <strong>{firebaseUser.email}</strong>. Please click the link in your email to activate full citizen services.
          </p>
          <button
            type="button"
            onClick={handleResendVerification}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
          >
            Resend verification email
          </button>
        </div>
      )}

      {/* Tab Navigation: Sign In vs Create Account */}
      {mode !== 'forgot' && (
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/60">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              mode === 'signin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Form 1: Standard Email & Password Sign In */}
      {mode === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Email Address</label>
            <div className="mt-1 relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); }}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="mt-1 relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Form 2: Register / Create Citizen Account */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Full Name</label>
            <div className="mt-1 relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rajesh Sharma"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Email Address</label>
            <div className="mt-1 relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh.sharma@example.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Password (Min 6 chars)</label>
            <div className="mt-1 relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Confirm Password</label>
            <div className="mt-1 relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-200">
            <span className="font-semibold">Security Policy:</span> Newly registered public citizens are securely assigned the <strong>Customer</strong> role by the backend. A verification email will be sent.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Registering Account…</span>
              </>
            ) : (
              <>
                <span>Create Citizen Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Form 3: Forgot Password Form */}
      {mode === 'forgot' && (
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">Reset Password</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your registered email address and Firebase will send you a password reset link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Email Address</label>
            <div className="mt-1 relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Send Reset Link</span>}
            </button>
          </div>
        </form>
      )}

      {/* Google Sign-In Provider Button */}
      {mode !== 'forgot' && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-2.5 border border-slate-300"
          >
            {/* Official Google 'G' Logo SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      )}

      {/* Footer Security Badge */}
      <div className="pt-3 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
          RBAC Verified Backend
        </span>
        <span className="font-mono text-[10px] text-slate-500">FastAPI + Firebase Auth + MongoDB</span>
      </div>

      {/* Demo Persona Password Dialog (Prompted on Persona selection) */}
      {selectedDemo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 border border-slate-700 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedDemo(null)}
              aria-label="Close demo modal"
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Authenticate Demo Persona</h3>
              <p className="text-xs text-slate-300 mt-1">
                Authenticating as <strong>{selectedDemo.name}</strong> ({selectedDemo.email}).
              </p>
            </div>

            {demoError && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
                {demoError}
              </div>
            )}

            <form onSubmit={handleDemoPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Firebase Account Password</label>
                <input
                  type="password"
                  value={demoPasswordInput}
                  onChange={(e) => setDemoPasswordInput(e.target.value)}
                  placeholder="Enter password..."
                  required
                  autoFocus
                  className="w-full mt-1 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedDemo(null)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={demoLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center space-x-1"
                >
                  {demoLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Sign In</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
