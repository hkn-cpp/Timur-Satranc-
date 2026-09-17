/**
 * İçerik doğrulayıcı sarmalayıcı (Bölüm 6).
 * Tek doğruluk kaynağı `../lessonValidator.ts` — burada ikinci kural
 * yazılmaz; yalnızca `guided/types` → validator adaptasyonu + 12 madde
 * raporu yapılır. HATA ÇIKTISI: ders id + adım indeksi + madde numarası.
 */
import {
  validateLesson as validateSingle,
  validateLessonSet as validateSet,
  formatReport,
  type ValidationIssue,
  type ValidatorContext,
} from '../lessonValidator';
import type { GuidedLesson } from './types';

export type { ValidationIssue, ValidatorContext };
export { formatReport };

/** Zengin dersi validatorun beklediği şekle indirger (fazla alanlar atılır). */
export function toValidatorLesson(lesson: GuidedLesson): Parameters<typeof validateSingle>[0] {
  return {
    id: lesson.id,
    title: lesson.title,
    mode: lesson.mode,
    startPosition: lesson.startPosition as never,
    steps: lesson.steps as never,
  };
}

export function validateGuidedLesson(lesson: GuidedLesson, ctx: ValidatorContext): ValidationIssue[] {
  return validateSingle(toValidatorLesson(lesson), ctx);
}

export function validateGuidedSet(lessons: GuidedLesson[], ctx: ValidatorContext): ValidationIssue[] {
  return validateSet(lessons.map(toValidatorLesson), ctx);
}
