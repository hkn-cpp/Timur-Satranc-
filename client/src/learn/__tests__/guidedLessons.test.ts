/**
 * FAZ 2 — rehberli ders doğrulayıcı fixture testleri. DERS İÇERİĞİ DEĞİL:
 * sentetik mini-dersler yalnızca doğrulayıcının 12 maddesini kanıtlar.
 *
 * Kritik kanıtlar:
 *  - madde 4: LEGAL hamleli expectRejection REDDEDİLİR (sahte yasak yok).
 *  - madde 5: awaitSquares/showGeometry'de literal kare anahtarı
 *    şema seviyesinde REDDEDİLİR (from + count zorunlu).
 *  - UYARI hükmü: Zürafa firstStep/ride DOĞRULANAMAZ (fail-closed m6).
 *
 * Çalıştırma: src/core/__tests__/runTests.ts entry'si üzerinden.
 */

import {
  PieceKind,
  type Piece,
  type Position,
  type Side,
} from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { computeZobristForArrays } from '../../core/position/zobrist';
import type {
  GuidedLesson,
  GuidedStep,
  PositionRef,
} from '../guidedSteps';
import {
  GRAND_XP_TOTAL,
  LEVEL_XP_TOTAL,
  checkXpTotals,
  expectedLessonXp,
  findExtraLessons,
  findMissingLessons,
  formatReport,
  parseLessonId,
  validateLesson,
  validateLessonSet,
  type ValidatorContext,
} from '../lessonValidator';

export interface TestSummary {
  passed: number;
  failed: number;
}

/** spec minimum yasak listesi — test ikamesi; kanonik kaynak
 *  02-isim-tablosu.md'dir (CLI oradan okur). */
const CTX: ValidatorContext = {
  forbiddenNames: [
    'Ferz', 'Müsteşar', 'Dabbabe', 'Öncü', 'Talia', 'Piyon',
    'queen', 'general', 'picket', 'giraffe', 'rook', 'knight',
    'pawn', 'king', 'prince',
  ],
};

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);

function rookPos(): PositionRef {
  return {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
    ],
  };
}

function engineDests(pos: PositionRef, from: number): number[] {
  const built = piecesToPos(pos);
  return generateLegalMoves(built).filter((m) => m.from === from).map((m) => m.to);
}

// Testler resolvePosition'a erişmez; motoru doğrudan kurar (oracle).
function piecesToPos(ref: PositionRef): Position {
  if (ref.kind !== 'pieces') throw new Error('fixture: pieces bekleniyor');
  const board: (Piece | null)[] = new Array(112).fill(null);
  for (const p of ref.pieces) {
    const piece: Piece = {
      id: `t-${p.side}-${p.kind}-${p.square}`,
      kind: p.kind,
      side: p.side as Side,
      pawnOf: p.kind === PieceKind.Pawn ? p.pawnOf : undefined,
      hasMoved: false,
      pawnStage: p.kind === PieceKind.Pawn && p.promotionStage !== undefined
        ? (p.promotionStage as 0 | 1 | 2)
        : undefined,
    };
    board[p.square] = piece;
  }
  const pos = {
    board,
    sideToMove: ref.sideToMove,
    citadels: {
      topLeft: { occupant: board[110], sealed: false },
      bottomRight: { occupant: board[111], sealed: false },
    },
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: { ...(ref.kingSwapUsed ?? { white: false, black: false }) },
    },
    zobristHash: 0n,
  } as Position;
  pos.zobristHash = computeZobristForArrays(board as never, pos.sideToMove);
  return pos;
}

const QUIZ: GuidedStep = {
  kind: 'quiz',
  question: 'Kale nasıl gider?',
  options: ['Düz', 'Çapraz'],
  correctIndex: 0,
  explanation: 'Kale düz gider.',
};

function finish(xp: number, badge?: string): GuidedStep {
  return { kind: 'finish', text: 'Ders bitti.', xp, badge };
}

function hasRule(issues: { rule: number; message: string }[], rule: number, frag?: string): boolean {
  return issues.some((i) => i.rule === rule && (frag === undefined || i.message.includes(frag)));
}

export function runGuidedLessonTests(): TestSummary {
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

  const rookCount = engineDests(rookPos(), sq(0, 0)).length;
  ok(rookCount > 0, `G00: fikstür kalesinin hedefi var (${rookCount})`);

  /* ---- G01: geçerli kale dersi (0 sorun) ---- */
  const validRook: GuidedLesson = {
    id: '1.3',
    title: 'Kale (Rook)',
    mode: 'interactive',
    startPosition: rookPos(),
    steps: [
      { kind: 'say', text: 'Kale düz gider.' },
      { kind: 'showMoves', square: sq(0, 0) },
      { kind: 'awaitSquares', from: sq(0, 0), count: rookCount, text: 'Hedefleri bul.' },
      { kind: 'awaitMove', accept: [{ from: sq(0, 0), to: sq(1, 0) }], text: 'Kaleyi sür.' },
      QUIZ,
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: sq(0, 0), to: sq(1, 1) }, explanation: 'Kale çapraz gidemez.' },
      finish(25),
    ],
  };
  const g01 = validateLesson(validRook, CTX);
  ok(g01.length === 0, `G01: geçerli ders sorunsuz (${JSON.stringify(g01.slice(0, 1))})`);

  /* ---- G02 (madde 4 KRİTİK): legal denemeli expectRejection REDDEDİLİR ---- */
  const fakeBan: GuidedLesson = {
    ...validRook,
    steps: [
      { kind: 'say', text: 'Kale düz gider.' },
      { kind: 'showMoves', square: sq(0, 0) },
      { kind: 'awaitSquares', from: sq(0, 0), count: rookCount, text: 'Hedefleri bul.' },
      QUIZ,
      { kind: 'expectRejection', text: 'Düz dene.', attempt: { from: sq(0, 0), to: sq(1, 0) }, explanation: 'Sahte yasak.' },
      finish(25),
    ],
  };
  const g02 = validateLesson(fakeBan, CTX);
  ok(hasRule(g02, 4, 'LEGAL'), 'G02: legal denemeli expectRejection madde 4 ile reddedilir');

  /* ---- G03 (madde 5 KRİTİK): awaitSquares literal listesi şemada reddedilir ---- */
  const literalList = {
    kind: 'awaitSquares',
    from: sq(0, 0),
    count: rookCount,
    text: 'Hedefleri bul.',
    accept: [sq(1, 0)],
  } as unknown as GuidedStep;
  const g03 = validateLesson({ ...validRook, steps: [...validRook.steps.slice(0, 2), literalList, ...validRook.steps.slice(3)] }, CTX);
  ok(hasRule(g03, 5, "'accept'"), 'G03: awaitSquares accept anahtarı madde 5 ile reddedilir');

  /* ---- G04: showGeometry fazında literal kare dizisi reddedilir ---- */
  const literalPhase = {
    kind: 'showGeometry',
    square: sq(0, 0),
    phases: [{ label: 'Hedefler', reveal: { of: 'destinations' }, squares: [1] }],
  } as unknown as GuidedStep;
  const g04 = validateLesson({ ...validRook, steps: [...validRook.steps.slice(0, 1), literalPhase, ...validRook.steps.slice(2)] }, CTX);
  ok(hasRule(g04, 5, "'squares'"), 'G04: faz literal kare dizisi madde 5 ile reddedilir');

  /* ---- G05: awaitSquares count uyuşmazlığı ---- */
  const g05 = validateLesson({
    ...validRook,
    steps: validRook.steps.map((s) => (s.kind === 'awaitSquares' ? { ...s, count: rookCount + 1 } : s)),
  }, CTX);
  ok(hasRule(g05, 5, 'count='), 'G05: yanlış count madde 5 ile reddedilir');

  /* ---- G06: Nöbetçi showGeometry (destinations + path) geçer ---- */
  const picketSq = sq(5, 5);
  const picketPos: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: picketSq, side: 'white', kind: PieceKind.Picket },
    ],
  };
  const picketCount = engineDests(picketPos, picketSq).length;
  ok(picketCount > 0, `G06a: fikstür nöbetçisinin hedefi var (${picketCount})`);
  const picketLesson: GuidedLesson = {
    id: '3.4',
    title: 'Nöbetçi (Picket)',
    mode: 'interactive',
    startPosition: picketPos,
    steps: [
      { kind: 'say', text: 'Nöbetçi en az iki gider.' },
      { kind: 'showMoves', square: picketSq },
      {
        kind: 'showGeometry',
        square: picketSq,
        phases: [
          { label: 'Hedefler', reveal: { of: 'destinations' } },
          { label: 'Yol', reveal: { of: 'path' } },
        ],
      },
      { kind: 'awaitSquares', from: picketSq, count: picketCount, text: 'Hedefleri bul.' },
      QUIZ,
      { kind: 'expectRejection', text: 'Bir dene.', attempt: { from: picketSq, to: sq(4, 4) }, explanation: 'Bir gidemez.' },
      finish(100),
    ],
  };
  const g06 = validateLesson(picketLesson, CTX);
  ok(!hasRule(g06, 6), `G06b: nöbetçi geometrisi madde 6 sorunsuz (${JSON.stringify(g06.filter((i) => i.rule === 6).slice(0, 1))})`);
  ok(g06.length === 0, `G06c: nöbetçi dersi baştan sona sorunsuz (${g06.length})`);

  /* ---- G07 (UYARI hükmü): Zürafa firstStep DOĞRULANAMAZ ---- */
  const giraffeSq = sq(5, 5);
  const giraffePos: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: giraffeSq, side: 'white', kind: PieceKind.Giraffe },
    ],
  };
  const giraffeDests = engineDests(giraffePos, giraffeSq);
  ok(giraffeDests.length > 0, `G07a: fikstür zürafasının hedefi var (${giraffeDests.length})`);
  const giraffeFirst: GuidedLesson = {
    id: '3.5',
    title: 'Zürafa (Giraffe)',
    mode: 'interactive',
    startPosition: giraffePos,
    steps: [
      { kind: 'say', text: 'Zürafa hibrit gider.' },
      { kind: 'showMoves', square: giraffeSq },
      { kind: 'showGeometry', square: giraffeSq, phases: [{ label: 'Adım', reveal: { of: 'firstStep' } }] },
      QUIZ,
      { kind: 'say', text: 'Devam.' },
      finish(100, 'Zürafa & Sıçrayıcılar Nişanı'),
    ],
  };
  const g07 = validateLesson(giraffeFirst, CTX);
  ok(hasRule(g07, 6, 'DOĞRULANAMAZ'), 'G07b: firstStep fail-closed madde 6 ile reddedilir');
  /* destinations + direction ile aynı ders GEÇER */
  const giraffeOk: GuidedLesson = {
    ...giraffeFirst,
    steps: [
      { kind: 'say', text: 'Zürafa hibrit gider.' },
      { kind: 'showMoves', square: giraffeSq },
      {
        kind: 'showGeometry',
        square: giraffeSq,
        phases: [
          { label: 'Hedefler', reveal: { of: 'destinations' } },
          { label: 'Kol', reveal: { of: 'direction', dx: 1, dy: 1 } },
        ],
      },
      QUIZ,
      { kind: 'say', text: 'Devam.' },
      finish(100, 'Zürafa & Sıçrayıcılar Nişanı'),
    ],
  };
  const g07c = validateLesson(giraffeOk, CTX);
  ok(!hasRule(g07c, 6), `G07c: zürafa destinations+direction madde 6 sorunsuz (${JSON.stringify(g07c.slice(0, 1))})`);

  /* ---- G08: narrative geçer + ihlal ---- */
  const narrativeOk: GuidedLesson = {
    id: '5.2',
    title: 'Taktik Çatal Işınlanması',
    mode: 'narrative',
    startPosition: rookPos(),
    steps: [
      { kind: 'say', text: 'Çatal anı.' },
      QUIZ,
      { kind: 'quiz', question: 'Ne olur?', options: ['A', 'B'], correctIndex: 1, explanation: 'Işın.' },
      { kind: 'show', annotate: [{ kind: 'square', square: sq(0, 0), tone: 'focus' }] },
      { kind: 'teleport', mode: 'demo', ghostTo: sq(5, 5), text: 'Hayalet belirir.' },
      finish(300),
    ],
  };
  ok(validateLesson(narrativeOk, CTX).length === 0, 'G08a: narrative ders sorunsuz');
  const narrativeBad: GuidedLesson = {
    ...narrativeOk,
    steps: [...narrativeOk.steps.slice(0, 4), { kind: 'awaitMove', accept: [{ from: sq(0, 0), to: sq(1, 0) }], text: 'Sür.' } as GuidedStep, narrativeOk.steps[5]],
  };
  ok(hasRule(validateLesson(narrativeBad, CTX), 9), 'G08b: narrative awaitMove madde 9 ile reddedilir');
  const teleportInteractive: GuidedLesson = {
    ...validRook,
    steps: [...validRook.steps.slice(0, 5), { kind: 'teleport', mode: 'demo', ghostTo: sq(5, 5), text: 'Hayalet.' } as GuidedStep, finish(25)],
  };
  ok(hasRule(validateLesson(teleportInteractive, CTX), 9), 'G08c: interactive teleport madde 9 ile reddedilir');

  /* ---- G09: awaitSquare türetilebilirlik ---- */
  const sqLesson: GuidedLesson = {
    ...validRook,
    steps: [
      { kind: 'say', text: 'Kare bul.' },
      { kind: 'awaitSquare', accept: [sq(1, 0)], text: 'Hedefe dokun.' },
      { kind: 'awaitSquare', accept: [sq(6, 5)], text: 'Boşluğa dokun.' },
      { kind: 'awaitSquare', accept: [110], text: 'Hisara dokun.' },
      QUIZ,
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: sq(0, 0), to: sq(1, 1) }, explanation: 'Olmaz.' },
      finish(25),
    ],
  };
  const g09 = validateLesson(sqLesson, CTX);
  ok(hasRule(g09, 5, '61'), 'G09: türetilemeyen kare (61) madde 5 ile reddedilir');
  ok(g09.filter((i) => i.rule === 5).length === 1, 'G09b: yasal kareler (varış + hisar) sorunsuz');

  /* ---- G10: play zinciri konum + sıra ilerletir (taraflar sırayla oynar) ---- */
  const chainPos: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
      { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
    ],
  };
  const chainOk: GuidedLesson = {
    ...validRook,
    startPosition: chainPos,
    steps: [
      { kind: 'say', text: 'İzle.' },
      { kind: 'play', move: { from: sq(0, 0), to: sq(1, 0) } },
      { kind: 'play', move: { from: sq(10, 9), to: sq(9, 9) } },
      QUIZ,
      { kind: 'awaitMove', accept: [{ from: sq(1, 0), to: sq(2, 0) }], text: 'Devam et.' },
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: sq(1, 0), to: sq(1, 1) }, explanation: 'Olmaz.' },
      finish(25),
    ],
  };
  ok(validateLesson(chainOk, CTX).length === 0, 'G10a: play zinciri sonrası konumda eşleşme sorunsuz');
  const chainBad: GuidedLesson = {
    ...chainOk,
    steps: chainOk.steps.map((s) => (s.kind === 'play' && s.move.from === sq(10, 9) ? { ...s, move: { from: sq(10, 9), to: sq(4, 9) } } : s)),
  };
  ok(hasRule(validateLesson(chainBad, CTX), 3), 'G10b: zincirde illegal play madde 3 ile reddedilir');

  /* ---- G11: terfi beklentisi ---- */
  const promoPos: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook },
    ],
  };
  const promoLesson: GuidedLesson = {
    ...validRook,
    startPosition: promoPos,
    steps: [
      { kind: 'say', text: 'Terfi.' },
      { kind: 'play', move: { from: sq(0, 8), to: sq(0, 9), expectPromotion: PieceKind.Rook } },
      QUIZ,
      { kind: 'awaitMove', accept: [{ from: sq(0, 9), to: sq(0, 8) }], text: 'Geri al.' },
      { kind: 'say', text: 'Devam.' },
      { kind: 'expectRejection', text: 'Dene.', attempt: { from: sq(0, 9), to: sq(1, 8) }, explanation: 'Olmaz.' },
      finish(25),
    ],
  };
  const g11 = validateLesson(promoLesson, CTX);
  ok(!hasRule(g11, 3), `G11a: temsilî terfi eşleşmesi sorunsuz (${JSON.stringify(g11.filter((i) => i.rule === 3).slice(0, 1))})`);
  const promoWrong: GuidedLesson = {
    ...promoLesson,
    steps: promoLesson.steps.map((s) => (s.kind === 'play' ? { ...s, move: { ...s.move, expectPromotion: PieceKind.Knight } } : s)),
  };
  ok(hasRule(validateLesson(promoWrong, CTX), 3, 'terfi'), 'G11b: yanlış terfi beklentisi madde 3 ile reddedilir');

  /* ---- G12: awaitSwap ---- */
  const swapPos: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(5, 5), side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
    ],
  };
  const swapLesson: GuidedLesson = {
    id: '6.1',
    title: 'Şah Takası Manevrası',
    mode: 'interactive',
    startPosition: swapPos,
    steps: [
      { kind: 'say', text: 'Takas hakkı.' },
      { kind: 'awaitSwap', text: 'Takası yap.' },
      QUIZ,
      { kind: 'awaitMove', accept: [{ from: sq(5, 5), to: sq(5, 6) }], text: 'Şahı sür.' },
      { kind: 'expectRejection', text: 'İki dene.', attempt: { from: sq(5, 5), to: sq(5, 7) }, explanation: 'İki olmaz.' },
      { kind: 'say', text: 'Devam.' },
      finish(360),
    ],
  };
  ok(validateLesson(swapLesson, CTX).length === 0, 'G12a: takas mevcutken awaitSwap sorunsuz');
  const swapUsed: GuidedLesson = {
    ...swapLesson,
    startPosition: { ...swapPos, kind: 'pieces', kingSwapUsed: { white: true, black: false } } as PositionRef,
  };
  ok(hasRule(validateLesson(swapUsed, CTX), 3, 'awaitSwap'), 'G12b: tüketilmiş takas hakkı madde 3 ile reddedilir');

  /* ---- G13: serialized konum ---- */
  const legacyBoard: unknown[][] = Array.from({ length: 10 }, () => Array(11).fill(null));
  legacyBoard[0][4] = { id: 'w-k', type: 'king', color: 'white', position: { x: 4, y: 0 }, hasMoved: false };
  legacyBoard[9][4] = { id: 'b-k', type: 'king', color: 'black', position: { x: 4, y: 9 }, hasMoved: false };
  legacyBoard[0][0] = { id: 'w-r', type: 'rook', color: 'white', position: { x: 0, y: 0 }, hasMoved: false };
  const serialized: PositionRef = {
    kind: 'serialized',
    data: JSON.stringify({
      board: legacyBoard,
      citadels: { whiteCitadelPiece: null, blackCitadelPiece: null },
      currentTurn: 'white',
      hasUsedKingSwap: { white: false, black: false },
      turnNumber: 1,
      halfMoveClock: 0,
    }),
  };
  const serLesson: GuidedLesson = { ...validRook, startPosition: serialized };
  ok(validateLesson(serLesson, CTX).length === 0, 'G13: serialized konum kurulup doğrulanır');
  const serBroken: GuidedLesson = { ...validRook, startPosition: { kind: 'serialized', data: '{bozuk' } };
  ok(hasRule(validateLesson(serBroken, CTX), 2, 'JSON'), 'G13b: bozuk serialized madde 2 ile reddedilir');

  /* ---- G14: madde 2 konum yasallığı ---- */
  const noPawnOf: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 2), side: 'white', kind: PieceKind.Pawn },
    ],
  };
  ok(hasRule(validateLesson({ ...validRook, startPosition: noPawnOf }, CTX), 2, 'pawnOf'), 'G14a: pawnOf yoksa madde 2');
  const blackInCheck: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(0, 0), side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(4, 1), side: 'white', kind: PieceKind.Rook },
    ],
  };
  ok(hasRule(validateLesson({ ...validRook, startPosition: blackInCheck }, CTX), 2, 'şah altında'), 'G14b: sıra-dışı şah çekiliyorsa madde 2');
  const badCitadel: PositionRef = {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: 110, side: 'black', kind: PieceKind.Knight },
    ],
  };
  ok(hasRule(validateLesson({ ...validRook, startPosition: badCitadel }, CTX), 2, 'hisar'), 'G14c: kural-dışı hisar doluluğu madde 2');

  /* ---- G15: metin uzunluğu + isim linti ---- */
  const longText = `x`.repeat(111);
  ok(hasRule(validateLesson({ ...validRook, steps: [{ kind: 'say', text: longText }, ...validRook.steps.slice(1)] }, CTX), 10), 'G15a: 111 karakter madde 10');
  ok(hasRule(validateLesson({ ...validRook, steps: [{ kind: 'say', text: 'Talia bekler.' }, ...validRook.steps.slice(1)] }, CTX), 12, 'talia'), 'G15b: yasak ad madde 12');
  const g15c = validateLesson({ ...validRook, steps: [{ kind: 'say', text: 'Nöbetçi bekler.' }, ...validRook.steps.slice(1)] }, CTX);
  ok(!hasRule(g15c, 12), 'G15c: doğru ad (Nöbetçi) sorunsuz');

  /* ---- G16: adım sayısı, eşik, id, XP ---- */
  ok(hasRule(validateLesson({ ...validRook, steps: validRook.steps.slice(0, 3) }, CTX), 7), 'G16a: 3 adım madde 7');
  const thin: GuidedLesson = {
    ...validRook,
    steps: [
      { kind: 'say', text: 'A.' },
      { kind: 'say', text: 'B.' },
      { kind: 'say', text: 'C.' },
      { kind: 'say', text: 'D.' },
      QUIZ,
      finish(25),
    ],
  };
  ok(hasRule(validateLesson(thin, CTX), 8), 'G16b: 1 interaktif adım madde 8');
  ok(hasRule(validateLesson({ ...validRook, id: '9.9', title: 'Yok' }, CTX), 1), 'G16c: bilinmeyen id madde 1');
  ok(hasRule(validateLesson({ ...validRook, title: 'Yanlış' }, CTX), 1, 'başlık'), 'G16d: başlık uyuşmazlığı madde 1');
  ok(hasRule(validateLesson({ ...validRook, steps: [...validRook.steps.slice(0, 6), finish(26)] }, CTX), 11, 'xp='), 'G16e: yanlış XP madde 11');
  const badgedEarly: GuidedLesson = {
    id: '1.2',
    title: 'Şah (King)',
    mode: 'interactive',
    startPosition: rookPos(),
    steps: [...validRook.steps.slice(0, 6), finish(25, 'Erken rozet')],
  };
  ok(hasRule(validateLesson(badgedEarly, CTX), 11, 'badge'), 'G16f: erken rozet madde 11');
  const lastNoBadge: GuidedLesson = { ...giraffeFirst, steps: [...giraffeFirst.steps.slice(0, 5), finish(100)] };
  ok(hasRule(validateLesson(lastNoBadge, CTX), 11, 'rozet'), 'G16g: son derste rozetsiz finish madde 11');

  /* ---- G17: set-seviyesi + saf yardımcılar ---- */
  const setIssues = validateLessonSet([validRook], CTX);
  ok(setIssues.filter((i) => i.rule === 1 && i.message.includes('eksik')).length === 24, 'G17a: tek derslik sette 24 eksik (madde 1)');
  ok(findMissingLessons(['1.1']).length === 24, 'G17b: findMissingLessons');
  ok(findExtraLessons(['1.1', '9.9']).join() === '9.9', 'G17c: findExtraLessons');
  ok(checkXpTotals({ 1: 100, 2: 250, 3: 500, 4: 800, 5: 1200, 6: 1800 }).length === 0, 'G17d: XP toplamları sorunsuz');
  ok(checkXpTotals({ 1: 99 }).length === 7, 'G17e: bozuk toplamlar 6 seviye + genel = 7 sorun');
  ok(expectedLessonXp(2, 0, 3) === 83 && expectedLessonXp(2, 2, 3) === 84, 'G17f: seviye 2 dağılımı 83/83/84');
  ok(expectedLessonXp(1, 0, 4) === 25 && expectedLessonXp(3, 4, 5) === 100, 'G17g: seviye 1/3 dağılımı');
  ok(expectedLessonXp(5, 0, 4) === 300 && expectedLessonXp(6, 4, 5) === 360, 'G17h: seviye 5/6 dağılımı');
  ok(LEVEL_XP_TOTAL[4] === 800 && GRAND_XP_TOTAL === 4650, 'G17i: XP sabitleri');
  ok(parseLessonId('3.5')?.level === 3 && parseLessonId('xx') === null, 'G17j: parseLessonId');
  ok(formatReport([]) === 'OK: sorun yok.', 'G17k: boş rapor');
  ok(formatReport([{ lessonId: '1.3', stepIndex: 2, rule: 5, message: 'm' }]).includes('[madde 5] ders 1.3 adım 2'), 'G17l: rapor biçimi');

  return { passed, failed };
}
