/**
 * SAF durum makinesi (Bölüm 7).
 *
 * Saflık: burada yalnızca çekirdek kural hesapları
 * (`generateLegalMoves`, `makeMove`, `kingSwapTargets`) + saf veri dönüşümü
 * vardır. Zamanlayıcı, ses, kayıt gibi yan etkiler `useGuidedLesson`
 * katmanındadır; zaman `TIMEOUT` / `PHASE_DONE` / `PLAY_DONE` action'ı olarak
 * dışarıdan gelir. `reduce` girdi state'ini mutate etmez.
 */
import {
  PieceKind,
  type Position,
  type SquareIndex,
} from '../../core/position/Position';
import { computeZobristForArrays } from '../../core/position/zobrist';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import { kingSwapTargets } from '../../core/rules/shared';
import type { GuidedLesson, GuidedStep, PositionRef } from './types';
import type { GuidedAction, GuidedState } from './machine.types';

export type { GuidedAction, GuidedState };

export interface MachineState extends GuidedState {
  /** O anki konum (hamleler buradan türetilir; değişmez güncellenir). */
  at: Position | null;
  /** Adım giriş anlık görüntüleri (BACK ile dönüş için). */
  snapshots: (Position | null)[];
  /** EXPLAIN_DONE sonrası yön: 'next' ilerler, 'retry' quize döner. */
  afterExplain: 'next' | 'retry';
}

let seq = 0;

function keyOf(pos: Position | null): string {
  if (!pos) return 'none';
  const parts: string[] = [pos.sideToMove];
  const board = pos.board as unknown as ({ kind: string; side: string } | null)[];
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (p) parts.push(`${i}:${p.side}:${p.kind}`);
  }
  return parts.join('|');
}

function clonePositions(list: (Position | null)[]): (Position | null)[] {
  return list.slice();
}

/** Sahnelenmiş konumu kur (pieces). serialized burada çözülemez. */
function buildPieces(ref: PositionRef): Position | null {
  if (ref.kind !== 'pieces') return null;
  seq += 1;
  const board: unknown[] = new Array(112).fill(null);
  for (const p of ref.pieces) {
    board[p.square] = {
      id: `m-${seq}-${p.side}-${String(p.kind)}-${p.square}`,
      kind: p.kind,
      side: p.side,
      pawnOf: p.kind === PieceKind.Pawn ? p.pawnOf : undefined,
      hasMoved: false,
      pawnStage: p.kind === PieceKind.Pawn && p.promotionStage !== undefined
        ? p.promotionStage
        : undefined,
    };
  }
  const citadels = {
    topLeft: { occupant: (board[110] as never) ?? null, sealed: false },
    bottomRight: { occupant: (board[111] as never) ?? null, sealed: false },
  };
  const pos = {
    board,
    sideToMove: ref.sideToMove,
    citadels,
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: { ...(ref.kingSwapUsed ?? { white: false, black: false }) },
    },
    zobristHash: 0n,
  };
  (pos as { zobristHash: bigint }).zobristHash = computeZobristForArrays(board as never, ref.sideToMove);
  return pos as unknown as Position;
}

export function initialState(): MachineState {
  return {
    status: 'idle',
    lesson: null,
    index: 0,
    phase: 0,
    found: [],
    hintLevels: {},
    wrongCounts: {},
    autoHint: false,
    skipped: false,
    totalHints: 0,
    lastResult: null,
    completedStepIndex: -1,
    xpAward: null,
    error: null,
    boardKey: 'none',
    at: null,
    snapshots: [],
    afterExplain: 'next',
  };
}

function isNarrative(lesson: GuidedLesson): boolean {
  return lesson.mode === 'narrative';
}

function isAwaitKind(kind: GuidedStep['kind']): boolean {
  return kind === 'awaitMove' || kind === 'awaitSquare' || kind === 'awaitSquares' || kind === 'awaitSwap';
}

function finishXp(lesson: GuidedLesson): number {
  for (let i = lesson.steps.length - 1; i >= 0; i--) {
    const s = lesson.steps[i];
    if (s.kind === 'finish') return s.xp;
  }
  return 0;
}

function computeAward(lesson: GuidedLesson, totalHints: number, skipped: boolean): number {
  const base = finishXp(lesson);
  if (skipped) return Math.floor(base * 0.5);
  if (totalHints <= 0) return base;
  if (totalHints === 1) return Math.floor(base * 0.8);
  return Math.floor(base * 0.6);
}

function toFinished(prev: MachineState): MachineState {
  return {
    ...prev,
    status: 'finished',
    lastResult: null,
    autoHint: false,
    completedStepIndex: prev.lesson ? prev.lesson.steps.length - 1 : prev.completedStepIndex,
    xpAward: prev.lesson ? computeAward(prev.lesson, prev.totalHints, prev.skipped) : 0,
    boardKey: keyOf(prev.at),
  };
}

function toContentError(prev: MachineState, stepIndex: number, message: string): MachineState {
  return {
    ...prev,
    status: 'contentError',
    lastResult: null,
    error: {
      lessonId: prev.lesson ? prev.lesson.id : '?',
      stepIndex,
      message,
    },
    boardKey: keyOf(prev.at),
  };
}

/** Adım giriş yönlendirmesi (saf): indeksteki adıma uygun durum + konum. */
function enterAt(prev: MachineState, i: number): MachineState {
  const lesson = prev.lesson;
  if (!lesson) return { ...prev, status: 'idle' };
  if (i >= lesson.steps.length) return toFinished({ ...prev, index: lesson.steps.length });
  const step = lesson.steps[i];
  if (isNarrative(lesson) && (isAwaitKind(step.kind) || step.kind === 'expectRejection')) {
    return toContentError({ ...prev, index: i }, i, `narrative derste '${step.kind}' adımı kullanılamaz`);
  }
  if (step.kind === 'setPosition') {
    const built = buildPieces(step.position);
    if (!built) {
      return toContentError({ ...prev, index: i }, i, 'setPosition konumu bu katmanda çözülemedi');
    }
    const snapshots = clonePositions(prev.snapshots);
    snapshots[i] = built;
    return {
      ...prev,
      status: 'presenting',
      index: i,
      phase: 0,
      found: [],
      autoHint: false,
      lastResult: null,
      completedStepIndex: Math.max(prev.completedStepIndex, i - 1),
      at: built,
      snapshots,
      boardKey: keyOf(built),
    };
  }
  const at = prev.at;
  if (!at) {
    return toContentError({ ...prev, index: i }, i, 'konum yok (START ile başlatılmalı)');
  }
  const snapshots = clonePositions(prev.snapshots);
  if (snapshots[i] == null) snapshots[i] = at;
  const base: MachineState = {
    ...prev,
    index: i,
    phase: 0,
    found: [],
    autoHint: false,
    lastResult: null,
    completedStepIndex: Math.max(prev.completedStepIndex, i - 1),
    snapshots,
    boardKey: keyOf(at),
  };
  switch (step.kind) {
    case 'play':
      return { ...base, status: 'playing' };
    case 'expectRejection':
      return { ...base, status: 'trapping' };
    case 'quiz':
      return { ...base, status: 'quizzing' };
    case 'awaitMove':
    case 'awaitSquare':
    case 'awaitSquares':
    case 'awaitSwap':
      return { ...base, status: 'awaiting' };
    default:
      return { ...base, status: 'presenting' };
  }
}

function destinationsOf(at: Position, from: SquareIndex): SquareIndex[] {
  return generateLegalMoves(at).filter((m) => m.from === from).map((m) => m.to);
}

function swapPartners(at: Position): { from: SquareIndex; partners: SquareIndex[] } | null {
  const used = at.flags.hasUsedKingSwap ?? { white: false, black: false };
  const targets = kingSwapTargets(at.sideToMove, at.board, at.citadels, used);
  if (targets.length === 0) return null;
  return { from: targets[0].from, partners: targets.map((t) => t.to) };
}

export function reduce(prev: MachineState, action: GuidedAction): MachineState {
  if (prev.status === 'finished') return prev;
  switch (action.type) {
    case 'START': {
      const lesson = action.lesson;
      const fresh = initialState();
      if (lesson.steps.length === 0) {
        return { ...fresh, lesson, status: 'finished', xpAward: 0, completedStepIndex: -1 };
      }
      const start = buildPieces(lesson.startPosition);
      if (!start) {
        return {
          ...fresh,
          lesson,
          status: 'contentError',
          error: { lessonId: lesson.id, stepIndex: -1, message: 'startPosition bu katmanda çözülemedi' },
        };
      }
      const seeded: MachineState = { ...fresh, lesson, at: start, snapshots: [start], boardKey: keyOf(start) };
      return enterAt(seeded, 0);
    }

    case 'NEXT': {
      if (prev.status !== 'presenting' || !prev.lesson) return prev;
      const step = prev.lesson.steps[prev.index];
      if (step.kind === 'showGeometry' && prev.phase < step.phases.length) return prev;
      return enterAt(prev, prev.index + 1);
    }

    case 'BACK': {
      if (!prev.lesson || prev.index <= 0) return prev;
      if (prev.status === 'idle' || prev.status === 'playing') return prev;
      const i = prev.index - 1;
      const snap = prev.snapshots[i] ?? null;
      const back: MachineState = {
        ...prev,
        at: snap,
        found: [],
        autoHint: false,
        lastResult: null,
        afterExplain: 'next',
        boardKey: keyOf(snap),
      };
      return enterAt(back, i);
    }

    case 'PHASE_DONE': {
      if (prev.status !== 'presenting' || !prev.lesson) return prev;
      const step = prev.lesson.steps[prev.index];
      if (step.kind !== 'showGeometry') return prev;
      if (prev.phase >= step.phases.length) return prev;
      return { ...prev, phase: prev.phase + 1, boardKey: keyOf(prev.at) };
    }

    case 'PLAY_DONE': {
      if (prev.status !== 'playing' || !prev.lesson || !prev.at) return prev;
      const step = prev.lesson.steps[prev.index];
      if (step.kind !== 'play') return prev;
      const match = generateLegalMoves(prev.at).find(
        (m) => m.from === step.move.from && m.to === step.move.to,
      );
      if (!match) {
        return toContentError(prev, prev.index, `play hamlesi ${step.move.from}→${step.move.to} legal değil`);
      }
      const next = makeMove(prev.at, match);
      const snapshots = clonePositions(prev.snapshots);
      const advanced: MachineState = {
        ...prev,
        at: next,
        lastResult: 'correct',
        completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
        snapshots,
        boardKey: keyOf(next),
      };
      return enterAt(advanced, prev.index + 1);
    }

    case 'INPUT_MOVE': {
      if (!prev.lesson || !prev.at) return prev;
      const step = prev.lesson.steps[prev.index];
      if (prev.status === 'awaiting' && step.kind === 'awaitMove') {
        const legal = generateLegalMoves(prev.at).find(
          (m) => m.from === action.move.from && m.to === action.move.to,
        );
        const accepted = step.accept.some(
          (a) => a.from === action.move.from && a.to === action.move.to,
        );
        if (legal && accepted) {
          const next = makeMove(prev.at, legal);
          const advanced: MachineState = {
            ...prev,
            at: next,
            lastResult: 'correct',
            completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
            boardKey: keyOf(next),
          };
          return enterAt(advanced, prev.index + 1);
        }
        const wrong = (prev.wrongCounts[prev.index] ?? 0) + 1;
        const hintAfter = step.hintAfter ?? 3;
        return {
          ...prev,
          wrongCounts: { ...prev.wrongCounts, [prev.index]: wrong },
          autoHint: wrong >= hintAfter,
          lastResult: 'wrong',
          boardKey: keyOf(prev.at),
        };
      }
      if (prev.status === 'trapping' && step.kind === 'expectRejection') {
        if (action.move.from === step.attempt.from && action.move.to === step.attempt.to) {
          return { ...prev, status: 'explaining', afterExplain: 'next', lastResult: 'trap-success', boardKey: keyOf(prev.at) };
        }
        return { ...prev, lastResult: null, boardKey: keyOf(prev.at) };
      }
      return prev;
    }

    case 'INPUT_SQUARE': {
      if (!prev.lesson || !prev.at) return prev;
      const step = prev.lesson.steps[prev.index];
      if (prev.status !== 'awaiting') return prev;
      if (step.kind === 'awaitSquare') {
        if (step.accept.includes(action.square)) {
          const advanced: MachineState = {
            ...prev,
            lastResult: 'correct',
            completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
            boardKey: keyOf(prev.at),
          };
          return enterAt(advanced, prev.index + 1);
        }
        const wrong = (prev.wrongCounts[prev.index] ?? 0) + 1;
        return {
          ...prev,
          wrongCounts: { ...prev.wrongCounts, [prev.index]: wrong },
          autoHint: wrong >= 3,
          lastResult: 'wrong',
          boardKey: keyOf(prev.at),
        };
      }
      if (step.kind === 'awaitSquares') {
        const dests = destinationsOf(prev.at, step.from);
        if (!dests.includes(action.square)) {
          const wrong = (prev.wrongCounts[prev.index] ?? 0) + 1;
          return {
            ...prev,
            wrongCounts: { ...prev.wrongCounts, [prev.index]: wrong },
            autoHint: wrong >= 3,
            lastResult: 'wrong',
            boardKey: keyOf(prev.at),
          };
        }
        if (prev.found.includes(action.square)) return prev;
        const found = [...prev.found, action.square];
        if (found.length >= step.count) {
          const advanced: MachineState = {
            ...prev,
            found,
            lastResult: 'correct',
            completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
            boardKey: keyOf(prev.at),
          };
          return enterAt(advanced, prev.index + 1);
        }
        return { ...prev, found, lastResult: null, boardKey: keyOf(prev.at) };
      }
      return prev;
    }

    case 'INPUT_SWAP': {
      if (!prev.lesson || !prev.at) return prev;
      const step = prev.lesson.steps[prev.index];
      if (prev.status !== 'awaiting' || step.kind !== 'awaitSwap') return prev;
      const info = swapPartners(prev.at);
      if (info && info.partners.includes(action.partner)) {
        const match = generateLegalMoves(prev.at).find(
          (m) => m.from === info.from && m.to === action.partner,
        );
        if (!match) return prev;
        const next = makeMove(prev.at, match);
        const advanced: MachineState = {
          ...prev,
          at: next,
          lastResult: 'correct',
          completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
          boardKey: keyOf(next),
        };
        return enterAt(advanced, prev.index + 1);
      }
      const wrong = (prev.wrongCounts[prev.index] ?? 0) + 1;
      return {
        ...prev,
        wrongCounts: { ...prev.wrongCounts, [prev.index]: wrong },
        autoHint: wrong >= 3,
        lastResult: 'wrong',
        boardKey: keyOf(prev.at),
      };
    }

    case 'ANSWER': {
      if (prev.status !== 'quizzing' || !prev.lesson) return prev;
      const step = prev.lesson.steps[prev.index];
      if (step.kind !== 'quiz') return prev;
      if (action.optionIndex === step.correctIndex) {
        return { ...prev, status: 'explaining', afterExplain: 'next', lastResult: 'correct', boardKey: keyOf(prev.at) };
      }
      const wrong = (prev.wrongCounts[prev.index] ?? 0) + 1;
      return {
        ...prev,
        status: 'explaining',
        afterExplain: 'retry',
        wrongCounts: { ...prev.wrongCounts, [prev.index]: wrong },
        lastResult: 'wrong',
        boardKey: keyOf(prev.at),
      };
    }

    case 'HINT': {
      if (prev.status !== 'awaiting' || !prev.lesson) return prev;
      const level = Math.min(3, (prev.hintLevels[prev.index] ?? 0) + 1);
      return {
        ...prev,
        hintLevels: { ...prev.hintLevels, [prev.index]: level },
        totalHints: prev.totalHints + 1,
        boardKey: keyOf(prev.at),
      };
    }

    case 'SKIP': {
      if (!prev.lesson) return prev;
      if (prev.status !== 'awaiting' && prev.status !== 'trapping' && prev.status !== 'quizzing') return prev;
      const skipped: MachineState = {
        ...prev,
        skipped: true,
        lastResult: null,
        completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
      };
      return enterAt(skipped, prev.index + 1);
    }

    case 'TIMEOUT': {
      if (prev.status !== 'trapping' || !prev.lesson) return prev;
      return { ...prev, status: 'explaining', afterExplain: 'next', lastResult: 'timeout-show', boardKey: keyOf(prev.at) };
    }

    case 'EXPLAIN_DONE': {
      if (prev.status !== 'explaining' || !prev.lesson) return prev;
      if (prev.afterExplain === 'retry') {
        return { ...prev, status: 'quizzing', afterExplain: 'next', lastResult: null, boardKey: keyOf(prev.at) };
      }
      const advanced: MachineState = {
        ...prev,
        afterExplain: 'next',
        completedStepIndex: Math.max(prev.completedStepIndex, prev.index),
      };
      return enterAt(advanced, prev.index + 1);
    }

    default:
      return prev;
  }
}
