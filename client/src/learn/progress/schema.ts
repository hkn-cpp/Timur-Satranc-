/**
 * İlerleme şeması v1 → v2 migrasyonu (Bölüm 11.3).
 *
 * - v1 (`timur-learn-progress-v1`): { completedLessons, lastLessonIdxByLevel }
 * - v2 (`timur-learn-progress-v2`): v1 alanları + xpByLesson, hintsUsed,
 *   completedStepIndex, skippedLessons, badges, titles. Yeni alanlar opsiyonel
 *   okunur; migrasyonda v1 verisinin tam kopyası yedek anahtara yazılır.
 * - Garanti: XP ve tamamlanmış ders sayısı ASLA azalmaz; açılmış seviye
 *   geri kilitlenmez (kilitleme ders-tamamlama tabanlıdır).
 */
import { sanitizeLearnProgress } from '../learnContent';

export const V1_KEY = 'timur-learn-progress-v1';
export const V1_BACKUP_KEY = 'timur-learn-progress-v1-backup';
export const V2_KEY = 'timur-learn-progress-v2';

export interface ProgressV1 {
  completedLessons: string[];
  lastLessonIdxByLevel: Record<number, number>;
}

export interface ProgressV2 extends ProgressV1 {
  version: 2;
  xpByLesson: Record<string, number>;
  hintsUsed: Record<string, number>;
  completedStepIndex: Record<string, number>;
  skippedLessons: string[];
  badges: string[];
  titles: string[];
}

export function emptyV2(): ProgressV2 {
  return {
    version: 2,
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

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeParse(raw: string | null): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** v1 → v2: yedekle, taşı, asla azaltma. */
export function migrateV1toV2(storage: StorageLike): ProgressV2 {
  const rawV1 = storage.getItem(V1_KEY);
  const existingV2 = safeParse(storage.getItem(V2_KEY)) as Partial<ProgressV2> | null;
  if (rawV1 !== null) {
    try {
      storage.setItem(V1_BACKUP_KEY, rawV1);
    } catch {
      /* yoksay */
    }
  }
  const v1: ProgressV1 = sanitizeLearnProgress(safeParse(rawV1));
  const base = existingV2 && existingV2.version === 2 ? existingV2 : null;
  const completed = Array.from(
    new Set([...(base?.completedLessons ?? []), ...v1.completedLessons]),
  );
  const xpByLesson: Record<string, number> = { ...(base?.xpByLesson ?? {}) };
  let xp = 0;
  for (const id of completed) xp += xpByLesson[id] ?? 0;
  void xp;
  return {
    version: 2,
    completedLessons: completed,
    lastLessonIdxByLevel: { ...(base?.lastLessonIdxByLevel ?? {}), ...v1.lastLessonIdxByLevel },
    xpByLesson,
    hintsUsed: { ...(base?.hintsUsed ?? {}) },
    completedStepIndex: { ...(base?.completedStepIndex ?? {}) },
    skippedLessons: [...(base?.skippedLessons ?? [])],
    badges: [...(base?.badges ?? [])],
    titles: [...(base?.titles ?? [])],
  };
}

/** Toplam XP (v2): ders XP'leri toplamı (tekrar 0 XP verir, toplam azalmaz). */
export function totalXpV2(state: ProgressV2): number {
  return Object.values(state.xpByLesson).reduce((n, v) => n + (Number.isFinite(v) ? v : 0), 0);
}

export function loadV2(storage: StorageLike): ProgressV2 {
  const parsed = safeParse(storage.getItem(V2_KEY)) as Partial<ProgressV2> | null;
  if (parsed && parsed.version === 2 && Array.isArray(parsed.completedLessons)) {
    return { ...emptyV2(), ...parsed, version: 2 as const };
  }
  return migrateV1toV2(storage);
}

export function saveV2(storage: StorageLike, state: ProgressV2): void {
  try {
    storage.setItem(V2_KEY, JSON.stringify(state));
  } catch {
    /* yoksay */
  }
}
