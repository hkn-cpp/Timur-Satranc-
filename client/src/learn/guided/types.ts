/**
 * Rehberli ders veri modeli (Bölüm 5).
 * Kanonik tipler yalnızca yeni çekirdekten: SquareIndex, Side, PieceKind,
 * Position, Move. Legacy satranç tipleri bu modülde import edilmez (yasak).
 */
import type { SquareIndex, Side, PieceKind } from '../../core/position/Position';

export type { SquareIndex, Side, PieceKind };

/** Ders dosyasında hamle referansı (generateLegalMoves çıktısıyla eşleşir). */
export interface MoveRef {
  from: SquareIndex;
  to: SquareIndex;
  /** Terfi temsilîdir (seçim yok). Yalnızca beklenen sonucu doğrulamak için. */
  expectPromotion?: PieceKind;
}

export interface PlacedPiece {
  square: SquareIndex;
  side: Side;
  kind: PieceKind;
  /** Yalnızca kind === Pawn için (Ders 4.2'nin 11 kimlikli konumu). */
  pawnOf?: PieceKind;
  /** Piyadelerin Piyadesi döngü kademesi. TANIMSIZ = sıradan piyade. */
  promotionStage?: number;
}

/** Ders konumu. Açılış dizilimi olmak ZORUNDA DEĞİLDİR. */
export type PositionRef =
  | { kind: 'serialized'; data: string }
  | {
      kind: 'pieces';
      sideToMove: Side;
      pieces: PlacedPiece[];
      kingSwapUsed?: { white: boolean; black: boolean };
    };

/** showGeometry fazlarının hangi kare kümesini açacağı (ASLA elle yazılmaz). */
export type GeometryReveal =
  | { of: 'destinations' }
  | { of: 'path' }
  | { of: 'direction'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { of: 'firstStep' }
  | { of: 'ride' };

export interface GeometryPhase {
  /** Koç metni, <= 110 karakter. */
  label: string;
  reveal: GeometryReveal;
  holdMs?: number;
}

export type Tone = 'good' | 'bad' | 'focus' | 'neutral';

export type Annotation =
  | { kind: 'square'; square: SquareIndex; tone: Tone | 'citadel' }
  | { kind: 'path'; square: SquareIndex }
  | { kind: 'destination'; square: SquareIndex }
  | { kind: 'slide'; from: SquareIndex; to: SquareIndex; tone: Tone }
  | { kind: 'leap'; from: SquareIndex; to: SquareIndex; tone: Tone }
  | { kind: 'ghost'; square: SquareIndex; side: Side; piece: PieceKind }
  | { kind: 'badge'; square: SquareIndex; figure: PieceKind }
  | { kind: 'coords'; visible: boolean }
  | { kind: 'seal'; square: SquareIndex; label: string };

export type GuidedStep =
  | { kind: 'say'; text: string; annotate?: Annotation[] }
  | { kind: 'show'; text?: string; annotate: Annotation[]; holdMs?: number }
  | { kind: 'showMoves'; square: SquareIndex; text?: string; distinguishPath?: boolean }
  | { kind: 'showGeometry'; square: SquareIndex; phases: GeometryPhase[]; text?: string }
  | { kind: 'compare'; left: SquareIndex; right: SquareIndex; text: string }
  | { kind: 'play'; move: MoveRef; text?: string }
  | { kind: 'awaitMove'; accept: MoveRef[]; text: string; onWrong?: string; hintAfter?: number }
  | { kind: 'awaitSquare'; accept: SquareIndex[]; text: string; onWrong?: string }
  | { kind: 'awaitSquares'; from: SquareIndex; count: number; text: string; onWrong?: string }
  | { kind: 'expectRejection'; text: string; attempt: MoveRef; explanation: string; fallbackAfterMs?: number }
  | { kind: 'quiz'; question: string; options: string[]; correctIndex: number; explanation: string }
  | { kind: 'teleport'; mode: 'demo'; ghostTo: SquareIndex; text: string }
  | { kind: 'awaitSwap'; text: string; onWrong?: string }
  | { kind: 'setPosition'; position: PositionRef; text?: string }
  | { kind: 'finish'; text: string; xp: number; badge?: string };

export interface GuidedLesson {
  /** "3.5" gibi ders kodu — learnContent.ts ile BİREBİR. */
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** learnContent.ts'teki başlık, BİREBİR. */
  title: string;
  mode: 'interactive' | 'narrative';
  startPosition: PositionRef;
  /** Yalnızca geliştirici notu, kullanıcıya gösterilmez. */
  stagingNote?: string;
  orientation: Side;
  steps: GuidedStep[];
  /** finish.xp ile AYNI değer (seviye dağılımı). */
  xp: number;
  /** Yalnızca seviyenin SON dersinde dolu. */
  badge?: string;
}
