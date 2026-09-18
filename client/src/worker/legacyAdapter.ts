/**
 * Eski (legacy `types/chess`) oyun durumu ↔ yeni Game Core (`Position`,
 * engine `Move`) adaptörü. Worker sınırı legacy tipleri TAŞIMAZ — dönüşüm
 * ana thread'de, tek noktada yapılır.
 *
 * Eşleme (doğrulanmış, tek yönde hata yapma lüksü yok):
 *  - Kare: sq 0..109 ↔ {x: sq%11, y: floor(sq/11)};
 *    110 ↔ {isCitadel, citadelSide:'left'} ↔ `blackCitadelPiece`;
 *    111 ↔ {isCitadel, citadelSide:'right'} ↔ `whiteCitadelPiece`.
 *    (moveRules.ts:28-29,41 + shared.ts:158-159 birlikte okundu.)
 *  - Taş: legacy queen (1 DÜZ) ↔ General; legacy general (1 ÇAPRAZ) ↔ Ferz;
 *    bishop↔Alfil, warMachine↔Dabbaba, diğerleri birebir (Position.ts tablosu).
 *  - `id` BİREBİR korunur (analizde fiziksel taş takibi için).
 *  - Terfi-satırı piyonunda `promotedFrom` yoksa legacy fallback
 *    (`custom || promotedFrom || 'queen'`) ile aynı: General.
 */

import type {
  BoardPosition as LegacyBoardPosition,
  GameState as LegacyGameState,
  Move as LegacyMove,
  Piece as LegacyPiece,
  PieceType as LegacyPieceType,
  PlayerColor,
} from '../types/chess';
import {
  PieceKind,
  type Piece as EnginePiece,
  type Position as EnginePosition,
  type Side,
} from '../core/position/Position';
import { MoveSpecialFlag, type Move as EngineMove } from '../core/move/Move';
import { computeZobristForArrays } from '../core/position/zobrist';
import { serializePosition, type SerializedPosition } from './protocol';

const LEGACY_TO_KIND: Record<LegacyPieceType, PieceKind> = {
  king: PieceKind.King,
  queen: PieceKind.General,
  general: PieceKind.Ferz,
  rook: PieceKind.Rook,
  knight: PieceKind.Knight,
  bishop: PieceKind.Alfil,
  camel: PieceKind.Camel,
  warMachine: PieceKind.Dabbaba,
  giraffe: PieceKind.Giraffe,
  picket: PieceKind.Picket,
  pawn: PieceKind.Pawn,
  prince: PieceKind.Prince,
};

const KIND_TO_LEGACY: Record<PieceKind, LegacyPieceType> = {
  [PieceKind.King]: 'king',
  [PieceKind.General]: 'queen',
  [PieceKind.Ferz]: 'general',
  [PieceKind.Rook]: 'rook',
  [PieceKind.Knight]: 'knight',
  [PieceKind.Alfil]: 'bishop',
  [PieceKind.Camel]: 'camel',
  [PieceKind.Dabbaba]: 'warMachine',
  [PieceKind.Giraffe]: 'giraffe',
  [PieceKind.Picket]: 'picket',
  [PieceKind.Pawn]: 'pawn',
  [PieceKind.Prince]: 'prince',
  // v3: Maceracı Şah'ın legacy karşılığı yok; GÖRÜNTÜ amaçlı `prince`
  // anahtarına eşlenir (Şah PNG'si). Kural motoru bu eşlemeyi kullanmaz.
  [PieceKind.AdventurousKing]: 'prince',
};

/** 110/111 + tahta karesi → legacy BoardPosition. */
export function squareToLegacy(sq: number): LegacyBoardPosition {
  if (sq === 110) return { x: -1, y: 8, isCitadel: true, citadelSide: 'left' };
  if (sq === 111) return { x: 11, y: 1, isCitadel: true, citadelSide: 'right' };
  return { x: sq % 11, y: Math.floor(sq / 11) };
}

function convertPiece(p: LegacyPiece): EnginePiece {
  const kind = LEGACY_TO_KIND[p.type];
  return {
    id: p.id,
    kind,
    side: p.color as Side,
    pawnOf: kind === PieceKind.Pawn ? LEGACY_TO_KIND[p.promotedFrom ?? 'queen'] : undefined,
    hasMoved: p.hasMoved ?? false,
    pawnStage: p.pawnOfPawnsStage as 0 | 1 | 2 | undefined,
  };
}

/**
 * Legacy `GameState` → yeni `Position` (worker'a gönderilmeye hazır).
 * Tahta + hisar occupant'ları 112'lik senkron diziye yazılır, hash hesaplanır.
 */
export function legacyGameStateToPosition(gs: LegacyGameState): EnginePosition {
  const board: (EnginePiece | null)[] = new Array(112).fill(null);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 11; x++) {
      const p = gs.board[y]?.[x];
      if (p) board[y * 11 + x] = convertPiece(p);
    }
  }
  const topLeft = gs.citadels.blackCitadelPiece ? convertPiece(gs.citadels.blackCitadelPiece) : null;
  const bottomRight = gs.citadels.whiteCitadelPiece ? convertPiece(gs.citadels.whiteCitadelPiece) : null;
  board[110] = topLeft;
  board[111] = bottomRight;
  const pos = {
    board,
    sideToMove: gs.currentTurn as Side,
    citadels: {
      topLeft: { occupant: topLeft, sealed: false },
      bottomRight: { occupant: bottomRight, sealed: false },
    },
    flags: {
      halfMoveClock: gs.halfMoveClock,
      fullMoveNumber: gs.turnNumber,
      repetitionCount: {},
      hasUsedKingSwap: { ...gs.hasUsedKingSwap },
    },
    zobristHash: 0n,
  } as EnginePosition;
  pos.zobristHash = computeZobristForArrays(board as never, pos.sideToMove);
  return pos;
}

/**
 * Tek adım: legacy `GameState` → worker'a gönderilmeye hazır `SerializedPosition`.
 * `useGame` bot etkisi bunu kullanır.
 */
export function legacyGameStateToSerialized(gs: LegacyGameState): SerializedPosition {
  return serializePosition(legacyGameStateToPosition(gs));
}

function legacyPieceAt(gs: LegacyGameState, pos: LegacyBoardPosition): LegacyPiece | null {
  if (pos.isCitadel) {
    return pos.citadelSide === 'left' ? gs.citadels.blackCitadelPiece : gs.citadels.whiteCitadelPiece;
  }
  return gs.board[pos.y]?.[pos.x] ?? null;
}

function convertCaptured(p: EnginePiece, at: LegacyBoardPosition): LegacyPiece {
  return {
    id: p.id,
    type: KIND_TO_LEGACY[p.kind],
    color: p.side as PlayerColor,
    position: at,
    hasMoved: true,
  };
}

export interface LegacyExecution {
  move: LegacyMove;
  /** `executeMoveInternal(move, promotionType)` ikinci argümanı. */
  promotionType?: LegacyPieceType;
}

/**
 * Engine hamlesi → legacy `executeMoveInternal` girdisi.
 * Kural mantığı TEKRAR ÇALIŞTIRILMAZ: terfi/relocation/takas legacy
 * `executeMoveInternal` içinde kendi kurallarıyla çözülür; burada sadece
 * from/to + takas eşleşmesi + terfi TÜRÜ taşınır. `null` = güvensiz hamle,
 * oynatma (safety guard).
 */
export function engineMoveToLegacy(
  snapshot: LegacyGameState,
  m: EngineMove,
): LegacyExecution | null {
  const from = squareToLegacy(m.from);
  const to = squareToLegacy(m.to);
  const mover = legacyPieceAt(snapshot, from);
  if (!mover || mover.color !== snapshot.currentTurn) return null;

  const isKingSwap = m.specialFlags.includes(MoveSpecialFlag.KingSwap);
  const isRelocation = m.specialFlags.includes(MoveSpecialFlag.Relocation);
  let swappedPiece: LegacyPiece | undefined;
  if (isKingSwap) {
    const target = legacyPieceAt(snapshot, to);
    if (!target || target.color !== snapshot.currentTurn || target.type === 'king') return null;
    swappedPiece = target;
  }

  const promotion = m.promotion ? KIND_TO_LEGACY[m.promotion] : undefined;
  return {
    move: {
      from,
      to,
      capturedPiece: m.capturedPiece ? convertCaptured(m.capturedPiece, to) : undefined,
      isCitadelMove: to.isCitadel,
      promotion,
      isKingSwap: isKingSwap || undefined,
      swappedPiece,
    },
    // Relocation/şah-piyonu legacy kendi çözer; alt-subayda engine türü geçer.
    promotionType: promotion !== undefined && !isRelocation ? promotion : undefined,
  };
}

/**
 * Game Core `Position` nesnesini UI (`BoardGrid` / `BoardMatrix` & `CitadelState`)
 * formatına dönüştürür.
 */
export function positionToLegacyBoardAndCitadels(pos: EnginePosition): {
  board: (LegacyPiece | null)[][];
  citadels: {
    blackCitadelPiece: LegacyPiece | null;
    whiteCitadelPiece: LegacyPiece | null;
  };
} {
  const board: (LegacyPiece | null)[][] = Array.from({ length: 10 }, () => Array(11).fill(null));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 11; x++) {
      const p = pos.board[y * 11 + x];
      if (p) {
        board[y][x] = {
          id: p.id,
          type: KIND_TO_LEGACY[p.kind],
          color: p.side as PlayerColor,
          position: { x, y },
          hasMoved: p.hasMoved,
          promotedFrom: p.pawnOf ? KIND_TO_LEGACY[p.pawnOf] : undefined,
          pawnOfPawnsStage: p.pawnStage,
          waiting: p.waiting,
        };
      }
    }
  }

  const leftPiece = pos.board[110];
  const rightPiece = pos.board[111];

  const citadels = {
    blackCitadelPiece: leftPiece
      ? {
          id: leftPiece.id,
          type: KIND_TO_LEGACY[leftPiece.kind],
          color: leftPiece.side as PlayerColor,
          position: { x: -1, y: 8, isCitadel: true, citadelSide: 'left' } as LegacyBoardPosition,
          hasMoved: leftPiece.hasMoved,
        }
      : null,
    whiteCitadelPiece: rightPiece
      ? {
          id: rightPiece.id,
          type: KIND_TO_LEGACY[rightPiece.kind],
          color: rightPiece.side as PlayerColor,
          position: { x: 11, y: 1, isCitadel: true, citadelSide: 'right' } as LegacyBoardPosition,
          hasMoved: rightPiece.hasMoved,
        }
      : null,
  };

  return { board, citadels };
}

