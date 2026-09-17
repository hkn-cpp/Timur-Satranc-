import { useEffect, useMemo, useReducer, useState } from 'react';
import type { SquareIndex } from '../core/position/Position';
import { reduce, initialState, type MachineState } from '../learn/guided/machine';
import type { GuidedLesson } from '../learn/guided/types';
import { playMoveSound } from '../utils/sound';
import { annotationsForStep } from '../components/learn/guided/stepAnnotations';

interface UseGuidedLessonOpts {
  lesson: GuidedLesson;
  /** Adım ilerlemesi dışarı kaydedilir (completedStepIndex). */
  onProgress?: (lessonId: string, completedStepIndex: number) => void;
  /** Ders bittiğinde (xp ödülüyle). */
  onComplete?: (lessonId: string, xp: number) => void;
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Tüm yan etkiler burada (makine saf): adım zamanlaması, tuzak sayacı,
 * ses, ilerleme kaydı. Unmount'ta tüm timer'lar iptal edilir.
 */
export function useGuidedLesson({ lesson, onProgress, onComplete }: UseGuidedLessonOpts) {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialState() as MachineState);

  useEffect(() => {
    dispatch({ type: 'START', lesson });
  }, [lesson]);

  const step = state.lesson ? state.lesson.steps[state.index] : null;
  const position = state.at;

  // İlerleme + tamamlanma kayıtları
  useEffect(() => {
    if (state.lesson && state.completedStepIndex >= 0) {
      onProgress?.(state.lesson.id, state.completedStepIndex);
    }
  }, [state.lesson, state.completedStepIndex, onProgress]);

  useEffect(() => {
    if (state.status === 'finished' && state.lesson && state.xpAward !== null) {
      onComplete?.(state.lesson.id, state.xpAward);
    }
  }, [state.status, state.lesson, state.xpAward, onComplete]);

  // Ses
  useEffect(() => {
    if (state.lastResult === 'correct' || state.lastResult === 'trap-success') {
      try {
        playMoveSound({});
      } catch {
        /* sessiz geç */
      }
    }
  }, [state.lastResult, state.boardKey]);

  // Adım zamanlaması: yalnızca kilitli-animasyon geçişleri otomatik.
  // Devam düğmesi say/show/compare/showMoves/teleport adımlarında kullanıcıda.
  const [holdReady, setHoldReady] = useState(true);

  useEffect(() => {
    setHoldReady(false);
    if (!step) {
      setHoldReady(true);
      return;
    }
    const rm = reducedMotion();
    if (step.kind === 'show') {
      const t = setTimeout(() => setHoldReady(true), rm ? 0 : (step.holdMs ?? 1200));
      return () => clearTimeout(t);
    }
    setHoldReady(true);
  }, [step, state.index]);

  useEffect(() => {
    if (!step || state.status === 'finished' || state.status === 'contentError' || state.status === 'idle') {
      return;
    }
    const rm = reducedMotion();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void): void => {
      timers.push(setTimeout(fn, rm ? 0 : ms));
    };
    if (state.status === 'presenting' && step.kind === 'showGeometry') {
      if (state.phase < step.phases.length) {
        after(step.phases[state.phase]?.holdMs ?? 900, () => dispatch({ type: 'PHASE_DONE' }));
      }
    } else if (state.status === 'playing') {
      after(700, () => dispatch({ type: 'PLAY_DONE' }));
    } else if (state.status === 'trapping' && step.kind === 'expectRejection') {
      after(step.fallbackAfterMs ?? 12000, () => dispatch({ type: 'TIMEOUT' }));
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [step, state.status, state.index, state.phase]);

  const annotations = useMemo(
    () =>
      step
        ? annotationsForStep(step, position, {
            phase: state.phase,
            found: state.found,
            hint: { hintLevel: state.hintLevels[state.index] ?? 0, autoHint: state.autoHint },
          })
        : [],
    [step, position, state.phase, state.found, state.hintLevels, state.index, state.autoHint],
  );

  const coachText = useMemo(() => {
    if (!step) return '';
    switch (step.kind) {
      case 'say':
        return step.text;
      case 'show':
        return step.text ?? '';
      case 'showMoves':
        return step.text ?? 'Bu taşın gidebildiği karelere bak.';
      case 'showGeometry': {
        const ph = step.phases[Math.min(state.phase, step.phases.length - 1)];
        return ph ? ph.label : (step.text ?? '');
      }
      case 'compare':
        return step.text;
      case 'play':
        return step.text ?? 'Hamleyi izle.';
      case 'awaitMove':
      case 'awaitSquare':
      case 'awaitSquares':
      case 'awaitSwap':
        return step.text;
      case 'expectRejection':
        return state.lastResult === 'trap-success' || state.status === 'explaining'
          ? step.explanation
          : step.text;
      case 'quiz':
        return state.status === 'explaining' ? step.explanation : step.question;
      case 'teleport':
        return step.text;
      case 'setPosition':
        return step.text ?? 'Bu tahtayı dersi göstermek için kurdum.';
      case 'finish':
        return step.text;
      default:
        return '';
    }
  }, [step, state.phase, state.status, state.lastResult]);

  const inputOpen =
    state.status === 'awaiting' || state.status === 'trapping';

  const canGoNext =
    state.status === 'explaining' ||
    (state.status === 'presenting' &&
      (step?.kind !== 'showGeometry' || state.phase >= (step.phases.length ?? 0)) &&
      (step?.kind !== 'show' || holdReady));

  return {
    state,
    step,
    position,
    annotations,
    coachText,
    inputOpen,
    canGoNext,
    dispatch,
    onSquare: (square: SquareIndex) => dispatch({ type: 'INPUT_SQUARE', square }),
    onMove: (from: SquareIndex, to: SquareIndex) =>
      dispatch({ type: 'INPUT_MOVE', move: { from, to } }),
    onSwap: (partner: SquareIndex) => dispatch({ type: 'INPUT_SWAP', partner }),
  };
}
