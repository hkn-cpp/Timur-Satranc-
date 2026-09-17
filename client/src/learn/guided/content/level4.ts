/**
 * Seviye 4 dersleri (Yüzbaşı, 200 × 4).
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(4, 9);

const lesson41: GuidedLesson = {
  id: '4.1',
  level: 4,
  title: 'Piyade Adımları',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 2), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook },
      { square: sq(4, 2), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Knight },
      { square: sq(6, 3), side: 'black', kind: PieceKind.Pawn, pawnOf: PieceKind.Ferz },
    ],
  },
  orientation: 'white',
  xp: 200,
  steps: [
    { kind: 'say', text: 'Piyade bir yürür, çapraz alır.' },
    { kind: 'showMoves', square: sq(5, 2), text: 'Düz bir, çapraz alma. Hepsi bu.' },
    { kind: 'awaitMove', accept: [{ from: sq(5, 2), to: sq(6, 3) }], text: 'Piyade ile çaprazdaki taşı al.' },
    { kind: 'expectRejection', text: 'Piyadeyi iki kare sürmeyi dene.', attempt: { from: sq(4, 2), to: sq(4, 4) }, explanation: 'İşte bu. Çift adım yoktur, hep tek tempo.' },
    { kind: 'expectRejection', text: 'Piyadeyi boş çapraza sürmeyi dene.', attempt: { from: sq(4, 2), to: sq(5, 3) }, explanation: 'İşte bu. Çapraz yalnız taş varsa, geçerken alma yok.' },
    { kind: 'quiz', question: 'Piyade nasıl yürür?', options: ['Bir düz', 'İki düz', 'Geri'], correctIndex: 0, explanation: 'Piyade daima bir kare düz yürür.' },
    { kind: 'say', text: 'Tek tempo zincirleri oyunu taşır.' },
    { kind: 'finish', text: 'Piyade temposu tamam, aferin.', xp: 200 },
  ],
};

const lesson42: GuidedLesson = {
  id: '4.2',
  level: 4,
  title: 'Temsilî Terfi İlkesi',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(0, 0), side: 'white', kind: PieceKind.King },
      { square: sq(5, 5), side: 'black', kind: PieceKind.King },
      { square: sq(0, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook },
      { square: sq(1, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Knight },
      { square: sq(2, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Picket },
      { square: sq(3, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Giraffe },
      { square: sq(4, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.General },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.King },
      { square: sq(6, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Ferz },
      { square: sq(7, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Alfil },
      { square: sq(8, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Camel },
      { square: sq(9, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Dabbaba },
      { square: sq(10, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn },
      { square: sq(10, 1), side: 'black', kind: PieceKind.Pawn, pawnOf: PieceKind.Rook },
    ],
  },
  stagingNote: '11 kimlikli sahnelenmiş konum; tahta dersi göstermek için kuruldu. K4 testiyle kanıtlı.',
  orientation: 'white',
  xp: 200,
  steps: [
    { kind: 'say', text: 'Her Piyade kendi figürüne dönüşür.' },
    { kind: 'say', text: 'Bu tahtayı dersi göstermek için kurdum.' },
    {
      kind: 'show',
      text: 'Rozetler kimin kime dönüşeceğini söyler.',
      annotate: [
        { kind: 'badge', square: sq(0, 8), figure: PieceKind.Rook },
        { kind: 'badge', square: sq(5, 8), figure: PieceKind.King },
        { kind: 'badge', square: sq(10, 8), figure: PieceKind.Pawn },
      ],
    },
    { kind: 'play', move: { from: sq(0, 8), to: sq(0, 9), expectPromotion: PieceKind.Rook }, text: 'Kale Piyadesi son sıraya vardı.' },
    { kind: 'awaitMove', accept: [{ from: sq(10, 1), to: sq(10, 0) }], text: 'Siyah Piyadeyi son sıraya sür.' },
    { kind: 'expectRejection', text: 'Piyadeyi boş çapraza sürmeyi dene.', attempt: { from: sq(3, 8), to: sq(4, 9) }, explanation: 'İşte bu. Seçim yok, yalnız kendi figürüne.' },
    { kind: 'quiz', question: 'Terfide figür seçilir mi?', options: ['Seçilir', 'Seçilmez'], correctIndex: 1, explanation: 'Temsilî terfi: yalnız kendi figürüne.' },
    { kind: 'finish', text: 'Temsil kuralı tamam, aferin.', xp: 200 },
  ],
};

const lesson43: GuidedLesson = {
  id: '4.3',
  level: 4,
  title: 'Şehzade Kuralı (Prince Rule)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: sq(0, 9), side: 'black', kind: PieceKind.King },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.King },
      { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
    ],
  },
  orientation: 'white',
  xp: 200,
  steps: [
    { kind: 'say', text: 'Şah Piyadesi sona varmak üzere.' },
    { kind: 'show', text: 'Son sıradaki boş kareye dikkat et.', annotate: [{ kind: 'square', square: sq(5, 9), tone: 'focus' }] },
    { kind: 'play', move: { from: sq(5, 8), to: sq(5, 9), expectPromotion: PieceKind.Prince }, text: 'Piyade Şehzade olarak doğdu.' },
    { kind: 'say', text: 'Şehzade Şah gibi her yöne gider.' },
    { kind: 'quiz', question: 'Şah Piyadesi ne olur?', options: ['Şah', 'Şehzade'], correctIndex: 1, explanation: 'Şah Piyadesi Şehzade olarak girer.' },
    { kind: 'awaitSquare', accept: [sq(10, 9)], text: 'Siyah Kalenin karesine dokun.' },
    { kind: 'quiz', question: 'Şehzade nasıl gider?', options: ['Şah gibi', 'Kale gibi'], correctIndex: 0, explanation: 'Şehzade Şah gibi her yöne gider.' },
    { kind: 'finish', text: 'Şehzade doğdu, aferin.', xp: 200 },
  ],
};

const lesson44: GuidedLesson = {
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
      { square: sq(6, 1), side: 'white', kind: PieceKind.Prince },
    ],
  },
  stagingNote: 'Motor Şehzadeyi royal saymaz; anlatım ghost ile yapılır.',
  orientation: 'white',
  xp: 200,
  steps: [
    { kind: 'say', text: 'Artık iki hükümdarın var.' },
    { kind: 'show', text: 'Şah ve Şehzade yan yana durur.', annotate: [{ kind: 'square', square: WK, tone: 'focus' }, { kind: 'square', square: sq(6, 1), tone: 'good' }] },
    { kind: 'quiz', question: 'Şah giderse oyun biter mi?', options: ['Bitmez', 'Biter'], correctIndex: 0, explanation: 'Şehzade varken mücadele sürer.' },
    { kind: 'quiz', question: 'Rakip ne yapmalı?', options: ['İkisini de almalı', 'Biri yeter'], correctIndex: 0, explanation: 'İki hükümdar da bertaraf edilmeli.' },
    { kind: 'show', text: 'Hayalet ikinci cephenin yönünü gösterir.', annotate: [{ kind: 'ghost', square: sq(6, 3), side: 'white', piece: PieceKind.Prince }] },
    { kind: 'say', text: 'Çift cephe kur, kayıp oyunu çevir.' },
    { kind: 'finish', text: 'Çift hükümdar tamam, tac senin.', xp: 200, badge: 'Temsili Terfi & Şehzade Tacı' },
  ],
};

export const LEVEL4_LESSONS: GuidedLesson[] = [lesson41, lesson42, lesson43, lesson44];
