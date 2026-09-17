import React, { FC } from 'react';

interface StepProgressRailProps {
  total: number;
  index: number;
  level: number;
  lessonId: string;
  title: string;
}

export const StepProgressRail: FC<StepProgressRailProps> = ({ total, index, level, lessonId, title }) => (
  <div className="w-full">
    <p className="truncate text-xs font-bold text-white/90">
      Seviye {level} · Ders {lessonId} — {title}
    </p>
    <div className="mt-1 flex items-center gap-1" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total} aria-label="Ders adımı">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: i <= index ? '#00d4c4' : 'rgba(245,238,220,0.25)' }}
        />
      ))}
    </div>
  </div>
);
