import React, { FC } from 'react';

interface CoachBubbleProps {
  text: string;
  foundLabel?: string | null;
}

/** Koç balonu — krem kart, sabit yükseklik (layout zıplamaz). */
export const CoachBubble: FC<CoachBubbleProps> = ({ text, foundLabel }) => (
  <div
    aria-live="polite"
    className="w-full rounded-xl border bg-[#f5eedc] p-2.5 shadow-md"
    style={{ borderColor: '#e5dcce', minHeight: '3.4rem' }}
  >
    <div className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: '#00d4c4', color: '#0d2818' }}
      >
        ♞
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug" style={{ color: '#141f1b' }}>
          {text}
        </p>
        {foundLabel && (
          <p className="mt-0.5 text-xs font-bold" style={{ color: '#5c6c66' }}>
            {foundLabel}
          </p>
        )}
      </div>
    </div>
  </div>
);
