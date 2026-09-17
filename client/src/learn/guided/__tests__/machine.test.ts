/**
 * Saf durum makinesi testleri (Bölüm 7.4, 27 vaka).
 */
import { PieceKind } from '../../../core/position/Position';
import { reduce, initialState, type MachineState } from '../machine';
import type { GuidedLesson } from '../types';

export interface TestSummary {
  passed: number;
  failed: number;
}

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);
const RSQ = sq(0, 0);

function rookLesson(): GuidedLesson {
  return {
    id: '1.3',
    level: 1,
    title: 'Kale (Rook)',
    mode: 'interactive',
    startPosition: {
      kind: 'pieces',
      sideToMove: 'white',
      pieces: [
        { square: WK, side: 'white', kind: PieceKind.King },
        { square: BK, side: 'black', kind: PieceKind.King },
        { square: RSQ, side: 'white', kind: PieceKind.Rook },
        { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
      ],
    },
    orientation: 'white',
    xp: 25,
    steps: [
      { kind: 'say', text: 'Koç konuşur.' },
      { kind: 'showMoves', square: RSQ, text: 'İzle.' },
      {
        kind: 'showGeometry',
        square: RSQ,
        text: 'Fazlar.',
        phases: [
          { label: 'Hedefler.', reveal: { of: 'destinations' } },
          { label: 'Yön.', reveal: { of: 'direction', dx: 1, dy: 0 } },
        ],
      },
      { kind: 'play', move: { from: RSQ, to: sq(1, 0) } },
      { kind: 'play', move: { from: sq(10, 9), to: sq(9, 9) } },
      {
        kind: 'awaitSquares',
        from: sq(1, 0),
        count: 12,
        text: 'Hedefleri bul.',
      },
      { kind: 'awaitMove', accept: [{ from: sq(1, 0), to: sq(2, 0) }], text: 'Sür.' },
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: sq(2, 0), to: sq(3, 1) }, explanation: 'Kale çapraz gidemez.' },
      { kind: 'quiz', question: 'Kale?', options: ['Düz', 'Çapraz'], correctIndex: 0, explanation: 'Düz.' },
      { kind: 'awaitSwap', text: 'Takas yap.' },
      { kind: 'setPosition', position: { kind: 'pieces', sideToMove: 'white', pieces: [{ square: WK, side: 'white', kind: PieceKind.King }, { square: BK, side: 'black', kind: PieceKind.King }] } },
      { kind: 'say', text: 'Son.' },
      { kind: 'finish', text: 'Bitti.', xp: 25 },
    ],
  };
}

function start(lesson: GuidedLesson): MachineState {
  return reduce(initialState(), { type: 'START', lesson });
}

function stateAtStep(n: number): MachineState {
  // rookLesson awaitSquares (5) konumuna hızlı ilerle (beyaz-siyah sırayla)
  let s = start(rookLesson());
  s = reduce(s, { type: 'NEXT' }); // 1
  s = reduce(s, { type: 'NEXT' }); // 2 (geometry, faz 0)
  s = reduce(s, { type: 'PHASE_DONE' });
  s = reduce(s, { type: 'PHASE_DONE' });
  s = reduce(s, { type: 'NEXT' }); // 3 play (beyaz)
  s = reduce(s, { type: 'PLAY_DONE' }); // 4 play (siyah)
  s = reduce(s, { type: 'PLAY_DONE' }); // 5 awaitSquares
  if (n === 5) return s;
  return s;
}

/** awaitSquares hedefleri (beyaz kale (1,0) konumundan, 12 hedef). */
const SQUARES_ALL = [0, 2, 3, 12, 23, 34, 45, 56, 67, 78, 89, 100];

function stateAtMove(): MachineState {
  // awaitSquares tamamlanınca sıra beyaza geçer, awaitMove (6) açılır
  let s = stateAtStep(5);
  for (const d of SQUARES_ALL) s = reduce(s, { type: 'INPUT_SQUARE', square: d });
  return s;
}

export function runGuidedMachineTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  const ok = (cond: boolean, name: string): void => {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  };

  // 1-4 presenting
  let s = start(rookLesson());
  ok(s.status === 'presenting' && s.index === 0, 'M01 presenting başlar');
  s = reduce(s, { type: 'NEXT' });
  ok(s.status === 'presenting' && s.index === 1, 'M02 NEXT ilerler');
  s = reduce(s, { type: 'BACK' });
  ok(s.index === 0, 'M03 BACK döner');
  s = reduce(s, { type: 'BACK' });
  ok(s.index === 0, 'M04 ilk adımda BACK sınırda kalır');

  // 5-7 playing
  let p = start(rookLesson());
  p = reduce(p, { type: 'NEXT' });
  p = reduce(p, { type: 'NEXT' });
  p = reduce(p, { type: 'PHASE_DONE' });
  p = reduce(p, { type: 'PHASE_DONE' });
  p = reduce(p, { type: 'NEXT' });
  ok(p.status === 'playing', 'M05 play adımında playing');
  const locked = reduce(p, { type: 'INPUT_MOVE', move: { from: RSQ, to: sq(2, 0) } });
  ok(locked.status === 'playing' && locked.index === p.index, 'M06 playing girdi kilitli');
  p = reduce(p, { type: 'PLAY_DONE' });
  p = reduce(p, { type: 'PLAY_DONE' });
  ok(p.status === 'awaiting' && p.index === 5, 'M05b PLAY_DONE ilerletir');
  const dup = reduce(p, { type: 'PLAY_DONE' });
  ok(dup.index === 5 && dup.status === 'awaiting', 'M07 çift PLAY_DONE idempotent');

  // 8-11 geometry
  let g = start(rookLesson());
  g = reduce(g, { type: 'NEXT' });
  g = reduce(g, { type: 'NEXT' });
  ok(g.status === 'presenting' && g.phase === 0, 'M08 geometry faz 0');
  g = reduce(g, { type: 'PHASE_DONE' });
  ok(g.phase === 1, 'M09 PHASE_DONE ilerler');
  const early = reduce(g, { type: 'NEXT' });
  ok(early.index === 2, 'M10 son faz öncesi NEXT kapalı');
  g = reduce(g, { type: 'PHASE_DONE' });
  g = reduce(g, { type: 'NEXT' });
  ok(g.status === 'playing', 'M11 tüm fazlar bitince NEXT açılır');

  // 12-16 awaitMove
  let a = stateAtMove();
  ok(a.status === 'awaiting' && a.index === 6, 'M12 awaiting giriş');
  const keyBefore = a.boardKey;
  const wrong = reduce(a, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(2, 1) } });
  ok(wrong.status === 'awaiting' && wrong.boardKey === keyBefore, 'M13 yanlışta konum değişmez');
  ok((wrong.wrongCounts[6] ?? 0) === 1, 'M13b yanlış sayacı artar');
  const right = reduce(a, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(2, 0) } });
  ok(right.index === 7 && right.status === 'trapping', 'M12b doğru hamle ilerletir');
  let h = stateAtMove();
  h = reduce(h, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(2, 1) } });
  h = reduce(h, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(3, 1) } });
  h = reduce(h, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(4, 1) } });
  ok(h.autoHint === true, 'M14 hintAfter sonrası otomatik ok');
  let hh = stateAtMove();
  hh = reduce(hh, { type: 'HINT' });
  hh = reduce(hh, { type: 'HINT' });
  ok(hh.hintLevels[6] === 2 && hh.totalHints === 2, 'M15 HINT seviyeleri');
  let sk = stateAtMove();
  sk = reduce(sk, { type: 'SKIP' });
  ok(sk.index === 7 && sk.skipped === true, 'M16 SKIP atlar + tavan işareti');

  // 17-19 awaitSquares
  let q: MachineState = stateAtStep(5);
  ok(q.status === 'awaiting', 'M17 awaitSquares giriş');
  q = reduce(q, { type: 'INPUT_SQUARE', square: sq(3, 0) });
  ok(q.status === 'awaiting' && q.found.length === 1, 'M17b kısmi ilerleme');
  const foundBefore = q.found.length;
  q = reduce(q, { type: 'INPUT_SQUARE', square: sq(5, 5) });
  ok(q.found.length === foundBefore, 'M18 yanlış seçim bulunanları silmez');
  q = reduce(q, { type: 'INPUT_SQUARE', square: sq(3, 0) });
  ok(q.found.length === foundBefore, 'M19 aynı kare sayaç artırmaz');

  // 20-23 expectRejection (izole ders)
  const trapLesson: GuidedLesson = {
    id: '2.1',
    level: 2,
    title: 'Vezir (Vizier)',
    mode: 'interactive',
    startPosition: {
      kind: 'pieces',
      sideToMove: 'white',
      pieces: [
        { square: WK, side: 'white', kind: PieceKind.King },
        { square: BK, side: 'black', kind: PieceKind.King },
        { square: sq(5, 5), side: 'white', kind: PieceKind.General },
      ],
    },
    orientation: 'white',
    xp: 83,
    steps: [
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: sq(5, 5), to: sq(6, 6) }, explanation: 'Vezir çapraz gidemez.' },
      { kind: 'finish', text: 'Bitti.', xp: 83 },
    ],
  };
  let t = start(trapLesson);
  ok(t.status === 'trapping', 'M20 trapping giriş');
  const tw = t.wrongCounts[0] ?? 0;
  t = reduce(t, { type: 'INPUT_MOVE', move: { from: sq(5, 5), to: sq(6, 6) } });
  ok(t.status === 'explaining' && t.lastResult === 'trap-success', 'M20b beklenen yasak başarı');
  ok((t.wrongCounts[0] ?? 0) === tw, 'M20c hata sayacı artmaz');
  let t2 = start(trapLesson);
  t2 = reduce(t2, { type: 'INPUT_MOVE', move: { from: sq(5, 5), to: sq(9, 9) } });
  ok(t2.status === 'trapping', 'M21 başka yasak hamlede kalır');
  let t3 = start(trapLesson);
  const k3 = t3.boardKey;
  t3 = reduce(t3, { type: 'INPUT_MOVE', move: { from: sq(5, 5), to: sq(5, 6) } });
  ok(t3.status === 'trapping' && t3.boardKey === k3, 'M22 legal hamlede konum değişmez');
  let t4 = start(trapLesson);
  t4 = reduce(t4, { type: 'TIMEOUT' });
  ok(t4.status === 'explaining' && t4.lastResult === 'timeout-show', 'M23 TIMEOUT açıklar');
  t4 = reduce(t4, { type: 'EXPLAIN_DONE' });
  ok(t4.index === 1, 'M23b EXPLAIN_DONE ilerletir');

  // 24 awaitSwap
  const swapLesson: GuidedLesson = {
    id: '6.1',
    level: 6,
    title: 'Şah Takası Manevrası',
    mode: 'interactive',
    startPosition: {
      kind: 'pieces',
      sideToMove: 'white',
      pieces: [
        { square: sq(5, 5), side: 'white', kind: PieceKind.King },
        { square: BK, side: 'black', kind: PieceKind.King },
        { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
      ],
    },
    orientation: 'white',
    xp: 360,
    steps: [
      { kind: 'awaitSwap', text: 'Takası yap.' },
      { kind: 'finish', text: 'Bitti.', xp: 360 },
    ],
  };
  let sw = start(swapLesson);
  ok(sw.status === 'awaiting', 'M24 swap awaiting');
  sw = reduce(sw, { type: 'INPUT_SWAP', partner: sq(0, 0) });
  ok(sw.index === 1, 'M24b doğru partner ilerletir');
  let sw2 = start(swapLesson);
  sw2 = reduce(sw2, { type: 'INPUT_SWAP', partner: sq(9, 9) });
  ok(sw2.status === 'awaiting', 'M24c yanlış partner kalır');

  // 25 quiz retry
  const quizLesson: GuidedLesson = {
    id: '4.4',
    level: 4,
    title: 'Çift Hükümdar Tehdidi',
    mode: 'narrative',
    startPosition: {
      kind: 'pieces',
      sideToMove: 'white',
      pieces: [
        { square: WK, side: 'white', kind: PieceKind.King },
        { square: BK, side: 'black', kind: PieceKind.King },
      ],
    },
    orientation: 'white',
    xp: 200,
    steps: [
      { kind: 'say', text: 'İki hükümdar.' },
      { kind: 'quiz', question: 'Ne olur?', options: ['Biter', 'Sürer'], correctIndex: 1, explanation: 'Sürer.' },
      { kind: 'quiz', question: 'Kim?', options: ['Şah', 'İkisi'], correctIndex: 1, explanation: 'İkisi.' },
      { kind: 'show', annotate: [{ kind: 'square', square: WK, tone: 'focus' }] },
      { kind: 'say', text: 'Devam.' },
      { kind: 'say', text: 'Son.' },
      { kind: 'finish', text: 'Bitti.', xp: 200 },
    ],
  };
  let qq = start(quizLesson);
  qq = reduce(qq, { type: 'NEXT' });
  ok(qq.status === 'quizzing', 'M25 quiz giriş');
  qq = reduce(qq, { type: 'ANSWER', optionIndex: 0 });
  ok(qq.status === 'explaining', 'M25b yanlış açıklama');
  qq = reduce(qq, { type: 'EXPLAIN_DONE' });
  ok(qq.status === 'quizzing', 'M25c yanlış sonrası tekrar');

  // 26 setPosition + BACK
  let full = stateAtStep(5);
  for (const d of SQUARES_ALL) full = reduce(full, { type: 'INPUT_SQUARE', square: d });
  // awaitMove(6) doğru, trap(7) TIMEOUT, quiz(8) doğru, swap(9) SKIP, setPosition(10)
  full = reduce(full, { type: 'INPUT_MOVE', move: { from: sq(1, 0), to: sq(2, 0) } });
  full = reduce(full, { type: 'TIMEOUT' });
  full = reduce(full, { type: 'EXPLAIN_DONE' });
  full = reduce(full, { type: 'ANSWER', optionIndex: 0 });
  full = reduce(full, { type: 'EXPLAIN_DONE' });
  full = reduce(full, { type: 'SKIP' });
  ok(full.index === 10, 'M26a setPosition giriş');
  const afterSet = full.boardKey;
  full = reduce(full, { type: 'NEXT' });
  full = reduce(full, { type: 'BACK' });
  ok(full.index === 10 && full.boardKey === afterSet, 'M26b BACK konumu geri getirir');

  // 27 narrative + awaitMove
  const badNarrative: GuidedLesson = {
    ...quizLesson,
    id: '5.1',
    title: '1. Terfi (Bekleme Aşaması)',
    steps: [
      { kind: 'say', text: 'Bekler.' },
      { kind: 'awaitMove', accept: [{ from: WK, to: sq(4, 1) }], text: 'Sür.' },
      { kind: 'quiz', question: 'S?', options: ['A', 'B'], correctIndex: 0, explanation: 'E.' },
      { kind: 'quiz', question: 'S?', options: ['A', 'B'], correctIndex: 0, explanation: 'E.' },
      { kind: 'say', text: 'D.' },
      { kind: 'say', text: 'E.' },
      { kind: 'finish', text: 'Bitti.', xp: 200 },
    ],
  };
  const bad = start(badNarrative);
  const bad2 = reduce(bad, { type: 'NEXT' });
  ok(bad2.status === 'contentError', 'M27 narrative awaitMove contentError');

  return { passed, failed };
}
