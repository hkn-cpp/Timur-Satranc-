/**
 * Seviye 5 dersleri (Emir, 300 × 4, narrative).
 */
import { PieceKind } from '../../../core/position/Position';
import type { GuidedLesson } from '../types';

function sq(col: number, row: number): number {
  return row * 11 + col;
}

const WK = sq(4, 0);
const BK = sq(0, 9);

function basePieces(extra: { square: number; side: 'white' | 'black'; kind: PieceKind; pawnOf?: PieceKind }[] = []) {
  return {
    kind: 'pieces' as const,
    sideToMove: 'white' as const,
    pieces: [
      { square: WK, side: 'white' as const, kind: PieceKind.King },
      { square: BK, side: 'black' as const, kind: PieceKind.King },
      ...extra,
    ],
  };
}

const lesson51: GuidedLesson = {
  id: '5.1',
  level: 5,
  title: '1. Terfi (Bekleme Aşaması)',
  mode: 'narrative',
  startPosition: basePieces([{ square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn }]),
  stagingNote: 'Bekleme durumu motorda yok; anlatım ghost ile yapılır.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Piyadelerin Piyadesi sona vardı.' },
    { kind: 'show', text: 'Kenarda bekler, kimse dokunamaz.', annotate: [{ kind: 'square', square: sq(5, 8), tone: 'focus' }, { kind: 'ghost', square: sq(5, 9), side: 'white', piece: PieceKind.Pawn }] },
    { kind: 'quiz', question: 'Piyade taşa dönüşür mü?', options: ['Dönüşür', 'Bekler'], correctIndex: 1, explanation: 'İlk varışta bekler, dönüşmez.' },
    { kind: 'quiz', question: 'Bekleyen taşa vurulur mu?', options: ['Vurulur', 'Dokunulmaz'], correctIndex: 1, explanation: 'Bekleyen Piyade dokunulmazdır.' },
    { kind: 'say', text: 'Sabret, döngü daha yeni başlıyor.' },
    { kind: 'say', text: 'Sıradaki ders çatalı anlatır.' },
    { kind: 'finish', text: 'Bekleme aşaması tamam.', xp: 300 },
  ],
};

const lesson52: GuidedLesson = {
  id: '5.2',
  level: 5,
  title: 'Taktik Çatal Işınlanması',
  mode: 'narrative',
  startPosition: basePieces([
    { square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn },
    { square: sq(2, 6), side: 'black', kind: PieceKind.Rook },
    { square: sq(4, 6), side: 'black', kind: PieceKind.Knight },
  ]),
  stagingNote: 'Işınlama motorda yok; teleport demo ile ghost belirir, taş oynamaz.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'İki taşı birden görecek kare var.' },
    { kind: 'show', text: 'Altın kare çatalın kurulacağı yerdir.', annotate: [{ kind: 'square', square: sq(3, 7), tone: 'citadel' }] },
    { kind: 'teleport', mode: 'demo', ghostTo: sq(3, 7), text: 'Piyade çatal karesinde belirir.' },
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
  mode: 'narrative',
  startPosition: basePieces([{ square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn }]),
  stagingNote: 'Orijin karesi motorda yok; anlatım ghost ile yapılır.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Piyade ikinci kez sona vardı.' },
    { kind: 'show', text: 'Hayalet yolu orijine dönüşü gösterir.', annotate: [{ kind: 'square', square: sq(5, 8), tone: 'focus' }, { kind: 'ghost', square: sq(5, 2), side: 'white', piece: PieceKind.Pawn }] },
    { kind: 'quiz', question: 'Piyade nereye döner?', options: ['Başlangıca', 'Kenara'], correctIndex: 0, explanation: 'Kendi başlangıç karesine döner.' },
    { kind: 'quiz', question: 'Yürüyüş nasıl sürer?', options: ['Sıfırdan', 'Kaldığı yerden'], correctIndex: 0, explanation: 'Sıfırdan yeniden yürür.' },
    { kind: 'say', text: 'İkinci tur sabır ister.' },
    { kind: 'say', text: 'Son durak Yedek Şah tacıdır.' },
    { kind: 'finish', text: 'Orijine dönüş tamam.', xp: 300 },
  ],
};

const lesson54: GuidedLesson = {
  id: '5.4',
  level: 5,
  title: '3. Terfi (Yedek Şah / Masnu’a)',
  mode: 'narrative',
  startPosition: basePieces([{ square: sq(5, 8), side: 'white', kind: PieceKind.Pawn, pawnOf: PieceKind.Pawn }]),
  stagingNote: 'Masnu’a PieceKind içinde yok; anlatım metin ve ghost ile yapılır.',
  orientation: 'white',
  xp: 300,
  steps: [
    { kind: 'say', text: 'Üçüncü varışta unvan gelir.' },
    { kind: 'show', text: 'Masnu’a Şah gibi gider, hisarı kilitler.', annotate: [{ kind: 'square', square: sq(5, 8), tone: 'focus' }, { kind: 'ghost', square: sq(5, 9), side: 'white', piece: PieceKind.King }] },
    { kind: 'quiz', question: 'Masnu’a nasıl gider?', options: ['Şah gibi', 'Kale gibi'], correctIndex: 0, explanation: 'Masnu’a Şah gibi her yöne gider.' },
    { kind: 'quiz', question: 'Özel gücü nedir?', options: ['Hisar kilidi', 'Çift adım'], correctIndex: 0, explanation: 'Kendi hisarını kilitleme gücü vardır.' },
    { kind: 'say', text: 'Döngü tamamlandı, taç senin.' },
    { kind: 'finish', text: 'Emir oldun, mühür senin.', xp: 300, badge: 'Çatal Işınlama Mührü' },
  ],
};

export const LEVEL5_LESSONS: GuidedLesson[] = [lesson51, lesson52, lesson53, lesson54];
