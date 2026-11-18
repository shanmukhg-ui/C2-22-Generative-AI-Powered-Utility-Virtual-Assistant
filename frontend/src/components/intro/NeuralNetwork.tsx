import React, { useMemo } from 'react';

interface NeuralNetworkProps {
  nodeCount?: number;
  className?: string;
}

export const NeuralNetwork: React.FC<NeuralNetworkProps> = ({
  nodeCount = 10,
  className = ''
}) => {
  const center = 100;
  const radius = 64;

  const { nodes, chords } = useMemo(() => {
    const calculatedNodes: Array<{ id: number; x: number; y: number; delay: number }> = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
      calculatedNodes.push({
        id: i,
        x: Number((center + radius * Math.cos(angle)).toFixed(2)),
        y: Number((center + radius * Math.sin(angle)).toFixed(2)),
        delay: Number((i * 0.22).toFixed(2))
      });
    }

    const calculatedChords: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
    const seenEdges = new Set<string>();

    for (let i = 0; i < nodeCount; i++) {
      const targets = [(i + 1) % nodeCount, (i + 3) % nodeCount];
      for (const target of targets) {
        const edgeKey = i < target ? `${i}-${target}` : `${target}-${i}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          calculatedChords.push({
            x1: calculatedNodes[i].x,
            y1: calculatedNodes[i].y,
            x2: calculatedNodes[target].x,
            y2: calculatedNodes[target].y,
            key: edgeKey
          });
        }
      }
    }

    return { nodes: calculatedNodes, chords: calculatedChords };
  }, [nodeCount, center, radius]);

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-full h-full select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="coreGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#201B50" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0B0A26" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="chordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.65" />
        </linearGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Rotating Neural Ring (24s cycle) */}
      <g className="intro-spin" style={{ transformOrigin: '100px 100px' }}>
        {/* Chord connections between nodes */}
        {chords.map((chord) => (
          <line
            key={chord.key}
            x1={chord.x1}
            y1={chord.y1}
            x2={chord.x2}
            y2={chord.y2}
            stroke="url(#chordGrad)"
            strokeWidth="1.25"
            strokeDasharray="4 2"
            opacity="0.75"
          />
        ))}

        {/* Outer Orbit Circle Guide */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(124, 58, 237, 0.25)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* 10 Pulsing Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Glow backing */}
            <circle
              cx={node.x}
              cy={node.y}
              r="4.5"
              fill="#22D3EE"
              opacity="0.3"
              filter="url(#nodeGlow)"
            />
            {/* Core dot with staggered pulse */}
            <circle
              cx={node.x}
              cy={node.y}
              r="3.5"
              fill="#22D3EE"
              className="intro-pulse-node"
              style={{
                animationDelay: `${node.delay}s`,
                transformOrigin: `${node.x}px ${node.y}px`
              }}
            />
          </g>
        ))}
      </g>

      {/* Central Beating Core with Lightning Bolt (Scale 1 -> 1.08 -> 1, 2s loop) */}
      <g className="intro-beat" style={{ transformOrigin: '100px 100px' }}>
        {/* Outer ring aura */}
        <circle
          cx={center}
          cy={center}
          r="26"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          strokeDasharray="3 3"
        />
        {/* Beating Core Disc */}
        <circle
          cx={center}
          cy={center}
          r="21"
          fill="url(#coreGlowGrad)"
          stroke="#7C3AED"
          strokeWidth="2"
        />
        {/* Lightning Bolt Icon */}
        <path
          d="M100 89 L92 101 H99 L98 111 L108 99 H101 Z"
          fill="#22D3EE"
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );
};
