import React, { FC } from 'react';
import { Sparkle, X } from '@phosphor-icons/react';

interface ForkPanelProps {
  count: number;
  open: boolean;
  onToggle: () => void;
}

/**
 * K8 "Taktik Çatal Hazır" paneli: bekleyen piyade + en az bir geçerli çatal
 * karesi varken parlar. Açılınca çatal kareleri tahtada işaretlenir;
 * oyuncu panele dokunmadan normal hamle de yapabilir (zorunlu değil).
 */
export const ForkPanel: FC<ForkPanelProps> = ({ count, open, onToggle }) => (
  <div className="w-full">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Çatal panelini kapat' : 'Taktik çatal karelerini göster'}
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-all ${
        open ? '' : 'animate-pulse'
      }`}
      style={{
        background: '#f59e0b',
        color: '#0d2818',
        boxShadow: '0 0 14px rgba(245,158,11,0.65)',
      }}
    >
      {open ? <X size={18} weight="bold" /> : <Sparkle size={18} weight="bold" />}
      {open ? 'Paneli kapat' : `Taktik Çatal Hazır (${count})`}
    </button>
    {open && (
      <p className="mt-1 rounded-lg px-2 py-1 text-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f5eedc' }}>
        Parlayan karelerden birine dokun; piyade oraya iner ve sıra geçer.
      </p>
    )}
  </div>
);
