import React, { FC, useCallback, useMemo } from 'react';
import type { Position, SquareIndex } from '../../../core/position/Position';
import { generateLegalMoves } from '../../../core/rules/generateLegalMoves';
import { squareToLegacy, positionToLegacyBoardAndCitadels } from '../../../worker/legacyAdapter';
import { BoardGrid } from '../../board/BoardGrid';

export type BoardInputMode = 'locked' | 'square' | 'move' | 'swap';

interface GuidedBoardProps {
  position: Position;
  mode: BoardInputMode;
  selected: SquareIndex | null;
  onSelect: (sq: SquareIndex | null) => void;
  onSquare: (sq: SquareIndex) => void;
  onMove: (from: SquareIndex, to: SquareIndex) => void;
  onSwap: (sq: SquareIndex) => void;
}

/** Legacy tahta konumu → kare indeksi (squareToLegacy tersi). */
function legacyToSquare(pos: { x: number; y: number; isCitadel?: boolean; citadelSide?: string }): SquareIndex {
  if (pos.isCitadel) return pos.citadelSide === 'left' ? 110 : 111;
  return pos.y * 11 + pos.x;
}

function pieceSideAt(position: Position, sq: SquareIndex): string | null {
  if (sq === 110) {
    const o = position.citadels.topLeft.occupant as unknown as { side: string } | null;
    return o ? o.side : null;
  }
  if (sq === 111) {
    const o = position.citadels.bottomRight.occupant as unknown as { side: string } | null;
    return o ? o.side : null;
  }
  const p = (position.board as unknown as ({ side: string } | null)[])[sq];
  return p ? p.side : null;
}

/**
 * Rehberli ders tahtası — oyna ekranlarındaki tahtanın (BoardGrid,
 * pieces/ PNG taşları) aynısı. Motor konumu (`Position`) yalnızca
 * `positionToLegacyBoardAndCitadels` ile görüntüye çevrilir; kural
 * hesapları çekirdekte kalır. Klavye: hücreler odaklanabilir
 * (cellA11y), Enter/Space tıkla aynı işi yapar, Escape seçimi bırakır.
 */
export const GuidedBoard: FC<GuidedBoardProps> = ({
  position,
  mode,
  selected,
  onSelect,
  onSquare,
  onMove,
  onSwap,
}) => {
  const { board, citadels } = useMemo(() => positionToLegacyBoardAndCitadels(position), [position]);

  const selectedPos = useMemo(
    () => (selected === null ? null : squareToLegacy(selected)),
    [selected],
  );

  // Seçili taşın yasal hedefleri — oyun tahtasının kendi göstergesi.
  const validMoves = useMemo(() => {
    if (mode !== 'move' || selected === null) return [];
    return generateLegalMoves(position)
      .filter((m) => m.from === selected)
      .map((m) => ({ from: squareToLegacy(m.from), to: squareToLegacy(m.to) }));
  }, [mode, position, selected]);

  const click = useCallback(
    (sq: SquareIndex) => {
      if (mode === 'locked') return;
      if (mode === 'square') {
        onSquare(sq);
        return;
      }
      if (mode === 'swap') {
        onSwap(sq);
        return;
      }
      if (selected === null) {
        if (pieceSideAt(position, sq) === position.sideToMove) onSelect(sq);
        return;
      }
      if (sq === selected) {
        onSelect(null);
        return;
      }
      if (pieceSideAt(position, sq) === position.sideToMove) {
        onSelect(sq);
        return;
      }
      onMove(selected, sq);
      onSelect(null);
    },
    [mode, position, selected, onSelect, onSquare, onMove, onSwap],
  );

  const handleDrop = useCallback(
    (fromSq: SquareIndex, toSq: SquareIndex) => {
      if (mode === 'move') {
        if (fromSq === toSq) return;
        if (pieceSideAt(position, fromSq) !== position.sideToMove) return;
        onMove(fromSq, toSq);
        onSelect(null);
        return;
      }
      if (mode === 'swap') {
        onSwap(toSq);
      }
    },
    [mode, position, onMove, onSelect, onSwap],
  );

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape') onSelect(null);
      }}
    >
      <BoardGrid
        board={board}
        citadels={citadels}
        selectedPos={selectedPos}
        validMoves={validMoves}
        turn={position.sideToMove}
        cellA11y
        onSquareClick={(pos) => click(legacyToSquare(pos))}
        onDropMove={(from, to) => handleDrop(legacyToSquare(from), legacyToSquare(to))}
      />
    </div>
  );
};
