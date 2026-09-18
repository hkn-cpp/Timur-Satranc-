/**
 * Game Core — Rules: makeMove / makeMoveInPlace / undoMoveInPlace (§7.2).
 *
 * §7.2 kuralı: Engine araması SADECE `*InPlace` ikilisini kullanır (allocation
 * yok); UI/replay SADECE immutable `makeMove` kullanır. İkisi de AYNI çekirdeği
 * (`shared.applyMoveToArrays` / `revertMoveInArrays`) ve AYNI terfi çözümünü
 * (`shared.resolvePawnPromotion`) kullanır — `generateLegalMoves` ile ortak kod.
 *
 * Bayrak/saat/hash politikası:
 *  - `halfMoveClock`: piyon hamlesi veya taş almada sıfırlanır, yoksa +1
 *    (legacy `GameState.halfMoveClock` alanı vardı ama HİÇ güncellenmiyordu;
 *    burada standarda bağlandı — KARAR NOKTASI olarak raporlanır).
 *  - `fullMoveNumber`: siyah oynayınca +1 (legacy `turnNumber` ile aynı).
 *  - `repetitionCount`: yeni hash'in sayacı +1 (legacy'de yoktu; spec §7.1
 *    `GameFlags` bunu öngörür).
 *  - `hasUsedKingSwap`: takas hamlesinde oynayan taraf için true.
 */

import {
  TOTAL_SQUARES,
  type CitadelState,
  type GameFlags,
  type Piece,
  type Position,
  type Side,
} from '../position/Position';
import { MoveSpecialFlag, type Move } from '../move/Move';
import { computeZobristForArrays } from '../position/zobrist';
import {
  applyMoveToArrays,
  assertBoardSize,
  isPromotionTarget,
  opponent,
  resolvePawnPromotion,
  revertMoveInArrays,
  type UndoRecord,
} from './shared';

export type { UndoRecord };

function cloneCitadels(c: CitadelState): CitadelState {
  return {
    topLeft: {
      occupant: c.topLeft.occupant ? { ...c.topLeft.occupant } : null,
      sealed: c.topLeft.sealed,
    },
    bottomRight: {
      occupant: c.bottomRight.occupant ? { ...c.bottomRight.occupant } : null,
      sealed: c.bottomRight.sealed,
    },
  };
}

function cloneFlags(f: GameFlags): GameFlags {
  return {
    halfMoveClock: f.halfMoveClock,
    fullMoveNumber: f.fullMoveNumber,
    repetitionCount: { ...f.repetitionCount },
    hasUsedKingSwap: f.hasUsedKingSwap
      ? { ...f.hasUsedKingSwap }
      : { white: false, black: false },
  };
}

function readSq(
  board: (Piece | null)[],
  citadels: CitadelState,
  sq: number,
): Piece | null {
  if (sq === 110) return citadels.topLeft.occupant;
  if (sq === 111) return citadels.bottomRight.occupant;
  return board[sq];
}

interface ResolvedMove {
  promotion?: import('../position/Position').PieceKind;
  isKingSwap: boolean;
  relocationTo: number | null;
  newPawnStage?: 0 | 1 | 2 | 3;
  newWaiting?: boolean;
  isTeleport: boolean;
}

/**
 * Hamleyi çalıştırılabilir forma çöz: UI özel terfi seçtiyse (`move.promotion`)
 * alt-subay piyonlarında o geçerli; Pawn-of-King / Pawn-of-Pawns hattı HER
 * ZAMAN shared çözümleyiciye sorulur (legacy `useGame` ~351-363 ile aynı sıra).
 */
function resolveForApply(
  position: Position,
  move: Move,
): ResolvedMove {
  const isKingSwap = move.specialFlags.includes(MoveSpecialFlag.KingSwap);
  if (isKingSwap) return { isKingSwap: true, relocationTo: null, isTeleport: false };
  // v3 K6: teleport hamlesi terfi hattına girmez (çatal karesi son yatayda
  // bile olsa); bekleme biter, tür değişmez.
  if (move.specialFlags.includes(MoveSpecialFlag.Teleport)) {
    return { isKingSwap: false, relocationTo: null, newWaiting: false, isTeleport: true };
  }
  const mover = readSq(
    position.board as (Piece | null)[],
    position.citadels,
    move.from,
  );
  if (
    mover &&
    mover.kind === 'pawn' &&
    isPromotionTarget(mover, move.to)
  ) {
    const custom =
      mover.pawnOf !== 'king' &&
      mover.pawnOf !== 'pawn' &&
      mover.pawnStage === undefined
        ? move.promotion
        : undefined;
    const r = resolvePawnPromotion(
      mover,
      position.board,
      position.citadels,
      custom,
    );
    return {
      promotion: r.promotedKind,
      isKingSwap: false,
      relocationTo: r.isRelocation ? r.relocationTo : null,
      newPawnStage: r.newStage,
      newWaiting: r.newWaiting,
      isTeleport: false,
    };
  }
  return {
    promotion: move.specialFlags.includes(MoveSpecialFlag.Promotion)
      ? move.promotion
      : undefined,
    isKingSwap: false,
    relocationTo: move.specialFlags.includes(MoveSpecialFlag.Relocation)
      ? move.to
      : null,
    isTeleport: false,
  };
}

function afterFlags(
  position: Position,
  move: Move,
  mover: Piece | null,
  captured: Piece | null,
  resolved: ResolvedMove,
  nextHashKey: string,
): GameFlags {
  const f = cloneFlags(position.flags);
  const pawnMove = mover?.kind === 'pawn';
  f.halfMoveClock = pawnMove || captured !== null ? 0 : f.halfMoveClock + 1;
  if (position.sideToMove === 'black') f.fullMoveNumber += 1;
  f.repetitionCount = { ...f.repetitionCount };
  // P1 DÜZELTME: girişteki konumun kendi sayacı yoksa (legacy adaptör /
  // eski test-iskeletleri boş map ile başlatır) ilk oluşumu 1 say.
  // Doğru başlatılmış konumlarda (map[cur]=1) etkisizdir.
  const curKey = (position.zobristHash as bigint).toString();
  if (!(curKey in f.repetitionCount)) f.repetitionCount[curKey] = 1;
  f.repetitionCount[nextHashKey] = (f.repetitionCount[nextHashKey] ?? 0) + 1;
  if (resolved.isKingSwap) {
    f.hasUsedKingSwap = {
      white: f.hasUsedKingSwap?.white ?? false,
      black: f.hasUsedKingSwap?.black ?? false,
    };
    f.hasUsedKingSwap[position.sideToMove] = true;
  }
  return f;
}

/** 112'lik karma dizi (tahta + hisar occupant'ları) — hash girdisi. */
function combined112(
  board: (Piece | null)[],
  citadels: CitadelState,
): (Piece | null)[] {
  const arr = board.slice();
  arr.length = TOTAL_SQUARES;
  arr[110] = citadels.topLeft.occupant;
  arr[111] = citadels.bottomRight.occupant;
  return arr;
}

/**
 * Immutable hamle — YENİ Position döner, girdi değişmez.
 * UI / geçmiş / replay SADECE bunu kullanır.
 */
export function makeMove(position: Position, move: Move): Position {
  assertBoardSize(position.board);
  const mover = readSq(position.board as (Piece | null)[], position.citadels, move.from);
  if (!mover) throw new Error(`GameCore.makeMove: ${move.from} karesinde taş yok`);
  const resolved = resolveForApply(position, move);

  const board = [...(position.board as (Piece | null)[])] as (Piece | null)[];
  const citadels = cloneCitadels(position.citadels);
  const undo = applyMoveToArrays(board, citadels, move.from, move.to, {
    promotion: resolved.promotion,
    isKingSwap: resolved.isKingSwap,
    relocationTo: resolved.relocationTo,
    newPawnStage: resolved.newPawnStage,
    newWaiting: resolved.newWaiting,
    isTeleport: resolved.isTeleport,
  });

  const nextSide: Side = opponent(position.sideToMove);
  const nextHash = computeZobristForArrays(combined112(board, citadels), nextSide, citadels);
  const captured = move.capturedPiece ?? undo.capturedBefore;
  const flags = afterFlags(position, move, mover, captured, resolved, nextHash.toString());

  return {
    board,
    sideToMove: nextSide,
    citadels,
    flags,
    zobristHash: nextHash,
  };
}

/**
 * Mutable hamle — `position` YERİNDE değişir, allocation yok (undo kaydı hariç).
 * Engine iç arama döngüsü SADECE bunu + `undoMoveInPlace` kullanır.
 * Dönüş: `undoMoveInPlace` için gerekli kayıt.
 */
export function makeMoveInPlace(position: Position, move: Move): UndoRecord {
  assertBoardSize(position.board);
  const board = position.board as unknown as (Piece | null)[];
  const undo = applyMoveToArrays(board, position.citadels, move.from, move.to, {
    ...(() => {
      const r = resolveForApply(position, move);
      return {
        promotion: r.promotion,
        isKingSwap: r.isKingSwap,
        relocationTo: r.relocationTo,
        newPawnStage: r.newPawnStage,
        newWaiting: r.newWaiting,
        isTeleport: r.isTeleport,
      };
    })(),
  });
  const moverBefore = undo.movedBefore;
  const captured = move.capturedPiece ?? undo.capturedBefore;
  undo.prevHalfMoveClock = position.flags.halfMoveClock;
  undo.prevFullMoveNumber = position.flags.fullMoveNumber;
  undo.prevSideToMove = position.sideToMove;
  undo.prevKingSwap = { ...(position.flags.hasUsedKingSwap ?? { white: false, black: false }) };
  undo.prevHash = position.zobristHash;

  const nextSide: Side = opponent(position.sideToMove);
  const resolved = resolveForApply(
    { ...position, sideToMove: undo.prevSideToMove } as Position,
    move,
  );
  void resolved;
  position.sideToMove = nextSide;
  const f = position.flags;
  const pawnMove = moverBefore.kind === 'pawn';
  f.halfMoveClock = pawnMove || captured !== null ? 0 : f.halfMoveClock + 1;
  if (undo.prevSideToMove === 'black') f.fullMoveNumber += 1;
  if (undo.movedBefore.side === undo.prevSideToMove && move.specialFlags.includes(MoveSpecialFlag.KingSwap)) {
    f.hasUsedKingSwap = { ...(f.hasUsedKingSwap ?? { white: false, black: false }) };
    f.hasUsedKingSwap[undo.prevSideToMove] = true;
  }
  const nextHash = computeZobristForArrays(
    combined112(board, position.citadels),
    nextSide,
    position.citadels,
  );
  position.zobristHash = nextHash;
  const prevKey = (undo.prevHash as bigint).toString();
  if (!(prevKey in f.repetitionCount)) f.repetitionCount[prevKey] = 1;
  f.repetitionCount[nextHash.toString()] = (f.repetitionCount[nextHash.toString()] ?? 0) + 1;
  return undo;
}

/**
 * `makeMoveInPlace` tersine çevirir (allocation yok).
 * İmza §7.2 ile uyumlu; 3. parametre (kayıt) relocation/takas/bayrak
 * restorasyonu için ZORUNLUDUR — kayıtsız geri alma desteklenmez.
 */
export function undoMoveInPlace(
  position: Position,
  move: Move,
  undo: UndoRecord,
): void {
  assertBoardSize(position.board);
  const isKingSwap = move.specialFlags.includes(MoveSpecialFlag.KingSwap);
  revertMoveInArrays(position.board as unknown as (Piece | null)[], position.citadels, undo, isKingSwap);
  position.sideToMove = undo.prevSideToMove;
  position.flags.halfMoveClock = undo.prevHalfMoveClock;
  position.flags.fullMoveNumber = undo.prevFullMoveNumber;
  position.flags.hasUsedKingSwap = { ...undo.prevKingSwap };
  // Bu hamlede eklenen repetition anahtarını geri al.
  const curKey = (position.zobristHash as bigint).toString();
  if (position.flags.repetitionCount[curKey] !== undefined) {
    const v = position.flags.repetitionCount[curKey] - 1;
    if (v <= 0) delete position.flags.repetitionCount[curKey];
    else position.flags.repetitionCount[curKey] = v;
  }
  position.zobristHash = undo.prevHash;
}
