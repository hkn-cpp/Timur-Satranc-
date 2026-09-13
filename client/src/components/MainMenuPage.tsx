import React, { FC } from 'react';
import { ShoppingCart, User, Gear } from '@phosphor-icons/react';
import { PageState, NotificationType } from '../types';
import logoImg from '../assets/logo.png';
import okulLogo from '../assets/okulLogo.png';
import chessboardImg from '../assets/board.png';
import { MusicToggleButton } from './MusicToggleButton';

interface MainMenuPageProps {
  onNavigate: (page: PageState) => void;
  onOpenCredits?: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const MainMenuPage: FC<MainMenuPageProps> = ({ onNavigate, onOpenCredits, showNotification }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#1a4228] relative overflow-hidden select-none">
      {/* Üst satır: Mağaza & Profil */}
      <div className="flex justify-between items-center px-5 pt-8 relative z-10">
        <button
          id="mobile-shop-btn"
          onClick={() => showNotification('Mağaza yakında açılıyor!', 'info')}
          className="mobile-icon-btn"
          aria-label="Mağaza"
        >
          <ShoppingCart size={24} weight="regular" />
        </button>
        <button
          id="mobile-profile-btn"
          onClick={() => showNotification('Profil yakında açılıyor!', 'info')}
          className="mobile-icon-btn"
          aria-label="Profil"
        >
          <User size={24} weight="regular" />
        </button>
      </div>

      {/* İkinci satır: Logo + Başlık + Ayarlar */}
      <div className="flex items-center justify-between px-5 mt-4 relative z-10">
        <button
          type="button"
          onClick={onOpenCredits}
          className="w-[clamp(48px,15.4vw,60px)] h-[clamp(48px,15.4vw,60px)] rounded-full overflow-hidden border-2 border-white/20 bg-black/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
          title="Hakkında & Künye Bilgileri"
          aria-label="Hakkında"
        >
          <img src={okulLogo} alt="Logo" className="w-[52px] h-[52px] object-contain" />
        </button>

        <h1 className="font-batangas text-fluid-h1 font-extrabold text-white text-center leading-none drop-shadow-md tracking-wide">
          Timur
          <br />
          Satrancı
        </h1>

        <div className="flex items-center gap-2">
          <MusicToggleButton variant="mobile-icon" />
          <button
            id="mobile-settings-btn"
            onClick={() => showNotification('Ayarlar yakında açılıyor!', 'info')}
            className="mobile-icon-btn"
            aria-label="Ayarlar"
          >
            <Gear size={24} weight="regular" />
          </button>
        </div>
      </div>

      {/* Satranç tahtası görseli */}
      <div className="flex-1 flex items-center justify-center px-6 py-2 relative z-10 overflow-x-clip">
        <div className="relative w-full max-w-[min(330px,84vw)] translate-y-[clamp(30px,14.1vw,60px)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(0,212,196,0.12)_0%,_transparent_70%)] blur-2xl pointer-events-none" />
          <img
            src={chessboardImg}
            alt="3D Timur Satranç Tahtası"
            className="w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] animate-float relative z-10"
          />
        </div>
      </div>

      {/* Oyna & Öğren butonları (su yeşili neon) */}
      <div className="flex flex-col gap-4 px-7 pb-12 relative z-10">
        <button
          id="mobile-play-btn"
          onClick={() => onNavigate('PLAY_MENU')}
          className="mobile-main-btn-neon"
        >
          <span className="font-batangas text-2xl font-bold">Oyna</span>
        </button>
        <button
          id="mobile-learn-btn"
          onClick={() => onNavigate('LEARN_MENU')}
          className="mobile-main-btn-neon"
        >
          <span className="font-batangas text-2xl font-bold">Öğren</span>
        </button>
      </div>
    </div>
  );
};
