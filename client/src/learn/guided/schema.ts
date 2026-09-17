/**
 * Runtime tip guard'ları (harici kütüphane yok).
 * Şema seviyesinde ret: awaitSquares / showGeometry fazlarında literal
 * kare dizisi (`accept/squares/targets/destinations`) REDDEDİLİR.
 */
import type { GuidedLesson, GuidedStep, PositionRef } from './types';

const STEP_KINDS = new Set([
  'say', 'show', 'showMoves', 'showGeometry', 'compare', 'play',
  'awaitMove', 'awaitSquare', 'awaitSquares', 'expectRejection',
  'quiz', 'teleport', 'awaitSwap', 'setPosition', 'finish',
]);

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

function isSquare(n: unknown): boolean {
  return isInt(n) && (n as number) >= 0 && (n as number) <= 111;
}

export function isPositionRef(v: unknown): v is PositionRef {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (r.kind === 'serialized') return typeof r.data === 'string';
  if (r.kind === 'pieces') {
    if (r.sideToMove !== 'white' && r.sideToMove !== 'black') return false;
    if (!Array.isArray(r.pieces)) return false;
    return (r.pieces as unknown[]).every((p) => {
      if (typeof p !== 'object' || p === null) return false;
      const q = p as Record<string, unknown>;
      return isSquare(q.square) && (q.side === 'white' || q.side === 'black') && typeof q.kind === 'string';
    });
  }
  return false;
}

/** Şema-katı adım kontrolü. Literal kare listesi varsa false + neden döner. */
export function checkStepSchema(step: unknown): { ok: boolean; reason?: string } {
  if (typeof step !== 'object' || step === null) return { ok: false, reason: 'adım nesne değil' };
  const s = step as Record<string, unknown>;
  if (typeof s.kind !== 'string' || !STEP_KINDS.has(s.kind)) {
    return { ok: false, reason: `bilinmeyen adım türü "${String(s.kind)}"` };
  }
  if (s.kind === 'awaitSquares') {
    for (const key of ['accept', 'squares', 'targets', 'destinations']) {
      if (key in s) return { ok: false, reason: `awaitSquares '${key}' alanı taşıyamaz` };
    }
    if (!isSquare(s.from) || !isInt(s.count)) {
      return { ok: false, reason: 'awaitSquares from + count zorunlu' };
    }
  }
  if (s.kind === 'showGeometry') {
    if (!isSquare(s.square) || !Array.isArray(s.phases)) {
      return { ok: false, reason: 'showGeometry square + phases zorunlu' };
    }
    for (let i = 0; i < (s.phases as unknown[]).length; i++) {
      const ph = (s.phases as Record<string, unknown>[])[i] as Record<string, unknown>;
      for (const key of ['squares', 'accept', 'targets', 'destinations']) {
        if (ph && key in ph) {
          return { ok: false, reason: `showGeometry faz[${i}] '${key}' alanı taşıyamaz` };
        }
      }
    }
  }
  return { ok: true };
}

export function isGuidedStep(step: unknown): step is GuidedStep {
  return checkStepSchema(step).ok;
}

export function isGuidedLesson(lesson: unknown): lesson is GuidedLesson {
  if (typeof lesson !== 'object' || lesson === null) return false;
  const l = lesson as Record<string, unknown>;
  if (typeof l.id !== 'string' || typeof l.title !== 'string') return false;
  if (l.mode !== 'interactive' && l.mode !== 'narrative') return false;
  if (!isPositionRef(l.startPosition)) return false;
  if (!Array.isArray(l.steps) || l.steps.length === 0) return false;
  if (l.level !== 1 && l.level !== 2 && l.level !== 3 && l.level !== 4 && l.level !== 5 && l.level !== 6) return false;
  if (l.orientation !== 'white' && l.orientation !== 'black') return false;
  if (typeof l.xp !== 'number') return false;
  return (l.steps as unknown[]).every((s) => checkStepSchema(s).ok);
}
