import React, { FC } from 'react';
import { CaretLeft, CaretRight, Lightbulb, Eye } from '@phosphor-icons/react';

interface LessonControlsProps {
  canBack: boolean;
  canNext: boolean;
  canHint: boolean;
  canSkip: boolean;
  showReveal: boolean;
  onBack: () => void;
  onNext: () => void;
  onHint: () => void;
  onSkip: () => void;
  onReveal: () => void;
}

export const LessonControls: FC<LessonControlsProps> = ({
  canBack,
  canNext,
  canHint,
  canSkip,
  showReveal,
  onBack,
  onNext,
  onHint,
  onSkip,
  onReveal,
}) => (
  <div className="flex w-full items-center gap-2 rounded-xl p-2" style={{ background: '#f4eedd' }}>
    <button
      type="button"
      onClick={onBack}
      disabled={!canBack}
      aria-label="Geri"
      className="flex h-10 w-10 items-center justify-center rounded-lg border disabled:opacity-40"
      style={{ background: '#e8deca', borderColor: '#e5dcce', color: '#141f1b' }}
    >
      <CaretLeft size={20} weight="bold" />
    </button>
    <button
      type="button"
      onClick={onHint}
      disabled={!canHint}
      aria-label="İpucu"
      className="flex h-10 w-10 items-center justify-center rounded-lg border disabled:opacity-40"
      style={{ background: '#e8deca', borderColor: '#e5dcce', color: '#141f1b' }}
    >
      <Lightbulb size={20} weight="bold" />
    </button>
    {showReveal ? (
      <button
        type="button"
        onClick={onReveal}
        className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-bold"
        style={{ background: '#f59e0b', color: '#0d2818' }}
      >
        <Eye size={18} weight="bold" /> Göster
      </button>
    ) : (
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Devam"
        className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-bold disabled:opacity-40"
        style={{ background: '#00d4c4', color: '#0d2818' }}
      >
        Devam <CaretRight size={18} weight="bold" />
      </button>
    )}
    <button
      type="button"
      onClick={onSkip}
      disabled={!canSkip}
      aria-label="Adımı atla"
      className="h-10 rounded-lg px-2 text-xs font-bold underline disabled:opacity-40"
      style={{ color: '#5c6c66' }}
    >
      Atla
    </button>
  </div>
);
