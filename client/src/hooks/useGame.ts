import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  BoardMatrix,
  BoardPosition,
  CitadelState,
  GameState,
  GameStatus,
  Move,
  Piece,
  PieceType,
  PlayerColor,
} from '../types/chess';
import { createInitialBoardSetup, createInitialGameState } from '../core/engine/boardSetup';
import { cloneBoard, cloneCitadels } from '../core/setup/setupSerializer';
import {
  calculateGameStatus,
  getLegalMoves,
  getPieceAt,
  processPawnPromotion,
} from '../core/engine/moveRules';
import { generateMoveNotation } from '../core/notation';
import { playMoveSound } from '../utils/sound';
import type { BotProfileId } from '../bot/profiles';
import { getSharedEngineClient } from '../worker/engineClient';
import { createBrowserWorker, isWorkerSupported } from '../worker/createBrowserWorker';
import { engineMoveToLegacy, legacyGameStateToPosition } from '../worker/legacyAdapter';

export interface MoveHistoryEntry {
  moveNumber: number; // 1, 2, 3, ... (1-indexed absolute move count)
  turnNumber: number; // 1, 1, 2, 2, ...
  player: PlayerColor;
  notation: string;
  from: BoardPosition;
  to: BoardPosition;
  capturedPiece?: Piece;
  promotion?: PieceType;
  boardState: BoardMatrix;
  citadelsState: CitadelState;
  capturedPiecesState: {
    white: Piece[];
    black: Piece[];
  };
  isCheck?: boolean;
  isCheckmate?: boolean;
  isKingSwap?: boolean;
  isRelocation?: boolean;
}

export interface UseGameProps {
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  isInitiallyPaused?: boolean;
  whiteName?: string;
  blackName?: string;
  boardRotates?: boolean;
  initialBoard?: BoardMatrix;
  initialCitadels?: CitadelState;
  initialTurn?: PlayerColor;
  initialHasUsedKingSwap?: { white: boolean; black: boolean };
  onMoveMade?: (move: Move, notation: string) => void;
  onGameOver?: (winner: PlayerColor | 'draw', reason: string) => void;
  /**
   * Bot modu (Faz 6, opt-in): verilirse sıra bu renge geçtiğinde hamle
   * Worker'daki Engine+Bot hattına hesaplattırılır. VERİLMEZSE bu hookun
   * davranışı birebir aynıdır (bot kodu hiç çalışmaz).
   */
  botSide?: PlayerColor | null;
  botProfileId?: BotProfileId;
}

export function useGame({
  initialTimeSeconds = 600,
  incrementSeconds = 0,
  isInitiallyPaused = false,
  whiteName = 'Emir Timur',
  blackName = 'Yıldırım Bayezid',
  boardRotates = false,
  initialBoard,
  initialCitadels,
  initialTurn,
  initialHasUsedKingSwap,
  onMoveMade,
  onGameOver,
  botSide = null,
  botProfileId = 'III',
}: UseGameProps = {}) {
  // ── Gerçek oyun başlangıcı snapshot'ı (özel dizilim veya klasik) ──────────
  // Mount'ta bir kez yakalanır; hamle geçmişi görünümü (başlangıca git) ve
  // "Yeniden Başlat" hep bu dizilime döner. Böylece serbest dizilimle başlayan
  // oyun, klasik dizilime geri düşmez.
  const startSnapshotRef = useRef<{
    board: BoardMatrix;
    citadels: CitadelState;
    turn: PlayerColor;
  } | null>(null);
  if (startSnapshotRef.current === null) {
    if (initialBoard) {
      startSnapshotRef.current = {
        board: cloneBoard(initialBoard),
        citadels: initialCitadels ? cloneCitadels(initialCitadels) : { whiteCitadelPiece: null, blackCitadelPiece: null },
        turn: initialTurn || 'white',
      };
    } else {
      const classic = createInitialBoardSetup();
      startSnapshotRef.current = {
        board: classic.board,
        citadels: classic.citadels,
        turn: initialTurn || 'white',
      };
    }
  }
  const startSnapshot = startSnapshotRef.current;

  // Live Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    if (initialBoard) {
      return {
        board: initialBoard,
        citadels: initialCitadels || { whiteCitadelPiece: null, blackCitadelPiece: null },
        currentTurn: initialTurn || 'white',
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isGameOver: false,
        status: 'IN_PROGRESS',
        winner: null,
        hasUsedKingSwap: initialHasUsedKingSwap || { white: false, black: false },
        turnNumber: 1,
        halfMoveClock: 0,
      };
    }
    return createInitialGameState();
  });
  const [selectedPos, setSelectedPos] = useState<BoardPosition | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    move: Move;
    piece: Piece;
    defaultType: PieceType;
  } | null>(null);

  // Bot düşünme göstergesi (opt-in bot modu dışında hep false kalır)
  const [botThinking, setBotThinking] = useState(false);

  // Structured History Entries with Board Snapshots
  const [historyEntries, setHistoryEntries] = useState<MoveHistoryEntry[]>([]);

  // History Viewer State (null = Live State, -1 = Initial Start Position, 0..N-1 = specific move index)
  const [viewedMoveIndex, setViewedMoveIndex] = useState<number | null>(null);

  // Clocks and UI status (Strictly linked to LIVE game)
  const [whiteTime, setWhiteTime] = useState<number>(initialTimeSeconds);
  const [blackTime, setBlackTime] = useState<number>(initialTimeSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(isInitiallyPaused);
  const [statusText, setStatusText] = useState<string>(`${whiteName} hamle sırası...`);

  useEffect(() => {
    setIsPaused(isInitiallyPaused);
  }, [isInitiallyPaused]);

  // History stack for full Undo/Redo actions
  const [historyStack, setHistoryStack] = useState<{
    gameState: GameState;
    historyEntries: MoveHistoryEntry[];
    whiteTime: number;
    blackTime: number;
  }[]>([]);
  const [redoStack, setRedoStack] = useState<{
    gameState: GameState;
    historyEntries: MoveHistoryEntry[];
    whiteTime: number;
    blackTime: number;
  }[]>([]);

  const stateRef = useRef({ gameState, historyEntries, whiteTime, blackTime, isPaused });
  stateRef.current = { gameState, historyEntries, whiteTime, blackTime, isPaused };

  // Timer interval - Runs strictly for LIVE active player, NEVER modified by history browsing
  useEffect(() => {
    if (isPaused || gameState.isGameOver || initialTimeSeconds <= 0) return;

    const interval = setInterval(() => {
      // Saf okuma: ref üzerinden karar ver, updater içinde yan etki yapma
      // (StrictMode çift-çalıştırmasında süre-bitişinin iki kez işlenmemesi için).
      const snap = stateRef.current;
      if (snap.gameState.isGameOver || snap.isPaused) return;
      if (snap.gameState.currentTurn === 'white') {
        if (snap.whiteTime <= 1) {
          setWhiteTime(0);
          setGameState((g) => (g.isGameOver ? g : { ...g, isGameOver: true, status: 'TIMEOUT', winner: 'black' }));
          setStatusText(`Süre bitti! ${blackName} kazandı.`);
          onGameOver?.('black', 'Beyazın süresi doldu!');
        } else {
          setWhiteTime((t) => t - 1);
        }
      } else {
        if (snap.blackTime <= 1) {
          setBlackTime(0);
          setGameState((g) => (g.isGameOver ? g : { ...g, isGameOver: true, status: 'TIMEOUT', winner: 'white' }));
          setStatusText(`Süre bitti! ${whiteName} kazandı.`);
          onGameOver?.('white', 'Siyahın süresi doldu!');
        } else {
          setBlackTime((t) => t - 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, gameState.isGameOver, gameState.currentTurn, initialTimeSeconds, whiteName, blackName, onGameOver]);

  // Current active index in history (-1 = Initial Board, 0..N-1 = Move, null when no moves yet)
  const currentViewedIndex =
    viewedMoveIndex !== null
      ? viewedMoveIndex
      : historyEntries.length > 0
      ? historyEntries.length - 1
      : null;

  // Viewing past history when viewing an earlier move than the latest
  const isViewingHistory =
    historyEntries.length > 0 &&
    currentViewedIndex !== null &&
    currentViewedIndex < historyEntries.length - 1;

  const displayedBoard = useMemo(() => {
    // -1 = başlangıç konumunu görüntüle → gerçek oyun başlangıcı (özel dizilim korunur)
    if (currentViewedIndex === -1) {
      return startSnapshot.board;
    }
    // null = hamle yok, canlı konum → o anki tahta (oyun başında = özel dizilim)
    if (currentViewedIndex === null) {
      return gameState.board;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.boardState : gameState.board;
  }, [currentViewedIndex, gameState.board, historyEntries, startSnapshot]);

  const displayedCitadels = useMemo(() => {
    if (currentViewedIndex === -1) {
      return startSnapshot.citadels;
    }
    if (currentViewedIndex === null) {
      return gameState.citadels;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.citadelsState : gameState.citadels;
  }, [currentViewedIndex, gameState.citadels, historyEntries, startSnapshot]);

  const displayedCapturedPieces = useMemo(() => {
    if (currentViewedIndex === -1) {
      return { white: [], black: [] };
    }
    if (currentViewedIndex === null) {
      return gameState.capturedPieces;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.capturedPiecesState : gameState.capturedPieces;
  }, [currentViewedIndex, gameState.capturedPieces, historyEntries]);

  const displayedLastMove = useMemo(() => {
    if (currentViewedIndex === -1 || currentViewedIndex === null) {
      return null;
    }
    const entry = historyEntries[currentViewedIndex];
    if (!entry) return lastMove;
    return {
      from: entry.from,
      to: entry.to,
      capturedPiece: entry.capturedPiece,
      promotion: entry.promotion,
      isKingSwap: entry.isKingSwap,
    };
  }, [currentViewedIndex, lastMove, historyEntries]);

  // Computed strictly legal moves for currently selected square (in Live mode)
  const validMoves = useMemo(() => {
    if (isViewingHistory || !selectedPos || gameState.isGameOver) return [];

    const selectedPiece = getPieceAt(selectedPos, gameState.board, gameState.citadels);
    if (!selectedPiece || selectedPiece.color !== gameState.currentTurn) return [];

    const allLegalMoves = getLegalMoves(
      gameState.currentTurn,
      gameState.board,
      gameState.citadels,
      gameState.hasUsedKingSwap
    );

    return allLegalMoves.filter((m) => {
      if (selectedPos.isCitadel && m.from.isCitadel) {
        return selectedPos.citadelSide === m.from.citadelSide;
      }
      return !selectedPos.isCitadel && !m.from.isCitadel && m.from.x === selectedPos.x && m.from.y === selectedPos.y;
    });
  }, [
    isViewingHistory,
    selectedPos,
    gameState.board,
    gameState.citadels,
    gameState.currentTurn,
    gameState.hasUsedKingSwap,
    gameState.isGameOver,
  ]);

  // Execute a verified move in Live game
  // Tüm hesap saf yapılır: setState updater'ı içinde başka setState çağrılmaz.
  // (StrictMode'da updater çift çalışır; iç içe çağrılar hamle geçmişini
  // ikiye katlayıp notasyon barı ile tahtayı senkrondan çıkarırdı.)
  const executeMoveInternal = useCallback(
    (move: Move, promotionType?: PieceType) => {
      // Ensure we are in live view
      setViewedMoveIndex(null);

      const prev = stateRef.current.gameState;
      const prevEntries = stateRef.current.historyEntries;
      const prevTimes = { whiteTime: stateRef.current.whiteTime, blackTime: stateRef.current.blackTime };
      {
        const newBoard: BoardMatrix = prev.board.map((row) => [...row]);
        const newCitadels: CitadelState = {
          whiteCitadelPiece: prev.citadels.whiteCitadelPiece ? { ...prev.citadels.whiteCitadelPiece } : null,
          blackCitadelPiece: prev.citadels.blackCitadelPiece ? { ...prev.citadels.blackCitadelPiece } : null,
        };

        const newHasUsedKingSwap = { ...prev.hasUsedKingSwap };

        // 1. Moving piece
        let movingPiece: Piece | null = null;

        // Rule 2: Handle King Swap
        if (move.isKingSwap && move.swappedPiece) {
          const kingPiece = newBoard[move.from.y][move.from.x];
          const targetFriendly = newBoard[move.to.y][move.to.x];

          if (kingPiece && targetFriendly) {
            newBoard[move.to.y][move.to.x] = {
              ...kingPiece,
              position: move.to,
              hasMoved: true,
            };
            newBoard[move.from.y][move.from.x] = {
              ...targetFriendly,
              position: move.from,
            };
            newHasUsedKingSwap[prev.currentTurn] = true;
            movingPiece = kingPiece;
          }
        } else {
          // Standard Move / Capture / Citadel Move
          if (move.from.isCitadel) {
            if (move.from.citadelSide === 'left') {
              movingPiece = newCitadels.blackCitadelPiece;
              newCitadels.blackCitadelPiece = null;
            } else {
              movingPiece = newCitadels.whiteCitadelPiece;
              newCitadels.whiteCitadelPiece = null;
            }
          } else {
            movingPiece = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;
          }

          if (!movingPiece) return;

          // Handle Captures
          let capturedPiece = move.capturedPiece;
          if (!capturedPiece && !move.to.isCitadel) {
            capturedPiece = newBoard[move.to.y][move.to.x] || undefined;
          }

          // Rule 4: Handle Pawn Promotion Pipeline & Multi-stage Relocation
          let effectiveType = promotionType || move.promotion || movingPiece.type;
          let targetPosition = move.to;
          let newPawnStage = movingPiece.pawnOfPawnsStage;

          if (movingPiece.type === 'pawn') {
            const isPromotionRow = (movingPiece.color === 'white' && move.to.y === 9) || (movingPiece.color === 'black' && move.to.y === 0);
            if (isPromotionRow) {
              const promoResult = processPawnPromotion(movingPiece, move.to, newBoard, newCitadels, promotionType);
              effectiveType = promoResult.promotedType;
              if (promoResult.isRelocation && promoResult.relocationPos) {
                targetPosition = promoResult.relocationPos;
                newPawnStage = promoResult.newStage;
              } else if (promoResult.newStage !== undefined) {
                newPawnStage = promoResult.newStage;
              }
            }
          }

          const updatedPiece: Piece = {
            ...movingPiece,
            type: effectiveType,
            position: targetPosition,
            hasMoved: true,
            pawnOfPawnsStage: newPawnStage,
          };

          if (targetPosition.isCitadel) {
            if (targetPosition.citadelSide === 'left') {
              newCitadels.blackCitadelPiece = updatedPiece;
            } else {
              newCitadels.whiteCitadelPiece = updatedPiece;
            }
          } else {
            newBoard[targetPosition.y][targetPosition.x] = updatedPiece;
          }
        }

        if (!movingPiece) return;

        // 2. Captures State
        const newCaptured = {
          white: [...prev.capturedPieces.white],
          black: [...prev.capturedPieces.black],
        };

        const capturedPiece = move.capturedPiece || (!move.isKingSwap && !move.to.isCitadel ? prev.board[move.to.y][move.to.x] || undefined : undefined);
        if (capturedPiece && !move.isKingSwap) {
          if (capturedPiece.color === 'white') {
            newCaptured.white.push(capturedPiece);
          } else {
            newCaptured.black.push(capturedPiece);
          }
        }

        // 3. Next Turn & Game Status Evaluation
        const nextTurn: PlayerColor = prev.currentTurn === 'white' ? 'black' : 'white';

        const nextStateCandidate: GameState = {
          ...prev,
          board: newBoard,
          citadels: newCitadels,
          currentTurn: nextTurn,
          hasUsedKingSwap: newHasUsedKingSwap,
          capturedPieces: newCaptured,
        };

        const statusResult = calculateGameStatus(nextStateCandidate);

        const notation = generateMoveNotation(
          { ...move, capturedPiece, promotion: promotionType },
          movingPiece,
          statusResult.isCheck,
          statusResult.isCheckmate
        );

        const newMove = { ...move, san: notation, capturedPiece, promotion: promotionType };
        const newMoveHistory = [...prev.moveHistory, newMove];

        setStatusText(statusResult.reason);
        if (statusResult.isGameOver) {
          onGameOver?.(statusResult.winner || 'draw', statusResult.reason);
        }

        // Create structured history entry
        const historyEntry: MoveHistoryEntry = {
          moveNumber: newMoveHistory.length,
          turnNumber: prev.turnNumber,
          player: prev.currentTurn,
          notation,
          from: move.from,
          to: move.to,
          capturedPiece,
          promotion: promotionType,
          boardState: newBoard,
          citadelsState: newCitadels,
          capturedPiecesState: newCaptured,
          isCheck: statusResult.isCheck,
          isCheckmate: statusResult.isCheckmate,
          isKingSwap: move.isKingSwap,
          isRelocation: move.isRelocation,
        };

        setHistoryEntries((prevEntries) => [...prevEntries, historyEntry]);

        // Ses: şah/mat > yeme > rastgele normal hamle (tüm oyun ekranları)
        playMoveSound(historyEntry);

        // Save history for undo
        setHistoryStack((h) => [
          ...h,
          {
            gameState: prev,
            historyEntries: prevEntries,
            whiteTime: prevTimes.whiteTime,
            blackTime: prevTimes.blackTime,
          },
        ]);
        setRedoStack([]);
        setLastMove(newMove);

        onMoveMade?.(move, notation);

        const next: GameState = {
          ...prev,
          board: newBoard,
          citadels: newCitadels,
          currentTurn: nextTurn,
          capturedPieces: newCaptured,
          moveHistory: newMoveHistory,
          isCheck: statusResult.isCheck,
          isCheckmate: statusResult.isCheckmate,
          isStalemate: statusResult.isStalemate,
          isGameOver: statusResult.isGameOver,
          status: statusResult.status,
          statusReason: statusResult.reason,
          winner: statusResult.winner,
          hasUsedKingSwap: newHasUsedKingSwap,
          turnNumber: nextTurn === 'white' ? prev.turnNumber + 1 : prev.turnNumber,
        };
        setGameState(next);
      }

      // Fischer increment: add increment to the player who just moved
      if (incrementSeconds > 0) {
        if (prev.currentTurn === 'white') {
          setWhiteTime((t) => t + incrementSeconds);
        } else {
          setBlackTime((t) => t + incrementSeconds);
        }
      }

      setSelectedPos(null);
    },
    [incrementSeconds, onMoveMade, onGameOver]
  );

  // History Navigation Controls
  // Notasyon barı ve tahta aynı state'ten beslenir; son hamleye gidildiğinde
  // "canlı" (null) normalize edilir — bar vurgusu ile tahta konumu birebir
  // paralel olur ve tahta girişi gereksiz yere kilitlenmez.

  // executeMoveInternal referansı: bot etkisi, üst bileşenin her render'ında
  // değişen callback kimlikleri yüzünden gereksiz tetiklenmesin diye ref
  // üzerinden GÜNCEL kapanışı çağırır (bağımlılıklara alınmaz).
  const executeRef = useRef(executeMoveInternal);
  executeRef.current = executeMoveInternal;

  // ── Bot hamlesi (Faz 6, opt-in) ──────────────────────────────────────────
  // `botSide` YOKSA bu effect her zaman erken döner: mevcut davranış birebir
  // korunur. Varsa ve sıra bottaysa, hamle Worker'daki Engine+Bot hattına
  // hesaplattırılır; sonuç aynı `executeMoveInternal` yolundan oynanır
  // (kural/notasyon/tarihçe akışı insan hamlesiyle BİREBİR aynıdır).
  // Bayat cevaplar (undo/reset/StrictMode) token + hamle-sayacı ile düşürülür.
  const botReqRef = useRef<{ cancel: () => void } | null>(null);
  const botTokenRef = useRef(0);
  useEffect(() => {
    if (!botSide) return;
    if (gameState.isGameOver || isPaused || isViewingHistory) return;
    if (gameState.currentTurn !== botSide) return;
    if (!isWorkerSupported()) return;
    const client = getSharedEngineClient(() => createBrowserWorker());
    if (!client) return;

    // Bayat isteği iptal et (StrictMode çift-çalıştırma / hızlı reset güvenliği).
    botReqRef.current?.cancel();
    botReqRef.current = null;
    const myToken = ++botTokenRef.current;
    const snapshot = stateRef.current.gameState;
    const moveNoAtRequest = snapshot.moveHistory.length;
    setBotThinking(true);
    const req = client.findBestMove(
      legacyGameStateToPosition(snapshot),
      botProfileId,
    );
    botReqRef.current = { cancel: () => req.cancel() };
    req.then(
      (result) => {
        if (botTokenRef.current !== myToken) return; // bayat cevap
        const snap = stateRef.current.gameState;
        if (snap.isGameOver || snap.currentTurn !== botSide) return;
        if (snap.moveHistory.length !== moveNoAtRequest) return; // undo/reset olmuş
        const conv = engineMoveToLegacy(snap, result.bestMove);
        if (!conv) {
          setBotThinking(false);
          return;
        }
        executeRef.current(conv.move, conv.promotionType);
        setBotThinking(false);
      },
      () => {
        // cancel/hata: oyun akışı bozulmaz, sadece düşünme göstergesi iner
        if (botTokenRef.current === myToken) setBotThinking(false);
      },
    );
    return () => {
      botReqRef.current?.cancel();
      botReqRef.current = null;
    };
  }, [botSide, botProfileId, gameState, isPaused, isViewingHistory]);
  const goToMove = useCallback((index: number | null) => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) {
      setViewedMoveIndex(null);
      return;
    }
    if (index === null || index >= count - 1) {
      setViewedMoveIndex(null);
    } else {
      setViewedMoveIndex(Math.max(-1, index));
    }
  }, [historyEntries.length]);

  const goToPreviousMove = useCallback(() => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) return;

    setViewedMoveIndex((prev) => {
      const current = prev !== null ? prev : count - 1;
      return Math.max(-1, current - 1);
    });
  }, [historyEntries.length]);

  const goToNextMove = useCallback(() => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) return;

    setViewedMoveIndex((prev) => {
      const current = prev !== null ? prev : count - 1;
      const next = Math.min(count - 1, current + 1);
      // Sona varınca canlı görünüme dön (tahta girişi açık kalır)
      return next >= count - 1 ? null : next;
    });
  }, [historyEntries.length]);

  const goToLive = useCallback(() => {
    setSelectedPos(null);
    setViewedMoveIndex(null);
  }, []);

  // Click handler on board square or citadel
  const handleSelectSquare = useCallback(
    (pos: BoardPosition) => {
      // If user is currently viewing history, ignore board clicks so history view remains intact
      if (viewedMoveIndex !== null) {
        return;
      }

      if (gameState.isGameOver || isPaused) return;

      // Bot düşünürken insan girişi engellenir (sıra değişmeden önce race condition önlemi)
      if (botThinking) return;

      // 1. If a piece is already selected
      if (selectedPos) {
        // Deselect if clicked same square
        if (
          (pos.isCitadel && selectedPos.isCitadel && pos.citadelSide === selectedPos.citadelSide) ||
          (!pos.isCitadel && !selectedPos.isCitadel && pos.x === selectedPos.x && pos.y === selectedPos.y)
        ) {
          setSelectedPos(null);
          return;
        }

        // Check if destination is in valid moves
        const targetMove = validMoves.find((m) => {
          if (pos.isCitadel && m.to.isCitadel) {
            return pos.citadelSide === m.to.citadelSide;
          }
          return !pos.isCitadel && !m.to.isCitadel && m.to.x === pos.x && m.to.y === pos.y;
        });

        if (targetMove) {
          let piece: Piece | null = null;
          if (selectedPos.isCitadel) {
            piece =
              selectedPos.citadelSide === 'left'
                ? gameState.citadels.blackCitadelPiece
                : gameState.citadels.whiteCitadelPiece;
          } else {
            piece = gameState.board[selectedPos.y][selectedPos.x];
          }

          if (piece && piece.type === 'pawn' && targetMove.promotion) {
            setPendingPromotion({
              move: targetMove,
              piece,
              defaultType: targetMove.promotion,
            });
            return;
          }

          executeMoveInternal(targetMove);
          return;
        }

        // If clicked own piece, switch selection
        const clickedPiece = pos.isCitadel
          ? pos.citadelSide === 'left'
            ? gameState.citadels.blackCitadelPiece
            : gameState.citadels.whiteCitadelPiece
          : gameState.board[pos.y][pos.x];

        if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
          setSelectedPos(pos);
          return;
        }

        setSelectedPos(null);
        return;
      }

      // 2. Select initial piece
      const clickedPiece = pos.isCitadel
        ? pos.citadelSide === 'left'
          ? gameState.citadels.blackCitadelPiece
          : gameState.citadels.whiteCitadelPiece
        : gameState.board[pos.y][pos.x];

      if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
        setSelectedPos(pos);
      }
    },
    [viewedMoveIndex, goToLive, gameState, isPaused, botThinking, selectedPos, validMoves, executeMoveInternal]
  );

  // Complete pawn promotion
  const resolvePromotion = useCallback(
    (chosenType: PieceType) => {
      if (!pendingPromotion) return;
      executeMoveInternal(pendingPromotion.move, chosenType);
      setPendingPromotion(null);
    },
    [pendingPromotion, executeMoveInternal]
  );

  // Drag & drop: tüm oyun modlarında sürükle-bırak ile hamle yap
  const handleDropMove = useCallback(
    (from: BoardPosition, to: BoardPosition) => {
      if (viewedMoveIndex !== null) return;
      if (gameState.isGameOver || isPaused) return;
      // Bot düşünürken sürükle-bırak da engellenir
      if (botThinking) return;

      const sameSquare =
        !!from.isCitadel === !!to.isCitadel &&
        (from.isCitadel
          ? from.citadelSide === to.citadelSide
          : from.x === to.x && from.y === to.y);
      if (sameSquare) return;

      const movingPiece = from.isCitadel
        ? from.citadelSide === 'left'
          ? gameState.citadels.blackCitadelPiece
          : gameState.citadels.whiteCitadelPiece
        : gameState.board[from.y]?.[from.x];

      if (!movingPiece || movingPiece.color !== gameState.currentTurn) return;

      const allLegalMoves = getLegalMoves(
        gameState.currentTurn,
        gameState.board,
        gameState.citadels,
        gameState.hasUsedKingSwap
      );

      const targetMove = allLegalMoves.find((m) => {
        const fromMatch = from.isCitadel
          ? m.from.isCitadel && m.from.citadelSide === from.citadelSide
          : !m.from.isCitadel && !from.isCitadel && m.from.x === from.x && m.from.y === from.y;
        if (!fromMatch) return false;
        if (to.isCitadel) return m.to.isCitadel && m.to.citadelSide === to.citadelSide;
        return !m.to.isCitadel && !to.isCitadel && m.to.x === to.x && m.to.y === to.y;
      });

      if (!targetMove) return;

      if (movingPiece.type === 'pawn' && targetMove.promotion) {
        setSelectedPos(from);
        setPendingPromotion({
          move: targetMove,
          piece: movingPiece,
          defaultType: targetMove.promotion,
        });
        return;
      }

      executeMoveInternal(targetMove);
    },
    [viewedMoveIndex, gameState, isPaused, botThinking, executeMoveInternal]
  );

  // Undo (Moves live game back 1 turn)
  const undoMove = useCallback(() => {
    if (historyStack.length === 0) return;
    const lastItem = historyStack[historyStack.length - 1];
    setRedoStack((r) => [
      ...r,
      { gameState, historyEntries, whiteTime, blackTime },
    ]);
    setHistoryStack((h) => h.slice(0, -1));
    setGameState(lastItem.gameState);
    setHistoryEntries(lastItem.historyEntries);
    setWhiteTime(lastItem.whiteTime);
    setBlackTime(lastItem.blackTime);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(
      lastItem.gameState.moveHistory.length > 0
        ? lastItem.gameState.moveHistory[lastItem.gameState.moveHistory.length - 1]
        : null
    );
    const turnName = lastItem.gameState.currentTurn === 'white' ? whiteName : blackName;
    setStatusText(`Hamle geri alındı (${turnName} sırası)`);
  }, [historyStack, gameState, historyEntries, whiteTime, blackTime, whiteName, blackName]);

  // Redo (Re-applies previously undone move)
  const redoMove = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextItem = redoStack[redoStack.length - 1];
    setHistoryStack((h) => [
      ...h,
      { gameState, historyEntries, whiteTime, blackTime },
    ]);
    setRedoStack((r) => r.slice(0, -1));
    setGameState(nextItem.gameState);
    setHistoryEntries(nextItem.historyEntries);
    setWhiteTime(nextItem.whiteTime);
    setBlackTime(nextItem.blackTime);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(
      nextItem.gameState.moveHistory.length > 0
        ? nextItem.gameState.moveHistory[nextItem.gameState.moveHistory.length - 1]
        : null
    );
    const turnName = nextItem.gameState.currentTurn === 'white' ? whiteName : blackName;
    setStatusText(`Hamle ileri alındı (${turnName} sırası)`);
  }, [redoStack, gameState, historyEntries, whiteTime, blackTime, whiteName, blackName]);

  // Pause / Resume (updater saf tutulur: yan etki dışarıda — StrictMode güvenliği)
  const togglePause = useCallback(() => {
    const next = !stateRef.current.isPaused;
    const turn = stateRef.current.gameState.currentTurn;
    setIsPaused(next);
    setStatusText(next ? 'Oyun duraklatıldı.' : `${turn === 'white' ? whiteName : blackName} sırası`);
  }, [whiteName, blackName]);

  // Reset Game — her zaman GERÇEK oyun başlangıcına döner (özel dizilim korunur)
  const resetGame = useCallback(() => {
    const starter = startSnapshot.turn;
    setGameState({
      board: cloneBoard(startSnapshot.board),
      citadels: cloneCitadels(startSnapshot.citadels),
      currentTurn: starter,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: { white: false, black: false },
      turnNumber: 1,
      halfMoveClock: 0,
    });
    setHistoryEntries([]);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(null);
    setPendingPromotion(null);
    setWhiteTime(initialTimeSeconds);
    setBlackTime(initialTimeSeconds);
    setIsPaused(false);
    setStatusText(`${starter === 'white' ? whiteName : blackName} hamle sırası...`);
    setHistoryStack([]);
    setRedoStack([]);
  }, [startSnapshot, initialTimeSeconds, whiteName, blackName]);

  // Resign Game (bitmiş oyunda tekrar ateşlenmez: çift onGameOver önlenir)
  const resignGame = useCallback(
    (player: PlayerColor) => {
      if (stateRef.current.gameState.isGameOver) return;
      const winner: PlayerColor = player === 'white' ? 'black' : 'white';
      const winnerName = winner === 'white' ? whiteName : blackName;
      const loserName = player === 'white' ? whiteName : blackName;
      setGameState((prev) => ({
        ...prev,
        isGameOver: true,
        winner,
      }));
      setStatusText(`${loserName} terk etti. Kazanan: ${winnerName}!`);
      onGameOver?.(winner, `${loserName} oyunu terk etti.`);
    },
    [whiteName, blackName, onGameOver]
  );

  // Agree Draw (bitmiş oyunda tekrar ateşlenmez)
  const agreeDraw = useCallback(() => {
    if (stateRef.current.gameState.isGameOver) return;
    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: 'draw',
    }));
    setStatusText('Karşılıklı anlaşma ile oyun berabere bitti.');
    onGameOver?.('draw', 'Beraberlik sağlandı.');
  }, [onGameOver]);

  // Apply Remote Snapshot (Online modda rakip hamlesi veya yeniden senkronizasyon için)
  const applyRemoteSnapshot = useCallback(
    (snapshot: {
      board: BoardMatrix;
      citadels: CitadelState;
      capturedPieces?: { white: Piece[]; black: Piece[] };
      currentTurn: PlayerColor;
      turnNumber?: number;
      lastMove?: Move | null;
      historyEntry?: MoveHistoryEntry;
      isCheck?: boolean;
      isCheckmate?: boolean;
      isStalemate?: boolean;
      isGameOver?: boolean;
      winner?: PlayerColor | 'draw' | null;
      status?: GameStatus;
      statusReason?: string;
    }) => {
      setGameState((prev) => ({
        ...prev,
        board: snapshot.board,
        citadels: snapshot.citadels,
        capturedPieces: snapshot.capturedPieces ?? prev.capturedPieces,
        currentTurn: snapshot.currentTurn,
        turnNumber: snapshot.turnNumber ?? prev.turnNumber,
        isCheck: snapshot.isCheck ?? prev.isCheck,
        isCheckmate: snapshot.isCheckmate ?? prev.isCheckmate,
        isStalemate: snapshot.isStalemate ?? prev.isStalemate,
        isGameOver: snapshot.isGameOver ?? prev.isGameOver,
        winner: snapshot.winner !== undefined ? snapshot.winner : prev.winner,
        status: snapshot.status ?? prev.status,
        statusReason: snapshot.statusReason ?? prev.statusReason,
      }));

      if (snapshot.lastMove !== undefined) {
        setLastMove(snapshot.lastMove);
      }

      if (snapshot.historyEntry) {
        const entry = snapshot.historyEntry;
        setHistoryEntries((prev) => {
          if (prev.some((e) => e.moveNumber === entry.moveNumber)) {
            return prev;
          }
          return [...prev, entry];
        });

        // Fischer increment for the remote player who moved
        if (incrementSeconds > 0) {
          if (entry.player === 'white') {
            setWhiteTime((t) => t + incrementSeconds);
          } else {
            setBlackTime((t) => t + incrementSeconds);
          }
        }
      }

      setViewedMoveIndex(null);
      setSelectedPos(null);
      setPendingPromotion(null);

      if (snapshot.statusReason) {
        setStatusText(snapshot.statusReason);
      } else {
        const turnName = snapshot.currentTurn === 'white' ? whiteName : blackName;
        setStatusText(`${turnName} hamle sırası...`);
      }
    },
    [whiteName, blackName, incrementSeconds]
  );

  return {
    // Live State
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    botThinking,
    statusText,
    boardRotates,
    whiteName,
    blackName,
    selectedPos,
    validMoves,
    lastMove,
    pendingPromotion,

    // Displayed / History View State
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,
    isViewingHistory,

    // Navigation & Actions
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    applyRemoteSnapshot,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    goToLive,
    undoMove,
    redoMove,
    togglePause,
    resetGame,
    resignGame,
    agreeDraw,
    canUndo: historyStack.length > 0,
    canRedo: redoStack.length > 0,
    canGoPrevious: historyEntries.length > 0 && (currentViewedIndex === null ? false : currentViewedIndex > -1),
    canGoNext: historyEntries.length > 0 && (currentViewedIndex === null ? false : currentViewedIndex < historyEntries.length - 1),
  };
}
