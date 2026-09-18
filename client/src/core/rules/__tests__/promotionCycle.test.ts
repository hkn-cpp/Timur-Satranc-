/**
 * v3 Terfi Ekosistemi — hamle üretimi + royal + çatal testleri (FAZ C).
 *
 * Kapsam: C1 kimlik regresyonu · C3 bekleyen piyade · C4 forkSquares +
 * teleport üretimi/uygulaması · C5 orijin (boş + dolu sütun) · C6 Maceracı
 * Şah hareketi · C7 mühür · K7(b) dört özel durum · yasallık öz-koruması.
 * (D fazı oyun-sonu testleri bu dosyaya eklenir.)
 */

import {
  PieceKind,
  type Piece,
  type Position,
  type Side,
} from '../../position/Position';
import { generateLegalMoves } from '../generateLegalMoves';
import { makeMove } from '../makeMove';
import { getGameResult, isCheck, isCitadelDraw } from '../gameResult';
import { MoveSpecialFlag } from '../../move/Move';
import {
  isAttacked,
  opponent,
  pseudoTargets,
  royalSquares,
} from '../shared';
import { forkSquares } from '../fork';

export interface TestSummary {
  passed: number;
  failed: number;
}

function tq(col: number, row: number): number {
  return row * 11 + col;
}

let idCounter = 100000;

interface Spec {
  sq: number;
  kind: PieceKind;
  side: Side;
  pawnOf?: PieceKind;
  pawnStage?: 0 | 1 | 2 | 3;
  waiting?: boolean;
}

function mkPos(
  side: Side,
  specs: Spec[],
  opts?: { sealed110?: boolean; sealed111?: boolean },
): Position {
  const board: (Piece | null)[] = new Array(112).fill(null);
  const citadels = {
    topLeft: { occupant: null as Piece | null, sealed: opts?.sealed110 ?? false },
    bottomRight: { occupant: null as Piece | null, sealed: opts?.sealed111 ?? false },
  };
  for (const s of specs) {
    const p: Piece = {
      id: `v3-${s.side}-${s.kind}-${s.sq}-${idCounter++}`,
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
  return {
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
}

const WK = { sq: tq(0, 0), kind: PieceKind.King, side: 'white' as Side };
const BK = { sq: tq(10, 9), kind: PieceKind.King, side: 'black' as Side };

export function runPromotionCycleTests(): TestSummary {
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

  // ---- C1: kimlik regresyonu (10 alt-subay + Şah hattı)
  const identities: [PieceKind, PieceKind][] = [
    [PieceKind.Rook, PieceKind.Rook],
    [PieceKind.Knight, PieceKind.Knight],
    [PieceKind.Picket, PieceKind.Picket],
    [PieceKind.Giraffe, PieceKind.Giraffe],
    [PieceKind.General, PieceKind.General],
    [PieceKind.Ferz, PieceKind.Ferz],
    [PieceKind.Alfil, PieceKind.Alfil],
    [PieceKind.Camel, PieceKind.Camel],
    [PieceKind.Dabbaba, PieceKind.Dabbaba],
    [PieceKind.King, PieceKind.Prince],
  ];
  for (const [pawnOf, expected] of identities) {
    const pos = mkPos('white', [
      WK,
      BK,
      { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf },
    ]);
    const mv = generateLegalMoves(pos).find((m) => m.from === tq(5, 8));
    ok(mv?.promotion === expected, `C1: ${pawnOf} piyonu → ${expected}`);
  }
  // Vezir Piyadesi → Vezir ve Vezir 1 kare ortogonal gider.
  const vezPos = mkPos('white', [
    WK,
    BK,
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.General },
  ]);
  const vezMove = generateLegalMoves(vezPos).find((m) => m.from === tq(5, 8));
  const vezAfter = makeMove(vezPos, vezMove!);
  const vezTargets = generateLegalMoves({ ...vezAfter, sideToMove: 'white' } as Position)
    .filter((m) => m.from === tq(5, 9))
    .map((m) => m.to);
  ok(
    vezTargets.includes(tq(5, 8)) && !vezTargets.includes(tq(6, 8)),
    'C1b: terfi eden Vezir 1 kare ortogonal gider, çapraz gidemez',
  );

  // ---- C3: bekleyen piyade
  const waitPos = mkPos('white', [
    WK,
    BK,
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
    { sq: tq(5, 0), kind: PieceKind.Rook, side: 'black' },
  ]);
  ok(
    generateLegalMoves(waitPos).filter((m) => m.from === tq(5, 9)).length === 0,
    'C3a: bekleyen piyadenin normal hamlesi yok',
  );
  const rookCaps = generateLegalMoves({ ...waitPos, sideToMove: 'black' } as Position)
    .filter((m) => m.from === tq(5, 0))
    .map((m) => m.to);
  ok(!rookCaps.includes(tq(5, 9)), 'C3b: bekleyen piyade alınamaz');
  ok(!isAttacked(waitPos.board, waitPos.citadels, tq(5, 9), 'black'), 'C3c: bekleyen piyade saldırı hesabında kurban değil');
  const blockPos = mkPos('white', [
    WK,
    BK,
    { sq: tq(5, 7), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook, pawnStage: 1, waiting: true },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const slideTargets = generateLegalMoves(blockPos).filter((m) => m.from === tq(5, 5)).map((m) => m.to);
  ok(
    slideTargets.includes(tq(5, 6)) && !slideTargets.includes(tq(5, 7)) && !slideTargets.includes(tq(5, 8)),
    'C3d: bekleyen piyade kayan ışına dolu kare engelidir',
  );

  // ---- C4: forkSquares (a) çoklu tehdit
  const forkPos = mkPos('white', [
    WK,
    BK,
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
    { sq: tq(3, 7), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.Knight, side: 'black' },
  ]);
  const forks = forkSquares(forkPos, tq(5, 9));
  ok(forks.multi.includes(tq(4, 6)), 'C4a: (4,6) iki taşa saldırır (multi)');
  ok(!forks.trapped.includes(tq(4, 6)), 'C4b: multi kare trapped listesinde değil');
  // Teleport hamlesi üretimde var ve sırayı geçirir.
  const teleMoves = generateLegalMoves(forkPos).filter((m) =>
    m.specialFlags.includes(MoveSpecialFlag.Teleport),
  );
  const teleTo46 = teleMoves.find((m) => m.from === tq(5, 9) && m.to === tq(4, 6));
  ok(teleTo46 !== undefined, 'C4c: teleport hamlesi generateLegalMoves içinde üretilir');
  const teleAfter = makeMove(forkPos, teleTo46!);
  const landed = teleAfter.board[tq(4, 6)] as Piece | null;
  ok(
    landed?.kind === PieceKind.Pawn && landed?.waiting !== true &&
      (teleAfter.board[tq(5, 9)] as Piece | null) === null &&
      teleAfter.sideToMove === 'black',
    'C4d: teleport iner, bekleme biter, sıra geçer',
  );

  // ---- K7(b): bağlı (pinned) taş — hiç legal hamlesi yok → trapped
  const pinPos = mkPos('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(4, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(4, 8), kind: PieceKind.Knight, side: 'black' },
    { sq: tq(4, 0), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
  ]);
  const pinForks = forkSquares(pinPos, tq(5, 9));
  ok(pinForks.trapped.includes(tq(5, 7)), 'K7b-i: bağlı taş (hamlesiz) → trapped');
  ok(
    generateLegalMoves({ ...pinPos, sideToMove: 'black' } as Position).filter((m) => m.from === tq(4, 8)).length === 0,
    'K7b-i-kontrol: bağlı atın gerçekten hamlesi yok',
  );

  // ---- K7(b): piyadeyi alabilen taş → GEÇERSİZ
  const capPos = mkPos('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(6, 8), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
  ]);
  // (5,7): saldırılar (4,8),(6,8). (6,8)'deki siyah piyon (5,7)'yi alabilir.
  const capForks = forkSquares(capPos, tq(5, 9));
  ok(!capForks.trapped.includes(tq(5, 7)) && !capForks.multi.includes(tq(5, 7)), 'K7b-ii: piyadeyi alabilen taş karesi geçersiz');

  // ---- K7(b): kaçış kareleri ikinci saldırı karesi arasında sıkışmış taş.
  // Sıçrayıcı gerekir (kayıcı ara karede de durur): siyah Mancınık (4,8);
  // (2,8) ve (4,6) kendi taşıyla kapalıysa TEK legal hamlesi (4,8)->(6,8)
  // kalır ve o kare ikinci saldırı karesidir.
  const sqSpecs: Spec[] = [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(4, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(4, 8), kind: PieceKind.Dabbaba, side: 'black' },
    { sq: tq(2, 8), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
    { sq: tq(4, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
  ];
  const sqPosW = mkPos('white', sqSpecs);
  const sqForks = forkSquares(sqPosW, tq(5, 9));
  ok(sqForks.trapped.includes(tq(5, 7)), 'K7b-iii: tek kaçışı ikinci saldırı karesi olan mancınık → trapped');

  // ---- C5: orijin sütunu doluysa beklemeye devam
  const fullColSpecs: Spec[] = [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1 },
    { sq: tq(4, 9), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ];
  for (let r = 2; r <= 7; r++) {
    fullColSpecs.push({ sq: tq(5, r), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook });
  }
  const fullCol = mkPos('white', fullColSpecs);
  const fullMove = generateLegalMoves(fullCol).find((m) => m.from === tq(5, 8) && m.to === tq(4, 9));
  ok(fullMove !== undefined, 'C5a: dolu sütunda çapraz varış hamlesi üretilir');
  const fullAfter = makeMove(fullCol, fullMove!);
  const stayed = fullAfter.board[tq(4, 9)] as Piece | null;
  ok(
    stayed?.kind === PieceKind.Pawn && stayed?.pawnStage === 1 && stayed?.waiting === true,
    'C5b: sütun doluysa beklemeye devam (kademe 1, varış karesinde)',
  );

  // ---- C6: Maceracı Şah hareketi + hisar
  const advPos = mkPos('white', [
    WK,
    BK,
    { sq: tq(5, 5), kind: PieceKind.AdventurousKing, side: 'white' },
  ]);
  const advTargets = generateLegalMoves(advPos).filter((m) => m.from === tq(5, 5)).map((m) => m.to);
  ok(advTargets.includes(tq(6, 6)) && !advTargets.includes(tq(7, 7)), 'C6a: Maceracı Şah Şehzade gibi 1 adım gider');
  const advOwn = mkPos('white', [
    WK,
    BK,
    { sq: tq(10, 1), kind: PieceKind.AdventurousKing, side: 'white' },
  ]);
  ok(
    generateLegalMoves(advOwn).filter((m) => m.from === tq(10, 1)).map((m) => m.to).includes(111),
    'C6b: Maceracı Şah KENDİ hisarına girebilir (beyaz → 111)',
  );
  const advOwnB = mkPos('black', [
    WK,
    BK,
    { sq: tq(0, 8), kind: PieceKind.AdventurousKing, side: 'black' },
  ]);
  ok(
    generateLegalMoves(advOwnB).filter((m) => m.from === tq(0, 8)).map((m) => m.to).includes(110),
    'C6c: Maceracı Şah KENDİ hisarına girebilir (siyah → 110)',
  );
  const princeOwn = mkPos('white', [
    WK,
    BK,
    { sq: tq(10, 1), kind: PieceKind.Prince, side: 'white' },
  ]);
  ok(
    !generateLegalMoves(princeOwn).filter((m) => m.from === tq(10, 1)).map((m) => m.to).includes(111),
    'C6d: Şehzade kendi hisarına GİREMEZ (korunur)',
  );

  // ---- C7: mühür
  const sealMove = generateLegalMoves(advOwn).find((m) => m.from === tq(10, 1) && m.to === 111);
  const sealed = makeMove(advOwn, sealMove!);
  ok(sealed.citadels.bottomRight.sealed === true, 'C7a: giriş mühür yazar');
  ok(
    (sealed.board[111] as Piece | null)?.kind === PieceKind.AdventurousKing,
    'C7b: mühürlenen hisarda Maceracı Şah durur',
  );
  const exitMoves = generateLegalMoves({ ...sealed, sideToMove: 'white' } as Position)
    .filter((m) => m.from === 111)
    .map((m) => m.to);
  ok(
    exitMoves.includes(tq(10, 0)) && exitMoves.includes(tq(10, 1)) && exitMoves.includes(tq(10, 2)),
    'C7c: Maceracı Şah hisardan çıkabilir',
  );
  const exited = makeMove({ ...sealed, sideToMove: 'white' } as Position, generateLegalMoves({ ...sealed, sideToMove: 'white' } as Position).find((m) => m.from === 111) as never as import('../../move/Move').Move);
  ok(exited.citadels.bottomRight.sealed === true, 'C7d: çıkışta mühür KALIR (kalıcı)');

  // ---- K2: çok-royal gevşemesi (hamle yasallığı)
  const dualPos = mkPos('white', [
    { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
    { sq: tq(6, 6), kind: PieceKind.Prince, side: 'white' },
    { sq: tq(4, 0), kind: PieceKind.Rook, side: 'black' },
    BK,
  ]);
  ok(royalSquares(dualPos.board, dualPos.citadels, 'white').length === 2, 'K2a: royal kümesi Şah+Şehzade');
  const dualWhitePrince = generateLegalMoves(dualPos).filter((m) => m.from === tq(6, 6));
  ok(dualWhitePrince.length > 0, 'K2b: çift royalde Şehzade oynamaya devam eder');
  // Şah tehdit altındayken BAŞKA hamle yapılabilir (koruma askıda).
  const dualOther = mkPos('white', [
    { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
    { sq: tq(6, 6), kind: PieceKind.Prince, side: 'white' },
    { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    BK,
  ]);
  const otherMoves = generateLegalMoves(dualOther).filter((m) => m.from === tq(0, 1));
  ok(otherMoves.length > 0, 'K2c: royal tehdit altındayken başka taş oynanabilir');

  // ---- Yasallık öz-koruması: üretilen her hamle pseudo-legal + tek-royal güvenliği
  const proofPositions: Position[] = [dualOther, forkPos, advPos, waitPos, sqPosW];
  let proofBad = 0;
  for (const pp of proofPositions) {
    const side = pp.sideToMove;
    const preRoyals = royalSquares(pp.board, pp.citadels, side);
    for (const m of generateLegalMoves(pp)) {
      const mover = (pp.board as (Piece | null)[])[m.from] as Piece | null;
      if (!mover || mover.side !== side) {
        proofBad++;
        continue;
      }
      const pseudos = pseudoTargets(mover, m.from, pp.board, pp.citadels).map((t) => t.to);
      const special = m.specialFlags.includes(MoveSpecialFlag.Teleport) ||
        m.specialFlags.includes(MoveSpecialFlag.KingSwap);
      if (!pseudos.includes(m.to) && !special) {
        proofBad++;
        continue;
      }
      if (preRoyals.length === 1) {
        const after = makeMove(pp, m);
        const post = royalSquares(after.board, after.citadels, side);
        if (post.length === 1 && isAttacked(after.board, after.citadels, post[0], opponent(side))) {
          proofBad++;
        }
      }
    }
  }
  ok(proofBad === 0, 'C8: üretilen hamleler pseudo-legal + tek-royal güvenli (0 ihlal)');

  // ---- D1: çift hükümdar oyun sonu
  // Şah mat görünümünde ama Şehzade var → oyun SÜRER.
  const dualMate = mkPos('black', [
    { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(2, 9), kind: PieceKind.Prince, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
  ]);
  ok(
    getGameResult(dualMate) === null,
    'D1a: Şah mat konumundayken Şehzade varsa oyun sürer',
  );
  // Şehzade alındı, Şah tek kaldı → mat kuralı geri gelir.
  const loneMate = mkPos('black', [
    { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
  ]);
  const loneRes = getGameResult(loneMate);
  ok(loneRes?.type === 'checkmate' && loneRes.winner === 'white', 'D1b: tek royal mat edilir');
  // Şah alındı, Şehzade tek kaldı → Şehzade mat edilmeli (şah çekilir).
  const princeMate = mkPos('black', [
    { sq: tq(0, 9), kind: PieceKind.Prince, side: 'black' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
  ]);
  ok(isCheck(princeMate, 'black') === true, 'D1c: tek Şehzade şah çekilir');
  const princeRes = getGameResult(princeMate);
  ok(princeRes?.type === 'checkmate' && princeRes.winner === 'white', 'D1d: tek Şehzade mat edilir');
  // Üç royal → açık oyunda sonuç yok.
  const triple = mkPos('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(1, 0), kind: PieceKind.Prince, side: 'white' },
    { sq: tq(2, 0), kind: PieceKind.AdventurousKing, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  ok(
    royalSquares(triple.board, triple.citadels, 'white').length === 3 &&
      getGameResult(triple) === null,
    'D1e: üç royal açık oyunda sonuç üretmez',
  );
  // Royal sıfır → kayıp (hamle olsa bile).
  const noRoyal = mkPos('white', [
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  const noRoyalRes = getGameResult(noRoyal);
  ok(noRoyalRes?.type === 'checkmate' && noRoyalRes.winner === 'black', 'D1f: royal kalmayınca taraf kaybeder');

  // ---- D2: hisar beraberliği + kilit
  const openCitadel = mkPos('black', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: 110, kind: PieceKind.King, side: 'white' },
  ]);
  const openRes = getGameResult(openCitadel);
  ok(openRes?.type === 'draw' && openRes.reason === 'citadel', 'D2a: mühürsüz hisar = citadel beraberliği');
  const sealedCitadel = mkPos(
    'black',
    [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: 110, kind: PieceKind.King, side: 'white' },
    ],
    { sealed110: true },
  );
  ok(isCitadelDraw(sealedCitadel) === false, 'D2b: kilitli hisar beraberlik üretmez');
  ok(getGameResult(sealedCitadel)?.type !== 'draw', 'D2c: kilitli hisarda oyun sürer');

  console.log(`promotionCycle: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
