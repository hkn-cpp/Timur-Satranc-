/**
 * Seviye 5 dersleri (Emir, 300 × 4, interactive — v3 motoru destekler).
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(0, 9);

const lesson51: GuidedLesson = {
  id: '5.1',
  level: 5,
  title: '1. Terfi (Bekleme Aşaması)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn },
      { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'v3: 1. varış beklemesi play adımıyla yaşatılır.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Piyadelerin Piyadesi sona vardı.' },
    { kind: 'play', move: { from: sq(5, 8), to: sq(5, 9), expectPromotion: PieceKind.Pawn }, text: 'Piyade son sırada beklemeye geçti.' },
    { kind: 'show', text: 'Bekleyen kareye kimse giremez.', annotate: [{ kind: 'square', square: sq(5, 9), tone: 'focus' }] },
    { kind: 'quiz', question: 'Piyade taşa dönüşür mü?', options: ['Dönüşür', 'Bekler'], correctIndex: 1, explanation: 'İlk varışta bekler, dönüşmez.' },
    { kind: 'quiz', question: 'Bekleyen taşa vurulur mu?', options: ['Vurulur', 'Dokunulmaz'], correctIndex: 1, explanation: 'Bekleyen Piyade dokunulmazdır.' },
    { kind: 'awaitMove', accept: [{ from: sq(10, 9), to: sq(10, 8) }], text: 'Siyah Kale ile bir kare ilerle.' },
    { kind: 'say', text: 'Sabret, döngü daha yeni başlıyor.' },
    { kind: 'finish', text: 'Bekleme aşaması tamam.', xp: 300 },
  ],
};

const lesson52: GuidedLesson = {
  id: '5.2',
  level: 5,
  title: 'Taktik Çatal Işınlanması',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn },
      { square: sq(3, 7), kind: PieceKind.Rook, side: 'black' },
      { square: sq(5, 7), kind: PieceKind.Knight, side: 'black' },
    ],
  },
  stagingNote: 'v3: bekleme play ile kurulur, ışınlanma awaitMove ile oynanır (4,6 çoklu çatal).',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Önce Piyade son sırada beklemeye geçsin.' },
    { kind: 'play', move: { from: sq(5, 8), to: sq(5, 9), expectPromotion: PieceKind.Pawn }, text: 'Piyade beklemeye geçti.' },
    { kind: 'play', move: { from: BK, to: sq(1, 9) }, text: 'Rakip Şahı kenara çekildi.' },
    { kind: 'awaitMove', accept: [{ from: sq(5, 9), to: sq(4, 6) }], text: 'Piyadeyi çatal karesine ışınla.' },
    { kind: 'quiz', question: 'Piyade oraya nasıl gider?', options: ['Yürür', 'Işınlanır'], correctIndex: 1, explanation: 'Çatal karesine doğrudan ışınlanır.' },
    { kind: 'quiz', question: 'Çatal ne demek?', options: ['İki tehdit', 'Tek tehdit'], correctIndex: 0, explanation: 'Çatal iki taşı aynı anda ister.' },
    { kind: 'say', text: 'Ağır taşları böyle avlarsın.' },
    { kind: 'finish', text: 'Çatal ışınlama tamam.', xp: 300 },
  ],
};

const lesson53: GuidedLesson = {
  id: '5.3',
  level: 5,
  title: '2. Terfi (Orijine Dönüş)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn, promotionStage: 1 },
      { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'v3: 2. varış orijine (5,2) döndürür.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Piyade ikinci kez sona vardı.' },
    { kind: 'play', move: { from: sq(5, 8), to: sq(5, 9), expectPromotion: PieceKind.Pawn }, text: 'Piyade orijine döndü.' },
    { kind: 'show', text: 'Başlangıç karesinden yeniden yürür.', annotate: [{ kind: 'square', square: sq(5, 2), tone: 'focus' }] },
    { kind: 'quiz', question: 'Piyade nereye döner?', options: ['Başlangıca', 'Kenara'], correctIndex: 0, explanation: 'Kendi başlangıç karesine döner.' },
    { kind: 'quiz', question: 'Yürüyüş nasıl sürer?', options: ['Sıfırdan', 'Kaldığı yerden'], correctIndex: 0, explanation: 'Sıfırdan yeniden yürür.' },
    { kind: 'awaitMove', accept: [{ from: sq(10, 9), to: sq(10, 8) }], text: 'Siyah Kale ile bir kare ilerle.' },
    { kind: 'finish', text: 'Orijine dönüş tamam.', xp: 300 },
  ],
};

const lesson54: GuidedLesson = {
  id: '5.4',
  level: 5,
  title: '3. Terfi (Maceracı Şah)',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: WK, side: 'white', kind: PieceKind.King },
      { square: BK, side: 'black', kind: PieceKind.King },
      { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn, promotionStage: 2 },
      { square: sq(10, 9), side: 'black', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'v3: 3. varış Maceracı Şah üretir.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Üçüncü varışta unvan gelir.' },
    { kind: 'play', move: { from: sq(5, 8), to: sq(5, 9), expectPromotion: PieceKind.AdventurousKing }, text: 'Maceracı Şah doğdu.' },
    { kind: 'show', text: 'Maceracı Şah gibi gider, hisarı kilitler.', annotate: [{ kind: 'square', square: sq(5, 9), tone: 'focus' }] },
    { kind: 'quiz', question: 'Maceracı Şah nasıl gider?', options: ['Şah gibi', 'Kale gibi'], correctIndex: 0, explanation: 'Maceracı Şah gibi her yöne gider.' },
    { kind: 'quiz', question: 'Özel gücü nedir?', options: ['Hisar kilidi', 'Çift adım'], correctIndex: 0, explanation: 'Kendi hisarını kilitleme gücü vardır.' },
    { kind: 'awaitMove', accept: [{ from: sq(10, 9), to: sq(10, 8) }], text: 'Siyah Kale ile bir kare ilerle.' },
    { kind: 'finish', text: 'Emir oldun, mühür senin.', xp: 300, badge: 'Çatal Işınlama Mührü' },
  ],
};

export const LEVEL5_LESSONS: GuidedLesson[] = [lesson51, lesson52, lesson53, lesson54];
