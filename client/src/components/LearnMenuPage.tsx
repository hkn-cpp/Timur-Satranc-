import React, { FC } from 'react';
import { ArrowLeft, MapTrifold, Shield, Cpu, Lock, Trophy } from '@phosphor-icons/react';
import { PageState, NotificationType } from '../types';
import { LEARN_LEVELS, TOTAL_LESSONS } from '../learn/learnContent';
import { useLearnProgress } from '../learn/learnProgress';

interface LearnMenuPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const LearnMenuPage: FC<LearnMenuPageProps> = ({ onNavigate, showNotification }) => {
  const { completedCount, percent, completedLevels, xp } = useLearnProgress();

  const roadmapProgress = TOTAL_LESSONS === 0 ? 0 : Math.round((completedCount / TOTAL_LESSONS) * 100);

  const learnItems = [
    {
      id: 'mobile-roadmap-btn',
      label: 'Yol Haritası',
      desc: `6 seviye • 25 ders • 70 bulmaca — ${completedCount}/${TOTAL_LESSONS} ders`,
      icon: <MapTrifold size={40} weight="duotone" />,
      progress: roadmapProgress,
      badge: `${completedLevels}/6`,
      page: 'ROADMAP' as PageState,
    },
    {
      id: 'mobile-rules-btn',
      label: 'Kurallar',
      desc: 'Taş değerleri + zafer ve beraberlik şartları',
      icon: <Shield size={40} weight="duotone" />,
      progress: 0,
      badge: 'Rehber',
      page: 'RULES' as PageState,
    },
    {
      id: 'mobile-analysis-btn',
      label: 'Analiz Motoru',
      desc: 'Canlı motor değerlendirmesi ve serbest tahta analizi',
      icon: <Cpu size={40} weight="duotone" />,
      badge: 'Motor',
      page: 'SELF_ANALYSIS' as PageState,
    },
  ];
  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Arka plan süslemeleri */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#0d2218] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a1d14] to-transparent" />
      </div>

      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-2 relative z-10">
        <button onClick={() => onNavigate('MAIN_MENU')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} weight="bold" />
          </div>
        </button>
        <div>
          <h1 className="font-batangas text-[2.2rem] font-bold text-white tracking-wide leading-none">Öğren</h1>
          <p className="text-[#A7BDB1] text-sm mt-0.5">Timur Satrancını keşfet</p>
        </div>
      </div>

      {/* Genel ilerleme kartı (krem) */}
      <div className="px-5 mt-3 mb-5 relative z-10">
        <div className="bg-[#f5eedc] rounded-2xl p-4 border border-[#e5dcce] shadow-xl w-full max-w-5xl lg:mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#5c6c66] text-sm font-semibold">Genel İlerleme</span>
            <span className="text-[#0c4e48] text-sm font-bold">%{percent} • {xp} XP</span>
          </div>
          <div className="w-full h-2 bg-[#141f1b]/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #00d4c4, #00a896)',
              }}
            />
          </div>
          <div className="flex gap-1 mt-2.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${s <= completedLevels ? 'bg-[#00a896]' : 'bg-[#141f1b]/10'}`}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-[#5c6c66]">
            {completedCount}/{TOTAL_LESSONS} ders • {completedLevels}/6 seviye tamamlandı
          </div>
        </div>
      </div>

      {/* Modül kartları (masaüstünde: kartlar sol + bilgi paneli sağ) */}
      <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar lg:overflow-visible px-5 pb-10">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-8 lg:items-start w-full max-w-5xl lg:mx-auto">
          <div className="flex flex-col gap-4 min-w-0">
            {learnItems.map((item) => (
              <button
                key={item.id}
                id={item.id}
                onClick={() => onNavigate(item.page)}
                className="mobile-card-btn group relative"
              >
                <div className="flex flex-col gap-0.5 text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-batangas text-[1.25rem] font-bold text-[#141f1b] leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[10px] bg-[#00d4c4]/20 text-[#0c4e48] border border-[#00d4c4]/40 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[#5c6c66] text-sm font-medium">{item.desc}</span>

                  {/* İlerleme */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#141f1b]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.progress}%`,
                          background: 'linear-gradient(90deg, #00d4c4, #00a896)',
                        }}
                      />
                    </div>
                    <span className="text-[#5c6c66] text-xs font-semibold flex-shrink-0">%{item.progress}</span>
                  </div>
                </div>

                <div className="text-[#141f1b] group-hover:scale-105 transition-all flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
              </button>
            ))}

            {/* Yakında (kilitli kartlar) */}
            <div className="rounded-2xl border border-[#e5dcce] bg-[#f5eedc]/50 p-5 flex items-center gap-4 opacity-70">
              <div className="w-14 h-14 rounded-2xl bg-[#141f1b]/5 border border-[#141f1b]/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={24} weight="duotone" className="text-[#141f1b]/30" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-batangas text-lg font-bold text-[#141f1b]/40">Turnuva Rehberi</span>
                  <Lock size={12} weight="bold" className="text-[#141f1b]/25" />
                </div>
                <p className="text-[#141f1b]/30 text-sm mt-0.5">Çok yakında açılıyor</p>
              </div>
            </div>
          </div>

          {/* Masaüstü bilgi paneli (mobilde gizli) */}
          <aside className="hidden lg:flex flex-col gap-4">
            <div className="rounded-2xl p-5 border border-[#e5dcce] bg-[#f5eedc] shadow-xl">
              <div className="font-batangas text-lg font-bold text-[#141f1b] mb-1">Nasıl çalışır?</div>
              <p className="text-[#5c6c66] text-sm leading-relaxed">
                Haritada 6 seviyeyi sırayla bitir: her derste teoriyi oku, bulmaca barajını geç,
                unvanı ve rozeti kap. İlerlemen bu cihazda saklanır.
              </p>
            </div>
            <div className="rounded-2xl p-5 border border-[#e5dcce] bg-[#f5eedc] shadow-xl">
              <div className="font-batangas text-lg font-bold text-[#141f1b] mb-3">Seviyeler ve rozetler</div>
              <div className="flex flex-col gap-2.5">
                {LEARN_LEVELS.map((l) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{l.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#141f1b] leading-tight">{l.unvan}</div>
                      <div className="text-xs text-[#5c6c66]">{l.rozet}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#00d4c4]/20 text-[#0c4e48] border border-[#00d4c4]/40">
                      {l.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
