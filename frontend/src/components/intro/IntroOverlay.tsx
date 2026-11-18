import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { ModuleChecklist } from './ModuleChecklist';
import { ParticleCanvas } from './ParticleCanvas';
import { useBootProgress } from '../../hooks/useBootProgress';

export type IntroState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'closed' };

export type IntroAction =
  | { type: 'BOOT_COMPLETE' }
  | { type: 'START' }
  | { type: 'SKIP' };

export function introReducer(state: IntroState, action: IntroAction): IntroState {
  switch (action.type) {
    case 'BOOT_COMPLETE':
      if (state.status === 'loading') {
        return { status: 'ready' };
      }
      return state;
    case 'START':
      if (state.status === 'ready') {
        return { status: 'closed' };
      }
      return state;
    case 'SKIP':
      return { status: 'closed' };
    default:
      return state;
  }
}

interface IntroOverlayProps {
  onClose: () => void;
  durationMs?: number;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  onClose,
  durationMs = 4200
}) => {
  const [state, dispatch] = useReducer(introReducer, { status: 'loading' });

  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const handleBootComplete = useCallback(() => {
    dispatch({ type: 'BOOT_COMPLETE' });
  }, []);

  const { progress, statusMessage, modules, completedModuleIds } = useBootProgress({
    durationMs,
    onComplete: handleBootComplete,
    active: state.status === 'loading'
  });

  // Restore focus to landing page's main heading
  const restoreFocus = useCallback(() => {
    const heading = document.getElementById('landing-main-heading');
    if (heading) {
      heading.focus();
    }
  }, []);

  // Body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // When state transitions to 'ready', auto-focus the Start button
  useEffect(() => {
    if (state.status === 'ready') {
      startButtonRef.current?.focus();
    }
  }, [state.status]);

  const handleStart = useCallback(() => {
    if (state.status === 'ready') {
      dispatch({ type: 'START' });
      restoreFocus();
    }
  }, [state.status, restoreFocus]);

  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP' });
    restoreFocus();
  }, [restoreFocus]);

  // Global keyboard listener for Enter and Escape, plus focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.status === 'closed') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
        return;
      }

      if (e.key === 'Enter') {
        if (state.status === 'ready') {
          e.preventDefault();
          handleStart();
        } else if (state.status === 'loading') {
          // Enter does nothing while loading
          e.preventDefault();
        }
        return;
      }

      // Focus trap for Tab key
      if (e.key === 'Tab') {
        const focusableElements = [skipButtonRef.current, startButtonRef.current].filter(
          (el): el is HTMLButtonElement => el !== null && !el.disabled
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, handleStart, handleSkip]);

  // Click on background or screen when ready advances to start
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only advance on click if ready and target is overlay or start button
    if (state.status === 'ready') {
      const target = e.target as HTMLElement;
      // If clicking skip button, skip handles itself
      if (target.closest('[data-intro-skip="true"]')) {
        return;
      }
      handleStart();
    }
  };

  return (
    <AnimatePresence onExitComplete={onClose}>
      {state.status !== 'closed' && (
        <motion.div
          key="intro-overlay"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="UtilityAI engine loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden select-none"
          style={{ background: 'var(--intro-bg-gradient)' }}
        >
          {/* BACKGROUND LAYER 1: Perspective Grid Floor */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div
              className="absolute w-[200%] h-[200%] -left-1/2 -bottom-[30%] intro-gridmove"
              style={{
                transform: 'perspective(500px) rotateX(68deg)',
                transformOrigin: '50% 100%',
                backgroundImage:
                  'linear-gradient(to right, rgba(34, 211, 238, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 58, 237, 0.15) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
              }}
            />
          </div>

          {/* BACKGROUND LAYER 2: Cyan Scan Line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent intro-scan shadow-[0_0_12px_#22D3EE]"
            />
          </div>

          {/* BACKGROUND LAYER 3: Canvas Particle Network (70 nodes) */}
          <ParticleCanvas className="z-0" />

          {/* BACKGROUND LAYER 4: Futuristic HUD Frame */}
          <div className="absolute inset-[18px] border border-[#22D3EE]/25 pointer-events-none rounded-lg z-10 hidden sm:block">
            {/* Top-left corner bracket */}
            <div className="absolute -top-[1px] -left-[1px] w-5 h-5 border-t-2 border-l-2 border-[#22D3EE]" />
            {/* Bottom-right corner bracket */}
            <div className="absolute -bottom-[1px] -right-[1px] w-5 h-5 border-b-2 border-r-2 border-[#22D3EE]" />
            {/* Top-right subtle bracket */}
            <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#22D3EE]/50" />
            {/* Bottom-left subtle bracket */}
            <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#22D3EE]/50" />

            {/* Monospace telemetry readouts */}
            <div className="absolute top-3 left-4 font-mono text-[11px] text-[#22D3EE]/80 tracking-widest flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping" />
              <span>UTILITYAI // CORE v2.6</span>
            </div>

            <div className="absolute bottom-3 left-4 font-mono text-[10px] text-slate-400/80 tracking-wider">
              secure channel · role-based access armed
            </div>

            <div className="absolute bottom-3 right-4 font-mono text-[10px] text-cyan-400/70 tracking-wider">
              NEURAL_STATE: {state.status.toUpperCase()}
            </div>
          </div>

          {/* TOP CONTROLS: Skip intro button */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-30">
            <button
              ref={skipButtonRef}
              type="button"
              data-intro-skip="true"
              onClick={handleSkip}
              className="px-3.5 py-1.5 rounded-md border border-slate-700/80 bg-[#171642]/60 hover:bg-[#201B50] hover:border-[#22D3EE]/50 text-slate-300 hover:text-white font-mono text-xs transition flex items-center space-x-1.5 shadow-sm group focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
            >
              <span>Skip intro</span>
              <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#22D3EE] transition" />
            </button>
          </div>

          {/* MAIN CENTER CONTENT (Scrollable on short landscape screens) */}
          <div className="relative z-20 flex flex-col items-center justify-center max-w-md w-full px-4 py-8 my-auto space-y-6">
            {/* Progress Ring with Neural Network Core */}
            <ProgressRing progress={progress} />

            {/* Heading: UtilityAI Engine (white -> purple -> cyan gradient) */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight bg-gradient-to-r from-white via-[#C084FC] to-[#22D3EE] bg-clip-text text-transparent drop-shadow-sm">
                UtilityAI Engine
              </h1>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Cognitive Grid & Citizen Dispatch Architecture
              </p>
            </div>

            {/* Module Checklist */}
            <ModuleChecklist
              modules={modules}
              completedModuleIds={completedModuleIds}
            />

            {/* Status Line (aria-live="polite") */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="min-h-[28px] flex items-center justify-center font-mono text-xs sm:text-sm text-center px-4"
            >
              {state.status === 'ready' ? (
                <div className="flex items-center space-x-2 text-cyan-200">
                  <span>Engine ready. Press</span>
                  <kbd className="px-2 py-0.5 rounded border border-[#22D3EE]/80 bg-[#171642] text-[#22D3EE] font-mono text-xs font-bold shadow-[0_0_8px_rgba(34,211,238,0.4)] intro-blink">
                    Enter
                  </kbd>
                  <span>to start</span>
                </div>
              ) : (
                <span className="text-slate-300 tracking-wide transition-opacity duration-200">
                  {statusMessage}
                </span>
              )}
            </div>

            {/* Action Start Button */}
            <div className="pt-1 w-full max-w-xs">
              <button
                ref={startButtonRef}
                type="button"
                disabled={state.status !== 'ready'}
                onClick={handleStart}
                className={`w-full py-3 px-6 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2 focus:ring-offset-[#0B0A26] ${
                  state.status === 'ready'
                    ? 'bg-gradient-to-r from-[#6D28F5] via-[#7C3AED] to-[#22D3EE] text-white shadow-purple-600/40 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                    : 'bg-[#201B50]/60 border border-slate-700/60 text-slate-400 opacity-45 cursor-not-allowed'
                }`}
              >
                <span>{state.status === 'ready' ? 'Start UtilityAI' : 'Loading…'}</span>
                <ArrowRight
                  className={`w-4 h-4 transition-transform ${
                    state.status === 'ready' ? 'group-hover:translate-x-1' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
