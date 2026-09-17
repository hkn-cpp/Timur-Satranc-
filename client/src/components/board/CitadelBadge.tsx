import React, { FC } from 'react';
import { BoardPosition, Piece, PlayerColor } from '../../types/chess';
import { PieceView } from './PieceView';
import { CastleTurret } from '@phosphor-icons/react';

interface CitadelBadgeProps {
  side: 'left' | 'right';
  targetRow: number; // 8 for Black (Row 9, Left), 1 for White (Row 2, Right)
  piece: Piece | null;
  isValidMoveTarget?: boolean;
  isDragOver?: boolean;
  isDraggingSource?: boolean;
  onCitadelClick?: (position: BoardPosition) => void;
  onCitadelDoubleClick?: (position: BoardPosition) => void;
  onCitadelDrop?: (e: React.DragEvent<HTMLDivElement>, pos: BoardPosition) => void;
  onCitadelDragOver?: (pos: BoardPosition) => void;
  onCitadelDragLeave?: () => void;
  onCitadelDragStart?: (pos: BoardPosition) => void;
  onCitadelDragEnd?: () => void;
  currentTurn?: PlayerColor;
  boardRotates?: boolean;
  /** İzleyici siyah taraftaysa true (çerçeve 180° dönüktür) — taş izleyiciye dönük kalır. */
  flipped?: boolean;
}

export const CitadelBadge: FC<CitadelBadgeProps> = ({
  side,
  targetRow,
  piece,
  isValidMoveTarget = false,
  isDragOver = false,
  isDraggingSource = false,
  onCitadelClick,
  onCitadelDoubleClick,
  onCitadelDrop,
  onCitadelDragOver,
  onCitadelDragLeave,
  onCitadelDragStart,
  onCitadelDragEnd,
  currentTurn = 'white',
  boardRotates = false,
  flipped = false,
}) => {
  const isLeft = side === 'left';
  const citadelPos: BoardPosition = {
    x: isLeft ? -1 : 11,
    y: targetRow,
    isCitadel: true,
    citadelSide: side,
  };

  // Row 9 (Y=8) -> 2nd row from top (top: 10%, height: 10%)
  // Row 2 (Y=1) -> 9th row from top (top: 80%, height: 10%)
  const topPercent = isLeft ? '10%' : '80%';

  return (
    <div
      data-square={isLeft ? 110 : 111}
      onClick={() => onCitadelClick?.(citadelPos)}
      onDoubleClick={() => onCitadelDoubleClick?.(citadelPos)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        onCitadelDragOver?.(citadelPos);
      }}
      onDragLeave={() => onCitadelDragLeave?.()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCitadelDrop?.(e, citadelPos);
      }}
      style={{
        height: '10%',
        top: topPercent,
      }}
      className={`absolute z-20 flex items-center justify-center cursor-pointer box-border transition-all duration-200 ${
        isLeft
          ? 'left-[calc(-100%/11)] w-[calc(100%/11)] border-t border-b border-l border-r-0 border-[#2b180d] rounded-l-md'
          : 'right-[calc(-100%/11)] w-[calc(100%/11)] border-t border-b border-r border-l-0 border-[#2b180d] rounded-r-md'
      } ${
        isValidMoveTarget
          ? 'bg-amber-400/90 border-amber-400 shadow-md ring-2 ring-amber-400 z-30'
          : isDragOver
          ? 'bg-[#00d4c4]/50 border-[#00d4c4] shadow-md ring-2 ring-[#00d4c4] z-30'
          : piece
          ? 'bg-[#7c532e] shadow-inner'
          : 'bg-[#5a381d] hover:bg-[#6c4323]'
      } ${isDraggingSource ? 'opacity-30' : ''}`}
      title={isLeft ? 'Siyah Hisar (9. Satır Sol)' : 'Beyaz Hisar (2. Satır Sağ)'}
    >
      {piece ? (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'piece', from: citadelPos }));
            e.dataTransfer.effectAllowed = 'move';
            try {
              const img = (e.currentTarget as HTMLDivElement).querySelector('img');
              if (img) e.dataTransfer.setDragImage(img, img.clientWidth / 2, img.clientHeight / 2);
            } catch {
              /* ignore */
            }
            onCitadelDragStart?.(citadelPos);
          }}
          onDragEnd={() => onCitadelDragEnd?.()}
        >
          <PieceView
            piece={piece}
            size="responsive"
            currentTurn={currentTurn}
            boardRotates={boardRotates}
            flipped={flipped}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-[#d9b382] pointer-events-none select-none">
          <CastleTurret weight="bold" className={`w-[min(58%,20px)] h-auto ${isValidMoveTarget ? 'text-amber-950 animate-bounce' : 'opacity-70'}`} />
          <span className={`hidden min-[420px]:inline text-[max(6px,1.6cqw)] font-extrabold uppercase tracking-tight leading-none mt-0.5 ${
            isValidMoveTarget ? 'text-amber-950 opacity-100' : 'opacity-60'
          }`}>
            {isLeft ? 'Hisar' : 'Hisar'}
          </span>
        </div>
      )}

      {isValidMoveTarget && !piece && (
        <span className="absolute w-[min(38%,14px)] aspect-square bg-[#00d4c4] rounded-full animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
