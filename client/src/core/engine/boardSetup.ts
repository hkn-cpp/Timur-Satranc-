/**
 * Timur Satrancı (Tamerlane Chess) Initial Board Setup
 * 
 * Grid: 11 Columns (0..10 / a..k) x 10 Rows (0..9 / 1..10) + 2 Citadels
 * 
 * Layout Symmetry:
 * - Row 9 (Black Back Line): Elephant (0), Camel (2), War Machine (4), War Machine (6), Camel (8), Elephant (10)
 * - Row 8 (Black Middle Line): Rook (0), Knight (1), Picket (2), Giraffe (3), General (4), King (5), Vizier (6), Giraffe (7), Picket (8), Knight (9), Rook (10)
 * - Row 7 (Black Pawn Line): 11 Pawns assigned to underlying piece types
 * - Row 2 (White Pawn Line): 11 Pawns assigned to underlying piece types
 * - Row 1 (White Middle Line): Symmetrical to Row 8
 * - Row 0 (White Back Line): Symmetrical to Row 9
 * - Black Citadel: X = -1, Y = 8 (Left of Row 9, targeted by White King;
 *   see moveRules.ts BLACK_CITADEL_POS — this comment previously had the
 *   two citadels swapped)
 * - White Citadel: X = 11, Y = 1 (Right of Row 2, targeted by Black King)
 */

import { BoardMatrix, CitadelState, GameState, Piece, PieceType, PlayerColor } from '../../types/chess';
import { createEmptyBoard } from './index';

// Underlying piece type for each column (0..10) of pawns (v3: 11 distinct
// identities; x7-x10 duplicates were replaced by Fil/Deve/Mancınık pawns and
// the Pawn-of-Pawns; see client/docs/terfi-ekosistemi/A-kararlar.md K1).
// NOTE legacy names: 'general' = Fers, 'queen' = Vezir. 'pawn' = Piyadelerin
// Piyadesi (3-phase cycle); 'king' = Şah Piyadesi (→ Şehzade line, NOT cycle).
export const PAWN_COLUMN_PROMOTIONS: PieceType[] = [
  'rook',        // X = 0: Pawn of Rook
  'knight',      // X = 1: Pawn of Knight
  'picket',      // X = 2: Pawn of Picket
  'giraffe',     // X = 3: Pawn of Giraffe
  'general',     // X = 4: Pawn of General (Fers)
  'king',        // X = 5: Pawn of King (→ Prince, NOT Pawn-of-Pawns)
  'queen',       // X = 6: Pawn of Vizier (Vezir)
  'bishop',      // X = 7: Pawn of Elephant (Fil)
  'camel',       // X = 8: Pawn of Camel (Deve)
  'warMachine',  // X = 9: Pawn of War Engine (Mancınık)
  'pawn',        // X = 10: Pawn of Pawns (3-phase cycle)
];

// Back row (Y=0 for White, Y=9 for Black) pieces mapping
export const BACK_ROW_SETUP: { [x: number]: PieceType } = {
  0: 'bishop',     // Elephant (Fil)
  2: 'camel',      // Camel (Deve)
  4: 'warMachine', // War Engine / Catapult (Mancınık)
  6: 'warMachine', // War Engine / Catapult (Mancınık)
  8: 'camel',      // Camel (Deve)
  10: 'bishop',    // Elephant (Fil)
};

// Middle row (Y=1 for White, Y=8 for Black) pieces mapping
export const MIDDLE_ROW_SETUP: { [x: number]: PieceType } = {
  0: 'rook',       // Rook (Kale)
  1: 'knight',     // Knight (At)
  2: 'picket',     // Picket (Piket / Nöbetçi)
  3: 'giraffe',    // Giraffe (Zürafa)
  4: 'general',    // General / Ferz (Fers)
  5: 'king',       // King (Şah)
  6: 'queen',      // Vizier / Queen (Vezir)
  7: 'giraffe',    // Giraffe (Zürafa)
  8: 'picket',     // Picket (Piket / Nöbetçi)
  9: 'knight',     // Knight (At)
  10: 'rook',      // Rook (Kale)
};

/**
 * Creates a unique piece instance
 */
export function createPiece(
  type: PieceType,
  color: PlayerColor,
  x: number,
  y: number,
  promotedFrom?: PieceType
): Piece {
  const id = `${color}-${type}-${x}-${y}-${Math.random().toString(36).substr(2, 4)}`;
  return {
    id,
    type,
    color,
    position: { x, y },
    hasMoved: false,
    promotedFrom: promotedFrom || type,
  };
}

/**
 * Initializes the full Timur Chess board state with accurate 11x10 positions
 */
export function createInitialBoardSetup(): { board: BoardMatrix; citadels: CitadelState } {
  const board: BoardMatrix = createEmptyBoard();

  // 1. Black Back Line (Y = 9)
  for (let x = 0; x <= 10; x++) {
    if (BACK_ROW_SETUP[x]) {
      board[9][x] = createPiece(BACK_ROW_SETUP[x], 'black', x, 9);
    }
  }

  // 2. Black Middle Line (Y = 8)
  for (let x = 0; x <= 10; x++) {
    if (MIDDLE_ROW_SETUP[x]) {
      board[8][x] = createPiece(MIDDLE_ROW_SETUP[x], 'black', x, 8);
    }
  }

  // 3. Black Pawn Line (Y = 7)
  for (let x = 0; x <= 10; x++) {
    board[7][x] = createPiece('pawn', 'black', x, 7, PAWN_COLUMN_PROMOTIONS[x]);
  }

  // 4. White Pawn Line (Y = 2)
  for (let x = 0; x <= 10; x++) {
    board[2][x] = createPiece('pawn', 'white', x, 2, PAWN_COLUMN_PROMOTIONS[x]);
  }

  // 5. White Middle Line (Y = 1)
  for (let x = 0; x <= 10; x++) {
    if (MIDDLE_ROW_SETUP[x]) {
      board[1][x] = createPiece(MIDDLE_ROW_SETUP[x], 'white', x, 1);
    }
  }

  // 6. White Back Line (Y = 0)
  for (let x = 0; x <= 10; x++) {
    if (BACK_ROW_SETUP[x]) {
      board[0][x] = createPiece(BACK_ROW_SETUP[x], 'white', x, 0);
    }
  }

  // 7. Citadel initial states (empty initially)
  const citadels: CitadelState = {
    whiteCitadelPiece: null, // X = -1, Y = 1
    blackCitadelPiece: null, // X = 11, Y = 8
  };

  return { board, citadels };
}

/**
 * Creates a complete initial GameState object
 */
export function createInitialGameState(): GameState {
  const { board, citadels } = createInitialBoardSetup();

  return {
    board,
    citadels,
    currentTurn: 'white',
    moveHistory: [],
    capturedPieces: {
      white: [],
      black: [],
    },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isGameOver: false,
    status: 'IN_PROGRESS',
    winner: null,
    hasUsedKingSwap: {
      white: false,
      black: false,
    },
    turnNumber: 1,
    halfMoveClock: 0,
  };
}

/**
 * Creates a GameState object from a custom board & citadels setup
 */
export function createCustomGameState(
  board: BoardMatrix,
  citadels?: CitadelState,
  currentTurn: PlayerColor = 'white',
  hasUsedKingSwap?: { white: boolean; black: boolean }
): GameState {
  return {
    board,
    citadels: citadels || { whiteCitadelPiece: null, blackCitadelPiece: null },
    currentTurn,
    moveHistory: [],
    capturedPieces: {
      white: [],
      black: [],
    },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isGameOver: false,
    status: 'IN_PROGRESS',
    winner: null,
    hasUsedKingSwap: hasUsedKingSwap || {
      white: false,
      black: false,
    },
    turnNumber: 1,
    halfMoveClock: 0,
  };
}
