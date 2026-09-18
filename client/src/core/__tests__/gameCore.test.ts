/**
 * Game Core — Faz 1 temel testleri (ana senaryolar; kapsamlı matris değil).
 *
 * Kapsam: kare yardımcıları, 12 taş türünde geçerli/geçersiz hamle,
 * şah, mat, pat (= hamlesiz kalan KAYBEDER), terfi (alt-subay / şehzade /
 * pawn-of-pawns relocation), hisar giriş-çıkış-kilit, şah takası,
 * make/undo, zobrist, isLegalMove.
 *
 * Çalıştırma: `src/core/__tests__/runTests.ts` entry'si üzerinden
 * (tsc → node; proje build'ine dahil olur, `tsc --noEmit` temiz kalmalı).
 */

import {
  PieceKind,
  type Piece,
  type Position,
  type Side,
} from '../position/Position';
import { computeZobristForArrays } from '../position/zobrist';
import {
  generateLegalMoves,
  isLegalMove,
} from '../rules/generateLegalMoves';
import {
  makeMove,
  makeMoveInPlace,
  undoMoveInPlace,
} from '../rules/makeMove';
import {
  getGameResult,
  isCheck,
  isGameOver,
} from '../rules/gameResult';
import { MoveSpecialFlag } from '../move/Move';

// ---------------------------------------------------------------- yardımcılar

let idCounter = 0;

export interface TestPieceSpec {
  sq: number;
  kind: PieceKind;
  side: Side;
  pawnOf?: PieceKind;
  pawnStage?: 0 | 1 | 2 | 3;
  waiting?: boolean;
}

/** Kare: col 0..10, row 0..9 → index. */
export function tq(col: number, row: number): number {
  return row * 11 + col;
}

/** 112'lik senkron pozisyon kurar (board[110/111] ↔ hisar occupant). */
export function createTestPosition(
  sideToMove: Side,
  specs: TestPieceSpec[],
  opts?: {
    kingSwap?: { white: boolean; black: boolean };
    sealed110?: boolean;
    sealed111?: boolean;
  },
): Position {
  const board: (Piece | null)[] = new Array(112).fill(null);
  const citadels = {
    topLeft: { occupant: null as Piece | null, sealed: opts?.sealed110 ?? false },
    bottomRight: { occupant: null as Piece | null, sealed: opts?.sealed111 ?? false },
  };
  for (const s of specs) {
    const p: Piece = {
      id: `${s.side}-${s.kind}-${s.sq}-${idCounter++}`,
      kind: s.kind,
      side: s.side,
      pawnOf: s.pawnOf,
      hasMoved: false,
      pawnStage: s.pawnStage,
      waiting: s.waiting,
    };
    board[s.sq] = p;
    if (s.sq === 110) citadels.topLeft.occupant = p;
    if (s.sq === 111) citadels.bottomRight.occupant = p;
  }
  const pos = {
    board,
    sideToMove,
    citadels,
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: opts?.kingSwap ?? { white: false, black: false },
    },
    zobristHash: 0n,
  } as Position;
  pos.zobristHash = computeZobristForArrays(board as never, sideToMove, citadels);
  return pos;
}

/** `from` karesinden üretilen hedefler. */
export function targetsFrom(pos: Position, from: number): number[] {
  return generateLegalMoves(pos)
    .filter((m) => m.from === from)
    .map((m) => m.to);
}

// ---------------------------------------------------------------- iskelet

export interface TestSummary {
  passed: number;
  failed: number;
}

export function runGameCoreTests(): TestSummary {
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
  const WK = { sq: tq(0, 0), kind: PieceKind.King, side: 'white' as Side };
  const BK = { sq: tq(10, 9), kind: PieceKind.King, side: 'black' as Side };

  // ---- A. kare yardımcıları
  ok(tq(0, 0) === 0, 'A1: (0,0)=0');
  ok(tq(10, 9) === 109, 'A2: (10,9)=109');
  ok(generateLegalMoves(createTestPosition('white', [WK, BK])).length >= 0, 'A3: boş tahtada üretim çökmez');

  // ---- B. taş hareketleri (merkez 5,5=60)
  const C = tq(5, 5);
  function centerBoard(kind: PieceKind, blocker?: TestPieceSpec): Position {
    const specs: TestPieceSpec[] = [
      WK,
      BK,
      { sq: C, kind, side: 'white' },
    ];
    if (blocker) specs.push(blocker);
    return createTestPosition('white', specs);
  }
  ok(targetsFrom(centerBoard(PieceKind.King), C).includes(tq(6, 6)), 'B01: şah 1 çapraz gider');
  ok(!targetsFrom(centerBoard(PieceKind.King), C).includes(tq(7, 7)), 'B02: şah 2 kare gidemez');
  ok(targetsFrom(centerBoard(PieceKind.General), C).includes(tq(5, 6)), 'B03: vezir 1 düz gider');
  ok(!targetsFrom(centerBoard(PieceKind.General), C).includes(tq(6, 6)), 'B04: vezir çapraz gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Ferz), C).includes(tq(6, 6)), 'B05: fers 1 çapraz gider');
  ok(!targetsFrom(centerBoard(PieceKind.Ferz), C).includes(tq(5, 6)), 'B06: fers düz gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Rook), C).includes(tq(5, 9)), 'B07: kale dosyada kayar');
  ok(!targetsFrom(centerBoard(PieceKind.Rook), C).includes(tq(6, 6)), 'B08: kale çapraz gidemez');
  ok(
    targetsFrom(
      centerBoard(PieceKind.Knight, { sq: tq(6, 6), kind: PieceKind.Pawn, side: 'white' }),
      C,
    ).includes(tq(7, 6)),
    'B09: at engel üzerinden atlar',
  );
  ok(!targetsFrom(centerBoard(PieceKind.Knight), C).includes(tq(6, 6)), 'B10: at bitişiğe gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Alfil), C).includes(tq(7, 7)), 'B11: fil tam 2 çapraz atlar');
  ok(
    targetsFrom(
      centerBoard(PieceKind.Alfil, { sq: tq(6, 6), kind: PieceKind.Pawn, side: 'black' }),
      C,
    ).includes(tq(7, 7)),
    'B12: fil aradaki taşı atlar',
  );
  ok(!targetsFrom(centerBoard(PieceKind.Alfil), C).includes(tq(6, 6)), 'B13: fil 1 çapraz gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Camel), C).includes(tq(8, 6)), 'B14: deve 3+1 atlar');
  ok(!targetsFrom(centerBoard(PieceKind.Camel), C).includes(tq(7, 6)), 'B15: deve 2+1 gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Dabbaba), C).includes(tq(5, 7)), 'B16: mancınık tam 2 düz atlar');
  ok(!targetsFrom(centerBoard(PieceKind.Dabbaba), C).includes(tq(5, 6)), 'B17: mancınık 1 düz gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Giraffe), C).includes(tq(9, 6)), 'B18: zürafa 1 çapraz+3 düz gider');
  ok(!targetsFrom(centerBoard(PieceKind.Giraffe), C).includes(tq(7, 6)), 'B19: zürafa 1 çapraz+1 düz gidemez');
  ok(targetsFrom(centerBoard(PieceKind.Picket), C).includes(tq(7, 7)), 'B20: talea en az 2 çapraz gider');
  ok(!targetsFrom(centerBoard(PieceKind.Picket), C).includes(tq(6, 6)), 'B21: talea 1 çapraz gidemez');

  // piyon
  const pawnPos = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  ok(targetsFrom(pawnPos, tq(5, 4)).includes(tq(5, 5)), 'B22: piyon 1 ileri gider');
  ok(!targetsFrom(pawnPos, tq(5, 4)).includes(tq(5, 3)), 'B23: piyon geri gidemez');
  const pawnCap = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(5, 5), kind: PieceKind.Pawn, side: 'black' },
    { sq: tq(6, 5), kind: PieceKind.Pawn, side: 'black' },
  ]);
  ok(!targetsFrom(pawnCap, tq(5, 4)).includes(tq(5, 5)), 'B24: piyon önü doluyken ilerleyemez');
  ok(targetsFrom(pawnCap, tq(5, 4)).includes(tq(6, 5)), 'B25: piyon çapraz taş alır');
  ok(!targetsFrom(pawnCap, tq(5, 4)).includes(tq(4, 5)), 'B26: piyon boş çapraza gidemez');

  // şehzade: şah gibi ama hisarsız
  const princePos = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(0, 7), kind: PieceKind.Prince, side: 'white' },
  ]);
  ok(targetsFrom(princePos, tq(0, 7)).includes(tq(0, 8)), 'B27: şehzade şah gibi 1 adım gider');
  ok(!targetsFrom(princePos, tq(0, 7)).includes(110), 'B28: şehzade hisara GİREMEZ');

  // ---- C. şah
  const checkPos = createTestPosition('white', [
    { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
    { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
    BK,
  ]);
  ok(isCheck(checkPos, 'white'), 'C1: dosyadaki kale şah çeker');
  const blockedPos = createTestPosition('white', [
    { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
    { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(4, 6), kind: PieceKind.Pawn, side: 'white' },
    BK,
  ]);
  ok(!isCheck(blockedPos, 'white'), 'C2: blokierung şahı kapatır');

  // ---- D. mat
  const matePos = createTestPosition('black', [
    { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
  ]);
  ok(isCheck(matePos, 'black'), 'D1: mat pozisyonunda şah var');
  ok(generateLegalMoves(matePos).length === 0, 'D2: mat pozisyonunda hamle yok');
  const mateRes = getGameResult(matePos);
  ok(mateRes?.type === 'checkmate' && mateRes.winner === 'white', 'D3: mat = rakip kazanır');
  ok(isGameOver(matePos), 'D4: mat oyun-sonudur');

  // ---- E. pat = hamlesiz kalan KAYBEDER
  const patPos = createTestPosition(
    'white',
    [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(1, 5), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(5, 1), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(9, 9), kind: PieceKind.King, side: 'black' },
    ],
    { kingSwap: { white: true, black: true } },
  );
  ok(!isCheck(patPos, 'white'), 'E1: pat pozisyonunda şah yok');
  ok(generateLegalMoves(patPos).length === 0, 'E2: pat pozisyonunda hamle yok');
  const patRes = getGameResult(patPos);
  ok(patRes?.type === 'stalemate_win' && patRes.winner === 'black', 'E3: pat = hamlesiz kalan KAYBEDER (kazanan rakip)');

  // ---- F. terfi
  const promoPos = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(0, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const promoMoves = generateLegalMoves(promoPos).filter((m) => m.from === tq(0, 8));
  ok(promoMoves.length === 1 && promoMoves[0].promotion === PieceKind.Rook, 'F1: alt-subay piyonu kendi türüne terfi eder');
  ok(promoMoves[0].specialFlags.includes(MoveSpecialFlag.Promotion), 'F2: terfi bayrağı konur');
  const promoAfter = makeMove(promoPos, promoMoves[0]);
  ok((promoAfter.board[tq(0, 9)] as Piece | null)?.kind === PieceKind.Rook, 'F3: terfi sonrası taş kale olur');

  const kingPawnPos = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.King },
  ]);
  const kingPawnMove = generateLegalMoves(kingPawnPos).find((m) => m.from === tq(5, 8));
  ok(kingPawnMove?.promotion === PieceKind.Prince, 'F4: şah piyadesi şehzadeye terfi eder');

  const popPos = createTestPosition('white', [
    { sq: tq(10, 0), kind: PieceKind.King, side: 'white' },
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn },
  ]);
  const popMove = generateLegalMoves(popPos).find((m) => m.from === tq(5, 8));
  // v3 K3/K4: ilk varışta relocation YOK — piyon varış karesinde bekler.
  ok(popMove !== undefined && !popMove.specialFlags.includes(MoveSpecialFlag.Relocation), 'F5: v3 ilk varışta relocation bayrağı YOK (yerinde bekler)');
  const popAfter = makeMove(popPos, popMove as never as import('../move/Move').Move);
  const waited = popAfter.board[tq(5, 9)] as Piece | null;
  ok(
    waited?.kind === PieceKind.Pawn && waited.waiting === true,
    'F6: 1. varış sonrası piyon varış karesini işgal eder ve bekler',
  );
  ok(
    (popAfter.board[tq(5, 9)] as Piece | null)?.pawnStage === 1,
    'F7: bekleme sonrası kademe 1 olur',
  );
  const pop2Pos = createTestPosition('white', [
    { sq: tq(10, 0), kind: PieceKind.King, side: 'white' },
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1 },
  ]);
  const pop2Move = generateLegalMoves(pop2Pos).find((m) => m.from === tq(5, 8));
  // v3 K10: ikinci varış orijine (5,2) döndürür (relocation semantiği).
  ok(
    pop2Move?.promotion === PieceKind.Pawn &&
      pop2Move.specialFlags.includes(MoveSpecialFlag.Relocation),
    'F8: v3 ikinci varış orijine-dönüş relocation üretir (Şehzade DEĞİL)',
  );
  const pop2After = makeMove(pop2Pos, pop2Move as never as import('../move/Move').Move);
  const homed = pop2After.board[tq(5, 2)] as Piece | null;
  ok(
    homed?.kind === PieceKind.Pawn && homed?.pawnStage === 2 && homed?.waiting !== true &&
      (pop2After.board[tq(5, 9)] as Piece | null) === null,
    'F8b: orijine dönüş (5,2) kademesi 2, bekleme bitmiş, hedef boş',
  );

  // ---- G. hisar
  const entryPos = createTestPosition('white', [
    { sq: tq(0, 7), kind: PieceKind.King, side: 'white' },
    BK,
  ]);
  const entryMoves = generateLegalMoves(entryPos).filter((m) => m.from === tq(0, 7));
  ok(entryMoves.some((m) => m.to === 110), 'G1: bitişik şah hisara girebilir');
  ok(
    entryMoves.find((m) => m.to === 110)?.specialFlags.includes(MoveSpecialFlag.CitadelEntry) === true,
    'G2: hisar girişi CitadelEntry bayrağı taşır',
  );
  const entryAfter = makeMove(entryPos, entryMoves.find((m) => m.to === 110) as never as import('../move/Move').Move);
  ok(entryAfter.citadels.topLeft.occupant?.kind === PieceKind.King, 'G3: giriş sonrası hisar occupantı şahtır');
  ok((entryAfter.board[110] as Piece | null)?.kind === PieceKind.King, 'G4: board[110] senkron tutulur');
  ok(getGameResult(entryAfter)?.type === 'draw', 'G5: rakip hisardaki şah = beraberlik');

  const exitPos = createTestPosition('white', [
    WK,
    BK,
    { sq: 111, kind: PieceKind.Rook, side: 'white' },
  ]);
  const exitTargets = targetsFrom(exitPos, 111);
  ok(
    exitTargets.includes(tq(10, 0)) && exitTargets.includes(tq(10, 1)) && exitTargets.includes(tq(10, 2)),
    'G6: sağ hisardaki beyaz taş 3 komşu kareye çıkar',
  );
  const quirkPos = createTestPosition('white', [
    WK,
    BK,
    { sq: 110, kind: PieceKind.Rook, side: 'white' },
  ]);
  ok(targetsFrom(quirkPos, 110).length === 0, 'G7 [quirk]: beyaz sol hisardaki taş hamlesizdir (legacy birebir)');

  const sealPos = createTestPosition(
    'white',
    [
      WK,
      BK,
      { sq: 110, kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
      { sq: tq(5, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    ],
    { sealed110: true },
  );
  const sealMove = generateLegalMoves(sealPos).find((m) => m.from === tq(5, 4));
  const sealAfter = makeMove(sealPos, sealMove as never as import('../move/Move').Move);
  ok(sealAfter.citadels.topLeft.sealed === true, 'G8: sealed bayrağı hamle sonrası korunur');
  ok(sealAfter.citadels.topLeft.occupant?.id === sealPos.citadels.topLeft.occupant?.id, 'G9: kilitli hisar occupantı korunur');

  // ---- H. şah takası
  const swapPos = createTestPosition('white', [
    { sq: tq(5, 1), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    BK,
  ]);
  const swapMoves = generateLegalMoves(swapPos).filter((m) =>
    m.specialFlags.includes(MoveSpecialFlag.KingSwap),
  );
  ok(swapMoves.some((m) => m.from === tq(5, 1) && m.to === tq(0, 1)), 'H1: şah takası üretilir');
  const swapAfter = makeMove(swapPos, swapMoves.find((m) => m.to === tq(0, 1)) as never as import('../move/Move').Move);
  ok(
    (swapAfter.board[tq(0, 1)] as Piece | null)?.kind === PieceKind.King &&
      (swapAfter.board[tq(5, 1)] as Piece | null)?.kind === PieceKind.Rook,
    'H2: takas sonrası taşlar yer değiştirir',
  );
  ok(swapAfter.flags.hasUsedKingSwap?.white === true, 'H3: takas hakkı işaretlenir');
  ok(
    generateLegalMoves(swapAfter).filter((m) => m.specialFlags.includes(MoveSpecialFlag.KingSwap)).length === 0,
    'H4: ikinci takas üretilmez',
  );
  const usedPos = createTestPosition(
    'white',
    [
      { sq: tq(5, 1), kind: PieceKind.King, side: 'white' },
      { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
      BK,
    ],
    { kingSwap: { white: true, black: false } },
  );
  ok(
    generateLegalMoves(usedPos).filter((m) => m.specialFlags.includes(MoveSpecialFlag.KingSwap)).length === 0,
    'H5: hakkı kullanılmış taraf takas üretemez',
  );

  // ---- I. make / undo
  const iuPos = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const iuBefore = JSON.stringify(iuPos.board);
  const iuHash = iuPos.zobristHash;
  const iuMove = generateLegalMoves(iuPos).find((m) => m.from === tq(5, 4));
  const iuUndo = makeMoveInPlace(iuPos, iuMove as never as import('../move/Move').Move);
  ok(JSON.stringify(iuPos.board) !== iuBefore, 'I1: in-place uygular');
  undoMoveInPlace(iuPos, iuMove as never as import('../move/Move').Move, iuUndo);
  ok(JSON.stringify(iuPos.board) === iuBefore, 'I2: undo tahtayı restore eder');
  ok(iuPos.zobristHash === iuHash && iuPos.sideToMove === 'white', 'I3: undo hash+sırayı restore eder');
  const immAfter = makeMove(iuPos, iuMove as never as import('../move/Move').Move);
  ok(JSON.stringify(iuPos.board) === iuBefore, 'I4: immutable girdi değiştirmez');
  ok(immAfter.sideToMove === 'black', 'I5: sıra rakibe geçer');

  // ---- J. zobrist
  const z1 = createTestPosition('white', [WK, BK]);
  const z2 = createTestPosition('white', [WK, BK]);
  ok(z1.zobristHash === z2.zobristHash && z1.zobristHash !== 0n, 'J1: aynı dizilim aynı hash (id bağımsız)');
  const z3 = createTestPosition('black', [WK, BK]);
  ok(z3.zobristHash !== z1.zobristHash, 'J2: sıra değişimi hashi değiştirir');

  // ---- Jb. v3 hash ayrımları (B1 kanıtları)
  // Aynı konuma farklı hamle sırasıyla ulaşım: make/undo tutarlılığı.
  const jPath = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const jMove = generateLegalMoves(jPath).find((m) => m.from === tq(5, 4));
  const jAfter = makeMove(jPath, jMove as never as import('../move/Move').Move);
  const jDirect = createTestPosition('black', [
    WK,
    BK,
    { sq: tq(5, 5), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  // Not: hasMoved bayrağı hashe girmez; hedef konumlar aynı hash'i verir.
  ok(jAfter.zobristHash === jDirect.zobristHash, 'J3: farklı yoldan aynı konum aynı hash');
  const jStage0 = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 0 },
  ]);
  const jStage1 = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1 },
  ]);
  ok(jStage0.zobristHash !== jStage1.zobristHash, 'J4: yalnız promotionStage farklı → farklı hash');
  const jWait = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
  ]);
  const jNoWait = createTestPosition('white', [
    WK,
    BK,
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1 },
  ]);
  ok(jWait.zobristHash !== jNoWait.zobristHash, 'J5: yalnız waiting farklı → farklı hash');
  const jSealed = createTestPosition('white', [WK, BK], { sealed110: true });
  const jOpen = createTestPosition('white', [WK, BK]);
  ok(jSealed.zobristHash !== jOpen.zobristHash, 'J6: yalnız sealed farklı → farklı hash');

  // ---- K. isLegalMove + oyun-sonu yok
  const livePos = createTestPosition('white', [WK, BK]);
  const liveMoves = generateLegalMoves(livePos);
  ok(liveMoves.length > 0 && isLegalMove(livePos, liveMoves[0]), 'K1: üretilen hamle legaldir');
  ok(!isLegalMove(livePos, { ...liveMoves[0], to: liveMoves[0].to + 1 }), 'K2: kaydırılmış hedef illegaldir');
  ok(getGameResult(livePos) === null && !isGameOver(livePos), 'K3: açık pozisyon oyun-sonu değildir');

  console.log(`gameCore: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
