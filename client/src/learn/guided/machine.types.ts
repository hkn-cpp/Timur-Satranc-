/**
 * Saf durum makinesi tipleri (Bölüm 7).
 * Zamana bağlı her şey action olarak dışarıdan gelir.
 */
import type { SquareIndex } from '../../core/position/Position';
import type { GuidedLesson, MoveRef } from './types';

export type GuidedAction =
  | { type: 'START'; lesson: GuidedLesson }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'PHASE_DONE' }
  | { type: 'PLAY_DONE' }
  | { type: 'INPUT_MOVE'; move: MoveRef }
  | { type: 'INPUT_SQUARE'; square: SquareIndex }
  | { type: 'INPUT_SWAP'; partner: SquareIndex }
  | { type: 'ANSWER'; optionIndex: number }
  | { type: 'HINT' }
  | { type: 'SKIP' }
  | { type: 'TIMEOUT' }
  | { type: 'EXPLAIN_DONE' };

export type StatusKind =
  | 'idle'
  | 'presenting'
  | 'playing'
  | 'awaiting'
  | 'trapping'
  | 'quizzing'
  | 'explaining'
  | 'finished'
  | 'contentError';

export interface GuidedState {
  status: StatusKind;
  lesson: GuidedLesson | null;
  /** O anki adım indeksi (finished/contentError'da son konum). */
  index: number;
  /** showGeometry faz imleci (presenting'te anlamlı). */
  phase: number;
  /** awaitSquares kısmi bulguları. */
  found: SquareIndex[];
  /** Adım başına ipucu seviyesi (BACK sonrası korunur). */
  hintLevels: Record<number, number>;
  /** Adım başına yanlış sayısı. */
  wrongCounts: Record<number, number>;
  /** Otomatik ok görünür mü (wrongCount >= hintAfter, ceza yok). */
  autoHint: boolean;
  /** SKIP kullanıldı mı (XP tavanı %50). */
  skipped: boolean;
  /** Toplam HINT sayısı (XP hesabı). */
  totalHints: number;
  /** Son etkileşim sonucu (görsel geri bildirim için). */
  lastResult: 'correct' | 'wrong' | 'trap-success' | 'timeout-show' | null;
  /** Tamamlanan en yüksek adım (dış katman kaydeder). */
  completedStepIndex: number;
  /** finished'te hesaplanan ödül; diğer hallerde null. */
  xpAward: number | null;
  /** contentError detayı. */
  error: { lessonId: string; stepIndex: number; message: string } | null;
  /** O anki konumun taşınabilir özeti (kare → "yan:kind" sözlüğü + sıra). */
  boardKey: string;
}
