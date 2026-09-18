/**
 * Game Core — Rules: isCheck / isGameOver / getGameResult (§7.2 immutable API).
 *
 * moveRules.ts:736-815 `calculateGameStatus` portu:
 *  - Hisar: rakip hisardaki Şah → beraberlik (legacy `DRAW_BY_CITADEL`).
 *  - Hamlesiz + şah çekiliyor → mat (rakip kazanır).
 *  - Hamlesiz + şah çekilmiyor → PAT = hamlesiz kalan KAYBEDER (Timur kuralı,
 *    legacy `LOSS_BY_STALEMATE`, spec `stalemate_win`).
 *  - Rok yok, en-passant yok (legacy'de ikisi de yoktur — korundu).
 *
 * Spec eşleme notu (v3): `GameResult.draw.reason` dörtlüsü
 * (agreement|repetition|fifty_move|citadel); hisar beraberliği `citadel`
 * reason'ıyla döner (v2'de `agreement`e eşlenirdi).
 */

import {
  BOTTOM_RIGHT_CITADEL,
  TOP_LEFT_CITADEL,
  PieceKind,
  type GameResult,
  type Position,
  type Side,
} from '../position/Position';
import {
  assertBoardSize,
  royalSquares,
  isAttacked,
  opponent,
} from './shared';
import { generateLegalMoves } from './generateLegalMoves';

/** Verilen taraf şah çekiyor mu? v3 K2: royal sayısı 1 değilse şah kavramı
 *  çalışmaz (çok-royalde koruma askıda, royalsiz tarafta çekilecek şah yok). */
export function isCheck(position: Position, side: Side): boolean {
  assertBoardSize(position.board);
  const royals = royalSquares(position.board, position.citadels, side);
  if (royals.length !== 1) return false;
  return isAttacked(position.board, position.citadels, royals[0], opponent(side));
}

function citadelKingSide(
  position: Position,
): { whiteInLeft: boolean; blackInRight: boolean } {
  const tl = position.citadels.topLeft.occupant;
  const br = position.citadels.bottomRight.occupant;
  void TOP_LEFT_CITADEL;
  void BOTTOM_RIGHT_CITADEL;
  return {
    whiteInLeft: tl !== null && tl.kind === PieceKind.King && tl.side === 'white',
    blackInRight: br !== null && br.kind === PieceKind.King && br.side === 'black',
  };
}

/**
 * Oyun sonucu (bitmediyse null). Resignation/timeout pozisyondan TÜRETİLEMEZ
 * (dış olaydır); bu fonksiyon SADECE tahta-içi sonuçları üretir.
 * v3 K2/K3: taraf, royal kümesi boşalmadıkça kaybetmez. Pat = galibiyet korunur.
 */
export function getGameResult(position: Position): GameResult | null {
  assertBoardSize(position.board);
  const side = position.sideToMove;
  const foe = opponent(side);

  // v3 K2: son royal de gittiyse taraf kaybeder (royal-sıfır kaybı).
  if (royalSquares(position.board, position.citadels, side).length === 0) {
    return { type: 'checkmate', winner: foe };
  }

  // Rule 3: Hisar beraberliği (v3 K12: kilitli hisar dışlanır; reason `citadel`).
  const { whiteInLeft, blackInRight } = citadelKingSide(position);
  const leftSealed = position.citadels.topLeft.sealed;
  const rightSealed = position.citadels.bottomRight.sealed;
  if ((whiteInLeft && !leftSealed) || (blackInRight && !rightSealed)) {
    return { type: 'draw', reason: 'citadel' };
  }

  // Elli-hamle (spec reason üçlüsünden; legacy saati bağlanmamıştı, burada bağlı).
  if (position.flags.halfMoveClock >= 100) {
    return { type: 'draw', reason: 'fifty_move' };
  }

  // Üç-tekrar (spec §7.1 repetitionCount; legacy'de yoktu, burada bağlı).
  const rep = position.flags.repetitionCount[position.zobristHash.toString()] ?? 0;
  if (rep >= 3) {
    return { type: 'draw', reason: 'repetition' };
  }

  const check = isCheck(position, side);
  const legal = generateLegalMoves(position);
  if (legal.length === 0) {
    if (check) return { type: 'checkmate', winner: foe };
    return { type: 'stalemate_win', winner: foe }; // PAT = kayıp (Rule 1)
  }
  return null;
}

/** Oyun bitti mi? */
export function isGameOver(position: Position): boolean {
  return getGameResult(position) !== null;
}

/**
 * Hisar beraberliği mi? (arama içi terminal kontrolü için; `getGameResult`
 * ile AYNI koşul — tek doğruluk kaynağı burasıdır, kopyası değil.)
 * v3 K12: kilitli (sealed) hisar üzerinden beraberlik oluşmaz.
 */
export function isCitadelDraw(position: Position): boolean {
  const { whiteInLeft, blackInRight } = citadelKingSide(position);
  if (whiteInLeft && !position.citadels.topLeft.sealed) return true;
  if (blackInRight && !position.citadels.bottomRight.sealed) return true;
  return false;
}
