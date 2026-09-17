/**
 * Tahta gösterim geometrisi (Bölüm 8.1).
 *
 * Kritik: hisar kareleri (110, 111) ızgaranın DIŞINDADIR ve `squareToCoord()`
 * onlar için null döner. Bu modül 110/111'i satır/sütun aritmetiğiyle
 * HESAPLAMAZ; ayrı yoldan çözer (sol cep topLeft, sağ cep bottomRight).
 */
import { BOARD_COLS, BOARD_ROWS, BOTTOM_RIGHT_CITADEL, TOP_LEFT_CITADEL } from '../../core/position/Position';

export const GUIDED_SQUARE_COUNT = 112;

export type SquareCell =
  | { kind: 'cell'; col: number; row: number }
  | { kind: 'citadel'; side: 'left' | 'right' };

/** Kare → ızgara hücresi veya hisar cebi (110/111 ayrı yol). */
export function squareCell(sq: number): SquareCell | null {
  if (sq === TOP_LEFT_CITADEL) return { kind: 'citadel', side: 'left' };
  if (sq === BOTTOM_RIGHT_CITADEL) return { kind: 'citadel', side: 'right' };
  if (!Number.isInteger(sq) || sq < 0 || sq >= BOARD_COLS * BOARD_ROWS) return null;
  return { kind: 'cell', col: sq % BOARD_COLS, row: Math.floor(sq / BOARD_COLS) };
}

/** 0..111 arası tüm kareler. */
export function allSquares(): number[] {
  const out: number[] = [];
  for (let i = 0; i < GUIDED_SQUARE_COUNT; i++) out.push(i);
  return out;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Kare merkezi (birim tahta uzayı, 0..1).
 * Ana ızgara: 11 sütun × 10 sıra (y yukarıdan aşağı).
 * Hisarlar: sol cep (satır 8 hizası, x<0), sağ cep (satır 1 hizası, x>1).
 */
export function squareCenterUnit(sq: number): Point | null {
  const cell = squareCell(sq);
  if (!cell) return null;
  if (cell.kind === 'citadel') {
    if (cell.side === 'left') return { x: -0.06, y: (9 - 8 + 0.5) / 10 };
    return { x: 1.06, y: (9 - 1 + 0.5) / 10 };
  }
  return {
    x: (cell.col + 0.5) / BOARD_COLS,
    y: (9 - cell.row + 0.5) / BOARD_ROWS,
  };
}
