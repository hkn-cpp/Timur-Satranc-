import React, { FC, useEffect, useState } from 'react';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { ensureMusicPlaying, isMusicEnabled, subscribeMusic, toggleMusic } from '../utils/music';

interface MusicToggleButtonProps {
  variant?: 'mobile-icon' | 'desktop';
}

/** Anasayfa müzik aç/kapat düğmesi. Tek global müzik durumunu yansıtır. */
export const MusicToggleButton: FC<MusicToggleButtonProps> = ({ variant = 'mobile-icon' }) => {
  const [on, setOn] = useState<boolean>(() => isMusicEnabled());

  useEffect(() => subscribeMusic(setOn), []);

  const handleClick = () => {
    const next = toggleMusic();
    setOn(next);
    if (next) ensureMusicPlaying();
  };

  if (variant === 'desktop') {
    const Icon = on ? SpeakerHigh : SpeakerSlash;
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={on ? 'Müziği kapat' : 'Müziği aç'}
        aria-pressed={on}
        title={on ? 'Müziği kapat' : 'Müziği aç'}
        className="flex items-center gap-2 bg-black/30 hover:bg-black/45 border border-white/10 hover:border-[#00d4c4]/40 px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer text-white shadow-lg"
      >
        <Icon size={18} weight={on ? 'fill' : 'regular'} className={on ? 'text-[#00d4c4]' : 'text-white/60'} />
        <span className="text-xs font-bold">{on ? 'Müzik Açık' : 'Müzik Kapalı'}</span>
      </button>
    );
  }

  const MobileIcon = on ? SpeakerHigh : SpeakerSlash;
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={on ? 'Müziği kapat' : 'Müziği aç'}
      aria-pressed={on}
      title={on ? 'Müziği kapat' : 'Müziği aç'}
      className="mobile-icon-btn"
    >
      <MobileIcon size={24} weight="regular" />
    </button>
  );
};

export default MusicToggleButton;
