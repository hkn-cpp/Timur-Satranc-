/**
 * Seviye 6 dersleri (Noyan, 360 × 5).
 * 6.1 konumu Şahın gerçekten tehdit altında olduğu şekilde sahnelendi.
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const lesson61: GuidedLesson = {
  id: '6.1',
  level: 6,
  title: 'Şah Takası Manevrası',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(5, 5), side: 'white', kind: PieceKind.King },
      { square: sq(10, 9), side: 'black', kind: PieceKind.King },
      { square: sq(5, 0), side: 'black', kind: PieceKind.Rook },
      { square: sq(2, 2), side: 'white', kind: PieceKind.Knight },
      { square: sq(7, 7), side: 'white', kind: PieceKind.Camel },
      { square: sq(9, 1), side: 'white', kind: PieceKind.Alfil },
    ],
  },
  stagingNote: 'Şah siyah Kale tehdidi altında; tahta dersi göstermek için kuruldu.',
  orientation: 'white',
  xp: 360,
  steps: [
    { kind: 'say', text: 'Şahın tehdit altında, tek hakkın var.' },
    { kind: 'show', text: 'Kale hattı Şahı görüyor, kaçış gerek.', annotate: [{ kind: 'square', square: sq(5, 5), tone: 'bad' }, { kind: 'square', square: sq(5, 0), tone: 'focus' }] },
    { kind: 'awaitSwap', text: 'Dost bir taşla yer değiştir.' },
    { kind: 'say', text: 'Takas hakkı maçta bir kez kullanılır.' },
    { kind: 'quiz', question: 'Takas kaç kez yapılır?', options: ['Bir', 'Sınırsız'], correctIndex: 0, explanation: 'Şah Takası maçta bir kez yapılır.' },
    { kind: 'awaitSquare', accept: [sq(5, 5)], text: 'Şahın eski karesine dokun.' },
    { kind: 'say', text: 'Hakkını son ana sakla.' },
    { kind: 'finish', text: 'Takas manevrası tamam.', xp: 360 },
  ],
};

const lesson62: GuidedLesson = {
  id: '6.2',
  level: 6,
  title: 'Hisar Beraberliği',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(0, 7), side: 'white', kind: PieceKind.King },
      { square: sq(10, 9), side: 'black', kind: PieceKind.King },
      { square: sq(5, 5), side: 'black', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'Ezilmiş tarafın Şahı hisara iki hamle uzakta; tahta dersi göstermek için kuruldu.',
  orientation: 'white',
  xp: 360,
  steps: [
    { kind: 'say', text: 'Ordun eridi ama sığınak var.' },
    { kind: 'show', text: 'Altın cep rakip hisardır, hedef orası.', annotate: [{ kind: 'square', square: 110, tone: 'citadel' }] },
    { kind: 'play', move: { from: sq(0, 7), to: sq(0, 8) }, text: 'Şah hisara bir adım yaklaştı.' },
    { kind: 'play', move: { from: sq(5, 5), to: sq(5, 6) }, text: 'Rakip baskıyı sürdürüyor.' },
    { kind: 'awaitMove', accept: [{ from: sq(0, 8), to: 110 }], text: 'Şahı hisar cebine sok.' },
    { kind: 'show', text: 'Mühür vuruldu, oyun berabere bitti.', annotate: [{ kind: 'seal', square: 110, label: 'Berabere' }] },
    { kind: 'quiz', question: 'Hisara giren ne alır?', options: ['Beraberlik', 'Zafer'], correctIndex: 0, explanation: 'Rakip hisara giren berabere kalır.' },
    { kind: 'awaitSquare', accept: [sq(0, 9)], text: 'Şahın gidebildiği kareye dokun.' },
    { kind: 'finish', text: 'Sığınma yolu tamam.', xp: 360 },
  ],
};

const lesson63: GuidedLesson = {
  id: '6.3',
  level: 6,
  title: 'Hisar Kilitleme',
  mode: 'narrative',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(4, 0), side: 'white', kind: PieceKind.King },
      { square: sq(4, 9), side: 'black', kind: PieceKind.King },
    ],
  },
  stagingNote: 'Masnu’a PieceKind içinde yok; kilit ghost ile anlatılır.',
  orientation: 'white',
  xp: 360,
  steps: [
    { kind: 'say', text: 'Kendi hisarın kilitlenebilir.' },
    { kind: 'show', text: 'Altın cep yalnız bir figüre açılır.', annotate: [{ kind: 'square', square: 111, tone: 'citadel' }] },
    { kind: 'show', text: 'Hayalet kilidi vuran figürü gösterir.', annotate: [{ kind: 'ghost', square: 111, side: 'black', piece: PieceKind.King }] },
    { kind: 'quiz', question: 'Kendi hisarına kim girer?', options: ['Masnu’a', 'Şah'], correctIndex: 0, explanation: 'Yalnızca Masnu’a kendi hisarına girer.' },
    { kind: 'quiz', question: 'Kilit neyi kapatır?', options: ['Rakip sığınağı', 'Taş çıkışını'], correctIndex: 0, explanation: 'Rakip Şahın sığınma yolu kapanır.' },
    { kind: 'say', text: 'Kilidi erken kur, sığınağı kapat.' },
    { kind: 'finish', text: 'Kilitleme tamam.', xp: 360 },
  ],
};

const lesson64: GuidedLesson = {
  id: '6.4',
  level: 6,
  title: 'Pat ile Kesin Zafer',
  mode: 'interactive',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(2, 7), side: 'white', kind: PieceKind.King },
      { square: sq(0, 9), side: 'black', kind: PieceKind.King },
      { square: sq(1, 6), side: 'white', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'Pat ağı tek hamleyle kapanır; tahta dersi göstermek için kuruldu.',
  orientation: 'white',
  xp: 360,
  steps: [
    { kind: 'say', text: 'Rakibi hamlesiz bırak, oyunu al.' },
    { kind: 'show', text: 'Ağ kapanmak üzere, son kare boşta.', annotate: [{ kind: 'square', square: sq(1, 8), tone: 'focus' }] },
    { kind: 'awaitMove', accept: [{ from: sq(1, 6), to: sq(1, 8) }], text: 'Kale ile ağı kapat.' },
    { kind: 'expectRejection', text: 'Siyah Şahı oynatmayı dene.', attempt: { from: sq(0, 9), to: sq(0, 8) }, explanation: 'İşte bu. Hamlesi yok, pat burada zaferdir.' },
    { kind: 'quiz', question: 'Pat ne getirir?', options: ['Zafer', 'Beraberlik'], correctIndex: 0, explanation: 'Pat bırakan taraf kesin kazanır.' },
    { kind: 'say', text: 'Beraberlik bekleme, ağı kapat.' },
    { kind: 'finish', text: 'Pat zaferi tamam.', xp: 360 },
  ],
};

const lesson65: GuidedLesson = {
  id: '6.5',
  level: 6,
  title: 'Yalın Şah (Soyutlama) Zaferi',
  mode: 'narrative',
  startPosition: {
    kind: 'pieces',
    sideToMove: 'white',
    pieces: [
      { square: sq(4, 0), side: 'white', kind: PieceKind.King },
      { square: sq(4, 9), side: 'black', kind: PieceKind.King },
      { square: sq(0, 1), side: 'white', kind: PieceKind.Rook },
    ],
  },
  stagingNote: 'Yalın-şah dalı GameResult içinde yok; kural anlatımla verilir.',
  orientation: 'white',
  xp: 360,
  steps: [
    { kind: 'say', text: 'Rakip ordu eridi, Şah yalnız kaldı.' },
    { kind: 'show', text: 'Yapayalnız Şah tablonun ortasındadır.', annotate: [{ kind: 'square', square: sq(4, 9), tone: 'focus' }] },
    { kind: 'quiz', question: 'Yalın Şah ne demek?', options: ['Doğrudan zafer', 'Beraberlik'], correctIndex: 0, explanation: 'Şahı yalnız bırakan doğrudan kazanır.' },
    { kind: 'quiz', question: 'Nasıl başarılır?', options: ['Değişimlerle', 'Bekleyerek'], correctIndex: 0, explanation: 'Zorla değişimlerle ordu eritilir.' },
    { kind: 'say', text: 'Materyali değişimle zafere çevir.' },
    { kind: 'say', text: 'Noyan oldun, berat senin.' },
    { kind: 'finish', text: 'Usta Noyan oldun, kutlarım.', xp: 360, badge: 'Altın Hisar & Usta Noyan Sertifikası' },
  ],
};

export const LEVEL6_LESSONS: GuidedLesson[] = [lesson61, lesson62, lesson63, lesson64, lesson65];
