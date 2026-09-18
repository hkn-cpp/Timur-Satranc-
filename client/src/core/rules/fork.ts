/**
 * Game Core — Çatal Işınlama hedefleri (v3 K7).
 *
 * `forkSquares(position, pawnSq)`: bekleyen Piyadelerin Piyadesi'nin
 * ışınlanabileceği boş kareleri (a)/(b) dallarına ayrılmış döndürür:
 *  - `multi`: piyade o kareden EN AZ İKİ rakip taşa saldırıyor.
 *  - `trapped`: piyade o kareden TAM BİR rakip taş P'ye saldırıyor ve P'nin
 *    her legal hamlesinden sonra P hâlâ aynı piyadenin saldırısında ve
 *    hamlelerden hiçbiri piyadeyi almıyor (hamlesiz P dahil).
 *
 * "Saldırı" = piyadenin o kareden normal alma hamlesi (1 kare çapraz ileri).
 * Royaller tehdit sayımına dahildir. Hedefin güvenli (alınmaz) olması gerekmez.
 *
 * Ayrı modüldür (shared ↔ generateLegalMoves/makeMove döngüsüne girmez).
 */

import {
  BOARD_COLS,
  BOARD_ROWS,
  PieceKind,
  coordToSquare,
  squareToCoord,
  type BoardArray,
  type CitadelState,
  type Piece,
  type Position,
  type Side,
  type SquareIndex,
} from '../position/Position';
import { computeZobristForArrays } from '../position/zobrist';
import { generateLegalMoves } from './generateLegalMoves';
import { opponent, pieceAt } from './shared';

export interface ForkTargets {
  /** En az iki rakip taşa saldırı (K7a). */
  multi: SquareIndex[];
  /** Kaçışsız tek tehdit (K7b). */
  trapped: SquareIndex[];
}

/** Piyonun `from` karesinden saldırdığı tahta kareleri (1 çapraz ileri). */
function pawnStrikeSquares(from: SquareIndex, side: Side): SquareIndex[] {
  const c = squareToCoord(from);
  if (!c) return [];
  const dir = side === 'white' ? 1 : -1;
  const out: SquareIndex[] = [];
  for (const dx of [-1, 1]) {
    const t = coordToSquare(c.col + dx, c.row + dir);
    if (t !== null) out.push(t);
  }
  return out;
}

/**
 * K7(b) kesin karşılığı: ışınlanma sonrası konumda tehdit edilen P'nin her
 * legal hamlesinden sonra P hâlâ aynı piyadenin saldırısında VE P piyadeyi
 * alamıyor. Hamlesiz P'de boş-doğrulukla sağlanır.
 */
function isTrappedThreat(
  position: Position,
  pawn: Piece,
  pawnFrom: SquareIndex,
  forkSq: SquareIndex,
  victimSq: SquareIndex,
): boolean {
  const foe = opponent(pawn.side);
  // Işınlanma sonrası kopya: piyade hedefte, bekleme bitmiş (teleport tamam),
  // sıra rakipte. Kural mantığı TEKRAR ÇALIŞTIRILMAZ — yalnızca konum kurulur.
  const board = [...(position.board as (Piece | null)[])] as (Piece | null)[];
  board[pawnFrom] = null;
  board[forkSq] = { ...pawn, waiting: false, hasMoved: true };
  const citadels: CitadelState = {
    topLeft: { ...position.citadels.topLeft },
    bottomRight: { ...position.citadels.bottomRight },
  };
  const post = {
    board,
    sideToMove: foe,
    citadels,
    flags: {
      halfMoveClock: position.flags.halfMoveClock,
      fullMoveNumber: position.flags.fullMoveNumber,
      repetitionCount: { ...position.flags.repetitionCount },
      hasUsedKingSwap: { ...(position.flags.hasUsedKingSwap ?? { white: false, black: false }) },
    },
    zobristHash: 0n,
  } as Position;
  (post as { zobristHash: bigint }).zobristHash = computeZobristForArrays(board as never, foe, citadels);

  const pMoves = generateLegalMoves(post).filter((m) => m.from === victimSq);
  // P'nin piyadeyi alabilmesi bir kurtuluştur (hedef kareye iniş = alma).
  if (pMoves.some((m) => m.to === forkSq)) return false;
  if (pMoves.length === 0) return true;
  const strikes = new Set(pawnStrikeSquares(forkSq, pawn.side));
  // P'nin her hamlesinden sonra P'nin durduğu kare (m.to) hâlâ saldırıda.
  // (m.to Hisar karesi olamaz — piyon saldırısı tahta kareleridir — ve
  // strikes kümesinde olmadığı için kaçış sayılır.)
  return pMoves.every((m) => strikes.has(m.to));
}

export function forkSquares(position: Position, pawnSq: SquareIndex): ForkTargets {
  const pawn = pieceAt(position.board, position.citadels, pawnSq);
  if (
    !pawn ||
    pawn.kind !== PieceKind.Pawn ||
    !pawn.waiting ||
    pawn.side !== position.sideToMove
  ) {
    return { multi: [], trapped: [] };
  }
  const multi: SquareIndex[] = [];
  const trapped: SquareIndex[] = [];
  const board = position.board as (Piece | null)[];
  for (let f = 0; f < BOARD_COLS * BOARD_ROWS; f++) {
    if (board[f] !== null) continue; // hedef boş olmak zorunda
    const strikes = pawnStrikeSquares(f, pawn.side);
    const victims: SquareIndex[] = [];
    for (const t of strikes) {
      const v = board[t] as Piece | null;
      if (v && v.side !== pawn.side) victims.push(t);
    }
    if (victims.length >= 2) {
      multi.push(f);
    } else if (victims.length === 1) {
      if (isTrappedThreat(position, pawn, pawnSq, f, victims[0])) trapped.push(f);
    }
  }
  return { multi, trapped };
}

/** Panel/üretim için birleşik liste (multi önce). */
export function allForkSquares(position: Position, pawnSq: SquareIndex): SquareIndex[] {
  const t = forkSquares(position, pawnSq);
  return [...t.multi, ...t.trapped];
}

/** Bekleyen piyadenin normal alma hedefine inip inemeyeceği (test yardımcısı). */
export function isWaitingPawn(
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  sq: SquareIndex,
): boolean {
  const p = pieceAt(board, citadels, sq);
  return !!p && p.kind === PieceKind.Pawn && p.waiting === true;
}
