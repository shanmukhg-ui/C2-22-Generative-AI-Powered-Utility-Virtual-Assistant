import React from 'react';
import { Check } from 'lucide-react';
import { BootModule } from '../../hooks/useBootProgress';

interface ModuleChecklistProps {
  modules: BootModule[];
  completedModuleIds: number[];
}

export const ModuleChecklist: React.FC<ModuleChecklistProps> = ({
  modules,
  completedModuleIds
}) => {
  const completedSet = new Set(completedModuleIds);

  return (
    <ul
      className="w-full max-w-sm space-y-2 font-mono text-xs select-none px-4"
      aria-label="Boot sequence checklist"
    >
      {modules.map((mod) => {
        const isDone = completedSet.has(mod.id);

        return (
          <li
            key={mod.id}
            className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
              isDone
                ? 'bg-emerald-950/25 border border-emerald-500/30 text-emerald-200'
                : 'bg-[#171642]/40 border border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {/* Check indicator or pending marker */}
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-colors duration-300 ${
                  isDone
                    ? 'bg-[#16A34A] text-white shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                    : 'border border-slate-600 bg-slate-900/60'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                )}
              </div>

              <span
                className={`tracking-wide text-[11px] sm:text-xs transition-colors duration-300 ${
                  isDone ? 'text-white font-semibold' : 'text-slate-400'
                }`}
              >
                {mod.label}
              </span>
            </div>

            {/* Status code badge */}
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                isDone
                  ? 'text-[#4ADE80] bg-emerald-900/40'
                  : 'text-slate-500 bg-slate-800/40'
              }`}
            >
              {isDone ? 'ARMED' : 'PENDING'}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
