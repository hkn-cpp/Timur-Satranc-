/**
 * Game Core — Zobrist Hash (docs/mimari.md §3.4 + §7.1 `Position.zobristHash`).
 *
 * Her (kare, taş-türü, taraf[, piyon-alt-türü]) kombinasyonu için deterministik
 * rastgele bir bigint tutar; `Position.zobristHash` bu tablodan hesaplanır.
 * Deterministik PRNG (mulberry32 + splitmix64) + sabit SEED kullanılır:
 * aynı kod her çalışta aynı tabloyu üretir (TT/cache tutarlılığı için şart).
 */

import {
  PieceKind,
  TOTAL_SQUARES,
  type BoardArray,
  type Side,
} from './Position';

// Piyon alt-türleri de hashe dahil (farklı `pawnOf` = farklı taş).
const PAWN_OF_KEYS = [
  'king',
  'general',
  'ferz',
  'rook',
  'knight',
  'alfil',
  'camel',
  'dabbaba',
  'giraffe',
  'picket',
  'pawn',
  'prince',
  '',
] as const;

// P1 DÜZELTME + v3: `pawnStage` (0/1/2/3) ve `waiting` hashe dahil — aynı
// karede aynı `pawnOf` ama farklı kademedeki/bekleme durumundaki piyonlar
// FARKLI gelecek-hamlelere sahiptir. Eski kod çakışıyordu (tekrar/TT).
const PAWN_STAGE_KEYS = ['', '0', '1', '2', '3'] as const;
const PAWN_WAIT_KEYS = ['', 'W'] as const;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBigint64(rand: () => number): bigint {
  const hi = BigInt(Math.floor(rand() * 0xffffffff));
  const lo = BigInt(Math.floor(rand() * 0xffffffff));
  return (hi << 32n) | lo;
}

function pieceKey(kind: PieceKind, side: Side, pawnOf?: PieceKind): string {
  // `pawnOf` boş string ile normalize edilir (pawn olmayanlarda tanımsız).
  return `${kind}|${side}|${pawnOf ?? ''}`;
}

/** [square][pieceKey] -> bigint */
const TABLE: Map<number, Map<string, bigint>> = new Map();
const SIDE_KEY: Record<Side, bigint> = { white: 0n, black: 0n };
/** Hisar mühür katkıları (v3 K12): slot başına bir anahtar. */
const SEALED_KEYS: { topLeft: bigint; bottomRight: bigint } = { topLeft: 0n, bottomRight: 0n };

function buildTable(): void {
  if (TABLE.size > 0) return;
  const rand = mulberry32(0x71bf_1a09);
  SIDE_KEY.white = randomBigint64(rand);
  SIDE_KEY.black = randomBigint64(rand);
  SEALED_KEYS.topLeft = randomBigint64(rand);
  SEALED_KEYS.bottomRight = randomBigint64(rand);
  const kinds = Object.values(PieceKind) as PieceKind[];
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const inner = new Map<string, bigint>();
    for (const kind of kinds) {
      for (const side of ['white', 'black'] as Side[]) {
        if (kind === PieceKind.Pawn) {
          for (const pawnOf of PAWN_OF_KEYS) {
            for (const stage of PAWN_STAGE_KEYS) {
              for (const wait of PAWN_WAIT_KEYS) {
                inner.set(
                  `${kind}|${side}|${pawnOf}|${stage}|${wait}`,
                  randomBigint64(rand),
                );
              }
            }
          }
        } else {
          inner.set(pieceKey(kind, side), randomBigint64(rand));
        }
      }
    }
    TABLE.set(sq, inner);
  }
}

buildTable();

/** Tek taşın hash katkısı (karesiyle birlikte). */
export function hashContribution(
  square: number,
  kind: PieceKind,
  side: Side,
  pawnOf?: PieceKind,
  pawnStage?: 0 | 1 | 2 | 3,
  waiting?: boolean,
): bigint {
  const inner = TABLE.get(square);
  if (!inner) return 0n;
  const key =
    kind === PieceKind.Pawn
      ? `${kind}|${side}|${pawnOf ?? ''}|${pawnStage ?? ''}|${waiting ? 'W' : ''}`
      : pieceKey(kind, side);
  return inner.get(key) ?? 0n;
}

/**
 * Pozisyon hash'i: board[0..111] katkıları XOR + sideToMove katkısı +
 * hisar mühür katkıları (v3). Hisar occupant'ları board[110/111] olarak
 * taşınır. `citadels` verilmezse mühürsüz varsayılır (eski çağrılarla
 * aynı hash — geriye uyumlu).
 */
export function computeZobristForArrays(
  board112: BoardArray | (unknown | null)[],
  sideToMove: Side,
  citadels?: { topLeft: { sealed: boolean }; bottomRight: { sealed: boolean } },
): bigint {
  let h = 0n;
  for (let sq = 0; sq < board112.length && sq < TOTAL_SQUARES; sq++) {
    const p = board112[sq] as {
      kind: PieceKind;
      side: Side;
      pawnOf?: PieceKind;
      pawnStage?: 0 | 1 | 2 | 3;
      waiting?: boolean;
    } | null;
    if (p) h ^= hashContribution(sq, p.kind, p.side, p.pawnOf, p.pawnStage, p.waiting);
  }
  if (citadels?.topLeft.sealed) h ^= SEALED_KEYS.topLeft;
  if (citadels?.bottomRight.sealed) h ^= SEALED_KEYS.bottomRight;
  h ^= SIDE_KEY[sideToMove];
  return h;
}

export const ZOBRIST_SEED = 0x71bf_1a09;
