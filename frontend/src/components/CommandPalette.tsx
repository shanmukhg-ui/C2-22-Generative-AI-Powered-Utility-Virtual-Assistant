import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, LayoutDashboard, ClipboardList, AlertCircle,
  Activity, BookOpen, ShieldCheck, User, Settings, ArrowRight,
  Zap, Droplets, Flame, Radio, Recycle, X, CornerDownLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onOpenNewRequest: () => void;
  onOpenNewComplaint: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewRequest,
  onOpenNewComplaint,
  onSelectPrompt
}) => {
  const { user, switchPersona } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    // Navigation items
    {
      id: 'nav-chat',
      title: 'Open AI Utility Assistant',
      category: 'Navigation',
      icon: Sparkles,
      action: () => { onNavigate('chat'); onClose(); }
    },
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        if (user?.role === 'Employee') onNavigate('employee-dash');
        else if (user?.role === 'Administrator') onNavigate('admin-dash');
        else onNavigate('customer-dash');
        onClose();
      }
    },
    {
      id: 'nav-landing',
      title: 'Public Portal (Landing Page)',
      category: 'Navigation',
      icon: Zap,
      action: () => { onNavigate('landing'); onClose(); }
    },
    {
      id: 'nav-req',
      title: 'Service Requests Registry',
      category: 'Navigation',
      icon: ClipboardList,
      action: () => { onNavigate('requests'); onClose(); }
    },
    {
      id: 'nav-cmp',
      title: 'Grievance & Complaints Desk',
      category: 'Navigation',
      icon: AlertCircle,
      action: () => { onNavigate('complaints'); onClose(); }
    },
    {
      id: 'nav-ops',
      title: 'Operational Telemetry & Ward Grid',
      category: 'Navigation',
      icon: Activity,
      action: () => { onNavigate('operations'); onClose(); }
    },
    {
      id: 'nav-kb',
      title: 'Knowledge Base & Ingested SOPs',
      category: 'Navigation',
      icon: BookOpen,
      action: () => { onNavigate('knowledge'); onClose(); }
    },
    // Quick Actions
    {
      id: 'act-req',
      title: 'New Service Request (Electricity, Water, Gas...)',
      category: 'Quick Actions',
      icon: ClipboardList,
      action: () => { onOpenNewRequest(); onClose(); }
    },
    {
      id: 'act-cmp',
      title: 'Lodge Official Consumer Grievance',
      category: 'Quick Actions',
      icon: AlertCircle,
      action: () => { onOpenNewComplaint(); onClose(); }
    },
    // Personas (1-Click Switch)
    {
      id: 'role-cust',
      title: 'Switch to John Doe (Citizen / Customer)',
      category: 'Switch Role (RBAC)',
      icon: User,
      action: () => { switchPersona('CUST0001'); onClose(); }
    },
    {
      id: 'role-emp',
      title: 'Switch to Priya Singh (Operations Staff)',
      category: 'Switch Role (RBAC)',
      icon: Activity,
      action: () => { switchPersona('EMP0001'); onClose(); }
    },
    {
      id: 'role-adm',
      title: 'Switch to Amit Kumar (System Administrator)',
      category: 'Switch Role (RBAC)',
      icon: ShieldCheck,
      action: () => { switchPersona('ADM0001'); onClose(); }
    },
    // Sample AI Queries
    {
      id: 'ai-elec',
      title: 'Ask AI: What documents are required for a new electricity connection?',
      category: 'AI Knowledge Inquiries',
      icon: Zap,
      action: () => {
        onSelectPrompt('What documents are required for a new electricity connection?');
        onNavigate('chat');
        onClose();
      }
    },
    {
      id: 'ai-tariff',
      title: 'Ask AI: Explain electricity tariff slabs and billing calculations',
      category: 'AI Knowledge Inquiries',
      icon: Zap,
      action: () => {
        onSelectPrompt('Explain electricity tariff slabs and billing calculations');
        onNavigate('chat');
        onClose();
      }
    },
    {
      id: 'ai-water',
      title: 'Ask AI: How to request a new water connection and pressure check?',
      category: 'AI Knowledge Inquiries',
      icon: Droplets,
      action: () => {
        onSelectPrompt('How to request a new water connection and pressure check?');
        onNavigate('chat');
        onClose();
      }
    },
    {
      id: 'ai-ops',
      title: 'Ask AI: Summarize today operational issues and outages',
      category: 'AI Knowledge Inquiries',
      icon: Activity,
      action: () => {
        onSelectPrompt("Summarize today's operational issues and outages");
        onNavigate('chat');
        onClose();
      }
    }
  ];

  const filtered = actions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-[#6D28F5] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, query, SOP, or ticket... (e.g. 'Electricity', 'Lodge', 'Summary')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-[#171642] placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching commands or procedures found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F3EEFF]/60 cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6D28F5] group-hover:bg-[#6D28F5] group-hover:text-white flex items-center justify-center transition shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#171642] group-hover:text-[#6D28F5] transition">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#6D28F5] transition" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center space-x-3">
            <span>Navigation: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd></span>
            <span>Close: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Esc</kbd></span>
          </div>
          <span className="text-[#6D28F5] font-bold">UtilityAI Copilot</span>
        </div>
      </div>
    </div>
  );
};

