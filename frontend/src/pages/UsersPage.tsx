import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../services/api';
import { User, Role } from '../types';
import {
  Users, Search, Filter, Shield, Briefcase, User as UserIcon,
  RefreshCw, CheckCircle2, ChevronRight, MapPin, Database,
  ArrowRight, ExternalLink
} from 'lucide-react';

export const UsersPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const { user, switchPersona } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers(120);
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.city || '').toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
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
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#171642] tracking-tight">Users Directory</h1>
            <p className="text-xs text-slate-500">
              Manage all 105+ registered citizens, utility technicians, and system administrators in MongoDB Atlas.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Atlas Live: {users.length} Users</span>
          </div>

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

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, ID, or ward..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Role:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D28F5] transition"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="Customer">Customers ({users.filter(u => u.role === 'Customer').length})</option>
            <option value="Employee">Staff ({users.filter(u => u.role === 'Employee').length})</option>
            <option value="Administrator">Administrators ({users.filter(u => u.role === 'Administrator').length})</option>
          </select>
        </div>
      </div>

      {/* 3. Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FC] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">User / Citizen</th>
                <th className="py-3.5 px-6">User ID</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Department / Scope</th>
                <th className="py-3.5 px-6">Location</th>
                <th className="py-3.5 px-6 text-right">Switch Persona</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D28F5]" />
                    <span>Loading users from MongoDB Atlas...</span>
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

                  return (
                    <tr
                      key={u.user_id}
                      className={`hover:bg-[#F3EEFF]/30 transition ${
                        isCurrent ? 'bg-[#F3EEFF]/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
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

                      <td className="py-3.5 px-6">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="py-3.5 px-6 text-slate-600 font-medium">
                        {u.department || 'Citizen Services'}
                      </td>

                      <td className="py-3.5 px-6 text-slate-500">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.city || 'Vizag'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        {isCurrent ? (
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitch(u.user_id)}
                            disabled={switchingId === u.user_id}
                            className="px-3 py-1.5 bg-white hover:bg-[#6D28F5] text-slate-700 hover:text-white border border-slate-200 hover:border-[#6D28F5] rounded-xl text-xs font-bold transition shadow-xs"
                          >
                            {switchingId === u.user_id ? 'Switching...' : 'Switch Persona'}
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
    </div>
  );
};
