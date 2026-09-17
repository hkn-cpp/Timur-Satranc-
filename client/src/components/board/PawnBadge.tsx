import React, { FC } from 'react';
import type { PieceKind, SquareIndex } from '../../core/position/Position';

/**
 * Piyade mikro-rozeti (Ders 4.2 kritik yolu).
 * Mevcut taş görsellerinden türetilemedi (legacy asset zinciri bu katmanda
 * yok); basit geometrik siluet + figür harfi çizilir. 360px'te ayırt edilir:
 * kare × 0.32, yüksek kontrast, harf etiketi.
 */
const FIGURE_LETTER: Record<string, string> = {
  king: 'Ş',
  general: 'V',
  ferz: 'F',
  rook: 'K',
  knight: 'A',
  alfil: 'Fi',
  camel: 'D',
  dabbaba: 'M',
  giraffe: 'Z',
  picket: 'N',
  pawn: 'P',
  prince: 'Şz',
};

const FIGURE_COLOR: Record<string, string> = {
  king: '#f59e0b',
  general: '#a78bfa',
  ferz: '#94a3b8',
  rook: '#60a5fa',
  knight: '#00d4c4',
  alfil: '#34d399',
  camel: '#fb7185',
  dabbaba: '#f87171',
  giraffe: '#facc15',
  picket: '#fb923c',
  pawn: '#d1d5db',
  prince: '#fde68a',
};

interface PawnBadgeProps {
  figure: PieceKind;
  squareSize: number;
}

export const PawnBadge: FC<PawnBadgeProps> = ({ figure, squareSize }) => {
  const s = Math.max(10, squareSize * 0.32);
  const key = String(figure);
  return (
    <div
      aria-hidden="true"
      style={{
        width: s,
        height: s,
        borderRadius: '9999px',
        background: '#141f1b',
        border: `1.5px solid ${FIGURE_COLOR[key] ?? '#fff'}`,
        color: FIGURE_COLOR[key] ?? '#fff',
        fontSize: s * 0.52,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {FIGURE_LETTER[key] ?? '?'}
    </div>
  );
};
