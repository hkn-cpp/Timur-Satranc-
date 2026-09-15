import type { SquareIndex, Side, PieceKind } from '../core/position/Position';
import type { Annotation } from './guidedAnnotations';
/* ---------- İçerik seviyesi yardımcı tipler ---------- */

/** Ders dosyasında hamle referansı. Çalışma anında generateLegalMoves()
 *  çıktısındaki bir Move ile eşleştirilir. Eşleşme bulunamazsa hata. */
export interface MoveRef {
  from: SquareIndex;
  to: SquareIndex;
  /** Terfi bu varyantta temsilîdir (seçim yok). Alan yalnızca doğrulama
   *  amaçlı beklenen sonucu yazmak için vardır, hamleyi belirlemez. */
  expectPromotion?: PieceKind;
}

export interface PlacedPiece {
  square: SquareIndex;
  side: Side;
  kind: PieceKind;
  /** Yalnızca kind === PieceKind.Pawn için: piyadenin temsil ettiği figür.
   *  Ders 4.2'nin 11 kimlikli sahnelenmiş konumu bu alanla kurulur. */
  pawnOf?: PieceKind;
  /** Piyadelerin Piyadesi döngü kademesi. TANIMSIZ = sıradan piyade
   *  (motor stage tanımlı her piyadeyi döngüye sokar; varsayılan 0 YAZILMAZ). */
  promotionStage?: number;
}

/** Ders konumu. Açılış dizilimi olmak ZORUNDA DEĞİLDİR (sahnelenmiş konum). */
export type PositionRef =
  /** Projenin mevcut konum serileştirmesi (Dizilim Editörü formatı). */
  | { kind: 'serialized'; data: string }
  /** Taş taş kurulan sahnelenmiş konum. Az taşla kurulur. */
  | {
      kind: 'pieces';
      sideToMove: Side;
      pieces: PlacedPiece[];
      /** Şah Takası hakkı durumu. Varsayılan ikisi de false. */
      kingSwapUsed?: { white: boolean; black: boolean };
    };

/** showGeometry fazlarının hangi kare kümesini açacağı. Küme ASLA elle
 *  yazılmaz; core/rules'un hamle üreticisinden türetilir. */
export type GeometryReveal =
  /** Tüm yasal varış kareleri. */
  | { of: 'destinations' }
  /** Geçilmesi zorunlu ama durulamayan ara kareler (kayıcılar). */
  | { of: 'path' }
  /** Tek bir doğrultudaki hedefler. */
  | { of: 'direction'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  /** Hibrit hareketin ilk adımı — yalnızca Zürafa (1 kare çapraz). */
  | { of: 'firstStep' }
  /** Hibrit hareketin kayış fazı — yalnızca Zürafa (min 3 kare düz). */
  | { of: 'ride' };

export interface GeometryPhase {
  /** Koç metni. <= 110 karakter. */
  label: string;
  reveal: GeometryReveal;
  holdMs?: number;
}

/* ---------- Adım tipleri ---------- */

export type GuidedStep =
  /** Koç konuşur, kullanıcı "Devam" der. */
  | { kind: 'say'; text: string; annotate?: Annotation[] }

  /** Tahtada işaret et, holdMs sonunda Devam aktifleşir. */
  | { kind: 'show'; text?: string; annotate: Annotation[]; holdMs?: number }

  /** Bir taşın TÜM yasal hamlelerini core/rules'tan alıp göster.
   *  distinguishPath: geçiş kareleri (sarı dolgu) ile varış kareleri
   *  (yeşil halka) ayrı tonda çizilir. Nöbetçi ve Zürafa için zorunlu. */
  | {
      kind: 'showMoves';
      square: SquareIndex;
      text?: string;
      distinguishPath?: boolean;
    }

  /** Bileşik hareketi faz faz aç. Zürafa ve Nöbetçi için zorunlu. */
  | {
      kind: 'showGeometry';
      square: SquareIndex;
      phases: GeometryPhase[];
      text?: string;
    }

  /** İki taşı karşılaştır (At vs Deve, Vezir vs Fers). */
  | { kind: 'compare'; left: SquareIndex; right: SquareIndex; text: string }

  /** Script hamleyi oynatır, kullanıcı izler. */
  | { kind: 'play'; move: MoveRef; text?: string }

  /** Kullanıcı belirli bir hamleyi yapmalı. */
  | {
      kind: 'awaitMove';
      accept: MoveRef[];
      text: string;
      onWrong?: string;
      /** Kaç yanlış denemeden sonra ok otomatik çizilsin. Varsayılan 3. */
      hintAfter?: number;
    }

  /** Kullanıcı bir kareye dokunmalı. */
  | {
      kind: 'awaitSquare';
      accept: SquareIndex[];
      text: string;
      onWrong?: string;
    }

  /** Kullanıcı N kareyi işaretlemeli ("Filin ulaşabildiği 4 kareyi bul").
   *  Kabul kümesi ELLE YAZILMAZ: from karesindeki taşın yasal hedefleri
   *  core/rules'tan türetilir. count yalnızca doğrulama içindir. */
  | {
      kind: 'awaitSquares';
      from: SquareIndex;
      count: number;
      text: string;
      onWrong?: string;
    }

  /** Kullanıcıyı standart satranç refleksini denemeye davet et, motor
   *  reddetsin, koç nedenini açıklasın. Müfredatın pedagojik omurgası.
   *  YASAK hamle denemek BAŞARIDIR; hata sayacına yazılmaz. */
  | {
      kind: 'expectRejection';
      text: string;
      /** Bu hamle core/rules'a göre ILLEGAL olmak ZORUNDA. */
      attempt: MoveRef;
      explanation: string;
      /** Kullanıcı denemezse koç kendisi gösterir. Varsayılan 12000. */
      fallbackAfterMs?: number;
    }

  /** Tahtasız kural kartı. */
  | {
      kind: 'quiz';
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }

  /** Seviye 5 çatal ışınlaması. Motor bunu YAPMADIĞI için yalnızca
   *  'demo' vardır ve yalnızca narrative derste kullanılır: hedef karede
   *  ghost belirir, gerçek taş yerinden oynamaz. */
  | { kind: 'teleport'; mode: 'demo'; ghostTo: SquareIndex; text: string }

  /** Ders 6.1 Şah Takası. Kabul edilen partner kareleri core/rules'un
   *  kingSwapTargets() çıktısından türetilir. */
  | { kind: 'awaitSwap'; text: string; onWrong?: string }

  /** Ders ortasında konumu değiştir. */
  | { kind: 'setPosition'; position: PositionRef; text?: string }

  /** Dersi bitir. */
  | { kind: 'finish'; text: string; xp: number; badge?: string };

/* ---------- Ders kabı (doğrulayıcı gereksinimi) ---------- */

export type GuidedLessonMode = 'interactive' | 'narrative';

export interface GuidedLesson {
  /** "1.1" gibi PDF/müfredat ders kodu — learnContent.ts ile BİREBİR. */
  id: string;
  /** Ders başlığı — learnContent.ts ile BİREBİR. */
  title: string;
  /** narrative listesi (4.4, 5.1, 5.2, 5.3, 5.4, 6.3, 6.5) narrative,
   *  geri kalan 18 ders interactive olmak ZORUNDA (madde 9). */
  mode: GuidedLessonMode;
  /** Dersin açılış konumu (sahnelenmiş olabilir). */
  startPosition: PositionRef;
  /** 6-14 adım (madde 7). Son adım 'finish' olmak ZORUNDA (madde 11). */
  steps: GuidedStep[];
}
