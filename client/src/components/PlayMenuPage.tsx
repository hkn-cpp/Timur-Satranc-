import React, { FC, useState } from 'react';
import { ArrowLeft, CaretDown, Play } from '@phosphor-icons/react';
import {
  Trophy,
  UsersThree,
  UserCircleGear,
  GraduationCap,
  SlidersHorizontal,
  MonitorPlay,
} from '@phosphor-icons/react';
import { PageState, NotificationType, TimeControl, GameMode } from '../types';

import { TimeControlModal } from './TimeControlModal';
import { CustomGameModal } from './CustomGameModal';
import { PlayInPersonModal } from './PlayInPersonModal';
import { TournamentModal } from './TournamentModal';
import { CoachModal } from './CoachModal';
import { PlayAFriendModal } from './PlayAFriendModal';

interface PlayMenuPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  onStartGame?: (mode: GameMode, timeSeconds?: number) => void;
  onStartOnlineGame?: (gameData: any, myColor: import('../types/chess').PlayerColor, gameCode: string) => void;
  onStartScreenPlay?: (config: {
    whiteName: string;
    blackName: string;
    timeControl: string;
    boardRotates: boolean;
    gameType: string;
  }) => void;
  onOpenSetupEditor?: (config?: {
    whiteName: string;
    blackName: string;
    timeControl: string;
    boardRotates: boolean;
    gameType: string;
  }) => void;
}

interface CreamCardProps {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}

function CreamCard({ id, label, desc, icon, badge, onClick }: CreamCardProps) {
  return (
    <button id={id} onClick={onClick} className="mobile-card-btn group relative">
      <div className="flex flex-col gap-0.5 text-left">
        <div className="flex items-center gap-2">
          <span className="font-batangas text-[1.25rem] font-bold text-[#141f1b] leading-tight">
            {label}
          </span>
          {badge && (
            <span className="text-[10px] bg-[#00d4c4]/25 text-[#0c4e48] border border-[#00d4c4]/40 font-bold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[#5c6c66] text-xs font-medium">{desc}</span>
      </div>

      <div className="text-[#141f1b] group-hover:scale-105 group-hover:text-[#0c4e48] transition-all flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </button>
  );
}

export const PlayMenuPage: FC<PlayMenuPageProps> = ({
  onNavigate,
  showNotification,
  onStartGame,
  onStartOnlineGame,
  onStartScreenPlay,
  onOpenSetupEditor,
}) => {
  // Seçili Zaman Kontrolü
  const [selectedTime, setSelectedTime] = useState<TimeControl>({
    category: 'bullet',
    label: '2 + 1',
    initialMinutes: 2,
    incrementSeconds: 1,
    icon: '🚀',
  });

  // Modallar
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isCustomGameOpen, setIsCustomGameOpen] = useState(false);
  const [isInPersonOpen, setIsInPersonOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isPlayFriendOpen, setIsPlayFriendOpen] = useState(false);

  // Hızlı Karşılaşma / Online Başlat
  const handleQuickPlay = () => {
    setIsPlayFriendOpen(true);
  };

  return (
    <div className="mobile-screen flex flex-col bg-[#1a4228] relative overflow-y-auto custom-scrollbar select-none">
      {/* ─── ÜST BAŞLIK ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-3 relative z-10">
        <button
          onClick={() => onNavigate('MAIN_MENU')}
          className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Geri"
        >
          <ArrowLeft size={28} weight="bold" />
        </button>
        <h1 className="font-batangas text-[clamp(2rem,1.4rem+3vw,2.4rem)] font-bold text-white tracking-wide leading-none">
          Oyna
        </h1>
      </div>

      {/* ─── MOD KARTLARI & HIZLI OYNA ─────────────────────────────── */}
      <div className="flex flex-col gap-4 px-5 py-3 pb-12 relative z-10 max-w-lg md:max-w-2xl mx-auto w-full lg:max-w-4xl">
        {/* 1. ÜST KISIM DİREKT OYNAMA KISAYOLU (krem kutu) */}
        <div className="bg-[#f5eedc] rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 border border-[#e5dcce]">
          {/* Zaman Seçici Butonu */}
          <button
            id="time-selector-btn"
            onClick={() => setIsTimeModalOpen(true)}
            className="w-full bg-[#e8deca] hover:bg-[#dfd4be] active:scale-[0.99] border border-[#d8ccb6] rounded-xl py-2.5 px-4 flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{selectedTime.icon || '🚀'}</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#5c6c66] font-semibold leading-tight">Zaman Kontrolü</span>
                <span className="font-batangas text-base font-bold text-[#141f1b]">
                  {selectedTime.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#5c6c66]">
              <span className="text-xs font-semibold">Değiştir</span>
              <CaretDown size={18} weight="bold" />
            </div>
          </button>

          {/* Oyunu Başlat Butonu (altın CTA) */}
          <button
            id="start-game-btn"
            onClick={handleQuickPlay}
            className="w-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.98] text-[#1A1A1A] font-batangas font-bold py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2 font-batangas text-xl font-bold">
              <Play size={22} weight="fill" />
              <span>Oyunu Başlat</span>
            </div>
          </button>
        </div>

        {/* 2. KREM RENK MENÜ KARTLARI LİSTESİ (Phosphor Icons - size={48}) */}
        <div className="flex flex-col gap-3.5 mt-1 md:grid md:grid-cols-2 md:gap-4">
          {/* Turnuvalar */}
          <CreamCard
            id="mobile-tournament-btn"
            label="Turnuvalar"
            desc="Canlı arena ve şampiyonalar"
            icon={<Trophy size={48} weight="duotone" />}
            badge="Canlı"
            onClick={() => setIsTournamentOpen(true)}
          />

          {/* Arkadaşınla Oyna */}
          <CreamCard
            id="mobile-friend-btn"
            label="Arkadaşınla oyna"
            desc="Davet kodu veya bağlantı ile"
            icon={<UsersThree size={48} weight="duotone" />}
            onClick={() => setIsPlayFriendOpen(true)}
          />

          {/* Bot'a Karşı Oyna */}
          <CreamCard
            id="mobile-bot-btn"
            label="Bot'a karşı oyna"
            desc="Yapay zekaya meydan oku"
            icon={<UserCircleGear size={48} weight="duotone" />}
            onClick={() => onNavigate('BOT_SELECT')}
          />

          {/* Koç ile Oyna */}
          <CreamCard
            id="mobile-coach-btn"
            label="Koç ile oyna"
            desc="Hamle analizi ve canlı tavsiyeler"
            icon={<GraduationCap size={48} weight="duotone" />}
            badge="Eğitim"
            onClick={() => setIsCoachOpen(true)}
          />

          {/* Özel Oyun */}
          <CreamCard
            id="mobile-custom-btn"
            label="Özel oyun"
            desc="Kuralları, tarafı ve süreyi belirle"
            icon={<SlidersHorizontal size={48} weight="duotone" />}
            onClick={() => setIsCustomGameOpen(true)}
          />

          {/* Ekranda Oyna */}
          <CreamCard
            id="mobile-screen-btn"
            label="Ekranda oyna"
            desc="Aynı ekranda iki oyuncu"
            icon={<MonitorPlay size={48} weight="duotone" />}
            onClick={() => setIsInPersonOpen(true)}
          />
        </div>
      </div>

      {/* ─── MODALLAR ─────────────────────────────────────────────── */}
      {/* 1. Zaman Kontrolü Seçim Modalı */}
      {isTimeModalOpen && (
        <TimeControlModal
          selectedTime={selectedTime}
          onSelect={(tc) => setSelectedTime(tc)}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}

      {/* 2. Özel Oyun Modalı */}
      {isCustomGameOpen && (
        <CustomGameModal
          onClose={() => setIsCustomGameOpen(false)}
          onStart={(config) => {
            setIsCustomGameOpen(false);
            if (onStartGame) {
              onStartGame('custom', config.timeControl.initialMinutes * 60);
            }
          }}
          showNotification={showNotification}
        />
      )}

      {/* 3. Ekranda Oyna Modalı */}
      {isInPersonOpen && (
        <PlayInPersonModal
          onClose={() => setIsInPersonOpen(false)}
          onStart={(config) => {
            setIsInPersonOpen(false);
            // Serbest dizilim seçildiyse editöre yönlendir (oyun türü seçim ekranından erişim)
            if (config.gameType === 'Serbest') {
              if (onOpenSetupEditor) {
                onOpenSetupEditor(config);
              } else if (onStartScreenPlay) {
                onStartScreenPlay(config);
              } else if (onStartGame) {
                onStartGame('local_pass_and_play', 600);
              }
              return;
            }
            if (onStartScreenPlay) {
              onStartScreenPlay(config);
            } else if (onStartGame) {
              onStartGame('local_pass_and_play', 600);
            }
          }}
        />
      )}

      {/* 4. Turnuvalar Modalı */}
      {isTournamentOpen && (
        <TournamentModal
          onClose={() => setIsTournamentOpen(false)}
          showNotification={showNotification}
        />
      )}

      {/* 5. Koç ile Oyna Modalı */}
      {isCoachOpen && (
        <CoachModal
          onClose={() => setIsCoachOpen(false)}
          onStartCoachGame={(_coachName, _tipLevel) => {
            setIsCoachOpen(false);
            if (onStartGame) {
              onStartGame('coach_easy', 900);
            }
          }}
          showNotification={showNotification}
        />
      )}

      {/* 6. Arkadaşınla Oyna Modalı */}
      {isPlayFriendOpen && (
        <PlayAFriendModal
          initialTimeControl={selectedTime}
          onClose={() => setIsPlayFriendOpen(false)}
          onStartOnlineGame={(gd, mc, gc) => {
            setIsPlayFriendOpen(false);
            if (onStartOnlineGame) {
              onStartOnlineGame(gd, mc, gc);
            } else if (onStartGame) {
              onStartGame('online', 600);
            }
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};
