/**
 * Seviye 1 dersleri (Karavul, 25 XP × 4).
 * Başlıklar learnContent.ts ile BİREBİR.
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);

const lesson11: GuidedLesson = {
  id: '1.1',
  level: 1,
  title: '112 Karelik Saha ve Hisarlar',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
    ],
  },
  orientation: 'white',
  xp: 25,
  steps: [
    { kind: 'say', text: 'Bu meydan 110 kare artı 2 hisar cebidir.' },
    { kind: 'show', text: 'Hatlar a ile k arası, sıralar 1 ile 10 arası.', annotate: [{ kind: 'coords', visible: true }] },
    { kind: 'awaitSquare', accept: [WK], text: 'Beyaz Şahın karesine dokun.' },
    { kind: 'awaitSquare', accept: [110], text: 'Sol hisar cebine dokun.' },
    { kind: 'quiz', question: 'Toplam kaç kare vardır?', options: ['110', '112', '128'], correctIndex: 1, explanation: '110 kare artı 2 hisar, toplam 112.' },
    { kind: 'say', text: 'Hisarlar sığınak karelerdir, oyunu bitirir.' },
    { kind: 'finish', text: 'Meydanı tanıdın, güzel başlangıç.', xp: 25 },
  ],
};

const SHAH = sq(5, 5);
const lesson12: GuidedLesson = {
  id: '1.2',
  level: 1,
  title: 'Şah (King)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: SHAH, side: 'white', kind: PieceKind.King },
      { square: sq(5, 0), side: 'black', kind: PieceKind.King },
    ],
  },
  orientation: 'white',
  xp: 25,
  steps: [
    { kind: 'say', text: 'Şah komşu 8 kareye bir adım gider.' },
    { kind: 'showMoves', square: SHAH, text: 'Yeşil halkalar Şahın gidebildiği kareler.' },
    { kind: 'awaitMove', accept: [{ from: SHAH, to: sq(5, 6) }], text: 'Şahı bir kare ileri sür.' },
    { kind: 'expectRejection', text: 'Şimdi rok yapmayı dene, iki kare yana git.', attempt: { from: sq(5, 6), to: sq(5, 8) }, explanation: 'İşte bu. Burada rok yoktur, Şah hep bir gider.' },
    { kind: 'quiz', question: 'Şah kaç kare gider?', options: ['Bir', 'İki', 'Sınırsız'], correctIndex: 0, explanation: 'Şah komşu kareye bir adım gider.' },
    { kind: 'say', text: 'Şahını hep koru, o oyunun kalbindir.' },
    { kind: 'finish', text: 'Şahı öğrendin, rok tuzağına düşmedin.', xp: 25 },
  ],
};

const lesson13: GuidedLesson = {
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
      { square: sq(0, 0), side: 'white', kind: PieceKind.Rook },
    ],
  },
  orientation: 'white',
  xp: 25,
  steps: [
    { kind: 'say', text: 'Kale düz hatlarda kesintisiz kayar.' },
    { kind: 'showMoves', square: sq(0, 0), text: 'Halkalar kalenin ulaşabildiği karelerdir.' },
    { kind: 'awaitSquares', from: sq(0, 0), count: 12, text: 'Kalenin tüm hedeflerini işaretle.' },
    { kind: 'awaitMove', accept: [{ from: sq(0, 0), to: sq(0, 5) }], text: 'Kaleyi uzağa, altıncı sıraya sür.' },
    { kind: 'quiz', question: 'Kale taşın üzerinden atlar mı?', options: ['Atlar', 'Atlayamaz'], correctIndex: 1, explanation: 'Kale kayar, üzerinden atlayamaz.' },
    { kind: 'say', text: 'Açık hatlar kalenin av sahasıdır.' },
    { kind: 'finish', text: 'Kale hattı senin elinde, aferin.', xp: 25 },
  ],
};

const NSQ = sq(5, 5);
const lesson14: GuidedLesson = {
  id: '1.4',
  level: 1,
  title: 'At (Knight)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: NSQ, side: 'white', kind: PieceKind.Knight },
      { square: sq(0, 1), side: 'white', kind: PieceKind.Rook },
    ],
  },
  orientation: 'white',
  xp: 25,
  steps: [
    { kind: 'say', text: 'At iki düz bir dik sıçrar.' },
    {
      kind: 'showGeometry',
      square: NSQ,
      text: 'Yaylar sıçramayı gösterir, ara taş engellemez.',
      phases: [
        { label: 'Atın tüm varış kareleri bunlar.', reveal: { of: 'destinations' } },
        { label: 'Bu koldaki hedeflere bak.', reveal: { of: 'direction', dx: 1, dy: 1 } },
      ],
    },
    { kind: 'compare', left: NSQ, right: sq(0, 1), text: 'At sıçrar, Kale kayar. Farkı gör.' },
    { kind: 'awaitMove', accept: [{ from: NSQ, to: sq(7, 6) }], text: 'Atı sağ yukarıdaki hedefe sıçrat.' },
    { kind: 'awaitSquare', accept: [sq(6, 7)], text: 'Atın başka bir hedefine dokun.' },
    { kind: 'quiz', question: 'At ara taşa takılır mı?', options: ['Takılır', 'Takılmaz'], correctIndex: 1, explanation: 'At sıçrar, aradaki taşa takılmaz.' },
    { kind: 'finish', text: 'Süvari oldun, rozet senin.', xp: 25, badge: 'Tahta ve Temel Süvari Rozeti' },
  ],
};

export const LEVEL1_LESSONS: GuidedLesson[] = [lesson11, lesson12, lesson13, lesson14];
