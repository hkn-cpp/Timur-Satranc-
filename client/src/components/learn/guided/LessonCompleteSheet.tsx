import React, { FC, useEffect, useState } from 'react';
import { Trophy, Medal } from '@phosphor-icons/react';

interface LessonCompleteSheetProps {
  title: string;
  xp: number;
  badge?: string;
  onClose: () => void;
  onReplay: () => void;
}

export const LessonCompleteSheet: FC<LessonCompleteSheetProps> = ({ title, xp, badge, onClose, onReplay }) => {
  const [shown, setShown] = useState(0);
  const reduced = (() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  })();

  useEffect(() => {
    if (reduced) {
      setShown(xp);
      return;
    }
    let v = 0;
    const step = Math.max(1, Math.ceil(xp / 20));
    const t = setInterval(() => {
      v += step;
      if (v >= xp) {
        v = xp;
        clearInterval(t);
      }
      setShown(v);
    }, 50);
    return () => clearInterval(t);
  }, [xp, reduced]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Ders tamamlandı">
      <div className="w-full max-w-sm rounded-2xl border bg-[#f5eedc] p-5 text-center shadow-2xl" style={{ borderColor: '#e5dcce' }}>
        <Trophy size={40} weight="fill" className="mx-auto" style={{ color: '#f59e0b' }} />
        <h2 className="mt-2 text-lg font-extrabold" style={{ color: '#141f1b' }}>
          {title} tamamlandı
        </h2>
        <p className="mt-1 text-3xl font-black" style={{ color: '#0d2818' }} aria-live="polite">
          +{shown} XP
        </p>
        {badge && (
          <p className="mx-auto mt-2 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm font-bold" style={{ background: '#e8deca', color: '#141f1b' }}>
            <Medal size={18} weight="fill" style={{ color: '#f59e0b' }} /> {badge}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onReplay} className="h-11 flex-1 rounded-xl border text-sm font-bold" style={{ borderColor: '#e5dcce', background: '#e8deca', color: '#141f1b' }}>
            Tekrar oyna
          </button>
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl text-sm font-bold" style={{ background: '#00d4c4', color: '#0d2818' }}>
            Derslere dön
          </button>
        </div>
      </div>
    </div>
  );
};
