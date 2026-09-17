/**
 * Adım → annotation türetme (saf). Kare listeleri içerikten değil,
 * `derive.ts` + `core/rules` çıktısından gelir.
 */
import { PieceKind, type Position, type SquareIndex } from '../../../core/position/Position';
import {
  deriveDestinations,
  deriveDirection,
  derivePathSquares,
  deriveSwapPartners,
} from '../../../learn/guided/derive';
import type { Annotation, GuidedStep } from '../../../learn/guided/types';

const LEAPERS = new Set<string>([
  PieceKind.Knight,
  PieceKind.Camel,
  PieceKind.Alfil,
  PieceKind.Dabbaba,
]);

function pieceKindAt(pos: Position, sq: SquareIndex): string | null {
  const p = (pos.board as unknown as ({ kind: string } | null)[])[sq];
  if (!p) return null;
  if (sq === 110) return (pos.citadels.topLeft.occupant as unknown as { kind: string } | null)?.kind ?? p.kind;
  if (sq === 111) return (pos.citadels.bottomRight.occupant as unknown as { kind: string } | null)?.kind ?? p.kind;
  return p.kind;
}

/** Taşa göre ok türü: sıçrayıcı → leap (yay), diğer → slide (düz). */
export function arrowFor(pos: Position, from: SquareIndex, to: SquareIndex): Annotation {
  const kind = pieceKindAt(pos, from);
  if (kind && LEAPERS.has(kind)) return { kind: 'leap', from, to, tone: 'focus' };
  return { kind: 'slide', from, to, tone: 'focus' };
}

export interface HintState {
  hintLevel: number;
  autoHint: boolean;
}

export function annotationsForStep(
  step: GuidedStep,
  pos: Position | null,
  opts: { phase?: number; found?: SquareIndex[]; hint?: HintState } = {},
): Annotation[] {
  const out: Annotation[] = [];
  if (!pos) return out;
  const hint = opts.hint ?? { hintLevel: 0, autoHint: false };

  switch (step.kind) {
    case 'say':
      if (step.annotate) out.push(...step.annotate);
      break;
    case 'show':
      out.push(...step.annotate);
      break;
    case 'showMoves': {
      const dests = deriveDestinations(pos, step.square);
      if (step.distinguishPath) {
        try {
          for (const s of derivePathSquares(pos, step.square)) out.push({ kind: 'path', square: s });
        } catch {
          /* kayıcı değilse path yok */
        }
      }
      for (const d of dests) out.push({ kind: 'destination', square: d });
      out.push({ kind: 'square', square: step.square, tone: 'focus' });
      break;
    }
    case 'showGeometry': {
      const ph = step.phases[Math.min(opts.phase ?? 0, step.phases.length - 1)];
      if (ph) {
        if (ph.reveal.of === 'destinations') {
          for (const d of deriveDestinations(pos, step.square)) out.push({ kind: 'destination', square: d });
        } else if (ph.reveal.of === 'direction') {
          for (const d of deriveDirection(pos, step.square, ph.reveal.dx, ph.reveal.dy)) {
            out.push({ kind: 'destination', square: d });
          }
        } else if (ph.reveal.of === 'path') {
          try {
            for (const s of derivePathSquares(pos, step.square)) out.push({ kind: 'path', square: s });
          } catch {
            for (const d of deriveDestinations(pos, step.square)) out.push({ kind: 'destination', square: d });
          }
        }
      }
      out.push({ kind: 'square', square: step.square, tone: 'focus' });
      break;
    }
    case 'compare':
      out.push({ kind: 'square', square: step.left, tone: 'focus' });
      out.push({ kind: 'square', square: step.right, tone: 'focus' });
      break;
    case 'play':
      out.push(arrowFor(pos, step.move.from, step.move.to));
      break;
    case 'awaitMove': {
      for (const f of opts.found ?? []) out.push({ kind: 'square', square: f, tone: 'good' });
      if (hint.hintLevel >= 2 || hint.autoHint) {
        const first = step.accept[0];
        if (first) {
          out.push({ kind: 'square', square: first.from, tone: 'focus' });
          if (hint.hintLevel >= 3 || hint.autoHint) out.push(arrowFor(pos, first.from, first.to));
        }
      }
      break;
    }
    case 'awaitSquare':
      for (const f of opts.found ?? []) out.push({ kind: 'square', square: f, tone: 'good' });
      break;
    case 'awaitSquares': {
      for (const f of opts.found ?? []) out.push({ kind: 'square', square: f, tone: 'good' });
      if (hint.hintLevel >= 2 || hint.autoHint) out.push({ kind: 'square', square: step.from, tone: 'focus' });
      break;
    }
    case 'expectRejection':
      out.push({ kind: 'square', square: step.attempt.from, tone: 'focus' });
      break;
    case 'teleport':
      out.push({
        kind: 'ghost',
        square: step.ghostTo,
        side: pos.sideToMove,
        piece: PieceKind.Pawn,
      });
      break;
    case 'awaitSwap': {
      try {
        for (const p of deriveSwapPartners(pos)) out.push({ kind: 'destination', square: p });
      } catch {
        /* takas yoksa işaret yok */
      }
      break;
    }
    case 'setPosition':
    case 'quiz':
    case 'finish':
      break;
    default:
      break;
  }
  return out;
}
