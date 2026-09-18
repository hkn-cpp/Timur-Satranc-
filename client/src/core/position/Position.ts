/**
 * Game Core — Position (docs/mimari.md §7.1 birebir).
 *
 * Referans: docs/mimari.md Bölüm 7.1'deki TypeScript tanımının aynısıdır.
 * `moveRules.ts` SİLİNMEDİ; referans olarak duruyor. Bu dosya yeni doğruluk
 * kaynağı (single source of truth) adayıdır, eski motorla birlikte yaşar.
 *
 * --- İSİM SEÇİMİ / LEGACY EŞLEME (neden spec isimleri kullanıldı) ---
 * Görev "§7.1'i birebir uygula" dediği için KANONİK isimler spec'ten alınır.
 * Eski motor (`core/engine/moveRules.ts` + `types/chess.ts` PieceType) ile
 * çakışan yerlerde spec kazanır; eşleme birebir korunur, kural değişmez:
 *
 *   legacy `king`                          -> `King`   (Şah, 8 yön 1 adım)
 *   legacy `queen` (Vezir/Vizier, 1 DÜZ)    -> `General` (spec: "General = Vezir")
 *   legacy `general` (Fers, 1 ÇAPRAZ)       -> `Ferz`
 *   legacy `rook`                          -> `Rook`
 *   legacy `knight`                        -> `Knight`
 *   legacy `bishop` (Fil, 2 çapraz atlama) -> `Alfil`
 *   legacy `camel` (3+1 L atlama)          -> `Camel`
 *   legacy `warMachine` (Mancınık, 2 düz)  -> `Dabbaba`
 *   legacy `giraffe`                       -> `Giraffe`
 *   legacy `picket` (Tale'a)               -> `Picket`
 *   legacy `pawn` + `promotedFrom`         -> `Pawn` + `pawnOf`
 *
 *   DİKKAT (en kritik swap): legacy'de `queen` düz gider, `general` çapraz
 *   gider. Spec'te `General` = Vezir (düz), `Ferz` = çapraz. Yani
 *   legacy.queen -> General, legacy.general -> Ferz. Ters eşlersen
 *   Vezir/Fers hareketleri yer değiştirir.
 *
 * --- SPEC'TEN SAPMALAR (bilinçli, kuralları korumak için) ---
 * 1. `PieceKind.Prince`: spec'te YOK, legacy'de VAR (Şah piyadesinin terfisi
 *    + Pawn-of-Pawns 2. kademe; Şah gibi hareket eder ama royal değildir —
 *    `isKingInCheck` onu aramaz, bkz. moveRules.ts:448). Kural mantığını
 *    değiştirmemek için "LEGACY EXTENSION" olarak eklendi. §7.1'in kendi
 *    notu da enum'un Faz 1'de moveRules.ts ile doğrulanacağını söyler;
 *    bu, o doğrulamanın sonucudur. Karar noktası olarak raporda sorulacak.
 * 2. `GameFlags.hasUsedKingSwap`: spec'te YOK, legacy Rule 2 (Şah Takası,
 *    maçta 1x) için ZORUNLU (`GameState.hasUsedKingSwap`). `Position`
 *    spec-verbatim kalsın diye opsiyonel alan olarak eklendi; yoksa
 *    "kullanılmadı" varsayılır. Alternatifi (takası taşımamak) kural
 *    değişikliği olurdu.
 * 3. Hisar: spec `topLeft`/`bottomRight`; legacy `blackCitadelPiece` (sol,
 *    x=-1,y=8, Beyaz Şah'ın hedefi) / `whiteCitadelPiece` (sağ, x=11,y=1,
 *    Siyah Şah'ın hedefi). Eşleme: topLeft <-> sol, bottomRight <-> sağ.
 *    `sealed` spec'ten alındı; legacy'de kavram yok → başlangıçta `false`.
 */

// ==================== TEMEL TİPLER (§7.1 verbatim) ====================

export type Side = 'white' | 'black';

/**
 * Kare indeksi: 0..109 → 10x11 ana ızgara (row-major, row=0..9, col=0..10 → index = row*11+col)
 * 110 → üst-sol hisar (topLeft citadel)
 * 111 → alt-sağ hisar (bottomRight citadel)
 */
export type SquareIndex = number;

export const BOARD_SQUARES = 110;
export const TOP_LEFT_CITADEL: SquareIndex = 110;
export const BOTTOM_RIGHT_CITADEL: SquareIndex = 111;
export const TOTAL_SQUARES = 112;

export const BOARD_COLS = 11;
export const BOARD_ROWS = 10;

export enum PieceKind {
  King = 'king',
  General = 'general', // Vezir
  Ferz = 'ferz',
  Rook = 'rook', // Savaş Arabası
  Knight = 'knight', // At
  Alfil = 'alfil', // Fil
  Camel = 'camel', // Deve
  Dabbaba = 'dabbaba', // Mancınık
  Giraffe = 'giraffe', // Zürafa
  Picket = 'picket', // Tale'a
  Pawn = 'pawn', // alt tür `pawnOf` alanında belirlenir
  // --- LEGACY EXTENSION (spec §7.1'de yok; gerekçe yukarıda madde 1) ---
  Prince = 'prince', // Şehzade: Şah gibi hareket eder, royal değil (v3'ten itibaren royal — royalSquares)
  // --- v3 EXTENSION (terfi ekosistemi): 3. terfi ürünü Maceracı Şah.
  // Tam royal'dir; Şehzade gibi hareket eder + kendi hisarına girip kilitler.
  AdventurousKing = 'adventurousKing',
}

export interface Piece {
  id: string; // oyun boyunca sabit benzersiz kimlik (örn. "w_rook_1")
  kind: PieceKind;
  side: Side;
  pawnOf?: PieceKind; // sadece kind === Pawn ise dolu: hangi figürün piyadesi
  hasMoved: boolean; // terfi / hisar giriş kuralları için
  // --- LEGACY EXTENSION (spec §7.1'de yok; gerekçe aşağıda) ---
  pawnStage?: 0 | 1 | 2 | 3; // SADECE Pawn + pawnOf===Pawn için: Piyadelerin Piyadesi
  // kademesi. 0=başlangıç, 1=1. varış sonrası bekleme, 2=orijine döndü,
  // 3=Maceracı Şah oldu. (v3: kademe 3 eklendi; 2 artık Şehzade DEĞİL,
  // orijine-dönüş kademesidir.)
  /** v3: bekleyen piyade (K4/K5). 10. yatayda varış karesini işgal eder,
   *  alınamaz, saldırmaz/saldırılmaz, normal hamlesi yoktur. */
  waiting?: boolean;
}

export type BoardArray = ReadonlyArray<Piece | null>; // length = 112

export interface CitadelSlotState {
  occupant: Piece | null;
  sealed: boolean; // kilitli mi (bkz. RulesPage kural tanımı)
}

export interface CitadelState {
  topLeft: CitadelSlotState;
  bottomRight: CitadelSlotState;
}

export interface GameFlags {
  halfMoveClock: number; // ilerlemesiz hamle sayacı (50-hamle benzeri kurallar için)
  fullMoveNumber: number;
  repetitionCount: Record<string, number>; // zobristHash → tekrar sayısı
  // --- LEGACY EXTENSION (spec §7.1'de yok; gerekçe yukarıda madde 2) ---
  hasUsedKingSwap?: Record<Side, boolean>; // Rule 2: Şah Takası maçta 1x
}

export type GameResult =
  | { type: 'checkmate'; winner: Side }
  | { type: 'stalemate_win'; winner: Side } // pat = galibiyet (Timur'a özgü kural)
  | { type: 'resignation'; winner: Side }
  | { type: 'timeout'; winner: Side }
  // v3: hisar beraberliği `agreement`ten ayrıldı (`citadel`); kilitli hisar
  // beraberlik üretmez (K12).
  | { type: 'draw'; reason: 'agreement' | 'repetition' | 'fifty_move' | 'citadel' };

export interface Position {
  board: BoardArray;
  sideToMove: Side;
  citadels: CitadelState;
  flags: GameFlags;
  zobristHash: bigint; // Transposition Table anahtarı
}

// ==================== KARE YARDIMCILARI (tip dışı, saf fonksiyon) ====================

/** Ana ızgara karesi mi (0..109)? */
export function isBoardSquare(sq: SquareIndex): boolean {
  return Number.isInteger(sq) && sq >= 0 && sq < BOARD_SQUARES;
}

/** Hisar karesi mi (110/111)? */
export function isCitadelSquare(sq: SquareIndex): boolean {
  return sq === TOP_LEFT_CITADEL || sq === BOTTOM_RIGHT_CITADEL;
}

/** index -> { col(0..10), row(0..9) }; hisar için null döner. */
export function squareToCoord(sq: SquareIndex): { col: number; row: number } | null {
  if (!isBoardSquare(sq)) return null;
  return { col: sq % BOARD_COLS, row: Math.floor(sq / BOARD_COLS) };
}

/** { col, row } -> index; aralık dışıysa null. */
export function coordToSquare(col: number, row: number): SquareIndex | null {
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (col < 0 || col >= BOARD_COLS || row < 0 || row >= BOARD_ROWS) return null;
  return row * BOARD_COLS + col;
}

/** Boş 112'lik tahta + boş hisarlar + başlangıç bayrakları (hash HARİÇ — zobrist.ts ile doldurulur). */
export function createEmptyPosition(sideToMove: Side = 'white'): Omit<Position, 'zobristHash'> {
  const board: (Piece | null)[] = new Array(TOTAL_SQUARES).fill(null);
  return {
    board,
    sideToMove,
    citadels: {
      topLeft: { occupant: null, sealed: false },
      bottomRight: { occupant: null, sealed: false },
    },
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: { white: false, black: false },
    },
  };
}
