import type { SquareIndex, Side, PieceKind } from '../core/position/Position';

export type Tone = 'good' | 'bad' | 'focus' | 'neutral';

export type Annotation =
  /** Kare vurgusu. 'citadel' hisar kareleri için altın bordür. */
  | { kind: 'square'; square: SquareIndex;
      tone: Tone | 'citadel' }

  /** Geçilmesi zorunlu ama DURULAMAYAN ara kare.
   *  Görsel: yarı saydam sarı/turuncu dolgu (#f59e0b %30). */
  | { kind: 'path'; square: SquareIndex }

  /** Yasal varış karesi.
   *  Görsel: yeşil halka (#22c55e, ring-2), dolgu yok. */
  | { kind: 'destination'; square: SquareIndex }

  /** Kayıcı hareket: DÜZ çizgi + ok ucu.
   *  Kale, Nöbetçi, Zürafa'nın kayış fazı. */
  | { kind: 'slide'; from: SquareIndex; to: SquareIndex; tone: Tone }

  /** Sıçrayıcı hareket: YAY (quadratic bezier), ara karelere dokunmaz.
   *  At, Deve, Fil, Mancınık. Bu ayrım Seviye 3'ün tamamının dayanağıdır,
   *  kozmetik değildir. */
  | { kind: 'leap'; from: SquareIndex; to: SquareIndex; tone: Tone }

  /** Hayalet taş: %35 opaklık, kesik kenarlık.
   *  narrative derslerde "motorun yapamadığı" şeyi göstermenin tek yolu. */
  | { kind: 'ghost'; square: SquareIndex; side: Side; piece: PieceKind }

  /** Piyade mikro-rozeti: temsil ettiği figürün minyatür silueti,
   *  piyadenin sağ alt köşesinde, kare boyutunun ~0.32 katı.
   *  Ders 4.2'nin kritik yolu. */
  | { kind: 'badge'; square: SquareIndex; figure: PieceKind }

  /** Koordinat ızgarası overlay'i (a..k / 1..10 + hisar etiketleri).
   *  Ders 1.1. */
  | { kind: 'coords'; visible: boolean }

  /** Mühür animasyonu (Ders 6.2 "Hisar Beraberliği Sağlandı"). */
  | { kind: 'seal'; square: SquareIndex; label: string };
