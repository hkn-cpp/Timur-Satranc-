import React, { FC, useMemo } from 'react';
import type { SquareIndex } from '../../core/position/Position';
import type { Annotation } from '../../learn/guided/types';
import { PawnBadge } from './PawnBadge';

export interface CenterPoint {
  x: number;
  y: number;
}

interface AnnotationLayerProps {
  annotations: Annotation[];
  /** Kare → piksel merkezi (data-square + getBoundingClientRect ile kurulur). */
  centers: Map<SquareIndex, CenterPoint>;
  squareSize: number;
  width: number;
  height: number;
}

const TONE_FILL: Record<string, string> = {
  good: 'rgba(34,197,94,0.35)',
  bad: 'rgba(239,68,68,0.35)',
  focus: 'rgba(0,212,196,0.25)',
  neutral: 'rgba(92,108,102,0.20)',
};

function useReducedMotion(): boolean {
  return useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];

/**
 * SVG overlay (pointer-events: none). `leap` yay, `slide` düz çizgi —
 * ayrı çizim yolları (Seviye 3'ün dayanağı, kozmetik değil).
 */
export const AnnotationLayer: FC<AnnotationLayerProps> = ({
  annotations,
  centers,
  squareSize,
  width,
  height,
}) => {
  const reduced = useReducedMotion();
  const s = Math.max(1, squareSize);
  const showCoords = annotations.some((a) => a.kind === 'coords' && a.visible);

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="gl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#00d4c4" />
        </marker>
      </defs>

      {showCoords && (
        <g fontSize={Math.max(8, s * 0.22)} fontWeight={800} fill="#f5eedc" opacity={0.9}>
          {FILES.map((f, i) => (
            <text key={f} x={(i + 0.5) * s} y={height - 2} textAnchor="middle">
              {f}
            </text>
          ))}
          {Array.from({ length: 10 }, (_, r) => (
            <text key={r} x={2} y={(9 - r + 0.5) * s} textAnchor="start">
              {r + 1}
            </text>
          ))}
          <text x={width - s * 0.4} y={s * 0.5} textAnchor="middle">
            Hisar
          </text>
        </g>
      )}

      {annotations.map((a, i) => {
        if (a.kind === 'path') {
          const c = centers.get(a.square);
          if (!c) return null;
          return (
            <rect
              key={i}
              x={c.x - s / 2}
              y={c.y - s / 2}
              width={s}
              height={s}
              rx={s * 0.12}
              fill="#f59e0b"
              opacity={0.3}
            />
          );
        }
        if (a.kind === 'destination') {
          const c = centers.get(a.square);
          if (!c) return null;
          return (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={s * 0.32}
              fill="none"
              stroke="#22c55e"
              strokeWidth={Math.max(2, s * 0.07)}
            />
          );
        }
        if (a.kind === 'square') {
          const c = centers.get(a.square);
          if (!c) return null;
          if (a.tone === 'citadel') {
            return (
              <rect
                key={i}
                x={c.x - s / 2}
                y={c.y - s / 2}
                width={s}
                height={s}
                rx={s * 0.1}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={3}
              />
            );
          }
          if (a.tone === 'focus') {
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={s * 0.4}
                fill="none"
                stroke="#00d4c4"
                strokeWidth={Math.max(2, s * 0.07)}
              >
                {!reduced && <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />}
              </circle>
            );
          }
          return (
            <rect
              key={i}
              x={c.x - s / 2}
              y={c.y - s / 2}
              width={s}
              height={s}
              rx={s * 0.12}
              fill={TONE_FILL[a.tone] ?? TONE_FILL.neutral}
            />
          );
        }
        if (a.kind === 'slide') {
          const f = centers.get(a.from);
          const t = centers.get(a.to);
          if (!f || !t) return null;
          const stroke = a.tone === 'bad' ? '#ef4444' : a.tone === 'good' ? '#22c55e' : '#00d4c4';
          return (
            <line
              key={i}
              x1={f.x}
              y1={f.y}
              x2={t.x}
              y2={t.y}
              stroke={stroke}
              strokeWidth={Math.max(2, s * 0.16)}
              strokeLinecap="round"
              markerEnd="url(#gl-arrow)"
            />
          );
        }
        if (a.kind === 'leap') {
          const f = centers.get(a.from);
          const t = centers.get(a.to);
          if (!f || !t) return null;
          const mx = (f.x + t.x) / 2;
          const my = (f.y + t.y) / 2 - s * 0.9;
          const stroke = a.tone === 'bad' ? '#ef4444' : a.tone === 'good' ? '#22c55e' : '#00d4c4';
          return (
            <path
              key={i}
              d={`M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={Math.max(2, s * 0.1)}
              strokeDasharray={reduced ? undefined : `${s * 0.18} ${s * 0.12}`}
              markerEnd="url(#gl-arrow)"
            />
          );
        }
        if (a.kind === 'ghost') {
          const c = centers.get(a.square);
          if (!c) return null;
          return (
            <g key={i} opacity={0.35}>
              <rect
                x={c.x - s * 0.4}
                y={c.y - s * 0.4}
                width={s * 0.8}
                height={s * 0.8}
                rx={s * 0.12}
                fill="#f5eedc"
                stroke="#f5eedc"
                strokeWidth={1.5}
                strokeDasharray={`${s * 0.08} ${s * 0.06}`}
              />
            </g>
          );
        }
        if (a.kind === 'seal') {
          const c = centers.get(a.square);
          if (!c) return null;
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={s * 0.44} fill="none" stroke="#f59e0b" strokeWidth={3}>
                {!reduced && <animate attributeName="r" values={`${s * 0.3};${s * 0.5};${s * 0.44}`} dur="0.8s" repeatCount="1" />}
              </circle>
            </g>
          );
        }
        return null;
      })}

      {annotations
        .filter((a) => a.kind === 'badge')
        .map((a, i) => {
          if (a.kind !== 'badge') return null;
          const c = centers.get(a.square);
          if (!c) return null;
          return (
            <foreignObject
              key={`b${i}`}
              x={c.x + s * 0.08}
              y={c.y + s * 0.08}
              width={s * 0.42}
              height={s * 0.42}
            >
              <PawnBadge figure={a.figure} squareSize={s} />
            </foreignObject>
          );
        })}
    </svg>
  );
};
