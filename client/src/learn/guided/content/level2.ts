/**
 * Seviye 2 dersleri (Keshik, 83 / 83 / 84).
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);
const VSQ = sq(5, 5);

const lesson21: GuidedLesson = {
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
      { square: VSQ, side: 'white', kind: PieceKind.General },
    ],
  },
  orientation: 'white',
  xp: 83,
  steps: [
    { kind: 'say', text: 'Vezir yalnız bir kare düz gider.' },
    { kind: 'showMoves', square: VSQ, text: 'Dört komşu kare, hepsi düz yönde.' },
    { kind: 'awaitMove', accept: [{ from: VSQ, to: sq(5, 6) }], text: 'Veziri bir kare ileri sür.' },
    { kind: 'expectRejection', text: 'Veziri çapraza sürmeyi dene.', attempt: { from: VSQ, to: sq(6, 6) }, explanation: 'İşte bu. Vezir çapraz gidemez, yalnız düz.' },
    { kind: 'quiz', question: 'Vezir nasıl gider?', options: ['Bir düz', 'Bir çapraz', 'Sınırsız'], correctIndex: 0, explanation: 'Vezir düz yönde bir kare gider.' },
    { kind: 'say', text: 'Vezir Şahın yakın muhafızıdır.' },
    { kind: 'finish', text: 'Vezir kalkanı hazır, aferin.', xp: 83 },
  ],
};

const lesson22: GuidedLesson = {
  id: '2.2',
  level: 2,
  title: 'Fers (General)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: VSQ, side: 'white', kind: PieceKind.Ferz },
    ],
  },
  orientation: 'white',
  xp: 83,
  steps: [
    { kind: 'say', text: 'Fers yalnız bir kare çapraz gider.' },
    { kind: 'showMoves', square: VSQ, text: 'Dört komşu kare, hepsi çapraz yönde.' },
    { kind: 'awaitMove', accept: [{ from: VSQ, to: sq(6, 6) }], text: 'Fersi çapraza bir kare sür.' },
    { kind: 'expectRejection', text: 'Fersi düz sürmeyi dene.', attempt: { from: VSQ, to: sq(5, 6) }, explanation: 'İşte bu. Fers düz gidemez, yalnız çapraz.' },
    { kind: 'quiz', question: 'Fers nasıl gider?', options: ['Bir düz', 'Bir çapraz', 'Sınırsız'], correctIndex: 1, explanation: 'Fers çapraz yönde bir kare gider.' },
    { kind: 'say', text: 'Fers Vezirin çaprazdaki eşidir.' },
    { kind: 'finish', text: 'Çapraz kilit hazır, aferin.', xp: 83 },
  ],
};

const lesson23: GuidedLesson = {
  id: '2.3',
  level: 2,
  title: 'Saray İkilisi Savunma Simbiyozu',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(5, 1), side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 2), side: 'white', kind: PieceKind.General },
      { square: sq(4, 2), side: 'white', kind: PieceKind.Ferz },
      { square: sq(5, 4), side: 'black', kind: PieceKind.Knight },
    ],
  },
  orientation: 'white',
  xp: 84,
  steps: [
    { kind: 'say', text: 'Vezir düzü, Fers çaprazı tutar.' },
    { kind: 'show', text: 'Üç taş tek yumruk, Şah ortada güvende.', annotate: [{ kind: 'square', square: sq(5, 1), tone: 'focus' }, { kind: 'square', square: sq(5, 2), tone: 'good' }, { kind: 'square', square: sq(4, 2), tone: 'good' }] },
    { kind: 'awaitMove', accept: [{ from: sq(5, 2), to: sq(5, 3) }], text: 'Veziri bir kare ileri sür.' },
    { kind: 'quiz', question: 'Sızan Atı kim durdurur?', options: ['Vezir', 'İkili birlikte', 'Hiçbiri'], correctIndex: 1, explanation: 'İkili birlikte artı ve çarpı yönleri tutar.' },
    { kind: 'awaitSquare', accept: [sq(4, 2)], text: 'Fersin karesine dokun.' },
    { kind: 'say', text: 'Zinciri bozma, birlikte hücum et.' },
    { kind: 'finish', text: 'Saray muhafızı oldun, rozet senin.', xp: 84, badge: 'Saray Kalkanı Rozeti' },
  ],
};

export const LEVEL2_LESSONS: GuidedLesson[] = [lesson21, lesson22, lesson23];
