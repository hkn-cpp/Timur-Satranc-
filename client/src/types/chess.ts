/**
 * Timur Chess (Tamerlane Chess / Timur Satrancı) Domain Types
 * 
 * Board: 11 columns (a to k) x 10 ranks (1 to 10) + 2 Citadels (Kale/Hisar)
 * Pieces: 11 unique piece types per player
 */

export type PlayerColor = 'white' | 'black';

/**
 * 12 Unique Pieces of Timur Chess:
 * - Pawn (Piyade)
 * - Rook (Kale / Rukh)
 * - Knight (At / Faras)
 * - Bishop (Fil)
 * - Queen (Vezir / Vizier)
 * - King (Şah)
 * - General (Fers / Ferz)
 * - Giraffe (Zürafa)
 * - Picket (Nöbetçi / Piket / Talia)
 * - Camel (Deve / Jamal)
 * - WarMachine (Mancınık / Dabbaba)
 */
export type PieceType =
  | 'pawn'
  | 'rook'
  | 'knight'
  | 'bishop'
  | 'queen'
  | 'king'
  | 'general'
  | 'giraffe'
  | 'picket'
  | 'camel'
  | 'warMachine'
  | 'prince';

export enum PieceTypeEnum {
  PAWN = 'pawn',
  ROOK = 'rook',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  QUEEN = 'queen',
  KING = 'king',
  GENERAL = 'general',
  GIRAFFE = 'giraffe',
  PICKET = 'picket',
  CAMEL = 'camel',
  WAR_MACHINE = 'warMachine',
  PRINCE = 'prince',
}

export type GameStatus =
  | 'IN_PROGRESS'
  | 'CHECK'
  | 'CHECKMATE'
  | 'LOSS_BY_STALEMATE'
  | 'DRAW_BY_CITADEL'
  | 'DRAW_BY_AGREEMENT'
  | 'RESIGNATION'
  | 'TIMEOUT';

export interface PieceMetadata {
  nameTr: string;
  nameEn: string;
  symbol: string;
  description: string;
}

export const PIECE_METADATA: Record<PieceType, PieceMetadata> = {
  pawn: {
    nameTr: 'Piyon (Piyade)',
    nameEn: 'Pawn',
    symbol: 'P',
    description: '1 kare ileri gider, 1 kare çapraz ileri taş alır.',
  },
  rook: {
    nameTr: 'Kale (Ruh)',
    nameEn: 'Rook',
    symbol: 'K',
    description: 'Dikey ve yatay doğrultuda sınırsız kare hareket eder.',
  },
  knight: {
    nameTr: 'At (Faras)',
    nameEn: 'Knight',
    symbol: 'A',
    description: 'Klasik L şeklinde hareket eder, taşların üzerinden atlayabilir.',
  },
  bishop: {
    nameTr: 'Fil',
    nameEn: 'Bishop',
    symbol: 'F',
    description: 'Çaprazda tam 2 kare atlar (aradaki taşı atlar).',
  },
  queen: {
    nameTr: 'Vezir',
    nameEn: 'Queen / Vizier',
    symbol: 'V',
    description: 'Dikey ve yatayda 1 kare hareket eder.',
  },
  king: {
    nameTr: 'Şah',
    nameEn: 'King',
    symbol: 'Ş',
    description: 'Her yöne (dikey, yatay, çapraz) 1 kare hareket eder.',
  },
  general: {
    nameTr: 'Fers (General)',
    nameEn: 'General / Ferz',
    symbol: 'Fe',
    description: 'Çaprazda 1 kare hareket eder.',
  },
  giraffe: {
    nameTr: 'Zürafa',
    nameEn: 'Giraffe',
    symbol: 'Z',
    description: '1 kare çapraz + en az 3 kare düz hareket eder (veya özel Zürafa sıçrayışı).',
  },
  picket: {
    nameTr: 'Nöbetçi (Piket / Talia)',
    nameEn: 'Picket',
    symbol: 'N',
    description: 'Çaprazda en az 2 kare hareket eder (1 kare çapraza gidemez).',
  },
  camel: {
    nameTr: 'Deve (Jamal)',
    nameEn: 'Camel',
    symbol: 'D',
    description: '1 kare çapraz + 2 kare düz şeklinde (3x1 L sıçrayışı) hareket eder.',
  },
  warMachine: {
    nameTr: 'Mancınık (Dabbaba)',
    nameEn: 'War Machine',
    symbol: 'M',
    description: 'Düz (dikey/yatay) tam 2 kare atlar.',
  },
  prince: {
    nameTr: 'Şehzade (Prince)',
    nameEn: 'Prince / Shahzada',
    symbol: 'Şz',
    description: 'Şah Piyonunun terfisiyle oluşur. Şah gibi her yöne 1 kare hareket eder.',
  },
};

/**
 * Coordinate position on the 11x10 board (+ Citadels)
 * x: 0 to 10 (representing columns a to k)
 * y: 0 to 9 (representing ranks 1 to 10)
 * isCitadel: true if position is in one of the extra Citadel squares
 * citadelSide: 'left' (White Citadel, attached to rank 9) or 'right' (Black Citadel, attached to rank 2)
 */
export interface BoardPosition {
  x: number;
  y: number;
  isCitadel?: boolean;
  citadelSide?: 'left' | 'right';
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: BoardPosition;
  hasMoved?: boolean;
  promotedFrom?: PieceType;
  pawnOfPawnsStage?: number; // 0 = initial, 1 = first promotion/relocated, 2 = fully promoted
  /** v3: bekleyen Piyadelerin Piyadesi (dokunulmaz; yeni çekirdekten taşınır, display amaçlı). */
  waiting?: boolean;
}

export interface Move {
  from: BoardPosition;
  to: BoardPosition;
  capturedPiece?: Piece;
  isCitadelMove?: boolean;
  promotion?: PieceType;
  san?: string; // Standard Algebraic Notation representation for 11x10
  timestamp?: number;
  isKingSwap?: boolean; // Rule 2: King Swap / Şah Takası
  swappedPiece?: Piece; // The friendly piece swapped with King
  isRelocation?: boolean; // Rule 4: Pawn of Pawns stage 1 relocation
}

export interface MoveHistoryNode {
  id: string;
  move: Move;
  fenBefore: string;
  fenAfter: string;
  comment?: string;
  children?: MoveHistoryNode[];
  parent?: string;
}

export type BoardMatrix = (Piece | null)[][]; // 10 rows (y=0..9) x 11 cols (x=0..10)

export interface CitadelState {
  whiteCitadelPiece: Piece | null; // Left Citadel (Black Citadel pos X=-1, Y=8 for White entry)
  blackCitadelPiece: Piece | null; // Right Citadel (White Citadel pos X=11, Y=1 for Black entry)
}

export interface GameState {
  board: BoardMatrix;
  citadels: CitadelState;
  currentTurn: PlayerColor;
  moveHistory: Move[];
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  status: GameStatus;
  statusReason?: string;
  winner: PlayerColor | 'draw' | null;
  hasUsedKingSwap: {
    white: boolean;
    black: boolean;
  };
  turnNumber: number;
  halfMoveClock: number; // For 50-move rule equivalent
}
