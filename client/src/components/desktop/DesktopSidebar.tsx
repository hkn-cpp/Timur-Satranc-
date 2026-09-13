import React, { FC } from 'react';
import {
  House,
  ShoppingBag,
  Trophy,
  User,
  Gear,
  BookOpen,
} from '@phosphor-icons/react';
import { PageState, NotificationType } from '../../types';
import logoImg from '../../assets/logo.png';

interface DesktopSidebarProps {
  currentPage: PageState;
  onNavigate: (page: PageState) => void;
  onOpenCredits: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const DesktopSidebar: FC<DesktopSidebarProps> = ({
  currentPage,
  onNavigate,
  onOpenCredits,
  showNotification,
}) => {
  const navItems = [
    {
      id: 'home',
      label: 'Ana Sayfa',
      icon: <House size={22} weight="duotone" />,
      isActive: currentPage === 'MAIN_MENU' || currentPage === 'PLAY_MENU',
      onClick: () => onNavigate('MAIN_MENU'),
    },
    {
      id: 'learn',
      label: 'Öğren',
      icon: <BookOpen size={22} weight="duotone" />,
      isActive:
        currentPage === 'LEARN_MENU' ||
        currentPage === 'ROADMAP' ||
        currentPage === 'RULES' ||
        currentPage === 'LESSON_DETAIL' ||
        currentPage === 'SELF_ANALYSIS',
      onClick: () => onNavigate('LEARN_MENU'),
    },
    {
      id: 'tournaments',
      label: 'Turnuva',
      icon: <Trophy size={22} weight="duotone" />,
      isActive: false,
      onClick: () => showNotification('Turnuva modu yakında açılıyor!', 'info'),
    },
    {
      id: 'shop',
      label: 'Mağaza',
      icon: <ShoppingBag size={22} weight="duotone" />,
      isActive: false,
      onClick: () => showNotification('Mağaza yakında açılıyor!', 'info'),
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: <User size={22} weight="duotone" />,
      isActive: false,
      onClick: () => showNotification('Profil yakında açılıyor!', 'info'),
    },
    {
      id: 'settings',
      label: 'Ayarlar',
      icon: <Gear size={22} weight="duotone" />,
      isActive: false,
      onClick: () => showNotification('Ayarlar yakında açılıyor!', 'info'),
    },
  ];

  return (
    <aside className="w-[var(--sbw)] fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between items-center py-6 border-r border-white/10 bg-[#0c2417]/90 backdrop-blur-xl select-none shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      {/* Üst Logo */}
      <button
        onClick={() => onNavigate('MAIN_MENU')}
        className="flex flex-col items-center text-center cursor-pointer group transition-all duration-300 transform hover:scale-105"
        title="Ana Sayfa"
      >
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-[0_4px_16px_rgba(0,212,196,0.15)] group-hover:border-[#00d4c4]/40 transition-colors">
          <img src={logoImg} alt="Timur Satrancı" />
        </div>
      </button>

      {/* Menü Butonları */}
      <nav className="flex flex-col gap-3 w-full px-3">
        {navItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl text-[10px] font-semibold gap-1 transition-all duration-200 w-full relative group cursor-pointer ${item.isActive
                ? 'text-white bg-white/10 font-bold shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'text-[#A7BDB1] hover:text-white hover:bg-white/5'
                }`}
            >
              {/* Aktif Şerit İndikatörü */}
              {item.isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 bg-[#00d4c4] rounded-r-full shadow-[0_0_8px_rgba(0,212,196,0.8)]" />
              )}

              <div className={`transition-all duration-200 transform group-hover:scale-110 ${item.isActive ? 'text-[#00d4c4]' : 'text-[#A7BDB1] group-hover:text-[#00d4c4]'
                }`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Alt Bilgi */}
      <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">
        v1.0
      </div>
    </aside>
  );
};
