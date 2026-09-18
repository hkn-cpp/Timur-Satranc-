/**
 * Worker protokolü (docs/mimari.md §7.4).
 *
 * Kimlik: her istek `requestId` taşır; ana thread bekleyen istekleri
 * `Map<requestId, {resolve, reject}>` ile izler. `bigint` hash, WASM uyumu
 * için `string` taşınır (spec §7.4).
 */

import type { BotProfileId } from '../bot/profiles';
import type { AnalysisResult, BestMoveResult, SearchLimits } from '../engine/EngineInterface';
import { PieceKind, type Piece, type Position } from '../core/position/Position';

/** Serileştirme formatı sürümü (v3: terfi ekosistemi alanları). */
export const SERIALIZATION_VERSION = 3;

/** `Position`ın `postMessage`/`structuredClone` ile taşınabilir hâli. */
export interface SerializedPosition {
  /** Format sürümü; yoksa v2 (terfi-ekosistemi öncesi) varsayılır. */
  version?: number;
  board: Position['board'];
  sideToMove: Position['sideToMove'];
  citadels: Position['citadels'];
  flags: Position['flags'];
  zobristHash: string; // bigint → string (§7.4)
}

export function serializePosition(position: Position): SerializedPosition {
  return {
    version: SERIALIZATION_VERSION,
    board: position.board,
    sideToMove: position.sideToMove,
    citadels: position.citadels,
    flags: position.flags,
    zobristHash: position.zobristHash.toString(),
  };
}

export function deserializePosition(sp: SerializedPosition): Position {
  const board = (sp.board as (Piece | null)[]).map((p) => {
    if (!p) return null;
    const out: Piece = { ...p };
    // v3 varsayılanları (K14). DİKKAT: `promotionStage` YALNIZCA
    // Piyadelerin Piyadesi'nde (`pawnOf===Pawn`) 0'a doldurulur; sıradan
    // piyonlarda `undefined` korunur (`undefined` = sıradan piyade demektir,
    // hepsine 0 yazmak temsilî terfiyi bozardı).
    if (out.waiting === undefined) out.waiting = false;
    if (out.kind === PieceKind.Pawn && out.pawnOf === PieceKind.Pawn && out.pawnStage === undefined) {
      out.pawnStage = 0;
    }
    return out;
  });
  const citadels: Position['citadels'] = {
    topLeft: {
      occupant: sp.citadels.topLeft.occupant,
      sealed: sp.citadels.topLeft.sealed ?? false,
    },
    bottomRight: {
      occupant: sp.citadels.bottomRight.occupant,
      sealed: sp.citadels.bottomRight.sealed ?? false,
    },
  };
  return {
    board: board as Position['board'],
    sideToMove: sp.sideToMove,
    citadels,
    flags: sp.flags,
    zobristHash: BigInt(sp.zobristHash),
  };
}

// ---- Ana Thread → Worker ----

export interface FindBestMoveRequest {
  type: 'find_best_move';
  requestId: string;
  position: SerializedPosition;
  profileId: BotProfileId;
  /** Profil bütçesini ezer (test için). */
  movetimeMs?: number;
  /** Profil derinliğini ezer (test için). */
  maxDepth?: number;
}

export interface AnalyzeRequest {
  type: 'analyze';
  requestId: string;
  position: SerializedPosition;
  limits: SearchLimits;
}

export interface CancelRequest {
  /** İptal edilecek isteğin requestId'si. */
  type: 'cancel';
  requestId: string;
}

export interface InitRequest {
  type: 'init';
  requestId: string;
}

export type WorkerRequest = FindBestMoveRequest | AnalyzeRequest | CancelRequest | InitRequest;

// ---- Worker → Ana Thread ----

export interface ReadyResponse {
  type: 'ready';
  requestId: string;
}

export interface BestMoveResultResponse {
  type: 'best_move_result';
  requestId: string;
  result: BestMoveResult;
}

export interface AnalysisResultResponse {
  type: 'analysis_result';
  requestId: string;
  result: AnalysisResult;
}

export interface CancelledResponse {
  type: 'cancelled';
  requestId: string;
}

export interface ErrorResponse {
  type: 'error';
  requestId: string;
  message: string;
}

export type WorkerResponse =
  | ReadyResponse
  | BestMoveResultResponse
  | AnalysisResultResponse
  | CancelledResponse
  | ErrorResponse;
