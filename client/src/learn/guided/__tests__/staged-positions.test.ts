/**
 * K4 — Ders 4.2'nin temeli: 11 farklı pawnOf kimliğiyle kurulu konumun
 * (a) core/rules'a göre legal olduğu, (b) resolvePawnPromotion'ın her biri
 * için doğru figürü döndürdüğü kanıtı.
 */
import { PieceKind, type Piece, type Position } from '../../../core/position/Position';
import { computeZobristForArrays } from '../../../core/position/zobrist';
import { generateLegalMoves } from '../../../core/rules/generateLegalMoves';
import { isCheck } from '../../../core/rules/gameResult';
import { resolvePawnPromotion } from '../../../core/rules/shared';

export interface TestSummary {
  passed: number;
  failed: number;
}

/** 11 kimlik: 10 figür + Piyadelerin Piyadesi (Pawn). */
export const ELEVEN_IDENTITIES: PieceKind[] = [
  PieceKind.Rook,
  PieceKind.Knight,
  PieceKind.Picket,
  PieceKind.Giraffe,
  PieceKind.General,
  PieceKind.King,
  PieceKind.Ferz,
  PieceKind.Giraffe,
  PieceKind.Picket,
  PieceKind.Knight,
  PieceKind.Pawn,
];

function sq(col: number, row: number): number {
  return row * 11 + col;
}

export function buildElevenPawnPosition(): Position {
  const board: (Piece | null)[] = new Array(112).fill(null);
  const kinds: PieceKind[] = [
    PieceKind.Rook, PieceKind.Knight, PieceKind.Picket, PieceKind.Giraffe,
    PieceKind.General, PieceKind.King, PieceKind.Ferz, PieceKind.Alfil,
    PieceKind.Camel, PieceKind.Dabbaba, PieceKind.Pawn,
  ];
  for (let c = 0; c < 11; c++) {
    board[sq(c, 8)] = {
      id: `w-pawn-${c}`,
      kind: PieceKind.Pawn,
      side: 'white',
      pawnOf: kinds[c],
      hasMoved: true,
      pawnStage: undefined,
    };
  }
  board[sq(0, 0)] = { id: 'w-k', kind: PieceKind.King, side: 'white', hasMoved: false };
  board[sq(5, 5)] = { id: 'b-k', kind: PieceKind.King, side: 'black', hasMoved: false };
  const pos = {
    board,
    sideToMove: 'white' as const,
    citadels: {
      topLeft: { occupant: null, sealed: false },
      bottomRight: { occupant: null, sealed: false },
    },
    flags: { halfMoveClock: 0, fullMoveNumber: 1, repetitionCount: {}, hasUsedKingSwap: { white: false, black: false } },
    zobristHash: 0n,
  } as unknown as Position;
  (pos as { zobristHash: bigint }).zobristHash = computeZobristForArrays(board as never, 'white');
  return pos;
}

export function runStagedPositionTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  const ok = (cond: boolean, name: string): void => {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  };

  const pos = buildElevenPawnPosition();

  // (a) legal: iki Şah var, sıra-dışı taraf şah altında değil, pawnOf tanımlı
  let wk = 0;
  let bk = 0;
  for (let i = 0; i < 112; i++) {
    const p = pos.board[i];
    if (p?.kind === PieceKind.King && p.side === 'white') wk++;
    if (p?.kind === PieceKind.King && p.side === 'black') bk++;
    if (p?.kind === PieceKind.Pawn) ok(p.pawnOf !== undefined, `K4a: ${i} pawnOf tanımlı`);
  }
  ok(wk === 1 && bk === 1, 'K4a: iki Şah sahnede');
  ok(!isCheck(pos, 'black'), 'K4a: sırası olmayan taraf şah altında değil');

  // (b) her kimlik doğru figüre çözülüyor
  const expected = new Map<PieceKind, PieceKind>([
    [PieceKind.Rook, PieceKind.Rook],
    [PieceKind.Knight, PieceKind.Knight],
    [PieceKind.Picket, PieceKind.Picket],
    [PieceKind.Giraffe, PieceKind.Giraffe],
    [PieceKind.General, PieceKind.General],
    [PieceKind.King, PieceKind.Prince],
    [PieceKind.Ferz, PieceKind.Ferz],
    [PieceKind.Alfil, PieceKind.Alfil],
    [PieceKind.Camel, PieceKind.Camel],
    [PieceKind.Dabbaba, PieceKind.Dabbaba],
  ]);
  for (let c = 0; c < 11; c++) {
    const pawn = pos.board[sq(c, 8)] as Piece;
    const r = resolvePawnPromotion(pawn, pos.board, pos.citadels);
    if (pawn.pawnOf === PieceKind.Pawn) {
      ok(r.isRelocation === true && r.promotedKind === PieceKind.Pawn, 'K4b: Pawn kimliği bekleme (relocation)');
    } else {
      ok(r.promotedKind === expected.get(pawn.pawnOf as PieceKind), `K4b: ${pawn.pawnOf} → ${r.promotedKind}`);
    }
  }

  // (c) terfi hamleleri motorda üretiliyor (düz itişler)
  const moves = generateLegalMoves(pos).filter((m) => m.from >= sq(0, 8) && m.from <= sq(10, 8));
  ok(moves.length >= 11, `K4c: 11 piyadenin itişi motorda (${moves.length})`);

  return { passed, failed };
}
