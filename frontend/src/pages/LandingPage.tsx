import React, { useState } from 'react';
import {
  Zap, Droplets, Flame, Radio, Recycle, ArrowRight,
  Sparkles, CheckCircle2, ShieldCheck, ChevronRight, Lock,
  FileText, Activity, Users, Laptop, Clock, Database, ChevronDown,
  X, User, Briefcase, Shield, Cpu, RotateCcw, ExternalLink,
  Search, Check, Eye, HelpCircle, Layers, Server, MessageSquare
} from 'lucide-react';
import { AuthCard } from '../components/AuthCard';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onSelectPersona?: (personaId: string) => void;
  onLoginSuccess?: () => void;
  onTryChatWithPrompt?: (prompt: string) => void;
  onReplayIntro?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onSelectPersona,
  onLoginSuccess,
  onTryChatWithPrompt,
  onReplayIntro
}) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>(undefined);

  // In-Laptop Live Interactive Assistant Demo State
  const [activeDemoQuery, setActiveDemoQuery] = useState<string | null>(null);
  const [demoResponse, setDemoResponse] = useState<{
    text: string;
    citation: string;
    tag: string;
    intent: string;
  } | null>(null);

  const demoScenarios: { [key: string]: { text: string; citation: string; tag: string; intent: string } } = {
    'Please list all complaints': {
      text: "Found 250 record(s) in Citizen Grievances & Complaints registry. Showing live records across metropolitan wards with verified tracking IDs.",
      citation: "MongoDB complaints [/api/complaints]",
      tag: "Live Dynamic Query",
      intent: "DYNAMIC_DATA_QUERY"
    },
    'List all successfully resolved cases': {
      text: "Found 112 record(s) with Status: Resolved in Service Requests registry. All resolved tickets confirmed with completion verification.",
      citation: "MongoDB service_requests [/api/requests]",
      tag: "Live Dynamic Query",
      intent: "DYNAMIC_DATA_QUERY"
    },
    'What are the currently assigned cases?': {
      text: "Found 108 record(s) with Status: Assigned / In Progress. Field crews actively operating across municipal sectors.",
      citation: "MongoDB service_requests [/api/requests]",
      tag: "Live Dynamic Query",
      intent: "DYNAMIC_DATA_QUERY"
    },
    'Show all pending complaints': {
      text: "Found 56 record(s) with Status: Pending / Unresolved in Citizen Grievances registry awaiting regional assignment.",
      citation: "MongoDB complaints [/api/complaints]",
      tag: "Live Dynamic Query",
      intent: "DYNAMIC_DATA_QUERY"
    },
    'Critical electricity incidents in Ward 11 that are still unresolved': {
      text: "No records found matching criteria (Status: Pending / Unresolved, Severity: Critical, Utility: Electricity, Location: Ward 11) in Operational Incidents registry. Zero records verified.",
      citation: "MongoDB operational_logs [/api/operations/logs]",
      tag: "Verified 0 Matches",
      intent: "DYNAMIC_QUERY_EMPTY"
    },
    'Assigned cases for Rajesh Kumar': {
      text: "No records found matching criteria (Status: Assigned / In Progress, Staff: Rajesh Kumar) in Service Requests registry. Zero records verified.",
      citation: "MongoDB service_requests [/api/requests]",
      tag: "Verified 0 Matches",
      intent: "DYNAMIC_QUERY_EMPTY"
    },
    'Lodge a new grievance': {
      text: "Starting guided grievance lodging flow: Please select target utility department (Electricity, Water, Gas, Telecom, Solid Waste).",
      citation: "Grievance Flow Engine [Interactive]",
      tag: "Chatbot Exclusivity",
      intent: "GRIEVANCE_FLOW"
    }
  };

  const handleInLaptopPrompt = (key: string) => {
    setActiveDemoQuery(key);
    setDemoResponse(demoScenarios[key] || null);
  };

  const handleResetLaptopDemo = () => {
    setActiveDemoQuery(null);
    setDemoResponse(null);
  };

  const handleLaunchFullPrompt = (query: string) => {
    if (onTryChatWithPrompt) {
      onTryChatWithPrompt(query);
    } else {
      onGetStarted();
    }
  };

  const handleQuickLogin = (userId?: string) => {
    if (onSelectPersona && userId) {
      onSelectPersona(userId);
    } else {
      setSelectedPersonaId(userId);
      setIsLoginModalOpen(true);
      if (onLogin) onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] flex flex-col font-sans selection:bg-[#6D28F5] selection:text-white relative overflow-x-hidden">
      {/* 1. Designer Organic 3D Fluid Purple Wave Backdrop (Matches Master Reference Exactly) */}
      <div className="absolute top-0 right-0 w-[58vw] h-[820px] pointer-events-none -z-0 overflow-hidden">
        <svg
          viewBox="0 0 1000 900"
          className="w-full h-full object-cover transform translate-x-8 -translate-y-4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="purpleGradFluid" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#DDD6FE" stopOpacity="0.30" />
              <stop offset="80%" stopColor="#EDE9FE" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="purpleGlowPrimary" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#A78BFA" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
            <filter id="ambientBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="80" />
            </filter>
          </defs>

          {/* Ambient Lighting Orbs */}
          <circle cx="720" cy="360" r="320" fill="url(#purpleGlowPrimary)" filter="url(#ambientBlur)" />
          <circle cx="860" cy="500" r="280" fill="url(#purpleGradFluid)" filter="url(#ambientBlur)" />

          {/* Sculpted Smooth Flowing Organic Curve Behind Laptop */}
          <path
            d="M 380,0 C 440,160 460,300 520,440 C 580,580 720,720 1000,780 L 1000,0 Z"
            fill="url(#purpleGradFluid)"
          />
          <path
            d="M 520,0 C 580,180 620,320 670,460 C 730,600 820,720 1000,820 L 1000,0 Z"
            fill="url(#purpleGlowPrimary)"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* 2. Top Header Navigation Bar (Matches Reference White Navbar) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          {/* Logo with rounded purple icon */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6D28F5] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-purple-600/30 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#171642]">
              Utility<span className="text-[#6D28F5]">AI</span>
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-9 text-sm font-semibold text-[#111827]">
            <a href="#hero" className="text-[#6D28F5] transition relative py-1">
              Home
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#6D28F5] rounded-full" />
            </a>
            <a href="#features" className="text-[#64748B] hover:text-[#6D28F5] transition">Features</a>
            <a href="#how-it-works" className="text-[#64748B] hover:text-[#6D28F5] transition">How It Works</a>
            <a href="#technology" className="text-[#64748B] hover:text-[#6D28F5] transition">Technology</a>
            <a href="#security" className="text-[#64748B] hover:text-[#6D28F5] transition">Security</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#6D28F5] transition rounded-lg hover:bg-purple-50"
                title="Replay AI Engine intro"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay intro</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedPersonaId(undefined);
                setIsLoginModalOpen(true);
                if (onLogin) onLogin();
              }}
              className="px-6 py-2.5 text-xs font-bold text-[#111827] hover:text-[#6D28F5] border border-slate-200 hover:border-[#6D28F5] rounded-xl transition shadow-xs bg-white hover:bg-slate-50"
            >
              Login
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 bg-[#6D28F5] hover:bg-[#5B21D6] text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/30 hover:shadow-lg hover:shadow-purple-600/40 transition transform active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section (Pixel-Perfect Match with Master Reference) */}
      <section id="hero" className="relative z-10 pt-10 pb-12 px-6 lg:px-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Cohort Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#F3EEFF] text-[#6D28F5] border border-purple-200/80 text-xs font-bold tracking-wide shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-[#6D28F5]" />
              <span>TechBharat AI CoE | Project C2-22</span>
            </div>

            {/* Main Headline */}
            <h1
              id="landing-main-heading"
              tabIndex={-1}
              className="text-4xl sm:text-5xl lg:text-[54px] font-black text-[#171642] tracking-tight leading-[1.12] focus:outline-none"
            >
              Your Utility Services. <br />
              <span className="text-[#6D28F5]">Simplified by AI.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-[#64748B] leading-relaxed max-w-lg font-normal">
              An intelligent virtual assistant that helps you access utility information, track service requests, and resolve complaints faster.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onGetStarted}
                className="px-7 py-3.5 bg-[#6D28F5] hover:bg-[#5B21D6] text-white font-bold text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(109,40,245,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(109,40,245,0.55)] flex items-center space-x-2.5 transition transform active:scale-95"
              >
                <span>Try AI Assistant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="px-7 py-3.5 bg-white hover:bg-slate-50 text-[#111827] border border-[#E5E7EB] font-bold text-sm rounded-xl shadow-xs transition hover:border-slate-300"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Right Hero: High-Fidelity 3D Laptop Mockup with Live In-Screen Assistant */}
          <div className="lg:col-span-6 flex justify-center items-center py-2">
            <div className="relative w-full max-w-[560px] transition-transform duration-500 hover:scale-[1.015]">
              {/* Outer Laptop Lid / Aluminum Shell */}
              <div className="bg-[#0B0F19] rounded-[22px] p-2.5 shadow-[0_25px_60px_-15px_rgba(23,22,66,0.30)] border border-slate-700/60 ring-1 ring-slate-800/80 relative">
                {/* Top Bezel & Camera Lens Dot */}
                <div className="flex items-center justify-center pb-2 pt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500/90 shadow-[0_0_4px_#3B82F6]" />
                  </div>
                </div>

                {/* Laptop Display Screen (Matching the Reference UI Layout) */}
                <div className="bg-white rounded-xl overflow-hidden shadow-inner grid grid-cols-12 min-h-[340px] border border-slate-200/40">
                  {/* Left Mini Sidebar: Deep Indigo #171642 */}
                  <div className="col-span-4 bg-[#171642] text-white p-3.5 flex flex-col justify-between select-none border-r border-[#201B50]">
                    <div className="space-y-4">
                      {/* Logo Badge */}
                      <div className="flex items-center space-x-2 pb-2.5 border-b border-white/10">
                        <div className="w-5 h-5 rounded-md bg-[#6D28F5] flex items-center justify-center">
                          <Zap className="w-3 h-3 text-white fill-current" />
                        </div>
                        <span className="text-xs font-black tracking-tight text-white">UtilityAI</span>
                      </div>

                      {/* Menu Items matching reference */}
                      <div className="space-y-1.5">
                        <div className="px-2.5 py-1.5 rounded-lg bg-[#6D28F5] text-white text-[11px] font-bold flex items-center space-x-2 shadow-sm">
                          <Zap className="w-3 h-3" />
                          <span>AI Assistant</span>
                        </div>
                        <div
                          onClick={() => handleQuickLogin('CUST0001')}
                          className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-[11px] font-medium flex items-center space-x-2 cursor-pointer transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="truncate">Service Requests</span>
                        </div>
                        <div
                          onClick={() => handleQuickLogin('CUST0001')}
                          className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-[11px] font-medium flex items-center space-x-2 cursor-pointer transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="truncate">Complaints</span>
                        </div>
                        <div
                          onClick={() => handleQuickLogin('EMP0001')}
                          className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-[11px] font-medium flex items-center space-x-2 cursor-pointer transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="truncate">Operations</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status Indicator */}
                    <div className="pt-2 border-t border-white/10 flex items-center space-x-1.5 text-[10px] text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>RAG Connected</span>
                    </div>
                  </div>

                  {/* Right Main Screen: Interactive Assistant Canvas */}
                  <div className="col-span-8 bg-gradient-to-b from-[#FAF8FF] to-[#F8F9FC] p-4 flex flex-col justify-between relative overflow-hidden text-left">
                    {/* Ambient Glow */}
                    <div className="absolute top-2 right-2 w-32 h-32 bg-[#8B5CF6]/15 rounded-full blur-2xl pointer-events-none" />

                    {/* When no scenario is clicked: Show 3D Mascot & 4 Prompt Chips */}
                    {!activeDemoQuery ? (
                      <div className="flex flex-col items-center justify-center text-center h-full my-auto space-y-3 py-1">
                        {/* 3D Glossy Robot Mascot (Matching Image 3) */}
                        <div className="relative transform hover:scale-105 transition-transform duration-300">
                          {/* Antenna */}
                          <div className="w-1.5 h-2 bg-gradient-to-b from-[#6D28F5] to-slate-400 mx-auto rounded-t-full relative">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#6D28F5] shadow-[0_0_8px_#6D28F5] animate-pulse" />
                          </div>

                          {/* Head Outer Casing with 3D Gloss */}
                          <div className="w-16 h-12 bg-gradient-to-b from-white via-slate-50 to-slate-200 rounded-[20px] p-1.5 shadow-[0_10px_25px_rgba(109,40,245,0.20)] border border-slate-200/90 relative mx-auto">
                            {/* Inner Visor Display */}
                            <div className="w-full h-full bg-[#171642] rounded-[14px] flex items-center justify-center space-x-2.5 shadow-inner px-2">
                              {/* Left Eye */}
                              <div className="w-2.5 h-3.5 rounded-full bg-gradient-to-b from-[#C4B5FD] to-[#7C3AED] shadow-[0_0_8px_#A78BFA] flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-white self-start mt-0.5" />
                              </div>
                              {/* Right Eye */}
                              <div className="w-2.5 h-3.5 rounded-full bg-gradient-to-b from-[#C4B5FD] to-[#7C3AED] shadow-[0_0_8px_#A78BFA] flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-white self-start mt-0.5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Speech Bubble */}
                        <div className="bg-white px-4 py-1.5 rounded-2xl shadow-xs border border-slate-200/90 max-w-xs">
                          <h3 className="text-xs font-extrabold text-[#171642]">
                            How can I help you today?
                          </h3>
                        </div>

                        {/* Dynamic Query Prompt Chips */}
                        <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm pt-1">
                          {[
                            'Please list all complaints',
                            'List all successfully resolved cases',
                            'What are the currently assigned cases?',
                            'Show all pending complaints',
                            'Critical electricity incidents in Ward 11 that are still unresolved',
                            'Assigned cases for Rajesh Kumar'
                          ].map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => handleInLaptopPrompt(prompt)}
                              className="py-1.5 px-2 bg-white hover:bg-[#F3EEFF] text-[9.5px] font-bold text-slate-700 hover:text-[#6D28F5] rounded-lg border border-slate-200 hover:border-[#6D28F5] shadow-2xs transition transform hover:-translate-y-0.5 text-left truncate"
                              title={prompt}
                            >
                              • {prompt}
                            </button>
                          ))}
                        </div>

                        {/* Lodge Grievance Prompt Button */}
                        <button
                          onClick={() => handleInLaptopPrompt('Lodge a new grievance')}
                          className="w-full max-w-sm py-1.5 px-3 bg-gradient-to-r from-rose-50 to-purple-50 text-rose-700 hover:text-purple-700 rounded-lg border border-rose-200 hover:border-purple-300 text-[10px] font-extrabold flex items-center justify-center space-x-1 shadow-2xs transition"
                        >
                          <span>✍️ Lodge a New Grievance (Chatbot Flow)</span>
                        </button>
                      </div>
                    ) : (
                      /* Live In-Screen Conversation Preview */
                      <div className="space-y-3 h-full flex flex-col justify-between py-1 animate-in fade-in duration-200">
                        {/* Conversation Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6D28F5] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28F5]" />
                            <span>Live Database Query</span>
                          </span>
                          <button
                            onClick={handleResetLaptopDemo}
                            className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        </div>

                        {/* User Bubble */}
                        <div className="flex justify-end">
                          <div className="bg-[#6D28F5] text-white text-[11px] font-medium px-3 py-1.5 rounded-xl rounded-tr-none shadow-xs max-w-[88%]">
                            {activeDemoQuery}
                          </div>
                        </div>

                        {/* Assistant Response Card */}
                        <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm space-y-2">
                          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-700">
                            <div className="w-4 h-4 rounded-full bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center text-[10px]">
                              🤖
                            </div>
                            <span className="text-[#171642]">UtilityAI Assistant</span>
                            <span className="ml-auto text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                              {demoResponse?.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                            {demoResponse?.text}
                          </p>
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <FileText className="w-3 h-3 text-[#6D28F5]" />
                              <span>{demoResponse?.citation}</span>
                            </span>
                          </div>
                        </div>

                        {/* Full Workspace Action Button */}
                        <button
                          onClick={() => {
                            handleLaunchFullPrompt(activeDemoQuery || 'Please list all complaints');
                          }}
                          className="w-full py-2 bg-gradient-to-r from-[#6D28F5] to-[#7C3AED] hover:from-[#5B21D6] hover:to-[#6D28F5] text-white text-[11px] font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                        >
                          <span>Open in Full AI Assistant Workspace</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Realistic Aluminum Laptop Keyboard Deck / Front Lip Notch */}
              <div className="relative mx-auto w-[94%] h-4 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-2xl shadow-[0_15px_30px_rgba(0,0,0,0.18)] border-t border-slate-300 flex items-center justify-center">
                <div className="w-16 h-1 bg-slate-400/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Row: 5 Utility Services (Left Card) + 3 Metrics (Right Card) */}
        {/* Exactly matching Image 3 with pure minimal elegance */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Card: 5 Utility Departments (7 columns) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center">
            <div className="w-full grid grid-cols-5 gap-2 text-center">
              {/* 1. Electricity */}
              <div
                onClick={() => handleLaunchFullPrompt("What documents are required for a new electricity connection?")}
                className="group cursor-pointer p-2 rounded-xl hover:bg-[#F3EEFF]/40 transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <span className="text-xs font-bold text-[#171642] group-hover:text-[#6D28F5] transition">
                  Electricity
                </span>
              </div>

              {/* 2. Water */}
              <div
                onClick={() => handleLaunchFullPrompt("How can I request a new water connection or report low pipeline pressure?")}
                className="group cursor-pointer p-2 rounded-xl hover:bg-cyan-50/50 transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                  <Droplets className="w-6 h-6 fill-current" />
                </div>
                <span className="text-xs font-bold text-[#171642] group-hover:text-cyan-700 transition">
                  Water
                </span>
              </div>

              {/* 3. Gas */}
              <div
                onClick={() => handleLaunchFullPrompt("What safety procedures should be followed during a natural gas leak?")}
                className="group cursor-pointer p-2 rounded-xl hover:bg-amber-50/50 transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                  <Flame className="w-6 h-6 fill-current" />
                </div>
                <span className="text-xs font-bold text-[#171642] group-hover:text-amber-600 transition">
                  Gas
                </span>
              </div>

              {/* 4. Telecom */}
              <div
                onClick={() => handleLaunchFullPrompt("What is the standard turnaround time for broadband optical fiber restoration?")}
                className="group cursor-pointer p-2 rounded-xl hover:bg-purple-50/50 transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-[#171642] group-hover:text-[#6D28F5] transition">
                  Telecom
                </span>
              </div>

              {/* 5. Waste Management */}
              <div
                onClick={() => handleLaunchFullPrompt("How do I schedule hazardous solid waste collection?")}
                className="group cursor-pointer p-2 rounded-xl hover:bg-emerald-50/50 transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                  <Recycle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-[#171642] group-hover:text-emerald-700 transition text-center leading-tight">
                  Waste <br className="hidden sm:inline" />Management
                </span>
              </div>
            </div>
          </div>

          {/* Right Card: 3 Metrics Statistics (5 columns) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] grid grid-cols-3 divide-x divide-slate-100 text-center items-center">
            {/* Stat 1: 24/7 AI Assistance */}
            <div className="px-3">
              <div className="text-3xl font-black text-[#6D28F5]">24/7</div>
              <div className="text-xs font-medium text-[#64748B] mt-1.5">AI Assistance</div>
            </div>

            {/* Stat 2: ~70% Faster Resolution */}
            <div className="px-3">
              <div className="text-3xl font-black text-[#6D28F5]">~70%</div>
              <div className="text-xs font-medium text-[#64748B] mt-1.5">Faster Resolution</div>
            </div>

            {/* Stat 3: 100% Verified Information */}
            <div className="px-3">
              <div className="text-3xl font-black text-[#6D28F5]">100%</div>
              <div className="text-xs font-medium text-[#64748B] mt-1.5">Verified Information</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Enterprise Features Showcase */}
      <section id="features" className="py-20 px-6 lg:px-10 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F3EEFF] text-[#6D28F5] text-xs font-bold">
              <span>CORE ARCHITECTURAL CAPABILITIES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#171642] tracking-tight">
              Enterprise-Grade AI Architecture
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Designed specifically for multi-department municipal utilities with strict role-based access control and grounded document citations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl bg-[#F8F9FC] border border-slate-100 hover:border-[#6D28F5]/40 transition shadow-xs hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171642] mb-2">Grounded RAG Engine</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Vector similarity search extracts verified clauses from official utility SOPs, circulars, and tariff sheets with exact page-level citations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl bg-[#F8F9FC] border border-slate-100 hover:border-[#6D28F5]/40 transition shadow-xs hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171642] mb-2">Role-Based Access Control</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Firebase ID tokens verified against MongoDB. Customer accounts are isolated to their own records, preventing cross-tenant leakage.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl bg-[#F8F9FC] border border-slate-100 hover:border-[#6D28F5]/40 transition shadow-xs hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] text-[#6D28F5] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171642] mb-2">Daily Outage Summarization</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Aggregates ward-level incident telemetry in real time, computing MTTR and generating executive summaries for engineering dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 lg:px-10 bg-[#F8F9FC] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F3EEFF] text-[#6D28F5] text-xs font-bold">
              <span>WORKFLOW</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#171642] tracking-tight">
              How UtilityAI Operates
            </h2>
            <p className="text-sm text-[#64748B]">
              From natural language questions to verified document citations and automated ticket tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28F5] font-black text-sm flex items-center justify-center">
                01
              </div>
              <h4 className="font-bold text-[#171642] text-sm">Natural Language Input</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Citizen or staff submits questions regarding tariffs, outages, or service applications in plain English.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28F5] font-black text-sm flex items-center justify-center">
                02
              </div>
              <h4 className="font-bold text-[#171642] text-sm">Intent & RBAC Routing</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Backend router detects intent (RAG, ticket lookup, complaint tracking, or outage summary) while verifying token permissions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28F5] font-black text-sm flex items-center justify-center">
                03
              </div>
              <h4 className="font-bold text-[#171642] text-sm">Grounded Vector Search</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                ChromaDB matches queries against indexed utility PDFs and circulars, pulling high-confidence verbatim snippets.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28F5] font-black text-sm flex items-center justify-center">
                04
              </div>
              <h4 className="font-bold text-[#171642] text-sm">Audited Delivery</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Synthesized answers are rendered with page citations, actionable UI cards, and logged into MongoDB audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Technology Stack Section */}
      <section id="technology" className="py-20 px-6 lg:px-10 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F3EEFF] text-[#6D28F5] text-xs font-bold">
              <span>STACK</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#171642] tracking-tight">
              Enterprise Technology Foundation
            </h2>
            <p className="text-sm text-[#64748B]">
              Built with battle-tested open standards and modern AI orchestration frameworks.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-[#F8F9FC] text-center space-y-2">
              <Cpu className="w-8 h-8 text-[#6D28F5] mx-auto" />
              <div className="font-bold text-[#171642] text-sm">FastAPI & Python 3.11</div>
              <p className="text-[11px] text-slate-500">Asynchronous high-throughput REST API with strict Pydantic v2 schemas</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-[#F8F9FC] text-center space-y-2">
              <Database className="w-8 h-8 text-[#6D28F5] mx-auto" />
              <div className="font-bold text-[#171642] text-sm">ChromaDB & MongoDB</div>
              <p className="text-[11px] text-slate-500">Persistent vector collection + document database with indexing</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-[#F8F9FC] text-center space-y-2">
              <Sparkles className="w-8 h-8 text-[#6D28F5] mx-auto" />
              <div className="font-bold text-[#171642] text-sm">LangChain Agent Router</div>
              <p className="text-[11px] text-slate-500">Autonomous tool selection, query reformulation, and fallback handler</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-[#F8F9FC] text-center space-y-2">
              <Shield className="w-8 h-8 text-[#6D28F5] mx-auto" />
              <div className="font-bold text-[#171642] text-sm">Firebase & Local JWT</div>
              <p className="text-[11px] text-slate-500">Zero-credential DEMO_MODE fallback with cryptographically verified claims</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Security & RBAC Section */}
      <section id="security" className="py-20 px-6 lg:px-10 bg-[#F8F9FC] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F3EEFF] text-[#6D28F5] text-xs font-bold">
              <span>ZERO-TRUST COMPLIANCE</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#171642] tracking-tight">
              Strict RBAC & Tenant Isolation
            </h2>
            <p className="text-sm text-[#64748B]">
              Client role parameters are never trusted. Identity is verified on every request.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#171642] text-base">Customer Isolation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Citizens are restricted strictly to public utility SOPs and can only inspect requests and complaints matching their own verified user ID.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28F5] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#171642] text-base">Operations Staff Access</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Authorized engineers access internal engineering SOPs, dispatch operational incidents across metropolitan wards, and trigger daily outage summaries.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-purple-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#171642] text-base">System Administrator</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Full privileges to upload and ingest official utility PDFs into the vector index, audit all system actions, and manage user roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-[#171642] text-white py-12 px-6 lg:px-10 border-t border-[#201B50]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#6D28F5] flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">UtilityAI Platform</span>
              <p className="text-[11px] text-slate-400">TechBharat AI CoE • Cohort #2 • Project C2-22</p>
            </div>
          </div>

          <div className="text-center md:text-right text-slate-400">
            <p className="font-medium text-slate-300">Gollavilli Shanmukh Vardhan Sai & PANAM VICTOR KOMAL</p>
            <p className="text-[11px] mt-0.5">Enterprise Utility Virtual Assistant with Grounded RAG & RBAC</p>
          </div>
        </div>
      </footer>

      {/* 10. Interactive Complete Firebase Authentication Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg my-8">
            <AuthCard
              isModal={true}
              title="Welcome to UtilityAI"
              subtitle="Sign in to access your authorized utility services"
              initialPersonaId={selectedPersonaId}
              onClose={() => {
                setIsLoginModalOpen(false);
                setSelectedPersonaId(undefined);
              }}
              onSuccess={() => {
                setIsLoginModalOpen(false);
                setSelectedPersonaId(undefined);
                if (onLoginSuccess) {
                  onLoginSuccess();
                } else {
                  onGetStarted();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
