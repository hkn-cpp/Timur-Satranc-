/**
 * Game Core — Move (docs/mimari.md §7.1 birebir).
 *
 * --- İSİM SEÇİMİ / LEGACY EŞLEME (neden spec isimleri kullanıldı) ---
 * `Position.ts` ile aynı karar: kanonik isimler spec'ten alınır.
 * Eski motorun `Move` tipi (`types/chess.ts:169-180`) şöyledir:
 *   { from, to: BoardPosition(x,y,isCitadel), capturedPiece?, promotion?: PieceType,
 *     san?, isKingSwap?, swappedPiece?, isRelocation? }
 * Yeni `Move` (§7.1): { from, to: SquareIndex, piece, capturedPiece,
 *   promotion?: PieceKind, specialFlags, metadata{isCheck,isCapture,algebraic} }
 * Eşleme:
 *   - `from`/`to`: legacy `{x,y}` <-> `row*11+col`; legacy `isCitadel/left`
 *     <-> `110`; `isCitadel/right` <-> `111` (bkz. Position.ts).
 *   - `capturedPiece`: legacy `Piece` -> yeni `Piece` (kind/side dönüşümü
 *     Position.ts başlığındaki tabloya göre).
 *   - `promotion`: legacy `promotedFrom || 'queen'` zinciri aynen korunur,
 *     sadece isimler çevrilir (legacy queen->General, legacy general->Ferz,
 *     legacy bishop->Alfil, legacy warMachine->Dabbaba; prince->Prince).
 *   - `san` (legacy) <-> `metadata.algebraic` (yeni). Üretim oddur/>
 *     `core/notation` birebir taşınmadı; basit SAN üretici rules içindedir
 *     (karar noktası olarak raporlanır).
 *   - legacy `isKingSwap/swappedPiece` -> `specialFlags=[KingSwap]`
 *     (from=şah karesi, to=hedef dost taş karesi; takas bilgisi tahtadan
 *     okunur, ek alan gerekmez).
 *   - legacy `isRelocation` (Pawn-of-Pawns 1. kademe güvenli-kareye taşıma)
 *     -> `specialFlags=[Relocation]` (ek alan gerekmez; `to` = VARILAN
 *     güvenli kare olarak yazılır — legacy `useGame.ts` ile aynı).
 *
 * --- SPEC'TEN SAPMALAR (bilinçli, kuralları korumak için) ---
 * `MoveSpecialFlag` spec'te {Promotion, CitadelEntry, CitadelSeal} üçlüsüdür.
 * Legacy Rule 2 (KingSwap) ve Rule 4 (Relocation) bu üçlüye sığmaz; onları
 * atmak kural değişikliği olurdu. Bu yüzden iki LEGACY EXTENSION bayrak
 * eklendi: `KingSwap`, `Relocation`. Spec bayrakları verbatim durur.
 */

import type { Piece, PieceKind, SquareIndex } from '../position/Position';

// ==================== HAMLE (§7.1 verbatim + 2 işaretli extension) ====================

export enum MoveSpecialFlag {
  Promotion = 'promotion',
  CitadelEntry = 'citadel_entry',
  CitadelSeal = 'citadel_seal',
  // --- LEGACY EXTENSION (gerekçe dosya başında) ---
  KingSwap = 'king_swap', // Rule 2: Şah Takası
  Relocation = 'relocation', // Rule 4: Pawn-of-Pawns güvenli-kareye taşıma (v3: orijine-dönüş de bu bayrağı taşır)
  // --- v3 EXTENSION (terfi ekosistemi K6): bekleyen piyadenin çatal
  // karesine ışınlanması. from=bekleyen piyade, to=çatal karesi, sıra geçer.
  Teleport = 'teleport',
}

export interface Move {
  from: SquareIndex;
  to: SquareIndex;
  piece: Piece; // hamleyi yapan taşın hamle-öncesi durumu
  capturedPiece: Piece | null;
  promotion?: PieceKind; // specialFlags içinde Promotion varsa dolu
  specialFlags: MoveSpecialFlag[]; // boş dizi = sıradan hamle
  metadata: {
    isCheck: boolean;
    isCapture: boolean;
    algebraic: string; // notation modülünün ürettiği string (örn. "Rf3-f7+")
  };
}

/** Sıradan (bayraksız) hamle mi? */
export function isQuietMove(move: Move): boolean {
  return move.specialFlags.length === 0;
}

/** Hamlede verilen bayrak var mı? */
export function hasSpecialFlag(move: Move, flag: MoveSpecialFlag): boolean {
  return move.specialFlags.includes(flag);
}
