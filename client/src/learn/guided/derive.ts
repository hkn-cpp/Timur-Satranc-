/**
 * core/rules'tan kare kümesi türetme yardımcıları.
 * İçerikte ELLE KARE LİSTESİ YOK — bu modül tek türetme noktasıdır.
 *
 * UYARI hükmü: core/rules SADECE nihai hedef kareleri dışa verir.
 * Zürafa ara yapısı (firstStep/ride) motorda YOKTUR → bu iki reveal
 * DOĞRULANAMAZ; deriveFirstStep/deriveRide bilinçli olarak HATA FIRLATIR
 * (elle hesaplama yasağını kod seviyesinde uygular).
 */
import {
  coordToSquare,
  isBoardSquare,
  squareToCoord,
  type Position,
  type SquareIndex,
} from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { kingSwapTargets } from '../../core/rules/shared';
import { computeZobristForArrays } from '../../core/position/zobrist';
import type { MoveRef, PositionRef } from './types';

let pieceSeq = 0;

/** PositionRef → çalışır Position (saf; pieces konumu az taşla kurulur). */
export function buildPosition(ref: PositionRef): Position {
  pieceSeq += 1;
  if (ref.kind === 'pieces') {
    const board: ({ kind: string; side: string; id: string; pawnOf?: string; hasMoved: boolean; pawnStage?: 0 | 1 | 2 } | null)[] =
      new Array(112).fill(null);
    const citadels = {
      topLeft: { occupant: null as null | never, sealed: false },
      bottomRight: { occupant: null as null | never, sealed: false },
    };
    for (const p of ref.pieces) {
      const piece = {
        id: `guided-${pieceSeq}-${p.side}-${p.kind}-${p.square}`,
        kind: p.kind,
        side: p.side,
        pawnOf: p.kind === 'pawn' ? (p.pawnOf as string) : undefined,
        hasMoved: false,
        pawnStage: p.kind === 'pawn' && p.promotionStage !== undefined
          ? (p.promotionStage as 0 | 1 | 2)
          : undefined,
      };
      (board as unknown[])[p.square] = piece;
    }
    (board as unknown[])[110] = citadels.topLeft.occupant;
    (board as unknown[])[111] = citadels.bottomRight.occupant;
    // Hisar aynası: board[110/111] ↔ occupant senkronu (pipeline değişmezi).
    for (const p of ref.pieces) {
      if (p.square === 110) citadels.topLeft.occupant = (board as unknown[])[110] as never;
      if (p.square === 111) citadels.bottomRight.occupant = (board as unknown[])[111] as never;
    }
    const pos = {
      board,
      sideToMove: ref.sideToMove,
      citadels,
      flags: {
        halfMoveClock: 0,
        fullMoveNumber: 1,
        repetitionCount: {},
        hasUsedKingSwap: { ...(ref.kingSwapUsed ?? { white: false, black: false }) },
      },
      zobristHash: 0n,
    };
    (pos as { zobristHash: bigint }).zobristHash = computeZobristForArrays(
      board as never,
      pos.sideToMove as never,
    );
    return pos as unknown as Position;
  }
  // serialized: Dizilim Editörü formatı — legacy adaptör üzerinden.
  // derive katmanı legacy tiplere dokunmaz; çeviri validate katmanındadır.
  throw new Error('derive.buildPosition: serialized konumu validate katmanı çözer');
}

/** from karesindeki taşın TÜM yasal hedefleri (motordan). */
export function deriveDestinations(pos: Position, from: SquareIndex): SquareIndex[] {
  return generateLegalMoves(pos)
    .filter((m) => m.from === from)
    .map((m) => m.to);
}

/** MoveRef → motordaki Move (sıfır/belirsiz eşleşme yoksa null). */
export function matchMove(
  pos: Position,
  ref: MoveRef,
): { ok: boolean; to: SquareIndex[] } {
  const matches = generateLegalMoves(pos).filter((m) => m.from === ref.from && m.to === ref.to);
  if (matches.length === 0) return { ok: false, to: [] };
  return { ok: true, to: matches.map((m) => m.to) };
}

/** from→to arası katı-ara kareler; ışın üzerinde değilse null (kural bilmez). */
export function rayTransit(from: SquareIndex, to: SquareIndex): SquareIndex[] | null {
  const f = squareToCoord(from);
  const t = squareToCoord(to);
  if (!f || !t) return null;
  const dc = Math.sign(t.col - f.col);
  const dr = Math.sign(t.row - f.row);
  if (dc === 0 && dr === 0) return null;
  const straight = dc === 0 || dr === 0;
  const diagonal = Math.abs(t.col - f.col) === Math.abs(t.row - f.row);
  if (!straight && !diagonal) return null;
  const out: SquareIndex[] = [];
  let c = f.col + dc;
  let r = f.row + dr;
  while (c !== t.col || r !== t.row) {
    const s = coordToSquare(c, r);
    if (s === null) return null;
    out.push(s);
    c += dc;
    r += dr;
  }
  return out;
}

/** Taşın hedefleri arasından geçiş-kare kümesi (yalnız ışınlı kayıcılar). */
export function derivePathSquares(pos: Position, from: SquareIndex): SquareIndex[] {
  const piece = isBoardSquare(from) ? (pos.board as unknown[])[from] as { kind: string } | null : null;
  if (!piece || (piece.kind !== 'rook' && piece.kind !== 'picket')) {
    throw new Error('derivePathSquares: path yalnızca Kale ve Nöbetçi için türetilebilir');
  }
  const seen = new Set<SquareIndex>();
  for (const d of deriveDestinations(pos, from)) {
    const mid = rayTransit(from, d);
    if (mid) for (const s of mid) seen.add(s);
  }
  return [...seen];
}

/** Tek doğrultudaki hedefler (dx, dy işaretine göre). */
export function deriveDirection(
  pos: Position,
  from: SquareIndex,
  dx: -1 | 0 | 1,
  dy: -1 | 0 | 1,
): SquareIndex[] {
  const f = squareToCoord(from);
  if (!f) return [];
  return deriveDestinations(pos, from).filter((d) => {
    const t = squareToCoord(d);
    if (!t) return false;
    return Math.sign(t.col - f.col) === dx && Math.sign(t.row - f.row) === dy;
  });
}

/** Zürafa ara fazları motorda YOK — fail-closed (elle hesaplama yasak). */
export function deriveFirstStep(): SquareIndex[] {
  throw new Error(
    'UNVERIFIABLE firstStep: core/rules ara-kareleri dışa vermiyor; destinations + direction kullan',
  );
}

/** Zürafa ara fazları motorda YOK — fail-closed (elle hesaplama yasak). */
export function deriveRide(): SquareIndex[] {
  throw new Error(
    'UNVERIFIABLE ride: core/rules ara-kareleri dışa vermiyor; destinations + direction kullan',
  );
}

/** Şah Takası partner kareleri (ders 6.1; boşsa takas vadedilemez). */
export function deriveSwapPartners(pos: Position): SquareIndex[] {
  const used = pos.flags.hasUsedKingSwap ?? { white: false, black: false };
  return kingSwapTargets(pos.sideToMove, pos.board, pos.citadels, used).map((t) => t.to);
}
