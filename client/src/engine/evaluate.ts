/**
 * Engine — değerlendirme v0.1: SADECE MATERYAL (§7.6).
 *
 * Ölçek: centipawn, 1 piyade = 100cp. Taş değerleri §7.6 v1 katsayılarıdır
 * (self-play ile kalibre edilecek başlangıç varsayımları — mimarinin kendi
 * kalibrasyon notu geçerlidir).
 *
 * v0.1'de KULLANILMAYAN §7.6 bileşenleri (Faz 3+/Engine v0.2 işi):
 * mobility, kingSafety, citadelControl, pieceActivity, pawnStructure.
 * `EVALUATION_WEIGHTS` spec kaydı için tutulur; motor yalnız `material`i okur.
 */

import {
  PieceKind,
  type Position,
} from '../core/position/Position';
import { royalSquares } from '../core/rules/shared';

export const EVALUATION_WEIGHTS = {
  material: 1.0, // v0.1'de kullanılan TEK bileşen
  mobility: 0.1,
  kingSafety: 0.3,
  citadelControl: 0.4, // Timur'a özgü, yüksek ağırlık (ileride)
  pieceActivity: 0.15,
  pawnStructure: 0.1,
} as const;

/** Taş değerleri, centipawn (§7.6 v1 tablosu). */
export const PIECE_VALUES_CP: Record<PieceKind, number> = {
  [PieceKind.King]: 0, // materyale dahil edilmez (oyun sonu koşulu)
  [PieceKind.General]: 950, // Vezir — en güçlü figür varsayımı
  [PieceKind.Ferz]: 300,
  [PieceKind.Rook]: 500,
  [PieceKind.Knight]: 300,
  [PieceKind.Alfil]: 200, // sınırlı sıçrama menzili
  [PieceKind.Camel]: 250,
  [PieceKind.Dabbaba]: 200,
  [PieceKind.Giraffe]: 350,
  [PieceKind.Picket]: 150, // en zayıf figür varsayımı
  [PieceKind.Pawn]: 100, // 11 piyade türü için tek tip başlangıç değeri
  // --- v3 (terfi ekosistemi K13): Şehzade 3.0, Maceracı Şah 3.0.
  // Şehzade'nin eski 400cp değeri bilinçli değişti (K13 değer matrisi).
  [PieceKind.Prince]: 300,
  [PieceKind.AdventurousKing]: 300,
};

/** Çok-royal durumda Şah'ın sonlu değeri (v3 K13: 8.0). */
export const MULTI_ROYAL_KING_CP = 800;

/** Beyaz-pozitif materyal farkı (cp). Hisar occupant'ları dahildir (board[110/111]).
 *  v3 K13: bekleyen piyade 50cp; Şah royal sayısı 1 iken 0 (mevcut), tarafın
 *  royal sayısı >1 iken 800cp (sonsuz değer aramayı bozardı). */
export function materialWhiteCp(position: Position): number {
  const whiteRoyals = royalSquares(position.board, position.citadels, 'white').length;
  const blackRoyals = royalSquares(position.board, position.citadels, 'black').length;
  let score = 0;
  const board = position.board;
  for (let sq = 0; sq < board.length; sq++) {
    const p = board[sq];
    if (!p) continue;
    let v = PIECE_VALUES_CP[p.kind] ?? 0;
    if (p.kind === PieceKind.Pawn && p.waiting === true) v = 50;
    if (p.kind === PieceKind.King) {
      v = (p.side === 'white' ? whiteRoyals : blackRoyals) > 1 ? MULTI_ROYAL_KING_CP : 0;
    }
    score += p.side === 'white' ? v : -v;
  }
  return Math.round(score * EVALUATION_WEIGHTS.material);
}

/**
 * Pozisyon skoru, centipawn, **sideToMove lehine pozitif** (§7.3 konvansiyonu).
 * Sessiz (non-terminal) düğümler içindir; mat/pat/draw skorlaması `search.ts`'tedir.
 */
export function evaluate(position: Position): number {
  const whiteCp = materialWhiteCp(position);
  return position.sideToMove === 'white' ? whiteCp : -whiteCp;
}
