import React, { FC, useMemo, useState } from 'react';
import { BoardMatrix, BoardPosition, CitadelState, Move, Piece, PieceType, PlayerColor, PIECE_METADATA } from '../../types/chess';
import { PieceView } from './PieceView';
import { CitadelBadge } from './CitadelBadge';
import { CheckFlash } from './CheckFlash';
import { COLUMN_LETTERS } from '../../core/notation';

interface BoardGridProps {
  board: BoardMatrix;
  citadels: CitadelState;
  selectedPos: BoardPosition | null;
  validMoves: Move[];
  lastMove?: Move | null;
  hintMove?: { from: BoardPosition; to: BoardPosition } | null;
  turn?: PlayerColor;
  boardRotates?: boolean;
  isEditorMode?: boolean;
  flipped?: boolean;
  /** Yeni şah hamlesinde 0.4sn "ŞAH!" bildirimi gösterir. */
  showCheckFlash?: boolean;
  /**
   * Rehberli ders erişilebilirliği (varsayılan kapalı — mevcut ekranlarda
   * davranış/görünüm değişmez): kareler odaklanabilir olur, Türkçe
   * aria-label taşır, Enter/Space tıklama ile aynı işlemi yapar.
   */
  cellA11y?: boolean;
  onSquareClick: (pos: BoardPosition) => void;
  onSquareDoubleClick?: (pos: BoardPosition) => void;
  onDropMove?: (from: BoardPosition, to: BoardPosition) => void;
  onDropFromPalette?: (type: PieceType, color: PlayerColor, to: BoardPosition) => void;
  onPieceDragStart?: (from: BoardPosition) => void;
  onPieceDragEnd?: () => void;
}

export const BoardGrid: FC<BoardGridProps> = ({
  board,
  citadels,
  selectedPos,
  validMoves,
  lastMove,
  hintMove,
  turn = 'white',
  boardRotates = false,
  isEditorMode = false,
  flipped = false,
  showCheckFlash = false,
  cellA11y = false,
  onSquareClick,
  onSquareDoubleClick,
  onDropMove,
  onDropFromPalette,
  onPieceDragStart,
  onPieceDragEnd,
}) => {
  const isRotated = flipped || (boardRotates && turn === 'black');
  const [dragOverPos, setDragOverPos] = useState<string | null>(null);
  const [draggingFromKey, setDraggingFromKey] = useState<string | null>(null);

  // Map valid moves by coordinate for O(1) lookup
  const validMoveMap = useMemo(() => {
    const map = new Map<string, Move>();
    for (const move of validMoves) {
      if (move.to.isCitadel) {
        map.set(`citadel-${move.to.citadelSide}`, move);
      } else {
        map.set(`${move.to.x},${move.to.y}`, move);
      }
    }
    return map;
  }, [validMoves]);

  // Standard display rows (Rank 10 down to 1 / Y=9 down to 0)
  const rows = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, posKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPos !== posKey) {
      setDragOverPos(posKey);
    }
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLDivElement>, posKey: string) => {
    if (dragOverPos === posKey) {
      setDragOverPos(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPos: BoardPosition) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPos(null);
    setDraggingFromKey(null);
    onPieceDragEnd?.();

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'palettePiece') {
        onDropFromPalette?.(data.pieceType, data.color, targetPos);
      } else if (data.type === 'piece' && data.from) {
        const from: BoardPosition = data.from;
        // Aynı kareye bırakıldıysa işlem yapma
        if (
          !from.isCitadel && !targetPos.isCitadel &&
          from.x === targetPos.x && from.y === targetPos.y
        ) {
          return;
        }
        if (onDropMove) {
          onDropMove(from, targetPos);
        } else {
          // Fallback: tıklama simülasyonu
          onSquareClick(from);
          onSquareClick(targetPos);
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleDragEnd = () => {
    setDraggingFromKey(null);
    setDragOverPos(null);
    onPieceDragEnd?.();
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center p-1 sm:p-2 select-none overflow-visible">
      {/* 11x10 Outer Board Frame */}
      <div
        className="board-frame relative w-full max-w-[min(100%,clamp(300px,80vmin,760px))] aspect-[11/10] bg-[#3a200f] rounded-xl p-1 sm:p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-[#7a4f2c]"
        style={{
          transform: isRotated ? 'rotate(180deg)' : undefined,
        }}
      >
        {/* Black Citadel (Left of Row 9 / Y=8) */}
        <CitadelBadge
          side="left"
          targetRow={8}
          piece={citadels.blackCitadelPiece}
          isValidMoveTarget={validMoveMap.has('citadel-left')}
          isDragOver={dragOverPos === 'citadel-left'}
          isDraggingSource={draggingFromKey === 'citadel-left'}
          onCitadelClick={onSquareClick}
          onCitadelDoubleClick={onSquareDoubleClick}
          onCitadelDrop={(e, pos) => handleDrop(e, pos)}
          onCitadelDragOver={() => setDragOverPos('citadel-left')}
          onCitadelDragLeave={() => setDragOverPos((p) => (p === 'citadel-left' ? null : p))}
          onCitadelDragStart={() => {
            setDraggingFromKey('citadel-left');
            onPieceDragStart?.({ x: -1, y: 8, isCitadel: true, citadelSide: 'left' });
          }}
          onCitadelDragEnd={handleDragEnd}
          currentTurn={turn}
          boardRotates={boardRotates}
          flipped={flipped}
        />

        {/* White Citadel (Right of Row 2 / Y=1) */}
        <CitadelBadge
          side="right"
          targetRow={1}
          piece={citadels.whiteCitadelPiece}
          isValidMoveTarget={validMoveMap.has('citadel-right')}
          isDragOver={dragOverPos === 'citadel-right'}
          isDraggingSource={draggingFromKey === 'citadel-right'}
          onCitadelClick={onSquareClick}
          onCitadelDoubleClick={onSquareDoubleClick}
          onCitadelDrop={(e, pos) => handleDrop(e, pos)}
          onCitadelDragOver={() => setDragOverPos('citadel-right')}
          onCitadelDragLeave={() => setDragOverPos((p) => (p === 'citadel-right' ? null : p))}
          onCitadelDragStart={() => {
            setDraggingFromKey('citadel-right');
            onPieceDragStart?.({ x: 11, y: 1, isCitadel: true, citadelSide: 'right' });
          }}
          onCitadelDragEnd={handleDragEnd}
          currentTurn={turn}
          boardRotates={boardRotates}
          flipped={flipped}
        />

        {/* 11x10 Inner Board Grid */}
        <div
          className="w-full h-full grid grid-rows-10 border border-[#2b180d] rounded-lg overflow-hidden shadow-inner"
          {...(cellA11y ? { role: 'grid' as const, 'aria-label': 'Timur Satrancı tahtası' } : {})}
        >
          {rows.map((y) => (
            <div key={y} className="grid grid-cols-11 w-full h-full">
              {cols.map((x) => {
                const piece = board[y][x];
                const isDarkSquare = (x + y) % 2 === 1;
                const isSelected = selectedPos?.x === x && selectedPos?.y === y && !selectedPos.isCitadel;
                const posKey = `${x},${y}`;
                const moveOption = validMoveMap.get(posKey);
                const isMoveTarget = Boolean(moveOption);
                const isCaptureTarget = isMoveTarget && Boolean(piece);
                const isLastMoveSquare =
                  lastMove &&
                  ((lastMove.from.x === x && lastMove.from.y === y && !lastMove.from.isCitadel) ||
                    (lastMove.to.x === x && lastMove.to.y === y && !lastMove.to.isCitadel));
                const isHovered = dragOverPos === posKey;
                const isDraggingSource = draggingFromKey === posKey;

                // İpucu (Hint) Vurguları
                const isHintFrom = hintMove && !hintMove.from.isCitadel && hintMove.from.x === x && hintMove.from.y === y;
                const isHintTo = hintMove && !hintMove.to.isCitadel && hintMove.to.x === x && hintMove.to.y === y;

                // Taş Kayma (Slide) Animasyonu
                const isLastMoveDestination =
                  lastMove &&
                  !lastMove.to.isCitadel &&
                  lastMove.to.x === x &&
                  lastMove.to.y === y &&
                  !lastMove.from.isCitadel;

                const slideStyle = isLastMoveDestination
                  ? ({
                      '--slide-x': `${(lastMove.from.x - x) * 100}%`,
                      '--slide-y': `${(y - lastMove.from.y) * 100}%`,
                    } as React.CSSProperties)
                  : undefined;

                return (
                  <div
                    key={posKey}
                    data-square={y * 11 + x}
                    onClick={() => onSquareClick({ x, y })}
                    onDoubleClick={() => onSquareDoubleClick?.({ x, y })}
                    onDragOver={(e) => handleDragOver(e, posKey)}
                    onDragLeave={(e) => handleDragLeave(e, posKey)}
                    onDrop={(e) => handleDrop(e, { x, y })}
                    {...(cellA11y
                      ? {
                          role: 'button' as const,
                          tabIndex: 0,
                          'aria-label': `${COLUMN_LETTERS[x]}${y + 1}, ${
                            piece ? PIECE_METADATA[piece.type]?.nameTr ?? piece.type : 'boş kare'
                          }`,
                          onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSquareClick({ x, y });
                            }
                          },
                        }
                      : {})}
                    className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors duration-100 ${
                      isDarkSquare ? 'bg-[#916239]' : 'bg-[#cba476]'
                    } ${
                      isSelected
                        ? 'bg-amber-300/60 ring-2 ring-inset ring-amber-400 z-10'
                        : isHintTo
                        ? 'bg-emerald-500/40 ring-4 ring-inset ring-emerald-400 z-20 animate-pulse'
                        : isHintFrom
                        ? 'bg-emerald-400/30 ring-2 ring-inset ring-emerald-400 z-20'
                        : isHovered
                        ? 'bg-[#00d4c4]/40 ring-2 ring-inset ring-[#00d4c4] z-10'
                        : isLastMoveSquare
                        ? 'bg-amber-500/25'
                        : ''
                    }`}
                  >
                    {/* Rank Number Label on left edge (Column 0) */}
                    {x === 0 && (
                      <span
                        className={`absolute top-0.5 left-0.5 text-[8px] font-extrabold pointer-events-none select-none ${
                          isDarkSquare
                            ? 'text-amber-100 opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                            : 'text-[#381f0d] opacity-85'
                        }`}
                        style={{
                          transform: isRotated ? 'rotate(180deg)' : undefined,
                        }}
                      >
                        {y + 1}
                      </span>
                    )}

                    {/* Column Letter Label on bottom edge (Row 0) */}
                    {y === 0 && (
                      <span
                        className={`absolute bottom-0.5 right-0.5 text-[8px] font-extrabold pointer-events-none select-none uppercase ${
                          isDarkSquare
                            ? 'text-amber-100 opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                            : 'text-[#381f0d] opacity-85'
                        }`}
                        style={{
                          transform: isRotated ? 'rotate(180deg)' : undefined,
                        }}
                      >
                        {COLUMN_LETTERS[x]}
                      </span>
                    )}

                    {/* Piece View with Slide Animation */}
                    {piece && (
                      <div
                        draggable
                        style={slideStyle}
                        className={`w-full h-full flex items-center justify-center transition-opacity ${
                          isDraggingSource ? 'opacity-30' : 'opacity-100'
                        } ${isLastMoveDestination ? 'animate-piece-slide' : ''}`}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggingFromKey(posKey);
                          onPieceDragStart?.({ x, y });
                          try {
                            // İçteki PieceView handler'ı çalışmazsa (iç içe draggable'da
                            // tarayıcı dış öğeyi kaynak seçebilir) drop sessizce düşerdi.
                            // Kaynağı kapanış (closure) koordinatından yaz: piece.position
                            // bayatlığına da dayanıklıdır.
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ type: 'piece', from: { x, y } })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                            const img = (e.currentTarget as HTMLDivElement).querySelector('img');
                            if (img) {
                              e.dataTransfer.setDragImage(img, img.clientWidth / 2, img.clientHeight / 2);
                            }
                          } catch {
                            /* ignore */
                          }
                        }}
                        onDragEnd={handleDragEnd}
                      >
                        <PieceView
                          piece={piece}
                          isSelected={isSelected}
                          isTarget={isCaptureTarget}
                          currentTurn={turn}
                          boardRotates={boardRotates}
                          flipped={flipped}
                        />
                      </div>
                    )}

                    {/* Hint destination indicator */}
                    {isHintTo && !piece && (
                      <div className="absolute w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-emerald-300/80 shadow-lg animate-ping pointer-events-none" />
                    )}

                    {/* Move Indicators */}
                    {isMoveTarget && !piece && !isHintTo && (
                      <div className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#00d4c4] ring-2 ring-black/40 shadow-md animate-pulse pointer-events-none" />
                    )}

                    {isCaptureTarget && (
                      <div className="absolute inset-0.5 border-2 border-red-500/90 rounded-md bg-red-600/20 shadow-sm animate-pulse pointer-events-none z-10" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Şah bildirimi (tahta çerçevesi içinde ortalanır, tıklamayı engellemez) */}
        <CheckFlash
          show={showCheckFlash}
          style={isRotated ? { transform: 'rotate(180deg)' } : undefined}
        />
      </div>
    </div>
  );
};
