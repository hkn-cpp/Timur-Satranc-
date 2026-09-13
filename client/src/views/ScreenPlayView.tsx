import React, { FC, useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { Header } from '../components/game/Header';
import { PlayerCard } from '../components/game/PlayerCard';
import { BoardContainer } from '../components/game/BoardContainer';
import { BottomToolbar } from '../components/game/BottomToolbar';
import { GameOverModal, GameOverMode } from '../components/game/GameOverModal';
import { PromotionModal } from '../components/board/PromotionModal';
import { useCheckFlash } from '../components/board/CheckFlash';
import { GameReviewView } from './GameReviewView';
import { SelfAnalysisView } from './SelfAnalysisView';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';
import { legacyGameStateToPosition } from '../worker/legacyAdapter';
import { ArrowCounterClockwise, Flag, Handshake, Play, Pause, X, House } from '@phosphor-icons/react';
import { NotificationType, PlayerColor } from '../types';
import { BoardMatrix, CitadelState } from '../types/chess';
import type { BotProfileId } from '../bot/profiles';
import { saveBotCrown } from '../components/BotSelectPage';

interface ScreenPlayViewProps {
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  whiteName?: string;
  blackName?: string;
  boardRotates?: boolean;
  initialBoard?: BoardMatrix;
  initialCitadels?: CitadelState;
  initialTurn?: PlayerColor;
  /** Game-over modal variant: local (default), bot veya online. */
  gameOverMode?: GameOverMode;
  /** Bot modu ekstraları */
  botDifficultyLabel?: string;
  /** Bu renk bot tarafından oynanır (verilmezse iki kişilik yerel oyun). */
  botSide?: PlayerColor | null;
  botProfileId?: BotProfileId;
  playerAccuracy?: number;
  /** Online modu ekstraları */
  eloDelta?: number;
  whiteRating?: number;
  blackRating?: number;
  onExit: () => void;
  showNotification?: (message: string, type?: NotificationType) => void;
}

export const ScreenPlayView: FC<ScreenPlayViewProps> = ({
  initialTimeSeconds = 600,
  incrementSeconds = 0,
  whiteName = 'hknclp',
  blackName = 'misafir',
  boardRotates = false,
  initialBoard,
  initialCitadels,
  initialTurn,
  onExit,
  showNotification,
  gameOverMode = 'local',
  botDifficultyLabel,
  botSide = null,
  botProfileId,
  playerAccuracy,
  eloDelta,
  whiteRating,
  blackRating,
}: ScreenPlayViewProps) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  /** Alt görünüm yönlendirmesi: oyun / otomatik inceleme / serbest sandbox. */
  const [subView, setSubView] = useState<'game' | 'review' | 'analysis'>('game');
  /** Game-over modalı X ile kapatılabilir (tahtayı incelemek için). */
  const [showGameOver, setShowGameOver] = useState(true);

  // İnceleme/analiz subView'ları hook'u unmount etmez (early return hook'tan
  // sonra gelir); saat işlemesin diye kimin beklettiğini izleyen bayrak.
  const pausedBySubView = useRef(false);

  // Timur Chess Gameplay Engine Hook
  const {
    // Live State
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    botThinking,
    statusText,
    selectedPos,
    validMoves,
    pendingPromotion,

    // History Display State
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,

    // Actions & Navigation
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    togglePause,
    resetGame,
    resignGame,
    agreeDraw,
    canGoPrevious,
    canGoNext,
  } = useGame({
    initialTimeSeconds,
    incrementSeconds,
    whiteName,
    blackName,
    boardRotates,
    initialBoard,
    initialCitadels,
    initialTurn,
    botSide,
    botProfileId,
    onMoveMade: (_move, _notation) => {
      // Optional sound or notification
    },
    onGameOver: (_winner, _reason) => {
      // Game over modal is displayed directly
    },
  });

  // Calculate material difference for both players
  const { whiteAdvantage, blackAdvantage } = useMemo(() => {
    const res = defaultMaterialCalculator.calculateAdvantage(displayedCapturedPieces);
    return {
      whiteAdvantage: res.leader === 'white' ? res.advantage : 0,
      blackAdvantage: res.leader === 'black' ? res.advantage : 0,
    };
  }, [displayedCapturedPieces]);

  // Şah çekilince tahtada 0.4sn "ŞAH!" bildirimi
  const showCheckFlash = useCheckFlash(historyEntries);

  // Yeni oyun sonu geldiğinde modalı tekrar göster ve bot modunda kazanıldıysa taç kaydet
  useEffect(() => {
    if (gameState.isGameOver) {
      setShowGameOver(true);
      if (gameOverMode === 'bot' && botProfileId) {
        const humanSide = botSide === 'white' ? 'black' : 'white';
        if (gameState.winner === humanSide) {
          saveBotCrown(botProfileId, 3);
        }
      }
    }
  }, [gameState.isGameOver, gameOverMode, botProfileId, botSide, gameState.winner]);

  // İnceleme/analiz subView'ları hook'u unmount etmez (early return hook'tan
  // sonra gelir); dış maçın saati işlemesin diye oyunu beklet, dönüşte
  // yalnızca bizim beklettiğimizi çöz (resetGame zaten unpause eder).
  useEffect(() => {
    if (subView !== 'game' && !isPaused) {
      pausedBySubView.current = true;
      togglePause();
    } else if (subView === 'game' && pausedBySubView.current) {
      pausedBySubView.current = false;
      togglePause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView]);

  const onResetClick = () => {
    pausedBySubView.current = false;
    resetGame();
    setIsOptionsOpen(false);
    setShowGameOver(true);
    setSubView('game');
  };

  const onShareClick = () => {
    const text = `${whiteName} - ${blackName}: ${statusText} (${gameState.moveHistory.length} hamle)`;
    try {
      void navigator.clipboard?.writeText(text);
      showNotification?.('Oyun sonucu panoya kopyalandı', 'success');
    } catch {
      showNotification?.('Paylaşım hazır: ' + text, 'info');
    }
  };

  const onResignClick = (player: PlayerColor) => {
    resignGame(player);
    setIsOptionsOpen(false);
  };

  const onDrawClick = () => {
    agreeDraw();
    setIsOptionsOpen(false);
  };

  // ── Alt görünüm yönlendirmesi (durum korunur: hook unmount olmaz) ──
  const reviewInitialPosition = useMemo(
    () =>
      initialBoard
        ? legacyGameStateToPosition({
            board: initialBoard,
            citadels: initialCitadels ?? { whiteCitadelPiece: null, blackCitadelPiece: null },
            currentTurn: initialTurn ?? 'white',
            halfMoveClock: 0,
            turnNumber: 1,
            hasUsedKingSwap: { white: false, black: false },
          } as unknown as Parameters<typeof legacyGameStateToPosition>[0])
        : undefined,
    [initialBoard, initialCitadels, initialTurn],
  );
  if (subView === 'review') {
    return (
      <GameReviewView
        historyEntries={historyEntries}
        whiteName={whiteName}
        blackName={blackName}
        winner={gameState.winner}
        statusText={statusText}
        onBack={() => setSubView('game')}
        onOpenSelfAnalysis={() => setSubView('analysis')}
        onRematch={onResetClick}
        initialPosition={reviewInitialPosition}
      />
    );
  }

  if (subView === 'analysis') {
    return (
      <SelfAnalysisView
        whiteName={whiteName}
        blackName={blackName}
        initialBoard={gameState.board}
        initialCitadels={gameState.citadels}
        initialTurn={gameState.currentTurn}
        initialTimeSeconds={0}
        onExit={() => setSubView('game')}
        showNotification={showNotification}
      />
    );
  }

  return (
    <div className="mobile-screen flex flex-col justify-between bg-[#153423] text-white relative overflow-hidden select-none">
      {/* 1. ÜST HEADER: Oyun İkonu + Başlık + Entegre Notasyon Barı */}
      <Header
        onBack={() => setIsOptionsOpen(true)}
        gameTypeTitle="Ekranda oyna"
        historyEntries={historyEntries}
        viewedMoveIndex={viewedMoveIndex}
        onSelectMove={goToMove}
      />

      {/* Bot düşünme göstergesi (yalnızca bot modunda, sıra bottayken görünür) */}
      {botThinking && !gameState.isGameOver && (
        <div className="flex justify-center relative z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full px-4 py-1 text-xs font-bold text-[#00e5ff] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
            Bot düşünüyor…
          </div>
        </div>
      )}

      {/* 2. OYUN ALANI (Mobil: dikey — Desktop: tahta + yan panel) */}
      <div className="flex-1 flex flex-col justify-between items-center px-[var(--gutter)] py-1 relative z-10 w-full max-w-lg md:max-w-2xl mx-auto overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:max-w-6xl lg:items-start">
        <div className="min-w-0 w-full flex flex-col justify-between items-center gap-2">
        {/* Üst Oyuncu (Siyah / misafir) */}
        <PlayerCard
          name={blackName}
          side="black"
          timeSeconds={blackTime}
          isActive={gameState.currentTurn === 'black' && !gameState.isGameOver}
          isTopPlayer={true}
          capturedPieces={displayedCapturedPieces.white}
          materialAdvantage={blackAdvantage}
        />

        {/* Ortadaki 11x10 Tahta Kapsayıcısı (Board & Hisarlar) */}
        <BoardContainer
          board={displayedBoard}
          citadels={displayedCitadels}
          selectedPos={selectedPos}
          validMoves={validMoves}
          lastMove={displayedLastMove}
          turn={gameState.currentTurn}
          boardRotates={boardRotates}
          onSquareClick={handleSelectSquare}
          onDropMove={handleDropMove}
          showCheckFlash={showCheckFlash}
        />

        {/* Alt Oyuncu (Beyaz / hknclp) */}
        <PlayerCard
          name={whiteName}
          side="white"
          timeSeconds={whiteTime}
          isActive={gameState.currentTurn === 'white' && !gameState.isGameOver}
          isTopPlayer={false}
          capturedPieces={displayedCapturedPieces.black}
          materialAdvantage={whiteAdvantage}
        />
        </div>

        {/* 3. YAN PANEL ARAÇ ÇUBUĞU (Mobil: alt bar — Desktop: sağ panel) */}
        <BottomToolbar
          onOptions={() => setIsOptionsOpen(true)}
          onTogglePause={togglePause}
          isPaused={isPaused}
          onSelfAnalysis={() => setSubView('analysis')}
          analysisHidden={!gameState.isGameOver}
          onPrevious={goToPreviousMove}
          onNext={goToNextMove}
          canPrevious={canGoPrevious}
          canNext={canGoNext}
        />
      </div>

      {/* ─── PİYON TERFİ MODALI ────────────────────────────────────── */}
      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.piece.color}
          defaultPromotionType={pendingPromotion.defaultType}
          onSelectPromotion={resolvePromotion}
        />
      )}

      {/* ─── SEÇENEKLER MODALI (Options Modal) ────────────────────────── */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">
                Oyun Seçenekleri
              </h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Duraklat / Devam Et */}
              <button
                onClick={() => {
                  togglePause();
                  setIsOptionsOpen(false);
                }}
                className="w-full bg-[#f4eedd] hover:bg-[#eae2cf] active:scale-98 text-[#141f1b] font-batangas font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer text-sm"
              >
                {isPaused ? <Play size={18} weight="fill" /> : <Pause size={18} weight="fill" />}
                <span>{isPaused ? 'Oyuna Devam Et' : 'Oyunu Duraklat'}</span>
              </button>

              {/* Yeniden Başlat */}
              <button
                onClick={onResetClick}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm"
              >
                <ArrowCounterClockwise size={18} weight="bold" className="text-[#00d4c4]" />
                <span>Yeniden Başlat</span>
              </button>

              {/* Beraberlik Teklif Et */}
              <button
                onClick={onDrawClick}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm"
              >
                <Handshake size={18} weight="bold" className="text-amber-300" />
                <span>Beraberlik Teklif Et / Bitir</span>
              </button>

              {/* Terk Et */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onResignClick('white')}
                  className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Flag size={14} weight="bold" />
                  <span>Beyaz Terk</span>
                </button>
                <button
                  onClick={() => onResignClick('black')}
                  className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Flag size={14} weight="bold" />
                  <span>Siyah Terk</span>
                </button>
              </div>

              {/* Ana Menüye Dön */}
              <button
                onClick={onExit}
                className="w-full mt-2 bg-black/40 hover:bg-black/60 active:scale-98 text-white/70 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer text-sm"
              >
                <House size={18} weight="bold" />
                <span>Ana Menüye Çık</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OYUN BİTTİ MODALI (Game Over Modal — local/bot/online) ────── */}
      {gameState.isGameOver && showGameOver && (
        <GameOverModal
          mode={gameOverMode}
          winner={gameState.winner}
          status={gameState.status}
          statusText={statusText}
          whiteName={whiteName}
          blackName={blackName}
          totalMoves={gameState.moveHistory.length}
          playerAccuracy={playerAccuracy}
          botDifficultyLabel={botDifficultyLabel}
          playerWon={
            gameOverMode === 'bot'
              ? gameState.winner === (botSide === 'white' ? 'black' : 'white')
              : undefined
          }
          eloDelta={eloDelta}
          whiteRating={whiteRating}
          blackRating={blackRating}
          onGameReview={() => setSubView('review')}
          onSelfAnalysis={() => setSubView('analysis')}
          onRematch={onResetClick}
          onNewGame={onExit}
          onRetry={onResetClick}
          onChangeBot={onExit}
          onRequestRematch={onResetClick}
          onFindOpponent={onExit}
          onClose={() => setShowGameOver(false)}
          onShare={onShareClick}
        />
      )}
    </div>
  );
};
