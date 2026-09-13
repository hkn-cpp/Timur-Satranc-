import React, { FC } from 'react';
import { BoardMatrix, BoardPosition, CitadelState, Move, PlayerColor } from '../../types/chess';
import { BoardGrid } from '../board/BoardGrid';

interface BoardContainerProps {
  board: BoardMatrix;
  citadels: CitadelState;
  selectedPos: BoardPosition | null;
  validMoves: Move[];
  lastMove?: Move | null;
  turn?: PlayerColor;
  boardRotates?: boolean;
  isEditorMode?: boolean;
  flipped?: boolean;
  onSquareClick: (pos: BoardPosition) => void;
  onSquareDoubleClick?: (pos: BoardPosition) => void;
  onDropMove?: (from: BoardPosition, to: BoardPosition) => void;
  onDropFromPalette?: (type: any, color: any, to: BoardPosition) => void;
  /** Yeni şah hamlesinde 0.4sn "ŞAH!" bildirimi gösterir. */
  showCheckFlash?: boolean;
}

export const BoardContainer: FC<BoardContainerProps> = ({
  board,
  citadels,
  selectedPos,
  validMoves,
  lastMove,
  turn = 'white',
  boardRotates = false,
  isEditorMode = false,
  flipped = false,
  onSquareClick,
  onSquareDoubleClick,
  onDropMove,
  onDropFromPalette,
  showCheckFlash = false,
}) => {
  return (
    <div className="w-full flex-1 flex items-center justify-center py-1 select-none">
      <BoardGrid
        board={board}
        citadels={citadels}
        selectedPos={selectedPos}
        validMoves={validMoves}
        lastMove={lastMove}
        turn={turn}
        boardRotates={boardRotates}
        isEditorMode={isEditorMode}
        flipped={flipped}
        showCheckFlash={showCheckFlash}
        onSquareClick={onSquareClick}
        onSquareDoubleClick={onSquareDoubleClick}
        onDropMove={onDropMove}
        onDropFromPalette={onDropFromPalette}
      />
    </div>
  );
};
