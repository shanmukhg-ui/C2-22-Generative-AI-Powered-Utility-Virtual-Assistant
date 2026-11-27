import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';
import { ChatMessage, Citation } from '../types';
import {
  Send, FileText, Paperclip, CheckCircle2, ShieldAlert
} from 'lucide-react';

// Formatted Markdown component that renders bold keywords and aligned bullet points
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Check for bullet line (•, -, *, 1.)
        const isBullet =
          trimmed.startsWith('•') ||
          trimmed.startsWith('-') ||
          trimmed.startsWith('*') ||
          /^\d+\./.test(trimmed);

        // Remove bullet prefix for cleaner rendering
        const cleanLine = trimmed.replace(/^([•\-\*]|\d+\.)\s*/, '');

        // Render inline bold formatting **text**
        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-white tracking-wide">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          });
        };

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start space-x-2.5 pl-2 py-0.5">
              <span className="text-[#A78BFA] font-black text-sm leading-none select-none mt-1">•</span>
              <span className="text-slate-200 font-normal leading-normal">{renderInline(cleanLine)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-slate-100 font-medium leading-normal">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const ChatPage: React.FC<{ initialQuery?: string }> = ({ initialQuery }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    'Please list all complaints',
    'List all successfully resolved cases',
    'What are the currently assigned cases?',
    'Show all pending complaints',
    'Critical electricity incidents in Ward 11 that are still unresolved',
    'Assigned cases for Rajesh Kumar',
    'I want to lodge a grievance'
  ];

  // Initialize greeting (matching Image 2 exactly)
  useEffect(() => {
    const defaultWelcome: ChatMessage = {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hi! I can answer from approved utility documents, look up your requests and complaints, and summarize operations (staff only).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([defaultWelcome]);

    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(
        textToSend,
        undefined,
        user?.role,
        user?.user_id
      );

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: res.intent,
        citations: res.citations || [],
        cards: res.cards || [],
        action_buttons: res.action_buttons || [],
        security_alert: res.security_alert || false,
        confidence: res.confidence,
        latency_ms: res.latency_ms
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'system',
          text: `Error connecting to assistant: ${err.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: 'Hi! I can answer from approved utility documents, look up your requests and complaints, and summarize operations (staff only).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0C28] text-white font-sans overflow-hidden">
      {/* 1. Header (Matching Screenshot 2) */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-[#231F58] bg-[#120F35] sticky top-0 z-20">
        <h1 className="text-2xl font-black text-white tracking-tight">AI Utility Assistant</h1>

        <button
          onClick={handleNewChat}
          className="px-4 py-2 bg-[#2D1B69] hover:bg-[#3D258A] text-[#C4B5FD] border border-[#4C2882] rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
        >
          New chat
        </button>
      </div>

      {/* 2. Messages Canvas (Deep Indigo with High-Contrast Clear Alignment) */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 space-y-6">
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-2xl bg-[#6D28F5] text-white px-5 py-3.5 rounded-2xl rounded-tr-none shadow-md text-sm font-medium leading-relaxed">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Assistant Response Card (Matching Image 2)
          return (
            <div key={msg.id} className="flex items-start space-x-3.5 max-w-3xl">
              {/* Circular Purple "AI" Avatar Badge */}
              <div className="w-8 h-8 rounded-full bg-[#6D28F5] text-white flex items-center justify-center font-black text-xs shadow-md shadow-purple-600/30 flex-shrink-0 mt-0.5">
                AI
              </div>

              {/* Message Box */}
              <div className="flex-1 bg-[#171442] border border-[#2B246B] rounded-2xl p-5 space-y-3.5 shadow-sm">
                {/* Security Alert Header if any */}
                {msg.security_alert && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>RBAC Access Restricted: Record isolation policy enforced.</span>
                  </div>
                )}

                {/* Formatted Markdown Body with Aligned Bullets & Bold */}
                <FormattedMarkdown content={msg.text} />

                {/* Structured Dynamic Data Table Card */}
                {msg.cards && msg.cards.map((card: any, cIdx: number) => {
                  if (card.type === 'DATA_TABLE' && card.rows && card.rows.length > 0) {
                    return (
                      <div key={cIdx} className="mt-3 pt-3 border-t border-[#2B246B] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#A78BFA] tracking-wide uppercase">
                            {card.title}
                          </span>
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#271B55] text-[#DDD6FE] border border-[#4C2882]">
                            Showing {card.showing_count} of {card.total_count} records
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-[#2B246B] bg-[#120F35] max-h-72 overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-200">
                            <thead className="bg-[#1A1647] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#2B246B] sticky top-0">
                              <tr>
                                <th className="py-2 px-3">Ticket ID</th>
                                <th className="py-2 px-3">Utility</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 px-3">Priority</th>
                                <th className="py-2 px-3">Location</th>
                                <th className="py-2 px-3">Staff</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2B246B]/60 font-medium">
                              {card.rows.map((row: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-white/5 transition">
                                  <td className="py-2 px-3 font-bold text-[#A78BFA] whitespace-nowrap">{row.id}</td>
                                  <td className="py-2 px-3 whitespace-nowrap">{row.utility}</td>
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      (row.status || '').toLowerCase().includes('resolve') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                      (row.status || '').toLowerCase().includes('progress') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                                      'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap text-[11px]">{row.priority}</td>
                                  <td className="py-2 px-3 text-[11px] text-slate-300 max-w-[150px] truncate">{row.location}</td>
                                  <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">{row.assignee}</td>
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

                {/* Quick Action Buttons */}
                {msg.action_buttons && msg.action_buttons.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {msg.action_buttons.map((btn: any, bIdx: number) => (
                      <button
                        key={bIdx}
                        onClick={() => handleSend(btn.target || btn.text)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#6D28F5] hover:bg-[#5B21D6] text-white text-xs font-bold shadow-md transition active:scale-95"
                      >
                        <span>{btn.text}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Citation Pill Chips (Matching Screenshot 2: New Connection Guide · p.2) */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {msg.citations.map((c, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#271B55] border border-[#3E297A] text-[#C4B5FD] text-xs font-semibold hover:bg-[#342373] transition cursor-default shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#A78BFA] flex-shrink-0" />
                        <span>{c.document_name} · p.{c.page_number}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Footer (Copy, Thumbs Up, Thumbs Down) */}
                <div className="pt-1 flex items-center space-x-4 text-slate-400 text-xs">
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-white transition font-medium flex items-center space-x-1"
                  >
                    <span>Copy</span>
                    {copiedId === msg.id && <span className="text-emerald-400 font-bold ml-1">Copied!</span>}
                  </button>
                  <button className="hover:text-purple-300 transition text-sm cursor-pointer" title="Helpful">
                    👍
                  </button>
                  <button className="hover:text-purple-300 transition text-sm cursor-pointer" title="Not helpful">
                    👎
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center space-x-3.5 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-[#6D28F5] text-white flex items-center justify-center font-black text-xs shadow-md shadow-purple-600/30 flex-shrink-0 animate-pulse">
              AI
            </div>
            <div className="bg-[#171442] rounded-2xl p-4 border border-[#2B246B] shadow-sm flex items-center space-x-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#6D28F5] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#6D28F5] animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#6D28F5] animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 font-medium text-slate-300">Grounded RAG retrieval active...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Suggested Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-8 pb-3 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex-shrink-0">
            Suggested:
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="px-3.5 py-1.5 rounded-xl bg-[#171442] hover:bg-[#231E5E] text-slate-300 hover:text-white border border-[#2B246B] transition font-medium flex-shrink-0 text-xs shadow-xs"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 4. Chat Input Bar (Dark Indigo Matching Design) */}
      <div className="p-6 bg-[#120F35] border-t border-[#231F58]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-center bg-[#1B174F] hover:bg-[#201C5C] focus-within:bg-[#221D63] rounded-2xl border border-[#342C80] focus-within:border-[#6D28F5] p-2 transition shadow-md"
        >
          {/* Paperclip Icon */}
          <button
            type="button"
            className="p-2.5 text-slate-400 hover:text-[#A78BFA] transition rounded-xl"
            title="Attach reference document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Input text */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about utility services..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none font-medium"
          />

          {/* Purple Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-[#6D28F5] hover:bg-[#5B21D6] disabled:opacity-40 text-white rounded-xl shadow-md shadow-purple-600/30 transition transform active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
