import React, { FC, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  FloppyDisk,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useGame } from '../hooks/useGame';
import { Header } from '../components/game/Header';
import { BoardContainer } from '../components/game/BoardContainer';
import { BottomToolbar } from '../components/game/BottomToolbar';
import { BoardMatrix, CitadelState, PlayerColor } from '../types/chess';
import {
  evaluateCapturedSnapshot,
  evalToWhiteShare,
  formatEval,
} from '../analysis/analysisEngine';
import { legacyGameStateToPosition, legacyGameStateToSerialized, positionToLegacyBoardAndCitadels } from '../worker/legacyAdapter';
import { deserializePosition, type SerializedPosition } from '../worker/protocol';
import { fullEvaluate } from '../engine/fullEvaluation';

export interface SelfAnalysisViewProps {
  title?: string;
  whiteName?: string;
  blackName?: string;
  initialBoard?: BoardMatrix;
  initialCitadels?: CitadelState;
  initialTurn?: PlayerColor;
  initialTimeSeconds?: number;
  onExit: () => void;
  showNotification?: (message: string, type?: 'info' | 'success' | 'error') => void;
}

interface Variation {
  id: number;
  name: string;
  forkPly: number;
  /** Snapshot of notations forked at creation + appended sandbox notes. */
  moves: string[];
  snapshotBefore: SerializedPosition;
  createdAtMove: number;
}

/**
 * Analiz Motoru (Kendi Kendine Analiz) — serbest sandbox.
 * İki taraf da serbestçe oynanabilir, canlı değerlendirme çubuğu ve
 * orijinal maç geçmişine dokunmayan varyasyon ağacı editörü içerir.
 */
export const SelfAnalysisView: FC<SelfAnalysisViewProps> = ({
  title = 'Analiz Motoru',
  whiteName = 'Beyaz',
  blackName = 'Siyah',
  initialBoard,
  initialCitadels,
  initialTurn,
  initialTimeSeconds = 0,
  onExit,
  showNotification,
}) => {
  const game = useGame({
    initialTimeSeconds,
    incrementSeconds: 0,
    whiteName,
    blackName,
    initialBoard,
    initialCitadels,
    initialTurn,
  });

  const [evalBarOn, setEvalBarOn] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const liveEval = useMemo(() => {
    const fallback = evaluateCapturedSnapshot(game.displayedCapturedPieces);
    const gs = game.gameState;
    if (gs.isCheckmate || gs.isStalemate || gs.winner) {
      if (gs.winner === 'white') return 20;
      if (gs.winner === 'black') return -20;
      return 0;
    }
    try {
      const pos = legacyGameStateToPosition(gs);
      const cp = fullEvaluate(pos);
      const whitePawns = pos.sideToMove === 'white' ? cp / 100 : -cp / 100;
      return Number.isNaN(whitePawns) ? fallback : whitePawns;
    } catch {
      return fallback;
    }
  }, [game.gameState, game.displayedCapturedPieces]);
  const whiteShare = evalToWhiteShare(liveEval);

  const currentMoveNo = game.historyEntries.length;

  const addVariation = () => {
    const id = Date.now();
    const fork = game.historyEntries.map((e) => e.notation);
    const forkPly = currentMoveNo;
    const snapshotBefore = legacyGameStateToSerialized(game.gameState);
    setVariations((prev) => [
      ...prev,
      {
        id,
        name: `Varyasyon ${prev.length + 1}`,
        forkPly,
        moves: [...fork],
        snapshotBefore,
        createdAtMove: currentMoveNo,
      },
    ]);
    showNotification?.('Varyasyon eklendi (orijinal geçmiş korunuyor)', 'success');
  };

  const appendLineToVariation = (id: number) => {
    const currentLine = game.historyEntries.map((e) => e.notation);
    setVariations((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const forkLen = v.forkPly ?? v.createdAtMove;
        return { ...v, moves: [...v.moves.slice(0, forkLen), ...currentLine.slice(forkLen)] };
      }),
    );
    showNotification?.('Varyasyon güncel çizgiyle güncellendi', 'info');
  };

  const deleteVariation = (id: number) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
    setPreviewId((prev) => (prev === id ? null : prev));
  };

  const saveVariationName = () => {
    if (editingId === null) return;
    const name = draftName.trim() || 'Varyasyon';
    setVariations((prev) => prev.map((v) => (v.id === editingId ? { ...v, name } : v)));
    setEditingId(null);
    setDraftName('');
  };

  return (
    <div className="mobile-screen flex flex-col justify-between bg-[#153423] text-white relative overflow-hidden select-none">
      <Header
        onBack={onExit}
        gameTypeTitle={title}
        historyEntries={game.historyEntries}
        viewedMoveIndex={game.viewedMoveIndex}
        onSelectMove={game.goToMove}
      />

      {/* Canlı değerlendirme çubuğu */}
      {evalBarOn && (
        <div className="w-full max-w-lg mx-auto px-3 pt-2 lg:max-w-6xl lg:px-[var(--gutter)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/60 w-10 text-right">{formatEval(liveEval)}</span>
            <div
              className="flex-1 h-4 rounded-full overflow-hidden border border-white/15 bg-[#2b2b2b] flex"
              role="meter"
              aria-valuenow={whiteShare}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Motor değerlendirmesi"
            >
              <div className="bg-[#f4eedd] h-full transition-all" style={{ width: `${whiteShare}%` }} />
              <div className="bg-[#1a1a1a] h-full flex-1" />
            </div>
            <button
              onClick={() => setEvalBarOn(false)}
              className="text-[11px] font-bold text-white/60 hover:text-white px-1 cursor-pointer"
            >
              Gizle
            </button>
          </div>
          <p className="text-[10px] text-white/40 font-semibold mt-1">
            Serbest tahta — iki tarafı da oynayabilirsin. Süre işlemez, sonuç kaydedilmez.
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between items-center px-[var(--gutter)] py-1 relative z-10 w-full max-w-lg md:max-w-2xl mx-auto overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:max-w-6xl lg:items-start">
        <div className="min-w-0 w-full flex flex-col items-center">
        <BoardContainer
          board={game.displayedBoard}
          citadels={game.displayedCitadels}
          selectedPos={game.selectedPos}
          validMoves={game.validMoves}
          lastMove={game.displayedLastMove}
          turn={game.gameState.currentTurn}
          flipped={flipped}
          onSquareClick={game.handleSelectSquare}
          onDropMove={game.handleDropMove}
        />
        </div>

        {/* Varyasyon ağacı editörü (Mobil: altta — Desktop: sağ panel) */}
        <div className="w-full bg-[#1c3829] border border-white/10 rounded-2xl p-3 mt-1 max-h-44 overflow-y-auto custom-scrollbar lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:max-h-[70vh] lg:mt-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Varyasyonlar ({variations.length})
            </span>
            <div className="flex items-center gap-1.5">
              {!evalBarOn && (
                <button
                  onClick={() => setEvalBarOn(true)}
                  className="text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Değerlendirme: Açık
                </button>
              )}
              <button
                onClick={() => setFlipped((f) => !f)}
                className="text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Tahtayı Çevir
              </button>
              <button
                onClick={addVariation}
                className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus size={13} weight="bold" /> Ekle
              </button>
            </div>
          </div>

          {variations.length === 0 && (
            <p className="text-xs text-white/50">
              Henüz varyasyon yok. Mevcut konumdan çatallanan yeni bir çizgi denemek için “Ekle”ye bas —
              orijinal maç geçmişi değişmez.
            </p>
          )}

          {variations.map((v) => (
            <div key={v.id} className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-2 mb-1.5">
              {editingId === v.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 bg-white/10 rounded-lg px-2 py-1.5 text-xs font-bold outline-none border border-emerald-500/50"
                    placeholder="Varyasyon adı"
                  />
                  <button
                    onClick={saveVariationName}
                    className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 px-2.5 py-1.5 rounded-lg cursor-pointer"
                  >
                    <FloppyDisk size={13} /> Kaydet
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">
                    {v.name}
                    <span className="text-white/40 font-semibold"> • {v.moves.length} hamle • @{v.createdAtMove}. hamleden çatal</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                      aria-label="Varyasyonu önizle"
                      title="Çatal anındaki konumu salt-okunur önizle (geçmişe yazılmaz)"
                      className="text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg cursor-pointer"
                    >
                      {previewId === v.id ? 'Kapat' : 'Önizle'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(v.id);
                        setDraftName(v.name);
                      }}
                      aria-label="Yeniden adlandır"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                    >
                      <PencilSimple size={13} />
                    </button>
                    <button
                      onClick={() => appendLineToVariation(v.id)}
                      aria-label="Mevcut çizgiyi ata"
                      title="Mevcut çizgiyi bu varyasyona ata"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                    >
                      <FloppyDisk size={13} />
                    </button>
                    <button
                      onClick={() => deleteVariation(v.id)}
                      aria-label="Varyasyonu sil"
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 cursor-pointer"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              )}
              {v.moves.length > 0 && (
                <p className="text-[11px] text-white/60 font-medium mt-1 truncate">{v.moves.join(' ')}</p>
              )}
            </div>
          ))}

          {previewId !== null &&
            (() => {
              const pv = variations.find((x) => x.id === previewId);
              if (!pv) return null;
              try {
                const pos = deserializePosition(pv.snapshotBefore);
                const preview = positionToLegacyBoardAndCitadels(pos);
                return (
                  <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-2.5 py-2 mb-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">
                        Önizleme: {pv.name}
                        <span className="text-white/40 font-semibold"> • çatal anı (salt-okunur)</span>
                      </span>
                      <button
                        onClick={() => setPreviewId(null)}
                        className="text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Kapat
                      </button>
                    </div>
                    <BoardContainer
                      board={preview.board}
                      citadels={preview.citadels}
                      selectedPos={null}
                      validMoves={[]}
                      onSquareClick={() => {}}
                    />
                    <p className="text-[10px] text-white/40 font-semibold">
                      Önizleme canlı tahtayı değiştirmez — orijinal geçmişe yazılmaz.
                    </p>
                  </div>
                );
              } catch {
                return null;
              }
            })()}
        </div>
      </div>

      <BottomToolbar
        onOptions={() => setIsOptionsOpen(true)}
        onTogglePause={game.togglePause}
        isPaused={game.isPaused}
        pauseHidden={initialTimeSeconds <= 0}
        onSelfAnalysis={() => game.goToLive()}
        onPrevious={game.goToPreviousMove}
        onNext={game.goToNextMove}
        canPrevious={game.canGoPrevious}
        canNext={game.canGoNext}
      />

      {/* Alt bilgi şeridi: geri/ileri + sıfırla */}
      <div className="w-full bg-black/40 border-t border-white/5 px-4 py-1.5 flex items-center justify-center gap-3 text-[11px] text-white/60 font-semibold">
        <button onClick={game.goToPreviousMove} disabled={!game.canGoPrevious} className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
          <CaretLeft size={13} weight="bold" /> Geri
        </button>
        <span>
          {game.historyEntries.length} hamle • Sıra: {game.gameState.currentTurn === 'white' ? whiteName : blackName}
        </span>
        <button onClick={game.goToNextMove} disabled={!game.canGoNext} className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
          İleri <CaretRight size={13} weight="bold" />
        </button>
        <button onClick={game.resetGame} className="flex items-center gap-1 hover:text-white cursor-pointer">
          <ArrowCounterClockwise size={13} /> Sıfırla
        </button>
      </div>

      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">Analiz Seçenekleri</h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                aria-label="Kapat"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
            </div>
            <button
              onClick={() => {
                setEvalBarOn((v) => !v);
                setIsOptionsOpen(false);
              }}
              className="w-full bg-[#274e39] hover:bg-[#326449] text-[#f4eedd] font-bold py-3 px-4 rounded-xl border border-white/10 cursor-pointer text-sm"
            >
              Değerlendirme Çubuğu: {evalBarOn ? 'Açık' : 'Kapalı'}
            </button>
            <button
              onClick={() => {
                game.resetGame();
                setVariations([]);
                setPreviewId(null);
                setEditingId(null);
                setDraftName('');
                setIsOptionsOpen(false);
              }}
              className="w-full bg-[#f4eedd] hover:bg-[#eae2cf] text-[#141f1b] font-bold py-3 px-4 rounded-xl cursor-pointer text-sm"
            >
              Tahtayı Sıfırla
            </button>
            <button
              onClick={onExit}
              className="w-full bg-black/40 hover:bg-black/60 text-white/70 font-semibold py-3 px-4 rounded-xl border border-white/10 cursor-pointer text-sm"
            >
              Analizden Çık
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfAnalysisView;
