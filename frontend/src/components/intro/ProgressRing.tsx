import React from 'react';
import { NeuralNetwork } from './NeuralNetwork';

interface ProgressRingProps {
  progress: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ progress }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Ring container sized to min(210px, 34vh, 60vw) */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 'var(--intro-ring-size)',
          height: 'var(--intro-ring-size)'
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transform -rotate-90"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="60%" stopColor="#6D28F5" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(124, 58, 237, 0.18)"
            strokeWidth="5"
          />

          {/* Filling Progress Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#ringGlow)"
            style={{
              transition: 'stroke-dashoffset 80ms linear'
            }}
          />
        </svg>

        {/* Neural network embedded in the center */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <NeuralNetwork nodeCount={10} />
        </div>
      </div>

      {/* Live percentage readout below ring */}
      <div className="mt-3 flex items-baseline space-x-1 font-mono text-cyan-300 font-bold select-none">
        <span className="text-xl sm:text-2xl tracking-tight text-[#22D3EE] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          {clampedProgress}
        </span>
        <span className="text-xs text-[#22D3EE]/80">%</span>
      </div>
    </div>
  );
};
