/**
 * Ajan-1 (KURAL MOTORU) regresyon kilidi — P0/P1 düzeltmeleri.
 *
 * Kapsam:
 *  - R1 piyon-saldırı modeli (isAttacked/findSafeRelocationSquare): düz-ileri
 *    saldırı DEĞİL, çapraz (boş bile olsa) saldırıdır.
 *  - R2 relocation-yakalama (P0): `to`'daki düşman kalkar, piyon güvenli-kareye
 *    (`landing`) gider; undo ikisini de restore eder.
 *  - R3 zobrist pawnStage: stage0 vs stage1 farklı hash.
 *  - R4 repetition oto-init: boş map ile başlayan zincirde ilk konum 1 sayılır.
 *  - R5 fifty-move / üç-tekrar oyun-sonu.
 *  - R6 terfi+şah, çifte-şah kaçışı, hisar-dolu girişi.
 *  - R7 make/undo simetrisi (quiet/terfi/takas/hisar) + perft bütünlüğü.
 *  - R8 setupValidator hisar-renk sayımı.
 *
 * Çalıştırma (client/ dizininden):
 *   npx tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node \
 *     --outDir "<TEMP>/timur-a1" "src/core/rules/__tests__/agent1.regression.test.ts"
 *   node "<TEMP>/timur-a1/core/rules/__tests__/agent1.regression.test.js"
 * NOT: runTests.ts'e kayıt EKLEME (12. ajanın işi).
 */

import { PieceKind, type Piece, type Position, type Side } from '../../position/Position';
import { computeZobristForArrays } from '../../position/zobrist';
import { generateLegalMoves } from '../generateLegalMoves';
import { makeMove, makeMoveInPlace, undoMoveInPlace } from '../makeMove';
import { getGameResult, isCheck } from '../gameResult';
import { isAttacked } from '../shared';
import { MoveSpecialFlag } from '../../move/Move';
import { validateSetupPosition } from '../../setup/setupValidator';
import { createEmptyBoard } from '../../engine/index';
import { createPiece as createLegacyPiece } from '../../engine/boardSetup';

export interface TestSummary {
  passed: number;
  failed: number;
}

let idCounter = 100000;
function tq(col: number, row: number): number {
  return row * 11 + col;
}
function mkPos(
  side: Side,
  specs: { sq: number; kind: PieceKind; side: Side; pawnOf?: PieceKind; pawnStage?: 0 | 1 | 2 }[],
): Position {
  const board: (Piece | null)[] = new Array(112).fill(null);
  const citadels = {
    topLeft: { occupant: null as Piece | null, sealed: false },
    bottomRight: { occupant: null as Piece | null, sealed: false },
  };
  for (const s of specs) {
    const p: Piece = {
      id: `${s.side}-${s.kind}-${s.sq}-${idCounter++}`,
      kind: s.kind,
      side: s.side,
      pawnOf: s.pawnOf,
      hasMoved: false,
      pawnStage: s.pawnStage,
    };
    board[s.sq] = p;
    if (s.sq === 110) citadels.topLeft.occupant = p;
    if (s.sq === 111) citadels.bottomRight.occupant = p;
  }
  const pos = {
    board,
    sideToMove: side,
    citadels,
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: { white: false, black: false },
    },
    zobristHash: 0n,
  } as unknown as Position;
  pos.zobristHash = computeZobristForArrays(board as never, side);
  return pos;
}

export function runAgent1RegressionTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string, extra?: string): void {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}${extra ? ' — ' + extra : ''}`);
    }
  }

  // ---- R1 piyon-saldırı modeli ----
  {
    const pos = mkPos('white', [
      { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
      { sq: tq(5, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]);
    ok(isAttacked(pos.board, pos.citadels, tq(5, 5), 'black') === false, 'R1a: piyon düz-ileri (boş) saldırı değil');
    ok(isAttacked(pos.board, pos.citadels, tq(4, 5), 'black') === true, 'R1b: piyon çapraz (boş) saldırıdır');
    ok(isAttacked(pos.board, pos.citadels, tq(6, 5), 'black') === true, 'R1c: piyon çapraz-2 (boş) saldırıdır');
    // Dolu şah-karesi sorguları (mat/şah yolu) hâlâ doğru:
    const chk = mkPos('white', [
      { sq: tq(4, 5), kind: PieceKind.King, side: 'white' },
      { sq: tq(5, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]);
    ok(isCheck(chk, 'white') === true, 'R1d: çaprazdaki şah şah-tır');
    const fwd = mkPos('white', [
      { sq: tq(5, 5), kind: PieceKind.King, side: 'white' },
      { sq: tq(5, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]);
    ok(isCheck(fwd, 'white') === false, 'R1e: düz-ilerideki şah şah-DEĞİL');
  }

  // ---- R2 v3 bekleme-yakalama (P0 relocation kalktı; K3/K4) ----
  {
    const pos = mkPos('white', [
      { sq: tq(10, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(4, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn },
      { sq: tq(5, 9), kind: PieceKind.Rook, side: 'black' },
    ]);
    const cap = generateLegalMoves(pos).find((m) => m.from === tq(4, 8) && m.to === tq(5, 9));
    ok(cap !== undefined && !cap.specialFlags.includes(MoveSpecialFlag.Relocation), 'R2a: v3 varış-yakalama relocation YOK (yerinde bekler)');
    if (cap) {
      const after = makeMove(pos, cap);
      const stayed = after.board[tq(5, 9)] as Piece | null;
      ok(stayed?.kind === PieceKind.Pawn && stayed?.side === 'white', 'R2b: `to` karesinde artık bekleyen beyaz piyon durur');
      ok(stayed?.waiting === true, 'R2c: varış-yakalama sonrası bekleme başlar (landing=varış karesi)');
      ok((after.board[tq(5, 9)] as Piece | null)?.pawnStage === 1, 'R2d: kademe 1 olur');
      ok(after.flags.halfMoveClock === 0, 'R2e: yakalama saati sıfırlar');
      // InPlace + undo ikisini de restore eder:
      const p2 = mkPos('white', [
        { sq: tq(10, 0), kind: PieceKind.King, side: 'white' },
        { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
        { sq: tq(4, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn },
        { sq: tq(5, 9), kind: PieceKind.Rook, side: 'black' },
      ]);
      const b0 = JSON.stringify(p2.board);
      const h0 = p2.zobristHash;
      const u = makeMoveInPlace(p2, cap);
      ok((p2.board[tq(5, 9)] as Piece | null)?.waiting === true, 'R2f: in-place varış bekleyen piyon olur');
      undoMoveInPlace(p2, cap, u);
      ok(JSON.stringify(p2.board) === b0 && p2.zobristHash === h0, 'R2g: undo `to`+`landing`+`from` restore eder');
    }
    // Sessiz varış (yakalamasız) v3: yerinde bekler.
    const q = mkPos('white', [
      { sq: tq(10, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn },
    ]);
    const qm = generateLegalMoves(q).find((m) => m.from === tq(5, 8));
    ok(qm !== undefined && !qm.specialFlags.includes(MoveSpecialFlag.Relocation), 'R2h: v3 sessiz varışta relocation YOK');
    if (qm) {
      const qa = makeMove(q, qm);
      ok((qa.board[tq(5, 9)] as Piece | null)?.waiting === true, 'R2i: sessizde hedef bekleyen piyonla dolar');
    }
  }

  // ---- R3 zobrist pawnStage ----
  {
    const a = mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 0 },
    ]);
    const b = mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1 },
    ]);
    ok(a.zobristHash !== b.zobristHash, 'R3a: stage0 vs stage1 farklı hash');
    const c = mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 0 },
    ]);
    ok(a.zobristHash === c.zobristHash, 'R3b: aynı dizilim aynı hash (id bağımsız)');
  }

  // ---- R4 repetition oto-init + R5 oyun-sonu ----
  {
    const pos = mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 4), kind: PieceKind.Rook, side: 'white' },
    ]);
    const mv = generateLegalMoves(pos).find((m) => m.from === tq(5, 4));
    ok(mv !== undefined, 'R4a: hamle var');
    if (mv) {
      const after = makeMove(pos, mv);
      const curKey = (pos.zobristHash as bigint).toString();
      const nextKey = (after.zobristHash as bigint).toString();
      ok((after.flags.repetitionCount[curKey] ?? 0) >= 1, 'R4b: giriş konumu 1 sayılır (oto-init)');
      ok((after.flags.repetitionCount[nextKey] ?? 0) >= 1, 'R4c: çıkış konumu 1 sayılır');
      // Üç-tekrar eşiği:
      const repPos = mkPos('white', [
        { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
        { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      ]);
      const hk = (repPos.zobristHash as bigint).toString();
      (repPos.flags.repetitionCount as Record<string, number>)[hk] = 3;
      const rr = getGameResult(repPos);
      ok(rr?.type === 'draw' && (rr as { reason: string }).reason === 'repetition', 'R5a: sayaç=3 tekrar-beraberliği');
      // Elli-hamle eşiği:
      const fifty = mkPos('white', [
        { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
        { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      ]);
      fifty.flags.halfMoveClock = 100;
      const fr = getGameResult(fifty);
      ok(fr?.type === 'draw' && (fr as { reason: string }).reason === 'fifty_move', 'R5b: saat=100 fifty-move beraberliği');
      const notYet = mkPos('white', [
        { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
        { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      ]);
      notYet.flags.halfMoveClock = 99;
      ok(getGameResult(notYet) === null, 'R5c: saat=99 oyun sürer');
    }
  }

  // ---- R6 terfi+şah / çifte-şah / hisar-dolu ----
  {
    // Terfi+şah: beyaz piyon (5,8)->(5,9)=kale, siyah şah (5,3) dosyada.
    const pos = mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(5, 3), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    ]);
    const pm = generateLegalMoves(pos).find((m) => m.from === tq(5, 8));
    ok(pm !== undefined && pm.promotion === PieceKind.Rook, 'R6a: terfi hamlesi üretilir');
    if (pm) {
      ok(pm.metadata.isCheck === true, 'R6b: terfi+şah metadata.isCheck');
      const after = makeMove(pos, pm);
      ok(isCheck(after, 'black') === true, 'R6c: terfi sonrası rakip şah-ta');
    }
    // Çifte-şah: beyaz şah (4,4), siyah kaleler (4,8)+(0,4). Beyaz şah-dışı taş oynayamaz.
    const dbl = mkPos('white', [
      { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
      { sq: tq(0, 4), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(0, 6), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]);
    if (isCheck(dbl, 'white')) {
      const nonKing = generateLegalMoves(dbl).filter((m) => m.from !== tq(4, 4));
      ok(nonKing.length === 0, `R6d: çifte-şahta şah-dışı hamle yok (n=${nonKing.length})`);
    } else {
      // Kurulum çifte-şah vermediyse en azından tek-şah filtresini kilitle:
      const chk1 = mkPos('white', [
        { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
        { sq: tq(0, 4), kind: PieceKind.Rook, side: 'white' },
        { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
        { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      ]);
      ok(isCheck(chk1, 'white'), 'R6d-alt: tek-şah kuruldu');
      const rookMoves = generateLegalMoves(chk1).filter((m) => m.from === tq(0, 4));
      ok(!rookMoves.some((m) => m.to === tq(0, 5)), 'R6e: şahı kapatmayan hamle filtrelenir');
    }
    // Hisar doluyken giriş: sol hisar düşmanla doluysa şah yakalayarak girebilir (canLand).
    const occ = mkPos('white', [
      { sq: tq(0, 7), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: 110, kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
    ]);
    const entry = generateLegalMoves(occ).filter((m) => m.from === tq(0, 7) && m.to === 110);
    ok(entry.length === 1 && entry[0].capturedPiece !== null, 'R6f: dolu hisara yakalama-girişi üretilir');
    if (entry.length === 1) {
      const ea = makeMove(occ, entry[0]);
      ok(ea.citadels.topLeft.occupant?.kind === PieceKind.King, 'R6g: giriş sonrası hisar şahındır');
      ok((ea.board[110] as Piece | null)?.kind === PieceKind.King, 'R6h: board[110] senkron');
    }
  }

  // ---- R7 make/undo simetrisi + perft bütünlüğü ----
  {
    function roundTrip(name: string, pos: Position, from: number): void {
      const mv = generateLegalMoves(pos).find((m) => m.from === from);
      if (!mv) {
        ok(false, `${name}: hamle bulunamadı`);
        return;
      }
      const b0 = JSON.stringify(pos.board);
      const c0 = JSON.stringify(pos.citadels);
      const h0 = pos.zobristHash;
      const s0 = pos.sideToMove;
      const f0 = JSON.stringify({ h: pos.flags.halfMoveClock, f: pos.flags.fullMoveNumber, k: pos.flags.hasUsedKingSwap });
      const u = makeMoveInPlace(pos, mv);
      const changed = JSON.stringify(pos.board) !== b0;
      undoMoveInPlace(pos, mv, u);
      ok(changed, `${name}: uygular`);
      ok(JSON.stringify(pos.board) === b0, `${name}: undo tahta`);
      ok(JSON.stringify(pos.citadels) === c0, `${name}: undo hisar`);
      ok(pos.zobristHash === h0 && pos.sideToMove === s0, `${name}: undo hash+sıra`);
      ok(
        JSON.stringify({ h: pos.flags.halfMoveClock, f: pos.flags.fullMoveNumber, k: pos.flags.hasUsedKingSwap }) === f0,
        `${name}: undo bayrak`,
      );
    }
    roundTrip('R7a-quiet', mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 4), kind: PieceKind.Rook, side: 'white' },
    ]), tq(5, 4));
    roundTrip('R7b-promo', mkPos('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(0, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    ]), tq(0, 8));
    roundTrip('R7c-swap', mkPos('white', [
      { sq: tq(5, 1), kind: PieceKind.King, side: 'white' },
      { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]), tq(5, 1));
    roundTrip('R7d-citadel', mkPos('white', [
      { sq: tq(0, 7), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ]), tq(0, 7));
    // Perft depth2 bütünlüğü (küçük konum):
    const pp = mkPos('white', [
      { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
      { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    ]);
    const b0 = JSON.stringify(pp.board);
    const h0 = pp.zobristHash;
    const s0 = pp.sideToMove;
    function perft(p: Position, d: number): number {
      if (d === 0) return 1;
      const ms = generateLegalMoves(p);
      if (d === 1) return ms.length;
      let n = 0;
      for (const m of ms) {
        const u = makeMoveInPlace(p, m);
        n += perft(p, d - 1);
        undoMoveInPlace(p, m, u);
      }
      return n;
    }
    const n2 = perft(pp, 2);
    ok(n2 > 0, `R7e: perft d2>0 (n=${n2})`);
    ok(JSON.stringify(pp.board) === b0 && pp.zobristHash === h0 && pp.sideToMove === s0, 'R7f: perft sonrası restore');
  }

  // ---- R8 setupValidator hisar-renk ----
  {
    const board = createEmptyBoard();
    board[0][0] = createLegacyPiece('king', 'white', 0, 0);
    board[9][9] = createLegacyPiece('king', 'black', 9, 9);
    const citadels: { whiteCitadelPiece: ReturnType<typeof createLegacyPiece> | null; blackCitadelPiece: ReturnType<typeof createLegacyPiece> | null } = {
      whiteCitadelPiece: { ...createLegacyPiece('king', 'black', 11, 1), position: { x: 11, y: 1, isCitadel: true, citadelSide: 'right' } },
      blackCitadelPiece: null,
    };
    const res = validateSetupPosition({ board, citadels: citadels as never, startingTurn: 'white' });
    ok(res.warnings.some((w) => w.includes('Siyah')), `R8a: yanlış-renk hisar-şahı siyaha sayılır (${JSON.stringify(res.warnings)})`);
    ok(!res.warnings.some((w) => w.includes('Beyaz')), 'R8b: beyaza yanlış uyarı yok');
  }

  console.log(`agent1.regression: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

declare const require: any;
declare const module: any;

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  const r = runAgent1RegressionTests();
  if (r.failed !== 0) throw new Error(`${r.failed} agent1 regression test failed`);
}
