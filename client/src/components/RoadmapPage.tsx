import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowClockwise,
  Check,
  Crown,
  Flag,
  Horse,
  Lock,
  Play,
  Scroll,
  Shield,
  Sword,
  Sparkle,
  Trophy,
} from '@phosphor-icons/react';
import { PageState, NotificationType } from '../types';
import { LEARN_LEVELS, TOTAL_LESSONS, TOTAL_XP } from '../learn/learnContent';
import { useLearnProgress, learnProgressStore, getStreak } from '../learn/learnProgress';
import { XPBadge } from './learn/XPBadge';

interface RoadmapPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  /** Yeni akış: seviyeye dokununca LessonDetail açılır. Verilmezse eski davranış korunur. */
  onOpenLevel?: (levelId: number) => void;
  /** Masaüstü panelinden doğrudan derse gitme (levelId, lessonIdx). */
  onOpenLesson?: (levelId: number, lessonIdx: number) => void;
}

// ─── Tasarım belirteçleri (docs/tasarim-plani.md) ────────────────────────────
const ACCENT = '#00d4c4';
const ACCENT_GLOW = 'rgba(0, 212, 196, 0.45)';
const CREAM = '#f5eedc';
const CREAM_BORDER = '#e5dcce';
const MUTED_ON_DARK = '#A7BDB1';

// ─── Patika geometrisi (attığın DC dosyasından birebir) ─────────────────────
// Alttan (BAŞLA) yukarı (OTAĞ). x: 0-100, y: 0-1520 — adalarla aynı uzay.
// Kübik segmentler: [p0x, p0y, c1x, c1y, c2x, c2y, p1x, p1y]
type Seg = [number, number, number, number, number, number, number, number];
const SEGS: Seg[] = [
  [30, 1470, 30, 1420, 30, 1395, 30, 1350],
  [30, 1350, 30, 1280, 55, 1190, 70, 1120],
  [70, 1120, 62, 1080, 56, 1045, 50, 1010],
  [50, 1010, 44, 975, 34, 930, 28, 890],
  [28, 890, 26, 820, 60, 720, 72, 660],
  [72, 660, 64, 620, 56, 585, 50, 550],
  [50, 550, 44, 515, 34, 470, 30, 430],
  [30, 430, 28, 350, 50, 260, 66, 195],
  [66, 195, 66, 158, 66, 121, 66, 84],
];

const MAP_H = 1520;
const CENTERS: Record<number, [number, number]> = {
  1: [30, 1350],
  2: [70, 1120],
  3: [28, 890],
  4: [72, 660],
  5: [30, 430],
  6: [66, 195],
};
const CHEST_SPOTS = [
  { after: 2, cx: 50, cy: 1010 },
  { after: 4, cx: 50, cy: 550 },
];

function cubicAt(s: Seg, t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]];
}

const TRAIL_D =
  `M ${SEGS[0][0]} ${SEGS[0][1]}` +
  SEGS.map((s) => ` C ${s[2]} ${s[3]}, ${s[4]} ${s[5]}, ${s[6]} ${s[7]}`).join('');

// Yay uzunluğu yaklaşık — ilerleme dolgusu için yeterli.
const TRAIL_PTS: Array<[number, number, number]> = (() => {
  const out: Array<[number, number, number]> = [[SEGS[0][0], SEGS[0][1], 0]];
  let len = 0;
  for (const s of SEGS) {
    for (let i = 1; i <= 40; i++) {
      const [x, y] = cubicAt(s, i / 40);
      const prev = out[out.length - 1];
      len += Math.hypot(x - prev[0], y - prev[1]);
      out.push([+x.toFixed(2), +y.toFixed(2), len]);
    }
  }
  return out;
})();
const TRAIL_LEN = TRAIL_PTS[TRAIL_PTS.length - 1][2];

function progressPath(pct: number): string {
  if (pct <= 0) return '';
  const target = Math.min(1, pct) * TRAIL_LEN;
  let d = `M ${TRAIL_PTS[0][0]} ${TRAIL_PTS[0][1]}`;
  for (let i = 1; i < TRAIL_PTS.length; i++) {
    const p = TRAIL_PTS[i];
    if (p[2] >= target) {
      const prev = TRAIL_PTS[i - 1];
      const f = (target - prev[2]) / Math.max(0.001, p[2] - prev[2]);
      d += ` L ${(prev[0] + (p[0] - prev[0]) * f).toFixed(2)} ${(prev[1] + (p[1] - prev[1]) * f).toFixed(2)}`;
      return d;
    }
    d += ` L ${p[0]} ${p[1]}`;
  }
  return d;
}

// Seviye ikonu — sistemde yalnızca @phosphor-icons/react kullanılır.
function LevelGlyph({ id, size = 30 }: { id: number; size?: number }) {
  const common = { size, weight: 'duotone' as const };
  switch (id) {
    case 1:
      return <Scroll {...common} />;
    case 2:
      return <Shield {...common} />;
    case 3:
      return <Sword {...common} />;
    case 4:
      return <Horse {...common} />;
    case 5:
      return <Sparkle {...common} />;
    default:
      return <Crown {...common} />;
  }
}

export const RoadmapPage: FC<RoadmapPageProps> = ({ onNavigate, showNotification, onOpenLevel, onOpenLesson }) => {
  const progress = useLearnProgress();
  const { state } = progress;
  const activeId = progress.activeLevel;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Seviye/ders türevleri — kilit kuralı learnProgress.isLevelUnlocked'dan gelir.
  const info = useMemo(
    () =>
      LEARN_LEVELS.map((lv) => {
        const doneN = lv.lessons.filter((d) => state.completedLessons.includes(d.id)).length;
        return { lv, doneN, complete: doneN === lv.lessons.length };
      }),
    [state.completedLessons],
  );
  const unlocked = (idx: number) => (idx === 0 ? true : info[idx - 1].complete);
  const selId = selectedId ?? activeId;
  const selIdx = Math.max(
    0,
    info.findIndex((x) => x.lv.id === selId),
  );
  const sel = info[selIdx] ?? info[0];

  const doneCount = state.completedLessons.length;
  const xp = progress.xp;
  const pct = TOTAL_LESSONS === 0 ? 0 : doneCount / TOTAL_LESSONS;
  const streak = getStreak();

  const activeLevel = LEARN_LEVELS.find((l) => l.id === activeId) ?? LEARN_LEVELS[0];

  // Harita bağlanınca / aktif seviye değişince aktif adaya kaydır.
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const targetY = (CENTERS[activeId] ?? [50, MAP_H - 60])[1];
    let tries = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (el.scrollHeight > el.clientHeight + 4) {
        el.scrollTop = Math.max(0, targetY - el.clientHeight * 0.55);
        if (el.scrollTop > 1) return;
      }
      if (tries++ < 24) window.setTimeout(tick, 60);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const handleSelect = (levelId: number, idx: number) => {
    const level = LEARN_LEVELS.find((l) => l.id === levelId);
    if (!level) return;
    setSelectedId(levelId);
    if (!unlocked(idx)) {
      showNotification(`${level.unvan} henüz kilitli! Önce önceki seviyeyi bitir.`, 'info');
    }
  };

  const openLevel = (levelId: number, idx: number) => {
    const level = LEARN_LEVELS.find((l) => l.id === levelId);
    if (!level) return;
    if (!unlocked(idx)) {
      showNotification(`${level.unvan} henüz kilitli! Önce önceki seviyeyi bitir.`, 'info');
      return;
    }
    if (onOpenLevel) {
      onOpenLevel(levelId);
      return;
    }
    if (levelId === 1) onNavigate('LESSON_1');
    else showNotification(`${level.title} başlatılıyor...`, 'success');
  };

  const openLessonAt = (levelId: number, lessonIdx: number, locked: boolean) => {
    if (locked) {
      showNotification('Bu ders kilitli! Önce önceki seviyeyi bitir.', 'info');
      return;
    }
    if (onOpenLesson) {
      onOpenLesson(levelId, lessonIdx);
      return;
    }
    openLevel(levelId, selIdx);
  };

  const handleReset = () => {
    learnProgressStore.reset();
    setSelectedId(1);
    showNotification('Öğrenme ilerlemesi sıfırlandı.', 'info');
  };

  const nextUndoneIdx = sel.lv.lessons.findIndex((d) => !state.completedLessons.includes(d.id));
  const selLocked = !unlocked(selIdx);
  const ctaLabel = sel.complete
    ? 'Seviyeyi tekrar et'
    : sel.doneN > 0 && nextUndoneIdx >= 0
      ? `Devam et: ${sel.lv.lessons[nextUndoneIdx].title}`
      : 'Seviyeye başla';
  const selPct = sel.lv.lessons.length === 0 ? 0 : Math.round((sel.doneN / sel.lv.lessons.length) * 100);

  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Üst başlık — koyu yeşil zemin, krem XP rozeti, neon ilerleme çizgisi */}
      <div
        className="relative overflow-hidden border-b border-white/10 px-4 sm:px-6 pt-10 pb-4 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #143223 0%, #122b1e 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(0,212,196,0.10) 0%, transparent 60%)' }}
        />
        <div className="relative flex items-start gap-3 max-w-6xl mx-auto">
          <button onClick={() => onNavigate('LEARN_MENU')} className="mobile-back-btn" aria-label="Geri">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <ArrowLeft size={20} weight="bold" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-batangas text-[2rem] sm:text-4xl font-bold text-white tracking-wide leading-none">
              Timur&apos;a Giden Yol
            </h1>
            <p className="text-sm mt-1.5 font-semibold" style={{ color: MUTED_ON_DARK }}>
              {doneCount} / {TOTAL_LESSONS} ders &nbsp;•&nbsp; {progress.completedLevels} / 6 seviye &nbsp;•&nbsp;{' '}
              {streak > 0 ? `${streak} gün seri • ` : ''}{xp} XP kazanıldı
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg"
              style={{ background: CREAM, borderColor: CREAM_BORDER, color: '#141f1b' }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
              <span className="text-sm font-bold whitespace-nowrap">
                {xp} / {TOTAL_XP} XP
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: MUTED_ON_DARK }}>
              Seviye {activeId} • {activeLevel.unvan}
            </span>
          </div>
        </div>
        <div className="relative max-w-6xl mx-auto mt-4 h-2.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round(pct * 100)}%`,
              background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)`,
              boxShadow: `0 0 18px ${ACCENT_GLOW}`,
            }}
          />
        </div>
      </div>

      {/* Orta alan: dikey patika haritası + seçili seviye paneli */}
      <div className="flex-1 relative z-10 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="flex flex-wrap items-start gap-4 px-4 sm:px-6 py-4 max-w-6xl w-full mx-auto box-border">
          {/* Harita — kaydırılabilir dikey patika, 6 seviye adası */}
          <div
            ref={mapRef}
            className="relative overflow-y-auto overflow-x-hidden custom-scrollbar border border-white/10"
            style={{
              flex: '1 1 430px',
              minWidth: 280,
              height: 'clamp(460px, 66vh, 780px)',
              borderRadius: 26,
              background: 'radial-gradient(ellipse at 50% 100%, #17392a 0%, #102518 70%)',
            }}
          >
            <div className="relative w-full" style={{ height: MAP_H }}>
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 0)',
                  backgroundSize: '30px 30px',
                }}
              />
              <svg viewBox="0 0 100 1520" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Kum yol + koyu kasa (tasarım planı: #c49a54 / #17100a) */}
                <path d={TRAIL_D} fill="none" stroke="#17100a" strokeWidth={20} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <path d={TRAIL_D} fill="none" stroke="#c49a54" strokeWidth={13} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <path d={TRAIL_D} fill="none" stroke="#e6c886" strokeWidth={5} strokeLinecap="round" strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
                <path d={TRAIL_D} fill="none" stroke="#4a3418" strokeWidth={2.4} strokeOpacity={0.85} strokeDasharray="14 13" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {/* İlerleme dolgusu — neon */}
                {progressPath(pct) !== '' && (
                  <path
                    d={progressPath(pct)}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: `drop-shadow(0 0 6px ${ACCENT_GLOW})` }}
                  />
                )}
              </svg>

              {/* BAŞLA / OTAĞ rozetleri */}
              <div
                className="absolute flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
                style={{ left: '30%', top: 1466, transform: 'translateX(-50%)', background: '#c49a54', color: '#1a1206', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
              >
                <Flag size={13} weight="fill" /> BAŞLA
              </div>
              <div
                className="absolute flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
                style={{ left: '66%', top: 44, transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f0c470, #d79a2b)', color: '#241503', boxShadow: '0 6px 20px rgba(215,154,43,0.42)' }}
              >
                <Crown size={14} weight="fill" /> TİMUR&apos;UN OTAĞI
              </div>

              {/* Sandıklar — ara ödül işaretleri */}
              {CHEST_SPOTS.map((c) => {
                const earned = info[c.after - 1]?.complete ?? false;
                return (
                  <div key={`chest-${c.after}`} className="absolute flex flex-col items-center gap-1" style={{ left: `${c.cx}%`, top: c.cy - 28, transform: 'translateX(-50%)' }}>
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
                      style={{
                        background: earned ? '#8a5a1f' : '#2a3a30',
                        borderColor: earned ? '#f0c470' : '#3e5347',
                        color: earned ? '#ffe9a8' : '#56705f',
                      }}
                    >
                      {earned ? <Trophy size={24} weight="duotone" /> : <Lock size={20} weight="bold" />}
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: earned ? '#f0c470' : MUTED_ON_DARK, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
                    >
                      {earned ? 'Ödül hazır' : `Sv. ${c.after} ödülü`}
                    </span>
                  </div>
                );
              })}

              {/* Seviye adaları */}
              {info.map((x, i) => {
                const lv = x.lv;
                const isLocked = !unlocked(i);
                const isComplete = x.complete;
                const isActive = lv.id === activeId && !isComplete && !isLocked;
                const isSel = lv.id === selId;
                const [cx, cy] = CENTERS[lv.id] ?? [50, 800];
                return (
                  <div
                    key={lv.id}
                    className="absolute flex flex-col items-center animate-float"
                    style={{
                      left: `${cx}%`,
                      top: cy - 66,
                      transform: 'translateX(-50%)',
                      width: 'clamp(150px, 40vw, 210px)',
                      animationDelay: `${i * 0.28}s`,
                      animationDuration: `${(3.6 + i * 0.25).toFixed(2)}s`,
                    }}
                  >
                    <button
                      onClick={() => handleSelect(lv.id, i)}
                      className="relative bg-transparent border-0 p-0 cursor-pointer leading-none"
                      aria-label={`Seviye ${lv.id}: ${lv.unvan}`}
                    >
                      <svg viewBox="0 0 160 132" className="block w-[clamp(120px,33vw,168px)] h-auto">
                        <ellipse cx="80" cy="122" rx="56" ry="13" fill="rgba(0,0,0,0.42)" />
                        <path d="M10 66 L80 104 L80 120 L10 82 Z" fill={isLocked ? '#1e2a23' : isComplete ? '#155238' : '#2a4a38'} />
                        <path d="M80 104 L150 66 L150 82 L80 120 Z" fill={isLocked ? '#17211b' : isComplete ? '#11402c' : '#1e3628'} />
                        <path d="M80 28 L150 66 L80 104 L10 66 Z" fill={isLocked ? '#2b3a31' : isComplete ? '#1c6a45' : `${lv.color}4d`} />
                        <path d="M80 40 L136 66 L80 92 L24 66 Z" fill={isLocked ? 'rgba(0,0,0,0.22)' : isComplete ? 'rgba(240,196,112,0.16)' : 'rgba(255,255,255,0.08)'} />
                        <g opacity={isLocked ? 0.55 : 1}>
                          <circle cx="80" cy="34" r="9.5" fill={isLocked ? '#41564a' : isComplete ? '#f0c470' : CREAM} />
                          <path d="M73 43 L87 43 L85 51 L75 51 Z" fill={isLocked ? '#41564a' : isComplete ? '#f0c470' : CREAM} />
                          <path d="M75 51 C71 60, 69 68, 67 74 L93 74 C91 68, 89 60, 85 51 Z" fill={isLocked ? '#41564a' : isComplete ? '#f0c470' : CREAM} />
                          <path d="M61 74 L99 74 L103 83 L57 83 Z" fill={isLocked ? '#33453a' : isComplete ? '#d7a34a' : '#ddd2b8'} />
                        </g>
                        {isLocked && (
                          <g>
                            <rect x="68" y="58" width="24" height="18" rx="3.5" fill="#233128" stroke="#6d8578" strokeWidth="2.2" />
                            <path d="M73 58 V52 a7 7 0 0 1 14 0 v6" fill="none" stroke="#6d8578" strokeWidth="2.4" />
                          </g>
                        )}
                        {isComplete && (
                          <path d="M64 66 L74 78 L98 52" fill="none" stroke="#f0c470" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                      <span
                        className="absolute flex items-center justify-center font-batangas text-[17px]"
                        style={{
                          left: '8%',
                          top: '12%',
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: isLocked ? '#314237' : isComplete ? '#f0c470' : CREAM,
                          color: isLocked ? '#8ba295' : '#141f1b',
                          border: `2px solid ${isSel ? '#ffffff' : 'rgba(20,31,27,0.25)'}`,
                          boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
                        }}
                      >
                        {lv.id}
                      </span>
                      {isActive && (
                        <span
                          className="absolute pointer-events-none rounded-full animate-pulse"
                          style={{ inset: '-6% 6% 18%', background: `radial-gradient(circle, ${ACCENT} 0%, transparent 68%)`, opacity: 0.55 }}
                        />
                      )}
                      {/* Taş ikonu rozeti */}
                      <span
                        className="absolute flex items-center justify-center rounded-full border shadow-md"
                        style={{
                          right: '6%',
                          top: '30%',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: isLocked ? '#233128' : isComplete ? '#f0c470' : '#141f1b',
                          color: isLocked ? '#6d8578' : isComplete ? '#241503' : '#ffffff',
                          borderColor: 'rgba(255,255,255,0.25)',
                        }}
                      >
                        {isLocked ? <Lock size={19} weight="bold" /> : isComplete ? <Check size={19} weight="bold" /> : <LevelGlyph id={lv.id} size={22} />}
                      </span>
                    </button>

                    {/* Ada etiketi — krem kart */}
                    <button
                      onClick={() => handleSelect(lv.id, i)}
                      className="mt-1.5 w-full text-left cursor-pointer rounded-2xl px-2.5 py-2.5 border shadow-xl transition-transform active:scale-[0.99]"
                      style={{
                        background: CREAM,
                        borderColor: CREAM_BORDER,
                        borderTop: `3px solid ${isLocked ? '#d1cbc0' : isComplete ? '#4a7c59' : ACCENT}`,
                        boxShadow: isSel ? '0 10px 26px rgba(0,0,0,0.45)' : '0 6px 18px rgba(0,0,0,0.32)',
                        outline: isSel ? '2px solid rgba(255,255,255,0.85)' : '0 solid transparent',
                        outlineOffset: 2,
                      }}
                    >
                      <span className="block text-[13.5px] font-bold text-[#141f1b] leading-tight" style={{ opacity: isLocked ? 0.5 : 1 }}>
                        {lv.id}. {lv.unvan}
                      </span>
                      <span
                        className="block mt-1 text-[11px] font-semibold text-[#5c6c66] leading-snug overflow-hidden"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {lv.title}
                      </span>
                      <span className="flex items-center gap-1.5 mt-2">
                        <XPBadge xp={lv.xp} />
                        <span className="text-[10.5px] font-bold text-[#5c6c66]">
                          {x.doneN}/{lv.lessons.length} ders
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ panel — seçili seviye detayı + dersler */}
          <aside className="flex flex-col gap-3.5" style={{ flex: '1 1 320px', minWidth: 260, maxWidth: 400 }}>
            <div className="rounded-3xl p-[18px] border shadow-xl" style={{ background: CREAM, borderColor: CREAM_BORDER, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0c4e48]">
                Seviye {sel.lv.id} • {sel.lv.unvan}
              </div>
              <div className="mt-1.5 font-batangas text-xl font-bold text-[#141f1b] leading-tight">{sel.lv.title}</div>
              <div className="mt-2.5 text-[13px] font-semibold text-[#5c6c66] leading-relaxed">
                {sel.doneN}/{sel.lv.lessons.length} ders • {sel.lv.baraj[0]}/{sel.lv.baraj[1]} bulmaca barajı •{' '}
                {sel.lv.sureDakika} dk • +{sel.lv.xp} XP
              </div>
              <div className="mt-1 text-[13px] text-[#5c6c66]">
                Rozet: <span className="text-[#141f1b] font-bold">{sel.lv.rozet}</span>
              </div>
              <div className="mt-3.5 h-2 rounded-full bg-[#141f1b]/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${selPct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }}
                />
              </div>

              {selLocked ? (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl p-3 border border-dashed border-[#cfc4ad] bg-[#141f1b]/5">
                  <Lock size={18} weight="bold" className="text-[#5c6c66] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#5c6c66] leading-snug">
                    {sel.lv.id - 1}. seviyeyi ({LEARN_LEVELS[selIdx - 1]?.unvan ?? 'önceki seviye'}) bitirince bu ada
                    açılır.
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (nextUndoneIdx >= 0) openLessonAt(sel.lv.id, nextUndoneIdx, false);
                    else openLevel(sel.lv.id, selIdx);
                  }}
                  className="mt-3.5 w-full flex items-center justify-center gap-2 border-0 rounded-2xl px-4 py-3.5 text-[15px] font-bold cursor-pointer transition-all hover:brightness-105 active:scale-[0.985]"
                  style={{ color: '#0d2818', background: ACCENT, boxShadow: `0 6px 22px ${ACCENT_GLOW}` }}
                >
                  <Play size={17} weight="fill" /> {ctaLabel}
                </button>
              )}
            </div>

            <div className="rounded-3xl p-[15px] border shadow-xl" style={{ background: CREAM, borderColor: CREAM_BORDER, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-[#141f1b]">Dersler</span>
                <span className="text-xs font-bold text-[#5c6c66]">
                  {sel.doneN}/{sel.lv.lessons.length} tamamlandı
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-2.5">
                {sel.lv.lessons.map((d, i) => {
                  const done = state.completedLessons.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => openLessonAt(sel.lv.id, i, selLocked)}
                      className="flex items-center gap-2.5 w-full text-left rounded-xl px-2.5 py-2.5 border transition-all hover:brightness-95 active:scale-[0.99]"
                      style={{
                        background: done ? '#eae2cf' : '#e8deca',
                        borderColor: done ? '#cfc4ad' : '#d8ccb6',
                        opacity: selLocked ? 0.55 : 1,
                        cursor: selLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border border-[#141f1b]/10"
                        style={{ background: done ? 'rgba(74,124,89,0.22)' : 'rgba(20,31,27,0.06)', color: done ? '#1b5c34' : '#141f1b' }}
                      >
                        {done ? <Check size={14} weight="bold" /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#5c6c66]">
                          Ders {d.id}
                        </span>
                        <span className="block text-[13px] font-bold text-[#141f1b] leading-snug">{d.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 px-1">
              <span className="text-[11.5px] font-semibold leading-snug" style={{ color: MUTED_ON_DARK }}>
                Ders satırına dokunmak ilgili dersi açar; ilerleme dersteki &quot;Tamamla&quot; ile işler.
              </span>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer text-[11.5px] font-bold px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-white/70 transition-colors hover:bg-white/20"
              >
                <ArrowClockwise size={13} weight="bold" /> Sıfırla
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
