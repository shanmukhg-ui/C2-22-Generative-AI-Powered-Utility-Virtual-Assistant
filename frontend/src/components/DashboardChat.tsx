import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, ChevronRight, ChevronLeft, Trash2, Send, Copy,
  Check, ArrowRight, ShieldCheck, MapPin, FileText, Users,
  ClipboardList, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';

export interface ActionButton {
  text: string;
  action: string;
  target?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: Array<{
    document_id: string;
    document_name: string;
    page_number: number;
    text_snippet?: string;
  }>;
  cards?: any[];
  actionButtons?: ActionButton[];
}

interface DashboardChatProps {
  role: string;
  onNavigate?: (page: string) => void;
  onOpenNewRequest?: () => void;
  onOpenNewComplaint?: () => void;
  onOpenUploadDoc?: () => void;
}

const STORAGE_COLLAPSE_KEY = 'utilityai_docked_chat_collapsed';
const STORAGE_HISTORY_PREFIX = 'utilityai_dashboard_chat_';

export const DashboardChat: React.FC<DashboardChatProps> = ({
  role,
  onNavigate,
  onOpenNewRequest,
  onOpenNewComplaint,
  onOpenUploadDoc
}) => {
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(' ')[0] : (role === 'Employee' ? 'Priya' : (role === 'Administrator' ? 'Amit' : 'John'));

  // Collapsed state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Role-specific initial greetings and chips
  const getGreeting = () => {
    switch (role) {
      case 'Employee':
        return `Hi ${userName}! I can help with incidents, outages and SOPs.`;
      case 'Administrator':
        return `Hi ${userName}! I can help manage users, documents and the system.`;
      case 'Customer':
      default:
        return `Hi ${userName}! I can help you apply for a service or file a complaint.`;
    }
  };

  const getChips = () => {
    switch (role) {
      case 'Employee':
        return [
          "Summarize today's operations",
          'Show critical incidents',
          'What are the currently assigned cases?',
          'List all successfully resolved cases',
          'Please list all complaints',
          'Find an SOP'
        ];
      case 'Administrator':
        return [
          'Please list all complaints',
          'What are the currently assigned cases?',
          'Manage users',
          'View audit logs',
          'Ingestion status',
          'Settings help'
        ];
      case 'Customer':
      default:
        return [
          'Please list all complaints',
          'Show all pending complaints',
          'Lodge a new grievance',
          'Track my request',
          'How to apply for a service',
          'Billing help'
        ];
    }
  };

  // Load chat history from localStorage or set initial welcome message
  useEffect(() => {
    const storageKey = `${STORAGE_HISTORY_PREFIX}${user?.user_id || role}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load chat history from localStorage', e);
    }

    // Default welcome message if no history
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'assistant',
        text: getGreeting(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [role, user?.user_id]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length === 0) return;
    const storageKey = `${STORAGE_HISTORY_PREFIX}${user?.user_id || role}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      // quota or blocked
    }
  }, [messages, role, user?.user_id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (!isCollapsed && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSE_KEY, String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleClearChat = () => {
    const initialMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'assistant',
      text: getGreeting(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    const storageKey = `${STORAGE_HISTORY_PREFIX}${user?.user_id || role}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify([initialMsg]));
    } catch (e) {}
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const data = await chatApi.sendMessage(
        text,
        `session_${user?.user_id || 'guest'}`,
        role,
        user?.user_id
      );

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || "I don't have that information in verified utility documentation. Please contact support.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        cards: data.cards || [],
        actionButtons: data.action_buttons || []
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: "I couldn't reach the assistant server right now. Please ensure the backend service is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionButtonClick = (action: ActionButton) => {
    if (action.action === 'SEND_MESSAGE') {
      handleSendMessage(action.target || action.text);
    } else if (action.action === 'LOOKUP_COMPLAINT' && action.target) {
      handleSendMessage(action.target);
    } else if (action.action === 'LIST_COMPLAINTS') {
      handleSendMessage('Please list all complaints');
    } else if (action.action === 'OPEN_REQUEST_MODAL' && onOpenNewRequest) {
      onOpenNewRequest();
    } else if (action.action === 'OPEN_COMPLAINT_MODAL') {
      handleSendMessage('I want to lodge a grievance');
    } else if (action.action === 'OPEN_UPLOAD_MODAL' && onOpenUploadDoc) {
      onOpenUploadDoc();
    } else if (action.action === 'NAVIGATE' && action.target && onNavigate) {
      onNavigate(action.target);
    } else if (action.action === 'TRACK_GPS' && onNavigate) {
      onNavigate('requests');
    }
  };

  // Render markdown with clean formatting (bold, bullet points, numbers)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          if (line.startsWith('• ') || line.startsWith('- ')) {
            const content = line.replace(/^[•\-]\s*/, '');
            return (
              <div key={idx} className="flex items-start space-x-1.5 pl-1">
                <span className="text-[#6D28F5] font-bold">•</span>
                <span>{renderInlineStyles(content)}</span>
              </div>
            );
          }

          // Numbered list
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start space-x-1.5 pl-1">
                <span className="font-bold text-[#6D28F5]">{numMatch[1]}.</span>
                <span>{renderInlineStyles(numMatch[2])}</span>
              </div>
            );
          }

          return <div key={idx}>{renderInlineStyles(line)}</div>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (str: string) => {
    // Basic bold parsing: **text**
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-content-main">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  /* ---------------------------------------------
     COLLAPSED STRIP VIEW (DESKTOP)
  --------------------------------------------- */
  if (isCollapsed) {
    return (
      <div
        className="hidden lg:flex flex-col items-center justify-between w-12 border-l border-surface-border bg-surface-card py-4 transition-all duration-300 z-10 select-none shadow-xs"
        title="Expand AI Assistant Panel"
      >
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-2 rounded-lg bg-primary-light/50 text-[#6D28F5] hover:bg-primary-light hover:scale-105 transition shadow-2xs"
          aria-label="Expand AI Assistant"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center space-y-4 my-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span
            className="text-[11px] font-bold text-content-muted tracking-wider uppercase rotate-90 whitespace-nowrap"
            style={{ transformOrigin: 'center' }}
          >
            AI Assistant
          </span>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 text-content-muted hover:text-content-main transition text-[10px]"
          title="Expand"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ---------------------------------------------
     FULL DOCKED PANEL VIEW (DESKTOP & MOBILE CARD)
  --------------------------------------------- */
  return (
    <aside
      className="w-full lg:w-[370px] xl:w-[380px] lg:flex-shrink-0 flex flex-col h-full bg-surface-card border-t lg:border-t-0 lg:border-l border-surface-border transition-all duration-300 shadow-sm z-10"
      aria-label="UtilityAI Assistant Chatbot"
    >
      {/* 1. Header Bar */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-card/90 backdrop-blur-xs select-none">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-heading font-extrabold text-xs text-content-main">
                UtilityAI Assistant
              </h3>
            </div>
            {/* Grounded RAG Live Badge */}
            <div className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Grounded RAG Live</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-content-muted">
          {/* Clear chat button */}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 rounded-lg hover:bg-surface-page hover:text-content-main transition"
            title="Reset conversation"
            aria-label="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Collapse Arrow */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:inline-flex p-1.5 rounded-lg hover:bg-surface-page hover:text-content-main transition"
            title="Collapse panel"
            aria-label="Collapse panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Message Body List (own scroll) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-2xs relative group transition ${
                msg.sender === 'user'
                  ? 'bg-[#6D28F5] text-white rounded-br-xs'
                  : 'bg-surface-page text-content-main border border-surface-border rounded-bl-xs'
              }`}
            >
              {renderFormattedText(msg.text)}

              {/* Structured DATA_TABLE Card */}
              {msg.cards && msg.cards.map((card: any, cIdx: number) => {
                if (card.type === 'DATA_TABLE' && card.rows && card.rows.length > 0) {
                  return (
                    <div key={cIdx} className="mt-3 pt-2 border-t border-surface-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#6D28F5] uppercase tracking-wide">
                          {card.title || 'Dynamic Query Records'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Showing {card.showing_count} of {card.total_count}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-card max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-surface-page text-content-muted font-bold border-b border-surface-border sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2">ID</th>
                              <th className="py-1.5 px-2">Utility</th>
                              <th className="py-1.5 px-2">Status</th>
                              <th className="py-1.5 px-2">Priority</th>
                              <th className="py-1.5 px-2">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border font-medium">
                            {card.rows.slice(0, 10).map((r: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-primary-light/20 transition">
                                <td className="py-1 px-2 font-bold text-[#6D28F5] whitespace-nowrap">{r.id}</td>
                                <td className="py-1 px-2 whitespace-nowrap">{r.utility}</td>
                                <td className="py-1 px-2 whitespace-nowrap">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                    (r.status || '').toLowerCase().includes('resolve') ? 'bg-emerald-100 text-emerald-800' :
                                    (r.status || '').toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="py-1 px-2 whitespace-nowrap text-[10px]">{r.priority}</td>
                                <td className="py-1 px-2 text-[10px] text-content-muted max-w-[120px] truncate">{r.location || 'Municipal'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

              {/* Citations block for Grounded RAG */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-surface-border/60 space-y-1">
                  <div className="flex items-center space-x-1 text-[10px] text-content-muted font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-[#6D28F5]" />
                    <span>Verified Citations</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface-card border border-surface-border text-[10px] text-primary font-medium"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span>{c.document_name} (p. {c.page_number})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick action navigation buttons embedded in reply */}
              {msg.actionButtons && msg.actionButtons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-border/50 flex flex-wrap gap-1.5">
                  {msg.actionButtons.map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleActionButtonClick(btn)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#6D28F5] hover:bg-[#5B21D6] text-white text-[11px] font-bold shadow-2xs transition active:scale-95"
                    >
                      <span>{btn.text}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Copy button for assistant responses */}
              {msg.sender === 'assistant' && (
                <button
                  type="button"
                  onClick={() => handleCopy(msg.id, msg.text)}
                  className="absolute top-2 right-2 p-1 text-content-muted hover:text-content-main opacity-0 group-hover:opacity-100 transition rounded bg-surface-card/80 shadow-2xs"
                  title="Copy response"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <span className="text-[9px] text-content-muted mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center space-x-1.5 p-2.5 bg-surface-page border border-surface-border rounded-xl w-18">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6D28F5] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#6D28F5] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#6D28F5] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Role-specific Quick-Action Chips */}
      <div className="px-3 pt-2 pb-1 border-t border-surface-border bg-surface-card">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          {getChips().map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-primary-light/60 hover:bg-primary-light text-[#6D28F5] border border-primary/20 text-[10px] font-semibold transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Input Box */}
      <div className="p-3 border-t border-surface-border bg-surface-card">
        <div className="flex items-center space-x-2 bg-surface-page border border-surface-border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#6D28F5] focus-within:border-transparent transition">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${role === 'Customer' ? 'services or complaints' : (role === 'Employee' ? 'outages & SOPs' : 'users & docs')}…`}
            className="flex-1 bg-transparent border-none text-xs text-content-main focus:outline-none placeholder:text-content-muted"
          />
          <button
            type="button"
            disabled={!inputMessage.trim() || isTyping}
            onClick={() => handleSendMessage()}
            className={`p-1.5 rounded-lg transition ${
              inputMessage.trim() && !isTyping
                ? 'bg-[#6D28F5] text-white hover:bg-[#5B21D6] active:scale-95'
                : 'text-content-muted opacity-40 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
