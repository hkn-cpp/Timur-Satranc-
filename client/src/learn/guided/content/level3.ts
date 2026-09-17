/**
 * Seviye 3 dersleri (Bahadır, 100 × 5).
 * Zürafa ara fazları (firstStep/ride) motorda doğrulanamadığı için
 * destinations + direction ile anlatılır (Bölüm 5 uyarısı).
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);
const CSQ = sq(5, 5);

const lesson31: GuidedLesson = {
  id: '3.1',
  level: 3,
  title: 'Fil (Elephant)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: CSQ, side: 'white', kind: PieceKind.Alfil },
    ],
  },
  orientation: 'white',
  xp: 100,
  steps: [
    { kind: 'say', text: 'Fil çapraz tam iki kare sıçrar.' },
    {
      kind: 'showGeometry',
      square: CSQ,
      text: 'Yay sıçramayı gösterir, aradaki taş engellemez.',
      phases: [
        { label: 'Filin dört hedefi bunlar.', reveal: { of: 'destinations' } },
        { label: 'Bu koldaki hedefe bak.', reveal: { of: 'direction', dx: 1, dy: 1 } },
      ],
    },
    { kind: 'awaitSquares', from: CSQ, count: 4, text: 'Filin dört hedefini işaretle.' },
    { kind: 'expectRejection', text: 'Fili bir kare çapraza sürmeyi dene.', attempt: { from: CSQ, to: sq(6, 6) }, explanation: 'İşte bu. Fil bir gidemez, tam iki sıçrar.' },
    { kind: 'quiz', question: 'Fil aradaki taşa takılır mı?', options: ['Takılır', 'Takılmaz'], correctIndex: 1, explanation: 'Fil sıçrar, aradaki taşa takılmaz.' },
    { kind: 'say', text: 'Fil tek renk karesine bağlıdır.' },
    { kind: 'finish', text: 'Fil hesabı tamam, aferin.', xp: 100 },
  ],
};

const lesson32: GuidedLesson = {
  id: '3.2',
  level: 3,
  title: 'Mancınık (WarEngine)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: CSQ, side: 'white', kind: PieceKind.Dabbaba },
    ],
  },
  orientation: 'white',
  xp: 100,
  steps: [
    { kind: 'say', text: 'Mancınık düz yönde tam iki sıçrar.' },
    {
      kind: 'showGeometry',
      square: CSQ,
      text: 'Siper arkasına düşer, öndeki taşı yok sayar.',
      phases: [
        { label: 'Mancınığın dört hedefi bunlar.', reveal: { of: 'destinations' } },
        { label: 'Bu koldaki hedefe bak.', reveal: { of: 'direction', dx: 0, dy: 1 } },
      ],
    },
    { kind: 'awaitMove', accept: [{ from: CSQ, to: sq(5, 7) }], text: 'Mancınığı iki kare ileri fırlat.' },
    { kind: 'expectRejection', text: 'Mancınığı bir kare sürmeyi dene.', attempt: { from: CSQ, to: sq(5, 6) }, explanation: 'İşte bu. Mancınık bir gidemez, tam iki sıçrar.' },
    { kind: 'quiz', question: 'Mancınık nasıl gider?', options: ['Tam iki düz', 'Bir düz', 'Kayarak'], correctIndex: 0, explanation: 'Mancınık düz yönde tam iki sıçrar.' },
    { kind: 'say', text: 'Siper arkası vuruşlar seni öne taşır.' },
    { kind: 'finish', text: 'Mancınık hesabı tamam, aferin.', xp: 100 },
  ],
};

const lesson33: GuidedLesson = {
  id: '3.3',
  level: 3,
  title: 'Deve (Camel)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: CSQ, side: 'white', kind: PieceKind.Camel },
      { square: sq(1, 1), side: 'white', kind: PieceKind.Knight },
    ],
  },
  orientation: 'white',
  xp: 100,
  steps: [
    { kind: 'say', text: 'Deve üç düz bir dik geniş sıçrar.' },
    {
      kind: 'showGeometry',
      square: CSQ,
      text: 'Derin hatlara çatal atar, engel tanımaz.',
      phases: [
        { label: 'Devenin hedefleri bunlar.', reveal: { of: 'destinations' } },
        { label: 'Bu koldaki hedefe bak.', reveal: { of: 'direction', dx: 1, dy: 1 } },
      ],
    },
    { kind: 'compare', left: CSQ, right: sq(1, 1), text: 'Deve geniştir, At dardır. Farkı gör.' },
    { kind: 'awaitMove', accept: [{ from: CSQ, to: sq(8, 6) }], text: 'Deveyi sağdaki derin hedefe sıçrat.' },
    { kind: 'awaitSquare', accept: [sq(6, 8)], text: 'Devenin başka bir hedefine dokun.' },
    { kind: 'quiz', question: 'Deve ara taşa takılır mı?', options: ['Takılır', 'Takılmaz'], correctIndex: 1, explanation: 'Deve sıçrar, üzerinden atlar.' },
    { kind: 'finish', text: 'Derin çatal hazır, aferin.', xp: 100 },
  ],
};

const PSQ = sq(5, 5);
const lesson34: GuidedLesson = {
  id: '3.4',
  level: 3,
  title: 'Nöbetçi (Picket)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: PSQ, side: 'white', kind: PieceKind.Picket },
    ],
  },
  stagingNote: 'setPosition ile geçiş karesi dolu varyant; tahta dersi göstermek için kuruldu.',
  orientation: 'white',
  xp: 100,
  steps: [
    { kind: 'say', text: 'Nöbetçi çapraz kayar, en az iki gider.' },
    { kind: 'showMoves', square: PSQ, distinguishPath: true, text: 'Turuncu geçilir, yeşil durulur.' },
    {
      kind: 'showGeometry',
      square: PSQ,
      text: 'Ara kareler geçilir ama durulamaz.',
      phases: [
        { label: 'Nöbetçinin hedefleri bunlar.', reveal: { of: 'destinations' } },
        { label: 'Turuncu kareler yalnız geçilir.', reveal: { of: 'path' } },
      ],
    },
    { kind: 'setPosition', text: 'Bu tahtayı dersi göstermek için kurdum.', position: { kind: 'pieces', sideToMove: 'white', pieces: [{ square: WK, side: 'white', kind: PieceKind.King }, { square: BK, side: 'black', kind: PieceKind.King }, { square: PSQ, side: 'white', kind: PieceKind.Picket }, { square: sq(4, 4), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook }] } },
    { kind: 'awaitMove', accept: [{ from: PSQ, to: sq(7, 7) }], text: 'Nöbetçiyi iki kare çapraza kaydır.' },
    { kind: 'expectRejection', text: 'Nöbetçiyi bir kare sürmeyi dene.', attempt: { from: PSQ, to: sq(6, 6) }, explanation: 'İşte bu. Nöbetçi bir gidemez, en az iki.' },
    { kind: 'quiz', question: 'Nöbetçi sıçrar mı?', options: ['Sıçrar', 'Kayarak gider'], correctIndex: 1, explanation: 'Nöbetçi kayar, sıçrayamaz.' },
    { kind: 'finish', text: 'En az iki kuralı tamam, aferin.', xp: 100 },
  ],
};

const GSQ = sq(5, 5);
const lesson35: GuidedLesson = {
  id: '3.5',
  level: 3,
  title: 'Zürafa (Giraffe)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: sq(0, 9), side: 'black', kind: PieceKind.King },
      { square: GSQ, side: 'white', kind: PieceKind.Giraffe },
    ],
  },
  stagingNote: 'setPosition ile çapraz adım karesi dolu varyant; tahta dersi göstermek için kuruldu.',
  orientation: 'white',
  xp: 100,
  steps: [
    { kind: 'say', text: 'Zürafa önce çapraz adım atar, sonra düz kayar.' },
    { kind: 'showMoves', square: GSQ, distinguishPath: true, text: 'Hibrit yol: adım artı en az üç kayış.' },
    {
      kind: 'showGeometry',
      square: GSQ,
      text: 'Önce varışlar, sonra tek kol detayı.',
      phases: [
        { label: 'Zürafanın tüm hedefleri bunlar.', reveal: { of: 'destinations' } },
        { label: 'Bu koldaki hedeflere bak.', reveal: { of: 'direction', dx: 1, dy: 1 } },
      ],
    },
    { kind: 'setPosition', text: 'Bu tahtayı dersi göstermek için kurdum.', position: { kind: 'pieces', sideToMove: 'white', pieces: [{ square: WK, side: 'white', kind: PieceKind.King }, { square: sq(0, 9), side: 'black', kind: PieceKind.King }, { square: GSQ, side: 'white', kind: PieceKind.Giraffe }, { square: sq(6, 6), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook }] } },
    { kind: 'awaitSquares', from: GSQ, count: 10, text: 'Zürafanın hedeflerini işaretle.' },
    { kind: 'expectRejection', text: 'Zürafayı iki kare düz sürmeyi dene.', attempt: { from: GSQ, to: sq(5, 7) }, explanation: 'İşte bu. Önce çapraz adım şarttır.' },
    { kind: 'quiz', question: 'Zürafa sıçrar mı?', options: ['Sıçrar', 'Yolu açık olmalı'], correctIndex: 1, explanation: 'Zürafa sıçrayamaz, yolu açık olmalı.' },
    { kind: 'finish', text: 'Akıncı oldun, nişan senin.', xp: 100, badge: 'Zürafa & Sıçrayıcılar Nişanı' },
  ],
};

export const LEVEL3_LESSONS: GuidedLesson[] = [lesson31, lesson32, lesson33, lesson34, lesson35];
