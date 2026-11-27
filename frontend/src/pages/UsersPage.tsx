import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, CreateUserPayload } from '../services/api';
import { User, Role } from '../types';
import {
  Users, Search, Filter, Shield, Briefcase, User as UserIcon,
  RefreshCw, CheckCircle2, ChevronRight, MapPin, Database,
  ArrowRight, ExternalLink, UserPlus, ShieldAlert, ShieldCheck,
  AlertCircle, Copy, Check, X, Lock, Power, UserX, AlertTriangle
} from 'lucide-react';

export const UsersPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const { user, switchPersona } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Modals state
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success result state
  const [provisionResult, setProvisionResult] = useState<{
    user: User;
    activation_link?: string;
    message: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers({ limit: 200 });
      setUsers(data || []);
    } catch (err: any) {
      console.error('Failed to load users directory:', err);
      setActionMessage({ type: 'error', text: 'Failed to load users from backend.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSwitch = async (uid: string) => {
    setSwitchingId(uid);
    try {
      const res = await switchPersona(uid);
      if (!res.success && res.requiresPassword) {
        const pass = window.prompt(res.message || `Enter password for ${res.email}:`);
        if (pass) {
          await switchPersona(uid, pass);
        }
      }
    } finally {
      setSwitchingId(null);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormDept('');
    setFormPhone('');
    setFormCity('');
    setFormPassword('');
    setAdminConfirmed(false);
    setFormError(null);
    setProvisionResult(null);
    setCopiedLink(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please provide both full name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        department: formDept.trim() || 'Operations',
        phone: formPhone.trim() || undefined,
        city: formCity.trim() || 'Visakhapatnam',
        password: formPassword.trim() || undefined
      };
      const res = await adminApi.createEmployee(payload);
      setProvisionResult({
        user: res.user,
        activation_link: res.activation_link,
        message: res.message
      });
      await loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to create employee account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdministrator = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!adminConfirmed) {
      setFormError('You must explicitly confirm authorization before provisioning an Administrator.');
      return;
    }
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please provide both full name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        department: formDept.trim() || 'IT Administration',
        phone: formPhone.trim() || undefined,
        city: formCity.trim() || 'Visakhapatnam',
        password: formPassword.trim() || undefined
      };
      const res = await adminApi.createAdministrator(payload);
      setProvisionResult({
        user: res.user,
        activation_link: res.activation_link,
        message: res.message
      });
      await loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to create administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    const isCurrentlyActive = targetUser.is_active !== false && targetUser.status !== 'Inactive';

    if (isCurrentlyActive) {
      // Guard against self-deactivation
      if (user?.user_id === targetUser.user_id) {
        setActionMessage({ type: 'error', text: 'You cannot deactivate your own administrative account.' });
        return;
      }

      // Guard against deactivating the last active admin
      if (targetUser.role === 'Administrator') {
        const activeAdmins = users.filter(
          (u) => u.role === 'Administrator' && u.is_active !== false && u.status !== 'Inactive' && u.user_id !== targetUser.user_id
        );
        if (activeAdmins.length === 0) {
          setActionMessage({ type: 'error', text: 'Cannot deactivate the last active Administrator account.' });
          return;
        }
      }

      // Open deactivation confirmation modal
      setDeactivatingUser(targetUser);
      setDeactivateReason('');
      return;
    }

    // Reactivate directly
    try {
      await adminApi.updateUserStatus(targetUser.user_id, { is_active: true });
      setActionMessage({ type: 'success', text: `Account ${targetUser.user_id} (${targetUser.name}) reactivated.` });
      await loadUsers();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || err.message || 'Failed to reactivate account.' });
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingUser) return;
    setSubmitting(true);
    try {
      await adminApi.updateUserStatus(deactivatingUser.user_id, {
        is_active: false,
        reason: deactivateReason.trim() || undefined
      });
      setActionMessage({
        type: 'success',
        text: `Account ${deactivatingUser.user_id} (${deactivatingUser.name}) deactivated successfully.`
      });
      setDeactivatingUser(null);
      await loadUsers();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to deactivate account.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.city || '').toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    const isActive = u.is_active !== false && u.status !== 'Inactive';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && isActive) ||
      (statusFilter === 'Inactive' && !isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: Role) => {
    if (role === 'Administrator') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-purple-300 border border-slate-700">
          <Shield className="w-3 h-3 text-purple-400" />
          <span>Administrator</span>
        </span>
      );
    }
    if (role === 'Employee') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#6D28F5] border border-purple-200">
          <Briefcase className="w-3 h-3 text-[#6D28F5]" />
          <span>Operations Staff</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <UserIcon className="w-3 h-3 text-blue-500" />
        <span>Customer / Citizen</span>
      </span>
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 text-xs font-semibold">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header with Provisioning Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#171642] tracking-tight">User Management & Directory</h1>
            <p className="text-xs text-slate-500">
              Admin-controlled provisioning, RBAC enforcement, and account lifecycle management.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Employee Button */}
          <button
            onClick={() => {
              resetForm();
              setShowAddEmployeeModal(true);
            }}
            className="px-3.5 py-2 bg-[#6D28F5] hover:bg-[#5b20d4] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>

          {/* Add Administrator Button */}
          <button
            onClick={() => {
              resetForm();
              setShowAddAdminModal(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>Add Administrator</span>
          </button>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition"
            title="Refresh Users List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Accounts</div>
          <div className="text-2xl font-extrabold text-[#171642] mt-1">{users.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Active Accounts</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {users.filter((u) => u.is_active !== false && u.status !== 'Inactive').length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Operations Staff</div>
          <div className="text-2xl font-extrabold text-[#6D28F5] mt-1">
            {users.filter((u) => u.role === 'Employee').length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Administrators</div>
          <div className="text-2xl font-extrabold text-purple-900 mt-1">
            {users.filter((u) => u.role === 'Administrator').length}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] transition"
            >
              <option value="ALL">All Roles</option>
              <option value="Customer">Customers</option>
              <option value="Employee">Staff</option>
              <option value="Administrator">Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] transition"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FC] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">User / Account</th>
                <th className="py-3.5 px-6">User ID</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D28F5]" />
                    <span>Loading directory from MongoDB Atlas...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = user?.user_id === u.user_id;
                  const isActive = u.is_active !== false && u.status !== 'Inactive';

                  return (
                    <tr
                      key={u.user_id}
                      className={`hover:bg-[#F3EEFF]/30 transition ${
                        isCurrent ? 'bg-[#F3EEFF]/40 font-semibold' : ''
                      } ${!isActive ? 'opacity-70 bg-slate-50/60' : ''}`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                              !isActive
                                ? 'bg-slate-400'
                                : u.role === 'Administrator'
                                ? 'bg-slate-900'
                                : 'bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6]'
                            }`}
                          >
                            {(u.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#171642] flex items-center space-x-2">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-slate-600 font-bold">
                        {u.user_id}
                      </td>

                      <td className="py-3.5 px-6">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-6 text-slate-600 font-medium">
                        {u.department || 'Citizen Services'}
                      </td>

                      <td className="py-3.5 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Status Toggle Button */}
                          {isCurrent ? (
                            <span className="text-[11px] text-slate-400 italic font-medium px-2 py-1">
                              Self Account
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition border ${
                                isActive
                                  ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                  : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                              }`}
                              title={isActive ? 'Deactivate user account' : 'Reactivate user account'}
                            >
                              {isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}

                          {/* Persona Switch (for quick testing) */}
                          <button
                            onClick={() => handleSwitch(u.user_id)}
                            disabled={switchingId === u.user_id || !isActive}
                            className={`px-2.5 py-1 bg-white hover:bg-[#6D28F5] text-slate-700 hover:text-white border border-slate-200 hover:border-[#6D28F5] rounded-xl text-xs font-semibold transition shadow-xs ${
                              !isActive ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {switchingId === u.user_id ? 'Switching...' : 'Switch'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD EMPLOYEE */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6D28F5] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#171642]">Provision Operations Staff</h2>
                  <p className="text-[11px] text-slate-400">Creates Employee identity in Firebase and MongoDB Atlas</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddEmployeeModal(false);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {provisionResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-900">{provisionResult.message}</div>
                    <div className="text-[11px] text-emerald-700">
                      User ID: <span className="font-mono font-bold">{provisionResult.user.user_id}</span> ({provisionResult.user.email})
                    </div>
                  </div>
                </div>

                {provisionResult.activation_link ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Password Reset / Activation Link</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={provisionResult.activation_link}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700"
                      />
                      <button
                        onClick={() => handleCopyLink(provisionResult.activation_link!)}
                        className="px-3 py-2.5 bg-[#6D28F5] text-white rounded-xl text-xs font-bold hover:bg-[#5b20d4] transition flex items-center space-x-1 shrink-0"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* SMTP Notice Banner */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Notice:</strong> External SMTP email delivery is not configured on this system.
                    Please copy the activation link above and deliver it securely to the employee to complete onboarding.
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={() => {
                      setShowAddEmployeeModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-[#6D28F5] text-white rounded-xl text-xs font-bold hover:bg-[#5b20d4] transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. arun.sharma@utilityai.org"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations / Grid"
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Work City</label>
                    <input
                      type="text"
                      placeholder="e.g. Visakhapatnam"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Initial Temporary Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave empty to use activation link"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEmployeeModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#6D28F5] text-white rounded-xl text-xs font-bold hover:bg-[#5b20d4] transition flex items-center space-x-1.5"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{submitting ? 'Provisioning...' : 'Provision Employee'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ADMINISTRATOR */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-purple-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-purple-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#171642]">Provision System Administrator</h2>
                  <p className="text-[11px] text-slate-400">Grants full system control & user management access</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddAdminModal(false);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High privilege security banner */}
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-purple-900 leading-relaxed">
                <strong>Administrative Access Warning:</strong> System Administrators have unrestricted privileges to
                manage user roles, deactivate accounts, view audit trails, and alter governance policies.
              </div>
            </div>

            {provisionResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-900">{provisionResult.message}</div>
                    <div className="text-[11px] text-emerald-700">
                      User ID: <span className="font-mono font-bold">{provisionResult.user.user_id}</span> ({provisionResult.user.email})
                    </div>
                  </div>
                </div>

                {provisionResult.activation_link ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Password Reset / Activation Link</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={provisionResult.activation_link}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700"
                      />
                      <button
                        onClick={() => handleCopyLink(provisionResult.activation_link!)}
                        className="px-3 py-2.5 bg-[#6D28F5] text-white rounded-xl text-xs font-bold hover:bg-[#5b20d4] transition flex items-center space-x-1 shrink-0"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Notice:</strong> External SMTP email delivery is not configured on this server.
                    Please copy the activation link above and deliver it securely to the administrator.
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={() => {
                      setShowAddAdminModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAdministrator} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Administrator Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh.chandra@utilityai.org"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. IT Administration"
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Visakhapatnam"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28F5]"
                    />
                  </div>
                </div>

                {/* Explicit authorization confirmation checkbox */}
                <label className="flex items-start space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminConfirmed}
                    onChange={(e) => setAdminConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-[#6D28F5] focus:ring-[#6D28F5]"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">
                    I confirm that this user is explicitly authorized to hold Administrator privileges in the system.
                  </span>
                </label>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAdminModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !adminConfirmed}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      adminConfirmed && !submitting
                        ? 'bg-slate-900 hover:bg-slate-800 text-purple-300'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{submitting ? 'Provisioning...' : 'Provision Administrator'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: DEACTIVATE USER CONFIRMATION */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center space-x-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171642]">Deactivate Account</h3>
                <p className="text-[11px] text-slate-400">Suspends access to virtual assistant services</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-900">{deactivatingUser.name}</strong> (
              <span className="font-mono font-bold">{deactivatingUser.user_id}</span>)? The user will be immediately
              blocked from logging in.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Deactivation Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Leave of absence, contract termination"
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="w-full text-xs bg-[#F8F9FC] border border-slate-200 rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeactivation}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Deactivating...' : 'Confirm Deactivation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
