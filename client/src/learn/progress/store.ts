/**
 * v2 ilerleme deposu: ders tamamlama + XP + rozet/unvan (saf çekirdek + ince
 * localStorage katmanı). Bulmaca eşiği gating'i ders-tamamlama gating'ine
 * dönüşür: seviye N, N-1'in tüm dersleri bitmeden açılmaz.
 */
import { useCallback, useEffect, useState } from 'react';
import { LEARN_LEVELS } from '../learnContent';
import { GUIDED_LESSONS } from '../guided/content/index';
import { awardForLesson, LEVEL_TITLES } from './xp';
import { loadV2, saveV2, V1_KEY, type ProgressV2 } from './schema';

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function lessonLevel(lessonId: string): number {
  const found = GUIDED_LESSONS.find((l) => l.id === lessonId);
  return found ? found.level : 1;
}

function lessonBaseXp(lessonId: string): number {
  const found = GUIDED_LESSONS.find((l) => l.id === lessonId);
  return found ? found.xp : 0;
}

export function recordLessonComplete(
  prev: ProgressV2,
  lessonId: string,
  opts: { hintsUsed: number; skipped: boolean; badge?: string },
): ProgressV2 {
  const isRepeat = prev.completedLessons.includes(lessonId);
  const award = awardForLesson(lessonBaseXp(lessonId), opts.hintsUsed, opts.skipped, isRepeat);
  const level = lessonLevel(lessonId);
  const levelIds = GUIDED_LESSONS.filter((l) => l.level === level).map((l) => l.id);
  const completedLessons = isRepeat ? prev.completedLessons : [...prev.completedLessons, lessonId];
  const titles = [...prev.titles];
  if (!isRepeat && levelIds.every((id) => completedLessons.includes(id))) {
    const title = LEVEL_TITLES[level];
    if (title && !titles.includes(title)) titles.push(title);
  }
  return {
    ...prev,
    completedLessons,
    xpByLesson: isRepeat ? prev.xpByLesson : { ...prev.xpByLesson, [lessonId]: award },
    hintsUsed: { ...prev.hintsUsed, [lessonId]: opts.hintsUsed },
    skippedLessons: opts.skipped && !prev.skippedLessons.includes(lessonId)
      ? [...prev.skippedLessons, lessonId]
      : prev.skippedLessons,
    badges: opts.badge && !prev.badges.includes(opts.badge) ? [...prev.badges, opts.badge] : prev.badges,
    titles,
  };
}

export function isGuidedLevelUnlocked(state: ProgressV2, level: number): boolean {
  if (level <= 1) return true;
  const prevIds = GUIDED_LESSONS.filter((l) => l.level === level - 1).map((l) => l.id);
  return prevIds.every((id) => state.completedLessons.includes(id));
}

/**
 * Makinenin hesapladığı nihai XP ödülünü aynen yaz (indirim makinede yapıldı,
 * burada yeniden hesaplanmaz). Tekrar tamamlama 0 XP verir, toplamı bozmaz.
 */
export function recordLessonAward(
  prev: ProgressV2,
  lessonId: string,
  xpAward: number,
  opts: { badge?: string },
): ProgressV2 {
  const isRepeat = prev.completedLessons.includes(lessonId);
  const level = lessonLevel(lessonId);
  const levelIds = GUIDED_LESSONS.filter((l) => l.level === level).map((l) => l.id);
  const completedLessons = isRepeat ? prev.completedLessons : [...prev.completedLessons, lessonId];
  const titles = [...prev.titles];
  if (!isRepeat && levelIds.every((id) => completedLessons.includes(id))) {
    const title = LEVEL_TITLES[level];
    if (title && !titles.includes(title)) titles.push(title);
  }
  return {
    ...prev,
    completedLessons,
    xpByLesson: isRepeat ? prev.xpByLesson : { ...prev.xpByLesson, [lessonId]: xpAward },
    badges: opts.badge && !prev.badges.includes(opts.badge) ? [...prev.badges, opts.badge] : prev.badges,
    titles,
  };
}

export function useGuidedProgress() {
  const [state, setState] = useState<ProgressV2>(() => {
    const s = browserStorage();
    if (!s) {
      return {
        version: 2 as const,
        completedLessons: [],
        lastLessonIdxByLevel: {},
        xpByLesson: {},
        hintsUsed: {},
        completedStepIndex: {},
        skippedLessons: [],
        badges: [],
        titles: [],
      };
    }
    // v1 anahtarı migrateV1toV2 içinde yedeklenir.
    void V1_KEY;
    try {
      const { loadV2: load } = { loadV2 };
      return load(s);
    } catch {
      return {
        version: 2 as const,
        completedLessons: [],
        lastLessonIdxByLevel: {},
        xpByLesson: {},
        hintsUsed: {},
        completedStepIndex: {},
        skippedLessons: [],
        badges: [],
        titles: [],
      };
    }
  });

  useEffect(() => {
    const s = browserStorage();
    if (s) saveV2(s, state);
  }, [state]);

  const completeLesson = useCallback(
    (lessonId: string, opts: { hintsUsed: number; skipped: boolean; badge?: string }) => {
      setState((prev) => recordLessonComplete(prev, lessonId, opts));
    },
    [],
  );

  const completeAward = useCallback((lessonId: string, xpAward: number, badge?: string) => {
    setState((prev) => recordLessonAward(prev, lessonId, xpAward, { badge }));
  }, []);

  const recordStep = useCallback((lessonId: string, completedStepIndex: number) => {
    setState((prev) => ({
      ...prev,
      completedStepIndex: { ...prev.completedStepIndex, [lessonId]: Math.max(prev.completedStepIndex[lessonId] ?? -1, completedStepIndex) },
    }));
  }, []);

  return {
    state,
    totalXp: Object.values(state.xpByLesson).reduce((n, v) => n + v, 0),
    totalLessons: LEARN_LEVELS.reduce((n, l) => n + l.lessons.length, 0),
    completedCount: state.completedLessons.length,
    isLessonComplete: (id: string) => state.completedLessons.includes(id),
    isLevelUnlocked: (level: number) => isGuidedLevelUnlocked(state, level),
    completeLesson,
    completeAward,
    recordStep,
  };
}
