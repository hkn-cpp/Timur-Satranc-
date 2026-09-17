/**
 * Kanıt fixture'ları F1-F9 (Bölüm 6): her biri bir maddeyi yakalamalı.
 * Çalıştırma: `runGuidedValidateFixtureTests()` (harness-bağımsız).
 */
import { PieceKind } from '../../../core/position/Position';
import { checkXpTotals } from '../../lessonValidator';
import { validateGuidedLesson, validateGuidedSet } from '../validate';
import type { GuidedLesson } from '../types';

export interface TestSummary {
  passed: number;
  failed: number;
}

const CTX = {
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
const RSQ = sq(0, 0);

function baseLesson(): GuidedLesson {
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
      ],
    },
    orientation: 'white',
    xp: 25,
    steps: [
      { kind: 'say', text: 'Kale düz gider.' },
      { kind: 'showMoves', square: RSQ },
      { kind: 'awaitSquares', from: RSQ, count: 12, text: 'Hedefleri bul.' },
      { kind: 'awaitMove', accept: [{ from: RSQ, to: sq(1, 0) }], text: 'Kaleyi sür.' },
      { kind: 'quiz', question: 'Kale nasıl gider?', options: ['Düz', 'Çapraz'], correctIndex: 0, explanation: 'Kale düz gider.' },
      { kind: 'expectRejection', text: 'Çapraz dene.', attempt: { from: RSQ, to: sq(1, 1) }, explanation: 'Kale çapraz gidemez.' },
      { kind: 'finish', text: 'Ders bitti.', xp: 25 },
    ],
  };
}

function hasRule(issues: { rule: number }[], rule: number): boolean {
  return issues.some((i) => i.rule === rule);
}

export function runGuidedValidateFixtureTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  const ok = (cond: boolean, name: string): void => {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  };

  // F1: sırası olmayan tarafın Şahı şah altında → 2
  const f1: GuidedLesson = {
    ...baseLesson(),
    startPosition: {
      kind: 'pieces',
      sideToMove: 'white',
      pieces: [
        { square: sq(0, 0), side: 'white', kind: PieceKind.King },
        { square: BK, side: 'black', kind: PieceKind.King },
        { square: sq(4, 1), side: 'white', kind: PieceKind.Rook },
      ],
    },
  };
  ok(hasRule(validateGuidedLesson(f1, CTX), 2), 'F1 illegal konum → madde 2');

  // F2: expectRejection LEGAL hamle → 4
  const f2: GuidedLesson = {
    ...baseLesson(),
    steps: baseLesson().steps.map((s) =>
      s.kind === 'expectRejection' ? { ...s, attempt: { from: RSQ, to: sq(1, 0) } } : s,
    ),
  };
  ok(hasRule(validateGuidedLesson(f2, CTX), 4), 'F2 legal yasak → madde 4');

  // F3: awaitSquares elle liste → 5
  const f3: GuidedLesson = {
    ...baseLesson(),
    steps: baseLesson().steps.map((s) =>
      s.kind === 'awaitSquares' ? ({ ...s, accept: [sq(1, 0)] } as unknown as typeof s) : s,
    ),
  };
  ok(hasRule(validateGuidedLesson(f3, CTX), 5), 'F3 elle liste → madde 5');

  // F4: interactive 2 interaktif adım → 8
  const f4: GuidedLesson = {
    ...baseLesson(),
    steps: [
      { kind: 'say', text: 'A.' },
      { kind: 'say', text: 'B.' },
      { kind: 'say', text: 'C.' },
      { kind: 'say', text: 'D.' },
      { kind: 'quiz', question: 'Soru?', options: ['A', 'B'], correctIndex: 0, explanation: 'Açıklama.' },
      { kind: 'say', text: 'E.' },
      { kind: 'finish', text: 'Ders bitti.', xp: 25 },
    ],
  };
  ok(hasRule(validateGuidedLesson(f4, CTX), 8), 'F4 az etkileşim → madde 8');

  // F5: narrative 1 quiz → 8
  const f5: GuidedLesson = {
    id: '5.2',
    level: 5,
    title: 'Taktik Çatal Işınlanması',
    mode: 'narrative',
    startPosition: baseLesson().startPosition,
    orientation: 'white',
    xp: 300,
    steps: [
      { kind: 'say', text: 'Çatal anı.' },
      { kind: 'quiz', question: 'Ne olur?', options: ['A', 'B'], correctIndex: 0, explanation: 'Işın.' },
      { kind: 'show', annotate: [{ kind: 'square', square: RSQ, tone: 'focus' }] },
      { kind: 'say', text: 'Devam.' },
      { kind: 'say', text: 'Bekle.' },
      { kind: 'finish', text: 'Ders bitti.', xp: 300 },
    ],
  };
  ok(hasRule(validateGuidedLesson(f5, CTX), 8), 'F5 tek quiz → madde 8');

  // F6: narrative awaitMove → 9
  const f6: GuidedLesson = {
    ...f5,
    steps: [
      { kind: 'say', text: 'Çatal anı.' },
      { kind: 'quiz', question: 'Ne olur?', options: ['A', 'B'], correctIndex: 0, explanation: 'Işın.' },
      { kind: 'quiz', question: 'Ne olur?', options: ['A', 'B'], correctIndex: 1, explanation: 'Işın.' },
      { kind: 'awaitMove', accept: [{ from: RSQ, to: sq(1, 0) }], text: 'Sür.' },
      { kind: 'say', text: 'Bekle.' },
      { kind: 'finish', text: 'Ders bitti.', xp: 300 },
    ],
  };
  ok(hasRule(validateGuidedLesson(f6, CTX), 9), 'F6 narrative awaitMove → madde 9');

  // F7: seviye XP 480 (500 yerine) → 11
  ok(checkXpTotals({ 1: 100, 2: 250, 3: 480, 4: 800, 5: 1200, 6: 1800 }).length > 0, 'F7 XP toplamı → madde 11');

  // F8: çift ders id → 1
  const dup = validateGuidedSet([baseLesson(), baseLesson()], CTX);
  ok(hasRule(dup, 1), 'F8 çift id → madde 1');

  // F9: "Dabbabe" → 12
  const f9: GuidedLesson = {
    ...baseLesson(),
    steps: [{ kind: 'say', text: 'Dabbabe ile vur.' }, ...baseLesson().steps.slice(1)],
  };
  ok(hasRule(validateGuidedLesson(f9, CTX), 12), 'F9 yasak ad → madde 12');

  return { passed, failed };
}
