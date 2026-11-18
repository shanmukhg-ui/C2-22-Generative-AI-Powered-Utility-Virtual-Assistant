import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles, LayoutDashboard, ClipboardList, AlertCircle,
  Activity, BookOpen, Users, ShieldCheck, Settings, User,
  Zap, LogOut, Home, ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, switchPersona } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role || 'Customer';

  // Navigation items based on role
  const getNavItems = (): NavItem[] => {
    const commonStart = [
      { id: 'landing', label: 'Public Portal', icon: Home, badge: 'Home' },
      { id: 'chat', label: 'AI Assistant', icon: Sparkles, badge: 'RAG' }
    ];

    if (role === 'Customer') {
      return [
        ...commonStart,
        { id: 'customer-dash', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'requests', label: 'Service Requests', icon: ClipboardList, badge: 'Live' },
        { id: 'complaints', label: 'Complaints', icon: AlertCircle },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    }

    if (role === 'Employee') {
      return [
        ...commonStart,
        { id: 'employee-dash', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'operations', label: 'Operations', icon: Activity, badge: '28 Incidents' },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    }

    // Administrator
    return [
      ...commonStart,
      { id: 'admin-dash', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'Users Directory', icon: Users, badge: '105' },
      { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, badge: 'SOPs' },
      { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings }
    ];
  };

  const navItems = getNavItems();

  const getInitials = (name?: string) => {
    if (!name) return 'JD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isCurrentActive = (id: string) => {
    if (currentPage === id) return true;
    if (id === 'customer-dash' && currentPage === 'customer-dash') return true;
    if (id === 'employee-dash' && currentPage === 'employee-dash') return true;
    if (id === 'admin-dash' && currentPage === 'admin-dash') return true;
    return false;
  };

  return (
    <aside
      className={`bg-gradient-to-b from-[#171642] via-[#1B194B] to-[#121133] text-white flex flex-col flex-shrink-0 min-h-screen select-none border-r border-[#24215E] transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/10">
        <div
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
          title="Return to Public Landing Page"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-105 transition shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-xl font-black tracking-tight text-white font-sans block leading-none">
                Utility<span className="text-[#A78BFA]">AI</span>
              </span>
              <span className="text-[10px] text-purple-300 tracking-wider uppercase font-semibold">
                TechBharat C2-22
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.id);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
              } py-2.5 rounded-xl text-xs font-bold transition-all group relative ${
                active
                  ? 'bg-gradient-to-r from-[#6D28F5] to-[#7C3AED] text-white shadow-lg shadow-purple-900/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-purple-300 group-hover:bg-white/15'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Active pill indicator on left edge */}
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Switcher & Profile Section */}
      <div className="p-3.5 border-t border-white/10 bg-[#0F0E2A]/70">
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={() => onNavigate('profile')}
            className="flex items-center space-x-2.5 min-w-0 cursor-pointer hover:opacity-90 transition group flex-1"
            title="View & Edit Profile"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] text-white flex items-center justify-center font-black text-xs shadow-md flex-shrink-0 relative group-hover:ring-2 group-hover:ring-[#A78BFA]">
              {getInitials(user?.name)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0F0E2A]" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#A78BFA] transition">
                  {user?.name || 'John Doe'}
                </p>
                <p className="text-[11px] text-purple-300 truncate leading-tight mt-0.5">
                  {user?.role || 'Customer'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (role === 'Customer') switchPersona('EMP0001');
              else if (role === 'Employee') switchPersona('ADM0001');
              else switchPersona('CUST0001');
            }}
            title="Cycle persona (Customer → Employee → Admin)"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-[#6D28F5] text-slate-300 hover:text-white transition flex-shrink-0 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-purple-300 hover:text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
};
