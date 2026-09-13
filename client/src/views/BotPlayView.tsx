import React, { FC, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { BoardGrid } from '../components/board/BoardGrid';
import { useCheckFlash } from '../components/board/CheckFlash';
import { GameOverModal } from '../components/game/GameOverModal';
import { PromotionModal } from '../components/board/PromotionModal';
import { GameReviewView } from './GameReviewView';
import { SelfAnalysisView } from './SelfAnalysisView';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';
import {
  ArrowLeft,
  Crown,
  Gear,
  List,
  Flag,
  Lightbulb,
  ArrowUUpLeft,
  CaretLeft,
  CaretRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  House,
  ArrowCounterClockwise,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react';
import { NotificationType, PlayerColor } from '../types';
import { BoardPosition } from '../types/chess';
import { BOT_PROFILES, type BotProfileId } from '../bot/profiles';
import { BOT_LEVELS } from '../components/BotSelectPage';
import { saveBotCrown } from '../components/BotSelectPage';
import { legacyGameStateToPosition, squareToLegacy } from '../worker/legacyAdapter';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import { evaluate } from '../engine/evaluate';
import { makeMove } from '../core/rules/makeMove';

interface BotPlayViewProps {
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  whiteName?: string;
  blackName?: string;
  botProfileId: BotProfileId;
  botSide: PlayerColor;
  onExit: () => void;
  showNotification?: (message: string, type?: NotificationType) => void;
}

export const BotPlayView: FC<BotPlayViewProps> = ({
  initialTimeSeconds = 600,
  incrementSeconds = 0,
  whiteName = 'Siz',
  blackName = 'Bot',
  botProfileId,
  botSide,
  onExit,
  showNotification,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [subView, setSubView] = useState<'game' | 'review' | 'analysis'>('game');
  const [showGameOver, setShowGameOver] = useState(true);

  // Taç Sistemi: Maç başında 3 taç ile başlar, ipucu veya geri al kullanıldıkça 2 ve 1'e düşer
  const [matchCrowns, setMatchCrowns] = useState<number>(3);

  // İpucu (Hint) Durumu
  const [hintMove, setHintMove] = useState<{ from: BoardPosition; to: BoardPosition } | null>(null);

  // Bot Diyalog Mesajı
  const botLevel = useMemo(() => {
    return BOT_LEVELS.find((l) => l.id === botProfileId) || BOT_LEVELS[0];
  }, [botProfileId]);

  const [dialogText, setDialogText] = useState<string>(
    'Hazırsan başlayalım! Bakalım beni yenebilecek misin?'
  );

  // Timur Game Core Hook
  const {
    gameState,
    whiteTime,
    blackTime,
    botThinking,
    isPaused,
    statusText,
    selectedPos,
    validMoves,
    lastMove,
    pendingPromotion,
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,
    isViewingHistory,
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    goToLive,
    undoMove,
    togglePause,
    resetGame,
    resignGame,
  } = useGame({
    initialTimeSeconds,
    incrementSeconds,
    whiteName,
    blackName,
    boardRotates: false,
    botSide,
    botProfileId,
  });

  const humanSide: PlayerColor = botSide === 'white' ? 'black' : 'white';
  const isHumanTurn = gameState.currentTurn === humanSide && !gameState.isGameOver;

  // İnceleme/analiz subView'ları hook'u unmount etmez (early return hook'tan
  // sonra gelir); dış maçın saati işlemesin ve bot hamle yapmasın diye
  // oyunu beklet, dönüşte yalnızca bizim beklettiğimizi çöz.
  const pausedBySubView = useRef(false);
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

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dinamik Bot Diyalog Tepkileri
  useEffect(() => {
    if (gameState.isGameOver) {
      if (gameState.winner === humanSide) {
        setDialogText('Tebrikler, harika oynadın! Kazanan sen oldun.');
      } else if (gameState.winner === botSide) {
        setDialogText('Bu sefer kazanan ben oldum! Tekrar denemek ister misin?');
      } else {
        setDialogText('Berabere bitti! Çekişmeli bir oyundu.');
      }
      return;
    }

    if (botThinking) {
      const thinkingQuotes = [
        'Hamlemi hesaplıyorum, bir saniye...',
        'Tahtadaki olasılıkları değerlendiriyorum...',
        'İlginç bir konum... Düşünüyorum.',
      ];
      setDialogText(thinkingQuotes[Math.floor(Math.random() * thinkingQuotes.length)]);
      return;
    }

    if (gameState.isCheck) {
      if (gameState.currentTurn === humanSide) {
        setDialogText('Şah çektim! Şahını koruman gerekiyor.');
      } else {
        setDialogText('Güzel bir şah çekiş! Hemen savunmaya geçiyorum.');
      }
      return;
    }

    if (hintMove) {
      setDialogText('İpucu: Tahtada yeşil ile işaretlenen hamleyi düşünebilirsin.');
      return;
    }

    if (isHumanTurn) {
      if (gameState.moveHistory.length === 0) {
        setDialogText('İlk hamleyi senden bekliyorum. Başarılar!');
      } else if (gameState.moveHistory.length > 20) {
        setDialogText('Oyun giderek ısınıyor, dikkatli ol!');
      } else {
        setDialogText('Hamleni yap, seni bekliyorum.');
      }
    }
  }, [botThinking, gameState.isGameOver, gameState.isCheck, gameState.currentTurn, gameState.moveHistory.length, hintMove, humanSide, botSide, isHumanTurn]);

  // Taç Cezası Uygulama Yardımcısı
  const penalizeCrown = useCallback((actionName: string) => {
    setMatchCrowns((prev) => {
      const next = Math.max(1, prev - 1);
      if (next < prev) {
        showNotification?.(`${actionName} kullanıldı — Kalan Taç: ${next}/3`, 'info');
      }
      return next;
    });
  }, [showNotification]);

  // İpucu (Hint) İşlemi: %75 En İyi Hamle, %25 İkinci En İyi Hamle
  const handleRequestHint = useCallback(() => {
    if (!isHumanTurn || botThinking || gameState.isGameOver) {
      showNotification?.('Yalnızca kendi sıranızda ipucu alabilirsiniz.', 'error');
      return;
    }

    try {
      const enginePos = legacyGameStateToPosition(gameState);
      const legalMoves = generateLegalMoves(enginePos);
      if (legalMoves.length === 0) return;

      // Hamleleri 1 derinlik yaprak skoruyla hızlıca sırala
      const scoredMoves = legalMoves.map((m) => {
        const nextPos = makeMove(enginePos, m);
        const score = -evaluate(nextPos);
        return { move: m, score };
      });

      scoredMoves.sort((a, b) => b.score - a.score);

      // %75 en iyi (0), %25 ikinci en iyi (1, varsa)
      let chosenIdx = 0;
      if (scoredMoves.length > 1 && Math.random() < 0.25) {
        chosenIdx = 1;
      }

      const chosen = scoredMoves[chosenIdx].move;
      const fromLegacy = squareToLegacy(chosen.from);
      const toLegacy = squareToLegacy(chosen.to);

      setHintMove({ from: fromLegacy, to: toLegacy });
      penalizeCrown('İpucu');
    } catch {
      showNotification?.('İpucu hesaplanamadı.', 'error');
    }
  }, [isHumanTurn, botThinking, gameState, penalizeCrown, showNotification]);

  // Geri Al (Undo) İşlemi: Kullanıcı sırasına kadar geri al
  const handleUndo = useCallback(() => {
    if (gameState.moveHistory.length === 0) {
      showNotification?.('Geri alınacak hamle bulunmuyor.', 'info');
      return;
    }

    setHintMove(null);

    // Eğer sıra insandaysa (bot da hamle yaptıysa), sıranın insana gelmesi için 2 hamle geri alınır
    // Eğer sıra bottaysa (insan hamle yaptı, bot düşünüyorsa), 1 hamle geri alınır
    if (isHumanTurn && gameState.moveHistory.length >= 2) {
      undoMove();
      setTimeout(() => {
        undoMove();
      }, 50);
    } else {
      undoMove();
    }

    penalizeCrown('Geri Al');
  }, [gameState.moveHistory.length, isHumanTurn, undoMove, penalizeCrown, showNotification]);

  // Hamle yapıldığında ipucunu temizle
  useEffect(() => {
    setHintMove(null);
  }, [gameState.moveHistory.length]);

  // Şah çekilince tahtada 0.4sn "ŞAH!" bildirimi
  const showCheckFlash = useCheckFlash(historyEntries);

  // Oyun sonu ve taç kaydetme
  useEffect(() => {
    if (gameState.isGameOver) {
      setShowGameOver(true);
      if (gameState.winner === humanSide) {
        saveBotCrown(botProfileId, matchCrowns);
      }
    }
  }, [gameState.isGameOver, gameState.winner, humanSide, botProfileId, matchCrowns]);

  // Materyal Avantajı
  const { whiteAdvantage, blackAdvantage } = useMemo(() => {
    const res = defaultMaterialCalculator.calculateAdvantage(displayedCapturedPieces);
    return {
      whiteAdvantage: res.leader === 'white' ? res.advantage : 0,
      blackAdvantage: res.leader === 'black' ? res.advantage : 0,
    };
  }, [displayedCapturedPieces]);

  // Mevcut incelenen hamle indeksi
  const currentViewIndex =
    viewedMoveIndex !== null
      ? viewedMoveIndex
      : historyEntries.length > 0
      ? historyEntries.length - 1
      : null;

  const BotIcon = botLevel.Icon;

  // İnceleme / Analiz Görünümleri
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
        perspective={humanSide}
        onRematch={() => {
          pausedBySubView.current = false;
          resetGame();
          setMatchCrowns(3);
          setHintMove(null);
          setShowGameOver(true);
          setSubView('game');
        }}
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
    <div className="mobile-screen flex flex-col bg-[#1a4228] text-white select-none relative overflow-y-auto custom-scrollbar">
      {/* ─── 1. ÜST HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10 bg-[#142b1f] sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
            aria-label="Geri"
          >
            <ArrowLeft size={22} weight="bold" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${botLevel.iconBg} flex items-center justify-center shadow-sm`}>
              <BotIcon size={20} weight="fill" className={botLevel.iconColor} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-batangas text-base font-bold text-white leading-tight">
                  Bot · {botLevel.title}
                </span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded font-bold text-amber-300">
                  {botProfileId}
                </span>
              </div>
              <span className="text-[11px] text-emerald-300/80 font-medium">
                {botThinking ? 'Düşünüyor...' : isHumanTurn ? 'Sizin sıranız' : 'Bot sırası'}
              </span>
            </div>
          </div>
        </div>

        {/* Aktif Maç Taçları & Seçenekler Butonu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-full border border-white/10" title={`Bu maç kazanabileceğiniz taç: ${matchCrowns}/3`}>
            {[1, 2, 3].map((star) => (
              <Crown
                key={star}
                size={16}
                weight={matchCrowns >= star ? 'fill' : 'bold'}
                className={matchCrowns >= star ? 'text-amber-400 drop-shadow-sm' : 'text-white/20'}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsOptionsOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
            aria-label="Ayarlar"
          >
            <Gear size={20} weight="bold" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between max-w-xl md:max-w-3xl mx-auto w-full px-2 sm:px-4 py-2 gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:max-w-6xl lg:items-start lg:px-6">
        <div className="min-w-0 w-full flex flex-col items-center justify-between gap-2">
        {/* ─── 2. BOT KARAKTERİ & DİYALOG BALONU (Chess.com Style) ──────── */}
        <div className="w-full flex items-center gap-3 px-1 py-1 animate-fade-in">
          {/* Bot Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-full ${botLevel.iconBg} border-2 border-amber-400/60 flex items-center justify-center shadow-lg`}>
              <BotIcon size={26} weight="fill" className={botLevel.iconColor} />
            </div>
            {botThinking && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            )}
          </div>

          {/* Konuşma Balonu (Speech Bubble) */}
          <div className="relative flex-1 bg-white text-[#141f1b] rounded-2xl px-4 py-2.5 shadow-xl border border-[#e5dcce] text-xs sm:text-sm font-semibold leading-snug">
            {/* Konuşma Kuyruğu (Pointer) */}
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[8px] border-r-white" />
            <p className={botThinking ? 'animate-pulse text-[#0c4e48]' : 'text-[#141f1b]'}>
              {dialogText}
            </p>
          </div>
        </div>

        {/* ─── 3. SATRANÇ TAHTASI (BoardGrid) ─────────────────────────── */}
        <div className="w-full flex-1 flex items-center justify-center">
          <BoardGrid
            board={displayedBoard}
            citadels={displayedCitadels}
            selectedPos={isViewingHistory ? null : selectedPos}
            validMoves={isViewingHistory ? [] : validMoves}
            lastMove={displayedLastMove}
            hintMove={hintMove}
            turn={gameState.currentTurn}
            boardRotates={false}
            flipped={humanSide === 'black'}
            onSquareClick={handleSelectSquare}
            onDropMove={handleDropMove}
            showCheckFlash={showCheckFlash}
          />
        </div>

        {/* ─── 4. OYUNCU SAATLERİ & SIRA BİLGİSİ ───────────────────────── */}
        <div className="w-full grid grid-cols-2 gap-2 px-1 max-w-[540px] lg:max-w-none">
          {/* Beyaz Saat */}
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all border ${
              gameState.currentTurn === 'white' && !gameState.isGameOver
                ? 'bg-[#f5eedc] text-[#141f1b] border-amber-400 shadow-lg ring-2 ring-amber-400/80 scale-[1.02]'
                : 'bg-[#132b1d] text-white/80 border-white/10'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-white border border-gray-400 inline-block shadow-sm" />
              <span className="text-xs font-bold truncate max-w-[80px] lg:max-w-[140px]">
                {whiteName}
              </span>
              {whiteAdvantage > 0 && (
                <span className="text-[10px] bg-emerald-600/30 text-emerald-300 font-extrabold px-1 rounded">
                  +{whiteAdvantage}
                </span>
              )}
            </div>
            <span className="font-mono text-base font-extrabold">
              {formatTime(whiteTime)}
            </span>
          </div>

          {/* Siyah Saat */}
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all border ${
              gameState.currentTurn === 'black' && !gameState.isGameOver
                ? 'bg-[#f5eedc] text-[#141f1b] border-amber-400 shadow-lg ring-2 ring-amber-400/80 scale-[1.02]'
                : 'bg-[#132b1d] text-white/80 border-white/10'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#141f1b] border border-gray-600 inline-block shadow-sm" />
              <span className="text-xs font-bold truncate max-w-[80px] lg:max-w-[140px]">
                {blackName}
              </span>
              {blackAdvantage > 0 && (
                <span className="text-[10px] bg-emerald-600/30 text-emerald-300 font-extrabold px-1 rounded">
                  +{blackAdvantage}
                </span>
              )}
            </div>
            <span className="font-mono text-base font-extrabold">
              {formatTime(blackTime)}
            </span>
          </div>
        </div>
        </div>

        {/* ─── SAĞ PANEL: NOTASYON + KONTROLLER (Mobil: altta) ─── */}
        <aside className="w-full min-w-0 flex flex-col gap-2 lg:sticky lg:top-20">
        {/* ─── 5. NOTASYON & GEÇMİŞ GEZİNME BARI ───────────────────────── */}
        <div className="w-full max-w-[540px] lg:max-w-none bg-[#142b1f] border border-white/10 rounded-xl p-1.5 flex items-center justify-between gap-2 shadow-inner">
          {/* Hamle Geçmişi Yatay Liste */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar px-1 py-0.5 text-xs">
            {historyEntries.length === 0 ? (
              <span className="text-white/40 italic text-xs">Oyun henüz başladı</span>
            ) : (
              historyEntries.map((entry, idx) => {
                const isSelected = currentViewIndex === idx;
                const moveNum = Math.floor(idx / 2) + 1;
                const isWhiteMove = idx % 2 === 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToMove(idx)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#00d4c4] text-[#0d2818] shadow-sm font-extrabold'
                        : 'bg-black/20 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    {isWhiteMove ? `${moveNum}. ` : ''}
                    {entry.notation}
                  </button>
                );
              })
            )}
          </div>

          {/* Entegre Gezinme Tuşları (⏮️, ◀️, ▶️, ⏭️) */}
          <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => goToMove(-1)}
              disabled={historyEntries.length === 0 || currentViewIndex === -1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 active:scale-90 text-white cursor-pointer"
              title="Başlangıca Git"
            >
              <CaretDoubleLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={goToPreviousMove}
              disabled={historyEntries.length === 0 || currentViewIndex === -1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 active:scale-90 text-white cursor-pointer"
              title="Önceki Hamle"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={goToNextMove}
              disabled={historyEntries.length === 0 || currentViewIndex === null || currentViewIndex === historyEntries.length - 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 active:scale-90 text-white cursor-pointer"
              title="Sonraki Hamle"
            >
              <CaretRight size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={goToLive}
              disabled={currentViewIndex === null || currentViewIndex === historyEntries.length - 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 active:scale-90 text-white cursor-pointer"
              title="Canlı Konuma Dön"
            >
              <CaretDoubleRight size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* ─── 6. ALT KONTROL ÇUBUĞU (4 Eylem Butonu — Resimdeki gibi) ─── */}
        <div className="w-full max-w-[540px] lg:max-w-none bg-[#f5eedc] text-[#141f1b] rounded-2xl p-2 grid grid-cols-4 lg:grid-cols-2 gap-2 shadow-2xl border border-[#e5dcce]">
          {/* 1. Seçenekler */}
          <button
            type="button"
            onClick={() => setIsOptionsOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-[#e8deca] active:scale-95 transition-all cursor-pointer group"
          >
            <List size={22} weight="bold" className="text-[#141f1b] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold mt-1 text-[#141f1b]">Seçenekler</span>
          </button>

          {/* 2. Terk Et */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Oyunu terk etmek istediğinize emin misiniz?')) {
                resignGame(humanSide);
              }
            }}
            disabled={gameState.isGameOver}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-[#e8deca] active:scale-95 transition-all cursor-pointer disabled:opacity-40 group"
          >
            <Flag size={22} weight="bold" className="text-[#141f1b] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold mt-1 text-[#141f1b]">Terk Et</span>
          </button>

          {/* 3. İpucu */}
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={!isHumanTurn || botThinking || gameState.isGameOver}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-[#e8deca] active:scale-95 transition-all cursor-pointer disabled:opacity-40 group"
          >
            <Lightbulb size={22} weight="fill" className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold mt-1 text-[#141f1b]">İpucu</span>
          </button>

          {/* 4. Geri Al */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={gameState.moveHistory.length === 0 || gameState.isGameOver}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-[#e8deca] active:scale-95 transition-all cursor-pointer disabled:opacity-40 group"
          >
            <ArrowUUpLeft size={22} weight="bold" className="text-[#141f1b] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold mt-1 text-[#141f1b]">Geri Al</span>
          </button>
        </div>
        </aside>
      </div>

      {/* ─── PENDING PROMOTION MODAL ───────────────────────────────────── */}
      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.piece.color}
          defaultPromotionType={pendingPromotion.defaultType}
          onSelectPromotion={(promotedType) => {
            resolvePromotion(promotedType);
          }}
        />
      )}

      {/* ─── SEÇENEKLER MODALI ────────────────────────────────────────── */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#f5eedc] text-[#141f1b] border border-[#e5dcce] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-zoom-in">
            <h3 className="font-batangas text-xl font-bold mb-4 text-[#141f1b] text-center">
              Oyun Seçenekleri
            </h3>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetGame();
                  setMatchCrowns(3);
                  setHintMove(null);
                  setIsOptionsOpen(false);
                  showNotification?.('Oyun yeniden başlatıldı.', 'info');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#1a442e] hover:bg-[#123020] text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <ArrowCounterClockwise size={18} weight="bold" />
                <span>Yeniden Başlat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  setSubView('review');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#e8deca] hover:bg-[#dfd4be] text-[#141f1b] font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 border border-[#cfc4ad]"
              >
                <MagnifyingGlassPlus size={18} weight="bold" />
                <span>Oyunu İncele / Analiz</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  onExit();
                }}
                className="w-full py-3 px-4 rounded-xl bg-red-800/10 hover:bg-red-800/20 text-red-700 font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-red-300 mt-2"
              >
                <House size={18} weight="bold" />
                <span>Ana Menüye Dön</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOptionsOpen(false)}
                className="w-full py-2.5 text-xs text-[#5c6c66] hover:text-[#141f1b] font-semibold text-center cursor-pointer mt-1"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OYUN BİTTİ MODALI ────────────────────────────────────────── */}
      {gameState.isGameOver && showGameOver && (
        <GameOverModal
          mode="bot"
          winner={gameState.winner}
          status={gameState.status}
          statusText={statusText}
          whiteName={whiteName}
          blackName={blackName}
          totalMoves={gameState.moveHistory.length}
          botDifficultyLabel={`Profil ${botProfileId} · ${botLevel.title}`}
          playerWon={gameState.winner === humanSide}
          onGameReview={() => setSubView('review')}
          onSelfAnalysis={() => setSubView('analysis')}
          onRetry={() => {
            resetGame();
            setMatchCrowns(3);
            setHintMove(null);
            setShowGameOver(true);
          }}
          onChangeBot={onExit}
          onClose={() => setShowGameOver(false)}
        />
      )}
    </div>
  );
};
