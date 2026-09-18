/**
 * Engine — v0.1 testleri: materyal evaluate + mat-in-1 + mat-in-2.
 *
 * Mat-in-2 kurgusu (beyaz oynar):
 *   BK(5,9) WK(5,7) Alfil(2,7) Knight(8,7) Knight(6,6) Ferz(4,8)
 *   Rook(9,5) Piyon(9,9)
 *   1. Kf5-f5+! (64→60; tek yasal cevap Ş(5,9)→(6,9))
 *   2. Kf5-f6# (60→61)
 * (9,9)'daki beyaz piyon, kalenin tek hamlelik arka-sıra matını (K→(9,9)#)
 * kapatır; (6,6)'daki ikinci at, alternatif tek-hamle mat karesi (6,8)'in
 * değil ama final matındaki (7,8) kaçağının kapağıdır. Kale (9,5)'tedir:
 * aynı satır/sütundaki (6,5) stalemate-kazancı ve F×Ş hamlesi de kazançtır
 * ama mat skoru (1M) pat-skorundan (900k) yüksek olduğu için motor temiz
 * mat hattını seçer.
 * Not: (4,8) fersi başlangıçta BK'ya saldırır (yapay kurulum artefaktı —
 * gerçek oyunda erişilemez konumdur); motor matı (1M) pat-kazancından
 * (900k) ÜSTTE skorladığı için yine de temiz mat hattını seçer.
 */

import { PieceKind } from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { getGameResult } from '../../core/rules/gameResult';
import { makeMove } from '../../core/rules/makeMove';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { evaluate, materialWhiteCp } from '../evaluate';
import { MATE_SCORE } from '../search';
import { TimurEngine } from '../timurEngine';

export async function runEngineTests(): Promise<TestSummary> {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  }
  const engine = new TimurEngine();

  // ---- E1. materyal evaluate
  const symPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 8), kind: PieceKind.Rook, side: 'black' },
  ]);
  ok(materialWhiteCp(symPos) === 0, 'E01: simetrik materyal farkı 0');
  ok(evaluate(symPos) === 0, 'E02: sıra beyazdayken skor 0');
  const upPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 8), kind: PieceKind.Rook, side: 'black' },
  ]);
  ok(evaluate(upPos) === 500, 'E03: +1 kale = +500cp (beyaz sıra)');
  const upBlack = createTestPosition('black', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 8), kind: PieceKind.Rook, side: 'black' },
  ]);
  ok(evaluate(upBlack) === -500, 'E04: skor sideToMove-görelidir (siyah sıra = -500)');

  // ---- E2. mat-in-1 (derinlik 1)
  const m1 = createTestPosition('white', [
    { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const r1 = await engine.findBestMove(m1, { depth: 1 });
  ok(r1.bestMove.from === tq(0, 5) && r1.bestMove.to === tq(0, 9), 'E05: mat-in-1 hamlesi Ka5-a9');
  ok(getGameResult(makeMove(m1, r1.bestMove))?.type === 'checkmate', 'E06: hamle sonrası mat');
  ok(r1.evaluationCp >= MATE_SCORE - 128, 'E07: mat skoru MAT eşiğinde');
  ok(r1.depthReached === 1 && r1.nodesSearched > 0 && r1.principalVariation.length >= 1, 'E08: sonuç metadatası dolu');

  // ---- E3. mat-in-2 (derinlik 3)
  const m2 = createTestPosition('white', [
    { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(2, 7), kind: PieceKind.Alfil, side: 'white' },
    { sq: tq(8, 7), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(6, 6), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(4, 8), kind: PieceKind.Ferz, side: 'white' },
    { sq: tq(9, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(9, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const r2 = await engine.findBestMove(m2, { depth: 3 });
  console.log(`   mat-in-2: best=${r2.bestMove.from}→${r2.bestMove.to} eval=${r2.evaluationCp} nodes=${r2.nodesSearched} time=${r2.timeMs}ms`);
  // Zorunlu-mat iddiası (hangi ilk hamle olursa olsun): skor MAT bandında olmalı
  // (pat-kazancı 900k bandında kalır) VE her siyah cevaba 2. hamlede mat bulunmalı.
  ok(r2.evaluationCp >= MATE_SCORE - 128, 'E09: mat-in-2 skoru MAT bandında (zorunlu mat)');
  const afterW1 = makeMove(m2, r2.bestMove);
  const replies = generateLegalMoves(afterW1);
  ok(replies.length >= 1, 'E10: siyahın en az bir cevabı var (anında oyun-sonu değil)');
  let allMate = true;
  for (const reply of replies) {
    const afterB1 = makeMove(afterW1, reply);
    const r3 = await engine.findBestMove(afterB1, { depth: 2 });
    const res = getGameResult(makeMove(afterB1, r3.bestMove));
    if (res?.type !== 'checkmate') {
      allMate = false;
      console.error(`   reply ${reply.from}→${reply.to}: mat YOK (${JSON.stringify(res)})`);
    }
  }
  ok(allMate, 'E11: tüm devamlar 2. hamlede mat olur');

  // ---- E4. analyze + cancel çökmez
  const ana = await engine.analyze(m1, { depth: 1 });
  ok(ana.bestMove.to === tq(0, 9) && ana.principalVariation.length >= 1, 'E12: analyze aynı matı döner');
  engine.cancel('test-id');
  ok(true, 'E13: cancel çökmez');

  // ---- E5. hamlesiz pozisyonda anlamlı hata
  const dead = createTestPosition('black', [
    { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
  ]);
  let threw = false;
  try {
    await engine.findBestMove(dead, { depth: 1 });
  } catch {
    threw = true;
  }
  ok(threw, 'E14: mat pozisyonda arama anlamlı hata verir');

  // ---- E6. v3 K13: bekleyen piyade + çok-royal değerleme ve arama geçişi
  const waitVal = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
  ]);
  ok(materialWhiteCp(waitVal) === 50, `E15: bekleyen piyade 50cp (gelen ${materialWhiteCp(waitVal)})`);
  const dualVal = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(1, 0), kind: PieceKind.Prince, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  // Beyaz: Şah 800 (çok-royal) + Şehzade 300 = 1100.
  ok(materialWhiteCp(dualVal) === 1100, `E16: çok-royalde Şah 800 + Şehzade 300 (gelen ${materialWhiteCp(dualVal)})`);
  const loneVal = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(1, 0), kind: PieceKind.Prince, side: 'black' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  // Beyaz tek royal: Şah 0. Siyah çift royal: Şah 800 + Şehzade 300 → -1100.
  ok(materialWhiteCp(loneVal) === -1100, `E17: tek-royalde Şah değersiz (gelen ${materialWhiteCp(loneVal)})`);
  const rDual = await engine.findBestMove(dualVal, { depth: 2 });
  const dualLegal = generateLegalMoves(dualVal).some(
    (m) => m.from === rDual.bestMove.from && m.to === rDual.bestMove.to,
  );
  ok(
    dualLegal && Math.abs(rDual.evaluationCp) < 900000,
    `E18: çok-royal aramada sonlu skor + legal hamle (skor ${rDual.evaluationCp})`,
  );

  console.log(`engine: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
