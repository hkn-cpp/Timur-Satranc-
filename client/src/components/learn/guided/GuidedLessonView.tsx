import React, { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import type { GuidedLesson } from '../../../learn/guided/types';
import type { SquareIndex } from '../../../core/position/Position';
import { useGuidedLesson } from '../../../hooks/useGuidedLesson';
import { AnnotationLayer, type CenterPoint } from '../../board/AnnotationLayer';
import { GuidedBoard, type BoardInputMode } from './GuidedBoard';
import { CoachBubble } from './CoachBubble';
import { StepProgressRail } from './StepProgressRail';
import { LessonControls } from './LessonControls';
import { LessonCompleteSheet } from './LessonCompleteSheet';

interface GuidedLessonViewProps {
  lesson: GuidedLesson;
  onExit: () => void;
  onProgress?: (lessonId: string, completedStepIndex: number) => void;
  onComplete?: (lessonId: string, xp: number) => void;
}

function inputModeFor(kind: string | undefined, status: string): BoardInputMode {
  if (status !== 'awaiting' && status !== 'trapping') return 'locked';
  if (kind === 'awaitSquare' || kind === 'awaitSquares') return 'square';
  if (kind === 'awaitSwap') return 'swap';
  return 'move';
}

/**
 * Rehberli ders orkestratörü. Mobil (360px): ray → tahta → koç → kontroller
 * tek akışta; masaüstü (lg+): tahta solda, koç paneli sağda.
 */
export const GuidedLessonView: FC<GuidedLessonViewProps> = ({ lesson, onExit, onProgress, onComplete }) => {
  const { state, step, position, annotations, coachText, inputOpen, canGoNext, dispatch, onSquare, onMove, onSwap } =
    useGuidedLesson({ lesson, onProgress, onComplete });
  const [selected, setSelected] = useState<SquareIndex | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState<{ centers: Map<SquareIndex, CenterPoint>; size: number; w: number; h: number }>({
    centers: new Map(),
    size: 0,
    w: 0,
    h: 0,
  });

  useEffect(() => {
    setSelected(null);
    setShowReveal(false);
  }, [state.index, replayKey]);

  useEffect(() => {
    if (replayKey > 0) dispatch({ type: 'START', lesson });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  // Tuzak "Göster" düğmesi 12sn sonra belirir (azaltılmış hareketle hemen).
  useEffect(() => {
    setShowReveal(false);
    if (state.status !== 'trapping') return;
    let rm = false;
    try {
      rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      rm = true;
    }
    const t = setTimeout(() => setShowReveal(true), rm ? 0 : 12000);
    return () => clearTimeout(t);
  }, [state.status, state.index]);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = (): void => {
      const host = el.getBoundingClientRect();
      const centers = new Map<SquareIndex, CenterPoint>();
      let size = 0;
      let n = 0;
      el.querySelectorAll('[data-square]').forEach((node) => {
        const r = (node as HTMLElement).getBoundingClientRect();
        centers.set(Number((node as HTMLElement).dataset.square), {
          x: r.left - host.left + r.width / 2,
          y: r.top - host.top + r.height / 2,
        });
        if (r.width > 0) {
          size += r.width;
          n++;
        }
      });
      setGeom({ centers, size: n > 0 ? size / n : 0, w: host.width, h: host.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.boardKey, position]);

  if (state.status === 'contentError') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-[#f5eedc] p-6 text-center" style={{ borderColor: '#e5dcce' }}>
        <WarningCircle size={36} weight="fill" style={{ color: '#ef4444' }} />
        <h2 className="text-base font-extrabold" style={{ color: '#141f1b' }}>Bu ders yüklenemedi</h2>
        <p className="text-sm" style={{ color: '#5c6c66' }}>
          {state.error?.message ?? 'Bozuk ders verisi.'} (adım {state.error?.stepIndex ?? '-'})
        </p>
        <button type="button" onClick={onExit} className="h-11 w-full rounded-xl text-sm font-bold" style={{ background: '#00d4c4', color: '#0d2818' }}>
          Derslere dön
        </button>
      </div>
    );
  }

  const mode = inputModeFor(step?.kind, state.status);
  const total = lesson.steps.length;

  // Koç balonu işaretli kareyi örtmesin: işaretler alt yarıdaysa balon üstte.
  let bubbleTop = false;
  if (geom.centers.size > 0 && annotations.length > 0) {
    let sum = 0;
    let c = 0;
    for (const a of annotations) {
      const sq = a.kind === 'square' || a.kind === 'path' || a.kind === 'destination' || a.kind === 'ghost' || a.kind === 'badge' || a.kind === 'seal'
        ? (a as { square: number }).square
        : a.kind === 'slide' || a.kind === 'leap'
          ? (a as { to: number }).to
          : null;
      const p = sq !== null ? geom.centers.get(sq) : undefined;
      if (p) {
        sum += p.y;
        c++;
      }
    }
    if (c > 0 && geom.h > 0) bubbleTop = sum / c > geom.h / 2;
  }

  const foundLabel =
    step?.kind === 'awaitSquares'
      ? `${state.found.length}/${step.count} bulundu`
      : null;

  const onWrongText =
    state.lastResult === 'wrong' &&
    (step?.kind === 'awaitMove' || step?.kind === 'awaitSquare' || step?.kind === 'awaitSquares' || step?.kind === 'awaitSwap')
      ? (step as { onWrong?: string }).onWrong ?? 'Olmadı, bir daha dene.'
      : null;

  const finishStep = state.status === 'finished' ? [...lesson.steps].reverse().find((s) => s.kind === 'finish') : null;

  const board = (
    <div ref={hostRef} className="relative w-full">
      {position && (
        <GuidedBoard
          position={position}
          mode={inputOpen ? mode : 'locked'}
          selected={selected}
          onSelect={setSelected}
          onSquare={onSquare}
          onMove={onMove}
          onSwap={onSwap}
        />
      )}
      <AnnotationLayer annotations={annotations} centers={geom.centers} squareSize={geom.size} width={geom.w} height={geom.h} />
    </div>
  );

  const quizBlock =
    (state.status === 'quizzing' || (state.status === 'explaining' && step?.kind === 'quiz')) && step?.kind === 'quiz' ? (
      <div className="flex w-full flex-col gap-1.5">
        {step.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            disabled={state.status !== 'quizzing'}
            onClick={() => dispatch({ type: 'ANSWER', optionIndex: i })}
            className="min-h-[2.5rem] rounded-xl border px-3 py-2 text-left text-sm font-bold disabled:opacity-80"
            style={{ background: '#e8deca', borderColor: '#e5dcce', color: '#141f1b' }}
          >
            {opt}
          </button>
        ))}
      </div>
    ) : null;

  const panel = (
    <div className="flex w-full flex-col gap-2">
      <CoachBubble text={coachText} foundLabel={foundLabel} />
      {onWrongText && (
        <p className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#141f1b' }} aria-live="polite">
          {onWrongText}
        </p>
      )}
      {quizBlock}
      <LessonControls
        canBack={state.index > 0 && state.status !== 'playing'}
        canNext={canGoNext}
        canHint={state.status === 'awaiting'}
        canSkip={state.status === 'awaiting' || state.status === 'trapping' || state.status === 'quizzing'}
        showReveal={showReveal && state.status === 'trapping'}
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => {
          if (state.status === 'explaining') dispatch({ type: 'EXPLAIN_DONE' });
          else dispatch({ type: 'NEXT' });
        }}
        onHint={() => dispatch({ type: 'HINT' })}
        onSkip={() => dispatch({ type: 'SKIP' })}
        onReveal={() => dispatch({ type: 'TIMEOUT' })}
      />
      {state.status === 'explaining' && step?.kind !== 'quiz' && (
        <p className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(0,212,196,0.12)', color: '#141f1b' }} aria-live="polite">
          Devam etmek için Devam düğmesine bas.
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-2 pb-4" style={{ background: '#122b1e' }} key={replayKey}>
      <div className="flex items-center gap-2 pt-2">
        <button type="button" onClick={onExit} aria-label="Geri" className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-black text-white" style={{ background: 'rgba(245,238,220,0.12)' }}>
          ←
        </button>
        <div className="flex-1">
          <StepProgressRail total={total} index={Math.min(state.index, total - 1)} level={lesson.level} lessonId={lesson.id} title={lesson.title} />
        </div>
      </div>

      {/* Mobil: balon üstteyse önce panelin balonu */}
      <div className="flex flex-col gap-2 lg:hidden">
        {bubbleTop && panel}
        {board}
        {!bubbleTop && panel}
      </div>

      {/* Masaüstü: tahta solda, koç paneli sağda */}
      <div className="hidden gap-4 lg:flex">
        <div className="max-w-[640px] flex-1">{board}</div>
        <div className="w-[340px] shrink-0">{panel}</div>
      </div>

      {state.status === 'finished' && finishStep?.kind === 'finish' && (
        <LessonCompleteSheet
          title={lesson.title}
          xp={state.xpAward ?? 0}
          badge={finishStep.badge}
          onClose={onExit}
          onReplay={() => setReplayKey((k) => k + 1)}
        />
      )}
    </div>
  );
};
