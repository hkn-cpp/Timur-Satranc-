import React, { FC } from 'react';
import { Medal, Crown } from '@phosphor-icons/react';

interface RankCardProps {
  title: string;
  badge?: string;
  xp: number;
}

/** Unvan + rozet kartı (seviye tamamlanınca). */
export const RankCard: FC<RankCardProps> = ({ title, badge, xp }) => (
  <div className="w-full rounded-2xl border bg-[#f5eedc] p-4 text-center shadow-md" style={{ borderColor: '#e5dcce' }}>
    <Crown size={32} weight="fill" className="mx-auto" style={{ color: '#f59e0b' }} />
    <h3 className="mt-1 text-base font-extrabold" style={{ color: '#141f1b' }}>
      {title}
    </h3>
    {badge && (
      <p className="mx-auto mt-1 flex items-center justify-center gap-1 text-sm font-bold" style={{ color: '#5c6c66' }}>
        <Medal size={16} weight="fill" style={{ color: '#f59e0b' }} /> {badge}
      </p>
    )}
    <p className="mt-1 text-xs font-bold" style={{ color: '#5c6c66' }}>
      {xp} XP
    </p>
  </div>
);
