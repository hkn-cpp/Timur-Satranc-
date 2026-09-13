import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { useOnlineGame } from '../hooks/useOnlineGame';
import type { OnlineGame } from '../core/online/roomService';
import { Header } from '../components/game/Header';
import { PlayerCard } from '../components/game/PlayerCard';
import { BoardContainer } from '../components/game/BoardContainer';
import { BottomToolbar } from '../components/game/BottomToolbar';
import { GameOverModal } from '../components/game/GameOverModal';
import { PromotionModal } from '../components/board/PromotionModal';
import { GameReviewView } from './GameReviewView';
import { SelfAnalysisView } from './SelfAnalysisView';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';
import {
  WifiHigh,
  WifiSlash,
  Spinner,
  Flag,
  Handshake,
  House,
  X,
  Copy,
} from '@phosphor-icons/react';
import { NotificationType, PlayerColor } from '../types';
import { getRating } from '../core/online/ratingService';

interface OnlinePlayViewProps {
  gameData: OnlineGame;
  myColor: PlayerColor;
  gameCode: string;
  onExit: () => void;
  showNotification?: (message: string, type?: NotificationType) => void;
}

export const OnlinePlayView: FC<OnlinePlayViewProps> = ({
  gameData: initialGameData,
  myColor,
  gameCode,
  onExit,
  showNotification,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [showGameOver, setShowGameOver] = useState(true);
  const [subView, setSubView] = useState<'game' | 'review' | 'analysis'>('game');

  // ─── Online senkronizasyon katmanı ──────────────────────────────────
  const {
    gameData,
    isMyTurn,
    connectionStatus,
    opponentJoined,
    isGameOver: onlineGameOver,
    syncMove,
    syncResignation,
    syncGameEndWithRating,
    syncDrawOffer,
    syncRespondDrawOffer,
    rebuildFromHistory,
  } = useOnlineGame({ gameCode, myColor, initialGameData });

  // ─── Yerel oyun motoru (DB snapshot'ıyla başlar) ────────────────────
  const {
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    statusText,
    selectedPos,
    validMoves,
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
    applyRemoteSnapshot,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    goToLive,
    togglePause,
    resignGame,
    agreeDraw,
    canGoPrevious,
    canGoNext,
  } = useGame({
    initialTimeSeconds: 0,
    incrementSeconds: 0,
    whiteName: initialGameData.white_name,
    blackName: initialGameData.black_name ?? 'Rakip bekleniyor',
    boardRotates: false,
    initialBoard: initialGameData.board_state,
    initialCitadels: initialGameData.citadels_state,
    initialTurn: initialGameData.current_turn || 'white',
  });

  // ─── Materyal avantajı (ScreenPlayView ile aynı türetme) ────────────
  const { whiteAdvantage, blackAdvantage } = useMemo(() => {
    const res = defaultMaterialCalculator.calculateAdvantage(displayedCapturedPieces);
    return {
      whiteAdvantage: res.leader === 'white' ? res.advantage : 0,
      blackAdvantage: res.leader === 'black' ? res.advantage : 0,
    };
  }, [displayedCapturedPieces]);

  // ─── Renk / isim / süre eşleşmesi ───────────────────────────────────
  const opponentColor: PlayerColor = myColor === 'white' ? 'black' : 'white';
  const liveWhiteName = gameData.white_name || 'Beyaz';
  const liveBlackName = gameData.black_name || 'Rakip bekleniyor';
  const myName = myColor === 'white' ? liveWhiteName : liveBlackName;
  const opponentName = myColor === 'white' ? liveBlackName : liveWhiteName;

  // ─── Rating rozeti (sadece gösterim, tahta/hamle mantığına dokunmaz) ───
  const [whiteRating, setWhiteRating] = useState<number | null>(null);
  const [blackRating, setBlackRating] = useState<number | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const whiteId = gameData.white_player_id;
    const blackId = gameData.black_player_id;
    if (!whiteId && !blackId) return;
    setRatingsLoading(true);
    (async () => {
      try {
        const [w, b] = await Promise.all([
          whiteId ? getRating(whiteId) : Promise.resolve({ data: null }),
          blackId ? getRating(blackId) : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        setWhiteRating(w.data?.rating ?? null);
        setBlackRating(b.data?.rating ?? null);
      } catch {
        if (!cancelled) {
          setWhiteRating(null);
          setBlackRating(null);
        }
      } finally {
        if (!cancelled) setRatingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameData.white_player_id, gameData.black_player_id]);

  const whiteDisplayName = ratingsLoading
    ? `${liveWhiteName} (...)`
    : whiteRating != null
      ? `${liveWhiteName} (${whiteRating})`
      : liveWhiteName;
  const blackDisplayName = ratingsLoading
    ? `${liveBlackName} (...)`
    : blackRating != null
      ? `${liveBlackName} (${blackRating})`
      : liveBlackName;
  const myDisplayName = myColor === 'white' ? whiteDisplayName : blackDisplayName;
  const opponentDisplayName = myColor === 'white' ? blackDisplayName : whiteDisplayName;

  // ─── Reconnect: bağlantı kurulduğunda geçmişi tazele (rebuild tetikleyici) ───
  useEffect(() => {
    if (connectionStatus === 'connected') {
      void rebuildFromHistory();
    }
  }, [connectionStatus, rebuildFromHistory]);

  // ─── Bağlantı durumu bildirimi (sessiz kopuş yerine kullanıcıya yansıt) ───
  const prevConnRef = useRef(connectionStatus);
  useEffect(() => {
    const prev = prevConnRef.current;
    prevConnRef.current = connectionStatus;
    if (prev === connectionStatus) return;
    if (connectionStatus === 'disconnected') {
      showNotification?.('Bağlantı kesildi. Yeniden bağlanılıyor...', 'error');
    } else if (connectionStatus === 'error') {
      showNotification?.('Çevrim içi bağlantı kurulamadı. Hamlelerin iletilmeyebilir.', 'error');
    } else if (connectionStatus === 'connected' && (prev === 'disconnected' || prev === 'error')) {
      showNotification?.('Yeniden bağlanıldı', 'success');
    }
  }, [connectionStatus, showNotification]);

  // ─── Gelen beraberlik teklifi bildirimi (teklif değişiminde tek seferlik) ───
  const prevOfferRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = gameData.draw_offer_by ?? null;
    const prev = prevOfferRef.current;
    prevOfferRef.current = cur;
    if (cur && cur === opponentColor && prev !== cur && !onlineGameOver) {
      showNotification?.('Rakip beraberlik teklif etti', 'info');
    }
  }, [gameData.draw_offer_by, opponentColor, onlineGameOver, showNotification]);
  const myTime = myColor === 'white' ? whiteTime : blackTime;
  const opponentTime = opponentColor === 'white' ? whiteTime : blackTime;

  const isInteractive =
    isMyTurn && !isViewingHistory && !gameState.isGameOver && !onlineGameOver && opponentJoined;

  // ─── Kendi hamlem → DB'ye senkronize et ─────────────────────────────
  const prevLocalCountRef = useRef(0);
  useEffect(() => {
    const count = historyEntries.length;
    if (count > prevLocalCountRef.current) {
      const latestEntry = historyEntries[count - 1];
      if (latestEntry.player === myColor) {
        void syncMove(latestEntry, count - 1);
      }
    }
    prevLocalCountRef.current = count;
  }, [historyEntries.length, myColor, syncMove]);

  // ─── Rakip hamlesi ──────────────────────────────────────────────────
  const prevRemoteCountRef = useRef(initialGameData.move_count);
  useEffect(() => {
    if (gameData.move_count > prevRemoteCountRef.current) {
      prevRemoteCountRef.current = gameData.move_count;

      // Son hamleyi rakip yaptıysa yerel motora yansıt
      if (gameData.last_move && gameData.last_move.player === opponentColor) {
        const historyEntry: any = {
          moveNumber: gameData.move_count,
          turnNumber: gameData.turn_number,
          player: gameData.last_move.player,
          notation: gameData.last_move.notation,
          from: gameData.last_move.from,
          to: gameData.last_move.to,
          promotion: (gameData.last_move as any).promotion,
          boardState: gameData.board_state,
          citadelsState: gameData.citadels_state,
          capturedPiecesState: gameData.captured_pieces,
          isKingSwap: (gameData.last_move as any).isKingSwap,
        };

        applyRemoteSnapshot({
          board: gameData.board_state,
          citadels: gameData.citadels_state,
          capturedPieces: gameData.captured_pieces,
          currentTurn: gameData.current_turn,
          turnNumber: gameData.turn_number,
          lastMove: gameData.last_move as any,
          historyEntry,
          isGameOver: gameData.status === 'ended',
          winner: gameData.winner,
          status: gameData.status === 'ended' ? (gameData.end_reason as any) : 'IN_PROGRESS',
        });

        showNotification?.('Rakip hamle yaptı', 'info');
      }
      goToLive();
    }
  }, [gameData, opponentColor, applyRemoteSnapshot, goToLive, showNotification]);

  // ─── Yerel oyun sonu → DB'ye bildir + ELO uygula (oyun başına tek; guard hook'ta) ───
  useEffect(() => {
    if (gameState.isGameOver && !onlineGameOver) {
      // resignGame/agreeDraw status alanını güncellemediği için bayat 'IN_PROGRESS'
      // yazılmasın: berabere→'agreement', kazananlı→'resignation' varsay.
      const reason =
        gameState.status && gameState.status !== 'IN_PROGRESS'
          ? gameState.status
          : gameState.winner === 'draw'
            ? 'agreement'
            : 'resignation';
      void syncGameEndWithRating(gameState.winner ?? 'draw', reason);
    }
  }, [gameState.isGameOver, gameState.winner, gameState.status, onlineGameOver, syncGameEndWithRating]);

  // ─── Rakip bitirdi (terk / beraberlik / uzaktan mat) → yerel motora yansıt ────────
  useEffect(() => {
    if (onlineGameOver && !gameState.isGameOver) {
      if (gameData.end_reason === 'resignation') {
        const resigningSide: PlayerColor = gameData.winner === 'white' ? 'black' : 'white';
        resignGame(resigningSide);
      } else if (gameData.winner === 'draw') {
        agreeDraw();
      } else if (gameData.winner === 'white' || gameData.winner === 'black') {
        // Mat/stalemate vb. uzaktan bitiş: yerel motor snapshot almadığı için (v2'de
        // applyRemoteSnapshot eklenecek) kazananı aynala; sebep metni yaklaşıktır.
        const losingSide: PlayerColor = gameData.winner === 'white' ? 'black' : 'white';
        resignGame(losingSide);
      }
    }
  }, [onlineGameOver, gameState.isGameOver, gameData.end_reason, gameData.winner, resignGame, agreeDraw]);

  // ─── Yeni oyun sonu geldiğinde modalı tekrar göster ─────────────────
  useEffect(() => {
    if (gameState.isGameOver || onlineGameOver) {
      setShowGameOver(true);
    }
  }, [gameState.isGameOver, onlineGameOver]);

  const handleResign = () => {
    resignGame(myColor);
    void syncResignation();
    setIsOptionsOpen(false);
  };

  const handleDrawOffer = () => {
    // Rakip teklif etmişse bu buton kabul işlevi görür; yoksa teklif gönderir.
    // Tek taraflı anında-beraberlik YOK (önceden syncDraw ile rakip onayı
    // alınmadan oyun bitiyordu).
    if (gameData.draw_offer_by === opponentColor) {
      void syncRespondDrawOffer(true);
      agreeDraw();
    } else {
      void syncDrawOffer();
      showNotification?.('Beraberlik teklifi gönderildi', 'info');
    }
    setIsOptionsOpen(false);
  };

  const handleShare = () => {
    const text = `${liveWhiteName} - ${liveBlackName}: ${statusText} (${historyEntries.length} hamle)`;
    try {
      void navigator.clipboard?.writeText(text);
      showNotification?.('Oyun sonucu panoya kopyalandı', 'success');
    } catch {
      showNotification?.('Paylaşım hazır: ' + text, 'info');
    }
  };

  const ConnectionIcon =
    connectionStatus === 'connected'
      ? WifiHigh
      : connectionStatus === 'connecting'
        ? Spinner
        : WifiSlash;
  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Bağlı'
      : connectionStatus === 'connecting'
        ? 'Bağlanıyor...'
        : 'Bağlantı kesildi';

  // ─── Rakip bekleniyor ekranı (tahtaya girmeden) ─────────────────────
  if (!opponentJoined) {
    return (
      <div className="mobile-screen flex flex-col items-center justify-center bg-[#122b1e] text-white p-6 select-none">
        <div className="bg-[#1a4228] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/10">
          <h2 className="font-batangas text-2xl font-bold mb-2">Rakip Bekleniyor...</h2>
          <p className="text-[#A7BDB1] text-sm mb-6">Arkadaşına bu kodu gönder:</p>
          <div className="bg-[#0a1710] rounded-xl p-4 mb-6">
            <span className="font-mono text-3xl font-extrabold text-[#00d4c4] tracking-[0.3em]">
              {gameCode}
            </span>
          </div>
          <button
            onClick={() => {
              try {
                void navigator.clipboard?.writeText(gameCode);
                showNotification?.(`Oda kodu (${gameCode}) kopyalandı!`, 'success');
              } catch {
                showNotification?.(`Oda kodun: ${gameCode}`, 'info');
              }
            }}
            className="w-full bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer text-sm mb-3 flex items-center justify-center gap-2"
          >
            <Copy size={16} weight="bold" />
            <span>Kodu Kopyala</span>
          </button>
          <button
            onClick={onExit}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            İptal Et
          </button>
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[#00d4c4] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── İnceleme / Analiz alt görünümleri (BotPlayView deseni; online'da onRematch yok) ───
  if (subView === 'review') {
    return (
      <GameReviewView
        historyEntries={historyEntries}
        whiteName={liveWhiteName}
        blackName={liveBlackName}
        winner={gameState.winner ?? gameData.winner ?? 'draw'}
        statusText={statusText}
        onBack={() => setSubView('game')}
        onOpenSelfAnalysis={() => setSubView('analysis')}
        perspective={myColor}
      />
    );
  }

  if (subView === 'analysis') {
    return (
      <SelfAnalysisView
        whiteName={liveWhiteName}
        blackName={liveBlackName}
        initialBoard={displayedBoard}
        initialCitadels={displayedCitadels}
        initialTurn={gameState.currentTurn}
        initialTimeSeconds={0}
        onExit={() => setSubView('game')}
        showNotification={showNotification}
      />
    );
  }

  // ─── Ana oyun ekranı ────────────────────────────────────────────────
  return (
    <div className="mobile-screen flex flex-col justify-between bg-[#153423] text-white relative overflow-hidden select-none">
      {/* Üst bar: bağlantı durumu + sıra göstergesi */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#142b1f] border-b border-white/10 relative z-20">
        <div
          className={`flex items-center gap-1.5 text-xs font-bold ${
            connectionStatus === 'connected'
              ? 'text-emerald-400'
              : connectionStatus === 'connecting'
                ? 'text-amber-400'
                : 'text-red-400'
          }`}
        >
          <ConnectionIcon
            size={14}
            weight="bold"
            className={connectionStatus === 'connecting' ? 'animate-spin' : ''}
          />
          <span>{connectionLabel}</span>
        </div>
        <div className="text-xs font-bold">
          {gameState.isGameOver || onlineGameOver ? (
            <span className="text-amber-400">Oyun Bitti</span>
          ) : isMyTurn ? (
            <span className="text-[#00d4c4]">Sıra sende</span>
          ) : (
            <span className="text-[#A7BDB1]">Sıra rakipte</span>
          )}
        </div>
      </div>

      {/* Beraberlik teklifi bandı (Faz 2 protokol) */}
      {gameData.draw_offer_by === opponentColor && !onlineGameOver && !gameState.isGameOver && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-400/30 text-amber-200 text-xs font-bold relative z-20">
          <span>Rakip beraberlik teklif etti</span>
          <button
            onClick={() => {
              void syncRespondDrawOffer(true);
              agreeDraw();
            }}
            className="bg-emerald-500/80 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
          >
            Kabul Et
          </button>
          <button
            onClick={() => {
              void syncRespondDrawOffer(false);
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
          >
            Reddet
          </button>
        </div>
      )}
      {gameData.draw_offer_by === myColor && !onlineGameOver && !gameState.isGameOver && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/10 text-[#A7BDB1] text-xs font-bold relative z-20">
          <span>Beraberlik teklifi gönderildi, rakip bekleniyor...</span>
          <button
            onClick={() => {
              void syncRespondDrawOffer(false);
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
          >
            Vazgeç
          </button>
        </div>
      )}

      {/* Başlık + notasyon */}
      <Header
        onBack={() => setIsOptionsOpen(true)}
        gameTypeTitle="Çevrimiçi Oyna"
        historyEntries={historyEntries}
        viewedMoveIndex={viewedMoveIndex}
        onSelectMove={goToMove}
      />

      {/* Oyun alanı (Mobil: dikey — Desktop: tahta + yan panel) */}
      <div className="flex-1 flex flex-col justify-between items-center px-[var(--gutter)] py-1 relative z-10 w-full max-w-lg md:max-w-2xl mx-auto overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:max-w-6xl lg:items-start">
        <div className="min-w-0 w-full flex flex-col justify-between items-center gap-2">
        <PlayerCard
          name={opponentDisplayName}
          side={opponentColor}
          timeSeconds={opponentTime}
          isActive={gameState.currentTurn === opponentColor && !gameState.isGameOver}
          isTopPlayer={true}
          capturedPieces={displayedCapturedPieces[myColor]}
          materialAdvantage={opponentColor === 'white' ? whiteAdvantage : blackAdvantage}
        />

        <BoardContainer
          board={displayedBoard}
          citadels={displayedCitadels}
          selectedPos={isInteractive ? selectedPos : null}
          validMoves={isInteractive ? validMoves : []}
          lastMove={displayedLastMove}
          turn={gameState.currentTurn}
          boardRotates={false}
          flipped={myColor === 'black'}
          onSquareClick={isInteractive ? handleSelectSquare : () => {}}
          onDropMove={isInteractive ? handleDropMove : undefined}
        />

        <PlayerCard
          name={myDisplayName}
          side={myColor}
          timeSeconds={myTime}
          isActive={gameState.currentTurn === myColor && !gameState.isGameOver}
          isTopPlayer={false}
          capturedPieces={displayedCapturedPieces[opponentColor]}
          materialAdvantage={myColor === 'white' ? whiteAdvantage : blackAdvantage}
        />
        </div>

        {/* Yan panel araç çubuğu (Mobil: alt bar — Desktop: sağ panel) */}
        <BottomToolbar
          onOptions={() => setIsOptionsOpen(true)}
          onTogglePause={togglePause}
          isPaused={isPaused}
          onSelfAnalysis={() => {
            if (gameState.isGameOver || onlineGameOver) {
              setSubView('analysis');
            } else {
              showNotification?.('Önce maçı bitir', 'info');
            }
          }}
          onPrevious={goToPreviousMove}
          onNext={goToNextMove}
          canPrevious={canGoPrevious}
          canNext={canGoNext}
        />
      </div>

      {/* Piyon terfisi */}
      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.piece.color}
          defaultPromotionType={pendingPromotion.defaultType}
          onSelectPromotion={resolvePromotion}
        />
      )}

      {/* Seçenekler modalı */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">Oyun Seçenekleri</h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleResign}
                disabled={gameState.isGameOver || onlineGameOver}
                className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-30"
              >
                <Flag size={18} weight="bold" />
                <span>Terk Et</span>
              </button>

              <button
                onClick={handleDrawOffer}
                disabled={gameState.isGameOver || onlineGameOver}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm disabled:opacity-30"
              >
                <Handshake size={18} weight="bold" className="text-amber-300" />
                <span>
                  {gameData.draw_offer_by === opponentColor
                    ? 'Beraberlik Teklifini Kabul Et'
                    : 'Beraberlik Teklif Et'}
                </span>
              </button>

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

      {/* Oyun sonu modalı */}
      {(gameState.isGameOver || onlineGameOver) && showGameOver && (
        <GameOverModal
          mode="online"
          winner={gameState.winner ?? gameData.winner ?? 'draw'}
          status={gameState.status ?? 'DRAW_BY_AGREEMENT'}
          statusText={statusText}
          whiteName={liveWhiteName}
          blackName={liveBlackName}
          totalMoves={historyEntries.length}
          onGameReview={() => {
            if (gameState.isGameOver || onlineGameOver) {
              setSubView('review');
            } else {
              showNotification?.('Önce maçı bitir', 'info');
            }
          }}
          onRequestRematch={() => showNotification?.('Rövanş isteği yakında', 'info')}
          onFindOpponent={() => showNotification?.('Yeni rakip bulma yakında', 'info')}
          onNewGame={onExit}
          onClose={() => setShowGameOver(false)}
          onShare={handleShare}
        />
      )}
    </div>
  );
};
