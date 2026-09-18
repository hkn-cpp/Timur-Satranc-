/**
 * Analyzer — kural-farkında ve eğitsel koç açıklamaları üreticisi.
 *
 * Timur Satrancı'na özgü figürler (Deve, Zürafa, Mancınık, Fil, Vezir, Ferz, Piyonlar ve Hisarlar)
 * için taktik ve stratejik açıklamalar üretir.
 */

import { PieceKind, type Position, type Side } from '../core/position/Position';
import type { Move } from '../core/move/Move';
import { makeMove } from '../core/rules/makeMove';
import { isAttacked, opponent, pseudoTargets } from '../core/rules/shared';
import { PIECE_VALUES_CP } from '../engine/evaluate';
import { MoveClassificationType } from './types';

const KIND_TR: Record<PieceKind, string> = {
  [PieceKind.King]: 'Şah',
  [PieceKind.General]: 'Vezir',
  [PieceKind.Ferz]: 'Ferz',
  [PieceKind.Rook]: 'Kale (Savaş Arabası)',
  [PieceKind.Knight]: 'At',
  [PieceKind.Alfil]: 'Fil',
  [PieceKind.Camel]: 'Deve',
  [PieceKind.Dabbaba]: 'Mancınık',
  [PieceKind.Giraffe]: 'Zürafa',
  [PieceKind.Picket]: 'Talea',
  [PieceKind.Pawn]: 'Piyon',
  [PieceKind.Prince]: 'Şehzade',
  [PieceKind.AdventurousKing]: 'Maceracı Şah',
};

export function pieceNameTR(kind: PieceKind): string {
  return KIND_TR[kind] ?? kind;
}

export interface MoveExplanationResult {
  coachComment: string;
  tacticalNote?: string;
  bestMoveReason?: string;
}

/**
 * Hamle sonrası konumda 0+ kısa Türkçe not üretir (legacy & test uyumluluğu).
 */
export function explainMove(before: Position, move: Move): string[] {
  const notes: string[] = [];
  const mover = before.sideToMove;
  const foe = opponent(mover);
  const movedKind = move.piece.kind;
  if (movedKind === PieceKind.King) return notes;

  const after = makeMove(before, move);
  const landing = move.to;

  // 1. Bedavaya bırakma
  if (
    isAttacked(after.board, after.citadels, landing, foe) &&
    !isAttacked(after.board, after.citadels, landing, mover)
  ) {
    notes.push(
      `Dikkat: ${pieceNameTR(movedKind)} korumasız kaldı — rakip bedavaya alabilir.`,
    );
  }

  // 2. Çatal
  const landed = after.board[landing];
  if (landed) {
    const victims = pseudoTargets(landed, landing, after.board, after.citadels)
      .map((t) => after.board[t.to])
      .filter((p) => p !== null && p.side === foe && p.kind !== PieceKind.King)
      .sort((a, b) => (PIECE_VALUES_CP[b!.kind] ?? 0) - (PIECE_VALUES_CP[a!.kind] ?? 0));
    if (victims.length >= 2) {
      const [v1, v2] = victims;
      notes.push(
        `Güzel: ${pieceNameTR(movedKind)} çatal kurdu — ${pieceNameTR(v1!.kind)} ve ${pieceNameTR(v2!.kind)} aynı anda tehdit altında.`,
      );
    }
  }

  return notes;
}


/**
 * Bir hamle için sınıflandırmasına ve tahta durumuna göre zengin koç yorumu üretir.
 */
export function generateCoachExplanation(
  before: Position,
  move: Move,
  classification: MoveClassificationType,
  bestMove: Move | null,
  lossCp: number,
  evalAfterCp: number,
): MoveExplanationResult {
  const mover = before.sideToMove;
  const foe = opponent(mover);
  const movedKind = move.piece.kind;
  const after = makeMove(before, move);
  const landing = move.to;

  const notes: string[] = [];
  let tacticalNote: string | undefined;
  let bestMoveReason: string | undefined;

  // 1. Hisar (Citadel) kontrolü
  if (landing === 110 || landing === 111) {
    tacticalNote = `${pieceNameTR(movedKind)} hisara giriş yaptı! Bu kritik bir stratejik hamle.`;
  }

  // 2. Şah çekme / Mat
  if (move.metadata.isCheck) {
    tacticalNote = `Doğrudan şah çekişiyle rakip şahın hareket alanını kısıtladın.`;
  }

  // 3. Bedavaya bırakma (Hung piece)
  const isHung =
    movedKind !== PieceKind.King &&
    isAttacked(after.board, after.citadels, landing, foe) &&
    !isAttacked(after.board, after.citadels, landing, mover);

  if (isHung) {
    tacticalNote = `Dikkat: ${pieceNameTR(movedKind)} korumasız bir kareye indi, rakip taşı bedavaya alabilir.`;
  }

  // 4. Çatal (Fork) — taş korumasız kaldıysa övgü uyarıyı ezmemeli
  // (aksi halde blunder yorumunun içinde "çatal attı!" methiyesi belirir).
  const landedPiece = after.board[landing];
  if (landedPiece && movedKind !== PieceKind.King && !isHung) {
    const victims = pseudoTargets(landedPiece, landing, after.board, after.citadels)
      .map((t) => after.board[t.to])
      .filter((p) => p !== null && p.side === foe && p.kind !== PieceKind.King)
      .sort((a, b) => (PIECE_VALUES_CP[b!.kind] ?? 0) - (PIECE_VALUES_CP[a!.kind] ?? 0));
    if (victims.length >= 2) {
      const [v1, v2] = victims;
      tacticalNote = `Güzel taktik: ${pieceNameTR(movedKind)} çatal attı! ${pieceNameTR(v1!.kind)} ve ${pieceNameTR(v2!.kind)} aynı anda tehdit altında.`;
    }
  }

  // En iyi hamle gerekçesi
  if (bestMove && (bestMove.from !== move.from || bestMove.to !== move.to)) {
    const bestKind = bestMove.piece.kind;
    bestMoveReason = `En iyi hamle ${pieceNameTR(bestKind)} ile oynayarak (${bestMove.metadata.algebraic}) üstünlüğü korumaktı.`;
  }

  // Sınıflandırmaya göre ana koç yorumu
  let coachComment = '';

  switch (classification) {
    case 'brilliant':
      coachComment = tacticalNote
        ? `Olağanüstü taktiksel buluş! ${tacticalNote}`
        : `Mükemmel bir hamle! Tahtadaki inisiyatifi ve üstünlüğü tamamen ele geçirdin.`;
      break;

    case 'great':
      coachComment = `Harika bir hamle! Pozisyonu en doğru ve güçlü şekilde devam ettirdin.`;
      break;

    case 'best':
      coachComment = `Motorun da önerdiği en iyi hamle! Taşlarının etkinliğini en üst düzeye çıkardın.`;
      break;

    case 'good':
      coachComment = `Sağlam ve güvenli bir hamle. Pozisyonun dengesini korudun.`;
      break;

    case 'book':
      coachComment = `Klasik açılış teorisi ve gelişim hamlesi. Taşlarını merkeze ve oyuna hazırlıyorsun.`;
      break;

    case 'inaccuracy':
      coachComment = isHung
        ? `${pieceNameTR(movedKind)} hamlesi ufak bir pürüz yarattı. ${tacticalNote}`
        : `Küçük bir hata. Bu hamle biraz zaman veya alan kaybettirdi. ${bestMoveReason ?? ''}`;
      break;

    case 'mistake':
      coachComment = isHung
        ? `Hatalı bir taş sürüşü. ${tacticalNote} ${bestMoveReason ?? ''}`
        : `Önemli bir avantajı elden kaçırdın. ${bestMoveReason ?? 'Daha aktif bir devam yolu vardı.'}`;
      break;

    case 'miss':
      coachComment = `Kaçırılan büyük fırsat! Rakibin önceki hatasını cezalandırıp net bir üstünlük kurabilirdin. ${bestMoveReason ?? ''}`;
      break;

    case 'blunder':
      coachComment = isHung
        ? `Büyük hata! ${pieceNameTR(movedKind)} korumasız bırakıldı ve materyal kaybına yol açtı. ${bestMoveReason ?? ''}`
        : `Kritik bir hata. Bu hamle dengeleri rakip lehine çevirdi. ${bestMoveReason ?? ''}`;
      break;
  }

  return {
    coachComment: coachComment.trim(),
    tacticalNote,
    bestMoveReason,
  };
}

/**
 * Tüm maç için genel bir koç değerlendirme özeti üretir.
 */
export function generateCoachIntroSummary(
  whiteAccuracy: number,
  blackAccuracy: number,
  criticalBlunders: number,
  brilliantMoves: number,
): { title: string; summary: string; tone: 'praise' | 'neutral' | 'critical' } {
  if (brilliantMoves > 0 && whiteAccuracy >= 80) {
    return {
      title: 'Harika bir maç çıkardın!',
      summary: 'Bu oyunda çok keskin taktikler ve mükemmel hamleler yakaladın. Birlikte detayları inceleyelim!',
      tone: 'praise',
    };
  }

  if (criticalBlunders >= 3) {
    return {
      title: 'Önemli dönüm noktaları vardı',
      summary: 'Her iki taraf için de maçın kaderini değiştiren kritik hatalar oldu. Bu hamleleri inceleyip ders çıkaralım.',
      tone: 'critical',
    };
  }

  if (whiteAccuracy >= 75 && blackAccuracy >= 75) {
    return {
      title: 'Çok dengeli ve mücadeleci bir oyun!',
      summary: 'İki taraf da taşlarını iyi organize etti ve stratejik bir satranç ortaya koydu. Hamle hamle göz atalım.',
      tone: 'praise',
    };
  }

  return {
    title: 'Oyun Analizi Hazır',
    summary: 'Hamlelerin tek tek değerlendirmesini ve motorun önerdiği alternatifleri aşağıdan adım adım inceleyebilirsin.',
    tone: 'neutral',
  };
}
