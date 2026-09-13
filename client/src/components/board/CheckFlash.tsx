import React, { FC, useEffect, useState } from 'react';
import type { MoveHistoryEntry } from '../../hooks/useGame';

/**
 * Yeni bir şah çeken hamle yapıldığında 400ms boyunca true döner.
 * Geçmişte gezinme / geri-ileri hamle sesi üretmez; yalnızca hamle
 * sayısı değişiminde son hamle şah ise yanıp söner.
 */
export function useCheckFlash(historyEntries: MoveHistoryEntry[]): boolean {
  const [flash, setFlash] = useState(false);
  const count = historyEntries.length;

  useEffect(() => {
    if (count === 0) return;
    const last = historyEntries[count - 1];
    if (last?.isCheck || last?.isCheckmate) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(t);
    }
    setFlash(false);
    // count dışında okunanlar stabil snapshot'tır (bilinçli)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return flash;
}

interface CheckFlashProps {
  show: boolean;
  style?: React.CSSProperties;
}

/** Tahta üzerinde 0.4sn beliren "ŞAH!" bildirimi (tıklamaları engellemez). */
export const CheckFlash: FC<CheckFlashProps> = ({ show, style }) => {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
      style={style}
      aria-live="polite"
    >
      <span className="animate-check-flash font-batangas font-black text-red-500 text-[clamp(2rem,9vmin,3.5rem)] tracking-wide drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_#0a1710]">
        ŞAH!
      </span>
    </div>
  );
};

export default CheckFlash;
