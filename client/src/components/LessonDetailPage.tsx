import React, { FC, useEffect, useState } from 'react';
import { ArrowLeft, Trophy, CaretRight } from '@phosphor-icons/react';
import { PageState, NotificationType } from '../types';
import { LEARN_LEVELS } from '../learn/learnContent';
import { useLearnProgress } from '../learn/learnProgress';
import { GUIDED_LESSONS } from '../learn/guided/content/index';
import { useGuidedProgress } from '../learn/progress/store';
import { GuidedLessonView } from './learn/guided/GuidedLessonView';
import { XPBadge } from './learn/XPBadge';
import { EngineNote } from './learn/EngineNote';
import { PuzzleStaticCard } from './learn/PuzzleStaticCard';
import { MicroBadgeLegend } from './learn/MicroBadgeLegend';
import { LessonCard } from './learn/LessonCard';

interface LessonDetailPageProps {
  levelId: number;
  lessonIdx: number;
  onNavigate: (page: PageState) => void;
  onLessonChange: (levelId: number, lessonIdx: number) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

/** Motor-notu gerektiren dersler (PDF anlatımı esastır). */
const ENGINE_NOTE_LESSONS = new Set(['5.1', '5.2', '5.3', '5.4', '6.3', '6.5']);
/** Tahta efsanesi gösterilecek dersler (PDF §7). */
const LEGEND_LESSONS = new Set(['1.1', '3.4', '3.5', '4.1', '5.2', '6.2']);

export const LessonDetailPage: FC<LessonDetailPageProps> = ({
  levelId,
  lessonIdx,
  onNavigate,
  onLessonChange,
  showNotification,
}) => {
  const progress = useLearnProgress();
  const guidedProgress = useGuidedProgress();
  const level = LEARN_LEVELS.find((l) => l.id === levelId) ?? LEARN_LEVELS[0];
  const safeIdx = Math.max(0, Math.min(lessonIdx, level.lessons.length - 1));
  const lesson = level.lessons[safeIdx];

  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => setSlideIdx(0), [levelId, lessonIdx, lesson.id]);

  // Birincil akış: rehberli ders içeriği varsa koç motoru açılır.
  const guidedLesson = GUIDED_LESSONS.find((g) => g.id === lesson.id);
  if (guidedLesson) {
    const finishStep = [...guidedLesson.steps].reverse().find((s) => s.kind === 'finish');
    const badge = finishStep && finishStep.kind === 'finish' ? finishStep.badge : undefined;
    return (
      <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <GuidedLessonView
            lesson={guidedLesson}
            onExit={() => onNavigate('ROADMAP')}
            onProgress={(lessonId, completedStepIndex) => guidedProgress.recordStep(lessonId, completedStepIndex)}
            onComplete={(lessonId, xp) => {
              progress.completeLesson(level.id, lessonId);
              guidedProgress.completeAward(lessonId, xp, badge);
              const levelNowDone = level.lessons.every(
                (d) => d.id === lessonId || progress.isLessonComplete(d.id),
              );
              if (levelNowDone) {
                showNotification(`Tebrikler! ${level.unvan} unvanını kazandın! 🎉 (${level.rozet})`, 'success');
              } else {
                showNotification(`Ders ${lessonId} tamamlandı! +${xp} XP 🎉`, 'success');
              }
            }}
          />
        </div>
      </div>
    );
  }

  const isComplete = progress.isLessonComplete(lesson.id);
  const isLastSlide = slideIdx >= lesson.slides.length - 1;
  const slide = lesson.slides[Math.min(slideIdx, lesson.slides.length - 1)];

  const handleComplete = () => {
    progress.completeLesson(level.id, lesson.id);
    const levelNowDone = level.lessons.every(
      (d) => d.id === lesson.id || progress.isLessonComplete(d.id),
    );
    if (levelNowDone) {
      showNotification(`Tebrikler! ${level.unvan} unvanını kazandın! 🎉 (${level.rozet})`, 'success');
      onNavigate('ROADMAP');
      return;
    }
    showNotification(`Ders ${lesson.id} tamamlandı! +${Math.round(level.xp / level.lessons.length)} XP 🎉`, 'success');
    if (safeIdx + 1 < level.lessons.length) onLessonChange(level.id, safeIdx + 1);
    else onNavigate('ROADMAP');
  };

  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2 relative z-10 flex-shrink-0">
        <button onClick={() => onNavigate('ROADMAP')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} weight="bold" />
          </div>
        </button>
        <div className="text-center flex-1 px-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00d4c4]">
              Seviye {level.id} • {level.unvan}
            </span>
            <XPBadge xp={level.xp} />
          </div>
          <h1 className="font-batangas text-base md:text-xl font-bold text-white leading-snug text-wrap">
            {lesson.id} — {lesson.title}
          </h1>
        </div>
        <div className="text-white/30 text-xs font-semibold whitespace-nowrap">
          {slideIdx + 1}/{lesson.slides.length}
        </div>
      </div>

      {/* Slayt noktaları */}
      <div className="flex gap-2 justify-center pb-2 flex-shrink-0 relative z-10">
        {lesson.slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === slideIdx ? '24px' : '6px',
                background: i === slideIdx ? '#00d4c4' : 'rgba(255,255,255,0.15)',
              }}
            aria-label={`Slayt ${i + 1}`}
          />
        ))}
      </div>

      {/* İçerik (kaydırılabilir) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-4 relative z-10 flex flex-col gap-3">
        {/* Ders seçici */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {level.lessons.map((d, i) => {
            const lessonDone = progress.isLessonComplete(d.id);
            return (
            <button
              key={d.id}
              onClick={() => onLessonChange(level.id, i)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-bold border transition-all"
              style={
                i === safeIdx
                  ? { background: '#00d4c4', borderColor: '#00d4c4', color: '#0d2818' }
                  : lessonDone
                    ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.35)', color: '#4ade80' }
                    : { background: '#f5eedc', borderColor: '#e5dcce', color: '#6B7280' }
              }
            >
              {lessonDone ? '✓ ' : ''}{d.id}
            </button>
            );
          })}
        </div>

        {/* İç kolonlar (masaüstünde: teori sol + alıştırmalar sağ) */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6 lg:items-start">
        <div className="flex flex-col gap-3 min-w-0">
        {/* Slayt kartı (krem) */}
        <div
          key={`${lesson.id}-${slideIdx}`}
          className="rounded-3xl p-6 lg:p-8 flex flex-col border border-[#e5dcce] bg-[#f5eedc] shadow-xl animate-zoom-in flex-shrink-0"
        >
          <div className="text-5xl lg:text-6xl mb-3 text-center">{slide.emoji}</div>
          <h2 className="font-batangas text-xl lg:text-2xl font-bold text-[#141f1b] text-center mb-3 leading-tight">
            {slide.title}
          </h2>
          <p className="text-[#3a4a44] text-[15px] md:text-base leading-7 text-center">{slide.body}</p>
          <div className="mt-3 text-center text-sm font-semibold text-[#0c4e48]">
            🎯 Kazanım: {lesson.goal}
          </div>
          {ENGINE_NOTE_LESSONS.has(lesson.id) && (
            <EngineNote text="Bu dersteki ışınlanma/kilitleme/Yalın Şah kuralları tarihî anlatıma göre aktarılır; oyun motoruna sonraki fazda eklenecek." />
          )}
        </div>

        {/* Slayt gezinme */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setSlideIdx((s) => Math.max(0, s - 1))}
            disabled={slideIdx === 0}
            className="flex-1 py-3 rounded-2xl border border-[#cfc4ad] bg-[#e8deca] text-[#141f1b] font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
          >
            ← Önceki
          </button>
          {!isLastSlide ? (
            <button
              onClick={() => setSlideIdx((s) => s + 1)}
              className="flex-1 py-3 rounded-2xl bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-bold text-sm shadow-lg transition-all cursor-pointer"
            >
              Sonraki →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isComplete}
              className="flex-1 py-3 rounded-2xl bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trophy size={15} weight="bold" />
              {isComplete ? 'Tamamlandı ✓' : 'Tamamla!'}
            </button>
          )}
        </div>

        </div>
        <div className="flex flex-col gap-3 min-w-0">
        {/* Efsane (gerekli derslerde) */}
        {LEGEND_LESSONS.has(lesson.id) && <MicroBadgeLegend />}

        {/* Bulmaca kartları (statik) */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-bold text-white/50">
            Bulmacalar ({lesson.puzzles.length}) — statik tanıtım
          </span>
          <span className="text-xs text-white/40">Baraj: {level.baraj[0]}/{level.baraj[1]}</span>
        </div>
        {lesson.puzzles.map((p, i) => (
          <PuzzleStaticCard
            key={`${lesson.id}-p${i}`}
            puzzle={p}
            index={i}
            onLockedClick={() =>
              showNotification('Bulmaca motoru sonraki fazda eklenecek. Önce teoriyi bitir! 🔒', 'info')
            }
          />
        ))}

        {/* Sonraki ders */}
        {safeIdx + 1 < level.lessons.length && (
          <LessonCard
            lesson={level.lessons[safeIdx + 1]}
            index={safeIdx + 1}
            isActive={false}
            isComplete={progress.isLessonComplete(level.lessons[safeIdx + 1].id)}
            color={level.color}
            onSelect={() => onLessonChange(level.id, safeIdx + 1)}
          />
        )}
        {safeIdx + 1 >= level.lessons.length && (
          <button
            onClick={() => onNavigate('ROADMAP')}
            className="w-full py-3 rounded-2xl border border-[#cfc4ad] bg-[#e8deca] text-[#141f1b] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            Haritaya dön <CaretRight size={15} weight="bold" />
          </button>
        )}
        </div>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
};
