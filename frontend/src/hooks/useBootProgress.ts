import { useState, useEffect, useRef } from 'react';

export interface BootModule {
  id: number;
  label: string;
  threshold: number;
}

export const BOOT_MODULES: BootModule[] = [
  { id: 0, label: 'Neural core', threshold: 20 },
  { id: 1, label: 'Knowledge base (RAG)', threshold: 42 },
  { id: 2, label: 'Utility connectors', threshold: 65 },
  { id: 3, label: 'Role-based security', threshold: 85 },
  { id: 4, label: 'Interface and effects', threshold: 100 },
];

export function getStatusMessage(progress: number): string {
  if (progress >= 100) return 'Engine ready. Press Enter to start';
  if (progress >= 85) return 'Calibrating interface…';
  if (progress >= 65) return 'Arming role-based security…';
  if (progress >= 42) return 'Connecting utility services…';
  if (progress >= 20) return 'Indexing approved documents…';
  return 'Waking neural core…';
}

interface UseBootProgressOptions {
  durationMs?: number;
  onComplete?: () => void;
  active?: boolean;
}

export function useBootProgress({
  durationMs = 4200,
  onComplete,
  active = true
}: UseBootProgressOptions = {}) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completedCallbackRef = useRef(onComplete);
  completedCallbackRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const startTime = Date.now();

    timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);

      // Eased curve: ease-out cubic for realistic deceleration toward completion
      const easedRatio = 1 - Math.pow(1 - ratio, 3);
      const currentPct = Math.min(100, Math.round(easedRatio * 100));

      setProgress(currentPct);

      if (ratio >= 1) {
        if (timer) clearInterval(timer);
        setProgress(100);
        setIsComplete(true);
        if (completedCallbackRef.current) {
          completedCallbackRef.current();
        }
      }
    }, 20);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [active, durationMs]);

  const statusMessage = getStatusMessage(progress);
  const completedModuleIds = BOOT_MODULES.filter((m) => progress >= m.threshold).map((m) => m.id);

  return {
    progress,
    statusMessage,
    isComplete,
    modules: BOOT_MODULES,
    completedModuleIds
  };
}
