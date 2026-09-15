/**
 * FAZ 2 — Rehberli ders doğrulayıcı (`npm run validate:lessons` çekirdeği).
 *
 * SAF FONKSİYONLAR: React/DOM/fs/timer/random YOK. Yasak isim listesi dahil
 * hiçbir harici veri gömülü DEĞİLDİR — `ValidatorContext` ile enjekte edilir
 * (madde 12: liste `client/docs/koc-motoru/02-isim-tablosu.md` dosyasından
 * CLI tarafından okunur; ikinci bir liste yazılmaz).
 *
 * KURAL EŞLEME NOTLARI (spec maddesi → implementasyon):
 *  - m3 (MoveRef birebir eşleşme): play/awaitMove; `from+to` ile eşleşir.
 *  - m3 (awaitSwap): MoveRef taşımaz; kingSwapTargets() çıktısının BOŞ
 *    OLMAMASI aranır. Hedef yokken takas vadeden ders m3 hatası alır.
 *  - m6 (showMoves): showGeometry değil ama aynı ruh — hedef karede
 *    sırası gelen tarafın taşı yoksa "gösterim kümesi boş" m6 hatası.
 *  - m2 (konum yasallığı): startPosition + her setPosition adımı.
 *  - m5 (şema): awaitSquares / showGeometry fazlarında literal kare
 *    anahtarı (`accept/squares/targets/destinations`) runtime'da REDDEDİLİR
 *    (TS tipi zaten izin vermez; JS ile yazılmış içeriğe karşı kemer+askı).
 *  - m8 (yapısal quiz): options<2 veya correctIndex aralık-dışı → m8.
 *  - m11 (bitiş): son adım 'finish' olmak ZORUNDA; erken 'finish' → m11.
 *
 * GEOMETRİ KARARI (yapıştırılan UYARI'ya yanıt — kanıt testlerde):
 *  core/rules SADECE nihai hedef kareleri dışarı verir
 *  (`shared.pseudoTargets`, shared.ts:82-310). Ara-kare yapısı
 *  (Zürafa firstStep/ride, Zürafa path) motorda YOKTUR. Bu yüzden:
 *  - `destinations` / `direction`: motordan TÜRETİLİR (tam doğrulanır).
 *  - `path`: YALNIZCA düz-ışınlı kayıcılarda (Kale, Nöbetçi) — motordan
 *    gelen from→to çiftleri arası saf ışın-enterpolasyonudur. Kural
 *    mantığı TEKRAR ÇALIŞTIRILMAZ (yasallığa karar verilmez), yalnızca
 *    motorun verdiği hamleler görselleştirilir. Zürafa hedefleri ışın
 *    üzerinde değildir → Zürafa'da `path` DOĞRULANAMAZ.
 *  - `firstStep` / `ride`: DOĞRULANAMAZ — fail-closed m6 hatası
 *    (UNVERIFIABLE). Ara kareleri elle hesaplamak YASAK olduğu için bu
 *    fazları kullanan ders geçemez; öneri: destinations + direction.
 */

import {
  BOARD_COLS,
  BOARD_ROWS,
  PieceKind,
  coordToSquare,
  isBoardSquare,
  isCitadelSquare,
  squareToCoord,
  type Piece,
  type Position,
  type Side,
  type SquareIndex,
} from '../core/position/Position';
import { computeZobristForArrays } from '../core/position/zobrist';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import { makeMove } from '../core/rules/makeMove';
import { isCheck } from '../core/rules/gameResult';
import { kingSwapTargets } from '../core/rules/shared';
import { legacyGameStateToPosition } from '../worker/legacyAdapter';
import { LEARN_LEVELS } from './learnContent';
import type {
  GeometryPhase,
  GuidedLesson,
  GuidedStep,
  MoveRef,
  PositionRef,
} from './guidedSteps';

/* ==================== public API ==================== */

export interface ValidationIssue {
  lessonId: string;
  /** Ders-seviyesi sorunlarda -1. */
  stepIndex: number;
  /** Spec madde numarası 1-12. */
  rule: number;
  message: string;
}

export interface ValidatorContext {
  /** 02-isim-tablosu.md'den okunan yasak adlar (küçük/büyük harf fark etmez,
   *  çekimli haller de yakalanır). Validator KENDİ listesini tutmaz. */
  forbiddenNames: string[];
}

export const LEVEL_XP_TOTAL: Record<number, number> = {
  1: 100,
  2: 250,
  3: 500,
  4: 800,
  5: 1200,
  6: 1800,
};

export const GRAND_XP_TOTAL = 4650;

/** Madde 9: motor mekaniği desteklemediği için narrative kalan dersler. */
export const NARRATIVE_LESSON_IDS: readonly string[] = [
  '4.4',
  '5.1',
  '5.2',
  '5.3',
  '5.4',
  '6.3',
  '6.5',
];

const INTERACTIVE_KINDS: readonly string[] = [
  'awaitMove',
  'awaitSquare',
  'awaitSquares',
  'expectRejection',
  'quiz',
  'awaitSwap',
];

const NARRATIVE_FORBIDDEN_KINDS: readonly string[] = [
  'awaitMove',
  'awaitSquare',
  'awaitSquares',
  'expectRejection',
  'awaitSwap',
];

const MAX_COACH_CHARS = 110;
const MIN_STEPS = 6;
const MAX_STEPS = 14;

/** Seviye-içi sıra (0-tabanlı) + ders sayısı → beklenen finish XP'si.
 *  Dağılım: taban = floor(toplam/n), kalan son derse. 250/3 → 83/83/84. */
export function expectedLessonXp(level: number, indexInLevel: number, lessonsInLevel: number): number {
  const total = LEVEL_XP_TOTAL[level] ?? 0;
  if (lessonsInLevel <= 0) return 0;
  const base = Math.floor(total / lessonsInLevel);
  if (indexInLevel < lessonsInLevel - 1) return base;
  return total - base * (lessonsInLevel - 1);
}

/** "1.1" → { level: 1, minor: 1 }. Parse edilemezse null. */
export function parseLessonId(id: string): { level: number; minor: number } | null {
  const m = /^(\d+)\.(\d+)$/.exec(id.trim());
  if (!m) return null;
  return { level: Number(m[1]), minor: Number(m[2]) };
}

export function formatReport(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'OK: sorun yok.';
  return issues
    .map((i) => `[madde ${i.rule}] ders ${i.lessonId} adım ${i.stepIndex}: ${i.message}`)
    .join('\n');
}

/* ==================== konum kurma ==================== */

let pieceSeq = 0;

function buildPiecesPosition(ref: Extract<PositionRef, { kind: 'pieces' }>): { pos: Position | null; error: string | null } {
  const board: (Piece | null)[] = new Array(112).fill(null);
  const citadels: Position['citadels'] = {
    topLeft: { occupant: null, sealed: false },
    bottomRight: { occupant: null, sealed: false },
  };
  for (const p of ref.pieces) {
    if (!Number.isInteger(p.square) || p.square < 0 || p.square > 111) {
      return { pos: null, error: `geçersiz kare ${String(p.square)}` };
    }
    if (p.kind === PieceKind.Pawn && p.pawnOf === undefined) {
      return { pos: null, error: `${p.square} karesindeki Piyadenin pawnOf alanı yok` };
    }
    if (p.kind !== PieceKind.Pawn && p.promotionStage !== undefined) {
      return { pos: null, error: `${p.square} karesinde promotionStage yalnızca Piyadede olur` };
    }
    /* KRİTİK: pawnStage TANIMSIZ = sıradan piyade. Varsayılan 0 YAZILMAZ —
       motor stage tanımlı her piyadeyi Piyadelerin Piyadesi sayar
       (shared.ts:342) ve temsilî terfi çalışmaz. */
    if (p.kind === PieceKind.Pawn && p.promotionStage !== undefined) {
      const stage = p.promotionStage;
      if (stage !== 0 && stage !== 1 && stage !== 2) {
        return { pos: null, error: `${p.square} karesinde promotionStage 0/1/2 olmalı` };
      }
    }
    if (board[p.square] !== null) {
      return { pos: null, error: `${p.square} karesinde iki taş üst üste` };
    }
    const piece: Piece = {
      id: `lesson-${p.side}-${p.kind}-${p.square}-${pieceSeq++}`,
      kind: p.kind,
      side: p.side,
      pawnOf: p.kind === PieceKind.Pawn ? p.pawnOf : undefined,
      hasMoved: false,
      pawnStage: p.kind === PieceKind.Pawn && p.promotionStage !== undefined
        ? (p.promotionStage as 0 | 1 | 2)
        : undefined,
    };
    board[p.square] = piece;
    if (p.square === 110) citadels.topLeft.occupant = piece;
    if (p.square === 111) citadels.bottomRight.occupant = piece;
  }
  const pos = {
    board,
    sideToMove: ref.sideToMove,
    citadels,
    flags: {
      halfMoveClock: 0,
      fullMoveNumber: 1,
      repetitionCount: {},
      hasUsedKingSwap: { ...(ref.kingSwapUsed ?? { white: false, black: false }) },
    },
    zobristHash: 0n,
  } as Position;
  pos.zobristHash = computeZobristForArrays(board as never, pos.sideToMove);
  return { pos, error: null };
}

interface SerializedLegacyShape {
  board?: unknown[][];
  citadels?: { whiteCitadelPiece?: unknown | null; blackCitadelPiece?: unknown | null };
  currentTurn?: Side;
  startingTurn?: Side;
  hasUsedKingSwap?: { white: boolean; black: boolean };
  turnNumber?: number;
  halfMoveClock?: number;
}

function buildSerializedPosition(data: string): { pos: Position | null; error: string | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return { pos: null, error: 'serialized data JSON parse edilemedi' };
  }
  const s = raw as SerializedLegacyShape;
  if (!Array.isArray(s.board) || s.board.length !== BOARD_ROWS || typeof s.citadels !== 'object' || s.citadels === null) {
    return { pos: null, error: 'serialized data Dizilim Editörü şekline uymuyor (10x11 board + citadels)' };
  }
  const turn = s.currentTurn ?? s.startingTurn;
  if (turn !== 'white' && turn !== 'black') {
    return { pos: null, error: 'serialized data sırası (currentTurn/startingTurn) yok' };
  }
  try {
    const pos = legacyGameStateToPosition({
      board: s.board,
      citadels: {
        whiteCitadelPiece: (s.citadels.whiteCitadelPiece ?? null) as never,
        blackCitadelPiece: (s.citadels.blackCitadelPiece ?? null) as never,
      },
      currentTurn: turn,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: s.hasUsedKingSwap ?? { white: false, black: false },
      turnNumber: s.turnNumber ?? 1,
      halfMoveClock: s.halfMoveClock ?? 0,
    } as never);
    return { pos, error: null };
  } catch (e) {
    return { pos: null, error: `legacy adaptör çevirisi başarısız: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function resolvePosition(ref: PositionRef): { pos: Position | null; error: string | null } {
  pieceSeq = 0;
  if (ref.kind === 'pieces') return buildPiecesPosition(ref);
  return buildSerializedPosition(ref.data);
}

/** Madde 2: konum yasallığı. */
function checkPositionLegality(pos: Position): string[] {
  const problems: string[] = [];
  let whiteKing = 0;
  let blackKing = 0;
  for (let sq = 0; sq < 112; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    if (p.kind === PieceKind.King && p.side === 'white') whiteKing++;
    if (p.kind === PieceKind.King && p.side === 'black') blackKing++;
    if (p.kind === PieceKind.Pawn && p.pawnOf === undefined) {
      problems.push(`${sq} karesindeki Piyadenin pawnOf alanı yok`);
    }
  }
  if (whiteKing < 1 || blackKing < 1) {
    problems.push(`her iki Şah sahnede olmalı (beyaz:${whiteKing}, siyah:${blackKing})`);
  }
  const other = pos.sideToMove === 'white' ? 'black' : 'white';
  if (isCheck(pos, other)) {
    problems.push(`sırası olmayan tarafın (${other}) Şahı şah altında`);
  }
  const tl = pos.citadels.topLeft.occupant;
  if (tl !== null && !(tl.kind === PieceKind.King && tl.side === 'white')) {
    problems.push('110 (sol hisar) yalnızca beyaz Şah barındırabilir');
  }
  const br = pos.citadels.bottomRight.occupant;
  if (br !== null && !(br.kind === PieceKind.King && br.side === 'black')) {
    problems.push('111 (sağ hisar) yalnızca siyah Şah barındırabilir');
  }
  return problems;
}

/* ==================== hamle eşleşmesi ==================== */

function matchMoveRef(pos: Position, ref: MoveRef): ReturnType<typeof generateLegalMoves> {
  return generateLegalMoves(pos).filter((m) => m.from === ref.from && m.to === ref.to);
}

/* ==================== geometri ==================== */

function legalDestinationsOf(pos: Position, square: SquareIndex): SquareIndex[] {
  return generateLegalMoves(pos)
    .filter((m) => m.from === square)
    .map((m) => m.to);
}

/** from→to arası katı-ara kareler; ışın üzerinde değilse (at/deve/zürafa
 *  hedefi) null. Kural BİLMEZ — yalnızca motorun verdiği çifti birleştirir. */
function rayTransit(from: SquareIndex, to: SquareIndex): SquareIndex[] | null {
  const f = squareToCoord(from);
  const t = squareToCoord(to);
  if (!f || !t) return null;
  const dc = Math.sign(t.col - f.col);
  const dr = Math.sign(t.row - f.row);
  if (dc === 0 && dr === 0) return null;
  const distC = Math.abs(t.col - f.col);
  const distR = Math.abs(t.row - f.row);
  const straight = dc === 0 || dr === 0;
  const diagonal = distC === distR;
  if (!straight && !diagonal) return null;
  const out: SquareIndex[] = [];
  let c = f.col + dc;
  let r = f.row + dr;
  while (c !== t.col || r !== t.row) {
    const sq = coordToSquare(c, r);
    if (sq === null) return null;
    out.push(sq);
    c += dc;
    r += dr;
  }
  return out;
}

function signOf(n: number): -1 | 0 | 1 {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/* ==================== koç metinleri ==================== */

interface CoachString {
  field: string;
  value: string;
}

function coachStringsOf(step: GuidedStep): CoachString[] {
  const out: CoachString[] = [];
  const text = (v: string | undefined, field: string): void => {
    if (v !== undefined) out.push({ field, value: v });
  };
  switch (step.kind) {
    case 'say':
      text(step.text, 'text');
      break;
    case 'show':
      text(step.text, 'text');
      break;
    case 'showMoves':
      text(step.text, 'text');
      break;
    case 'showGeometry':
      text(step.text, 'text');
      for (let i = 0; i < step.phases.length; i++) {
        out.push({ field: `phases[${i}].label`, value: step.phases[i].label });
      }
      break;
    case 'compare':
      text(step.text, 'text');
      break;
    case 'play':
      text(step.text, 'text');
      break;
    case 'awaitMove':
      text(step.text, 'text');
      text(step.onWrong, 'onWrong');
      break;
    case 'awaitSquare':
      text(step.text, 'text');
      text(step.onWrong, 'onWrong');
      break;
    case 'awaitSquares':
      text(step.text, 'text');
      text(step.onWrong, 'onWrong');
      break;
    case 'expectRejection':
      text(step.text, 'text');
      text(step.explanation, 'explanation');
      break;
    case 'quiz':
      out.push({ field: 'question', value: step.question });
      for (let i = 0; i < step.options.length; i++) {
        out.push({ field: `options[${i}]`, value: step.options[i] });
      }
      out.push({ field: 'explanation', value: step.explanation });
      break;
    case 'teleport':
      text(step.text, 'text');
      break;
    case 'awaitSwap':
      text(step.text, 'text');
      text(step.onWrong, 'onWrong');
      break;
    case 'setPosition':
      text(step.text, 'text');
      break;
    case 'finish':
      text(step.text, 'text');
      break;
  }
  return out;
}

function charLen(s: string): number {
  return [...s].length;
}

function lintTokens(s: string): string[] {
  return s.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
}

/* ==================== ders doğrulama ==================== */

function canonicalLesson(id: string): { level: number; indexInLevel: number; lessonsInLevel: number; title: string } | null {
  for (const lv of LEARN_LEVELS) {
    const idx = lv.lessons.findIndex((l) => l.id === id);
    if (idx >= 0) {
      return { level: lv.id, indexInLevel: idx, lessonsInLevel: lv.lessons.length, title: lv.lessons[idx].title };
    }
  }
  return null;
}

/** Tek ders (set-bağımsız tüm maddeler: 1-parça, 2-12). */
export function validateLesson(lesson: GuidedLesson, ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = (stepIndex: number, rule: number, message: string): void => {
    issues.push({ lessonId: lesson.id, stepIndex, rule, message });
  };
  const forbidden = ctx.forbiddenNames.map((n) => n.toLocaleLowerCase('tr-TR'));

  /* ---- madde 1 (ders parçası): id biçimi + kanonik eşleşme ---- */
  const parsed = parseLessonId(lesson.id);
  if (!parsed || parsed.level < 1 || parsed.level > 6) {
    at(-1, 1, `ders id "${lesson.id}" "S.N" biçiminde ve seviye 1-6 aralığında olmalı`);
  }
  const canon = canonicalLesson(lesson.id);
  if (!canon) {
    at(-1, 1, `ders id "${lesson.id}" learnContent.ts'teki 25 derste yok`);
  } else if (lesson.title !== canon.title) {
    at(-1, 1, `başlık uyuşmuyor: ders "${lesson.title}", müfredat "${canon.title}"`);
  }

  /* ---- madde 9 (mod): narrative listesi iki yönlü zorunlu ---- */
  const mustNarrative = (NARRATIVE_LESSON_IDS as readonly string[]).includes(lesson.id);
  if (mustNarrative && lesson.mode !== 'narrative') {
    at(-1, 9, `ders ${lesson.id} narrative listesinde, mode narrative olmalı`);
  }
  if (!mustNarrative && canon && lesson.mode !== 'interactive') {
    at(-1, 9, `ders ${lesson.id} narrative listesinde değil, mode interactive olmalı`);
  }

  /* ---- madde 7: adım sayısı ---- */
  if (lesson.steps.length < MIN_STEPS || lesson.steps.length > MAX_STEPS) {
    at(-1, 7, `adım sayısı ${lesson.steps.length}, 6-14 aralığında olmalı`);
  }

  /* ---- madde 8: etkileşim eşiği ---- */
  const kinds = lesson.steps.map((s) => s.kind);
  const interactiveCount = kinds.filter((k) => (INTERACTIVE_KINDS as readonly string[]).includes(k)).length;
  if (lesson.mode === 'interactive' && interactiveCount < 3) {
    at(-1, 8, `interactive derste ${interactiveCount} interaktif adım var, en az 3 olmalı`);
  }
  if (lesson.mode === 'narrative') {
    const quizCount = kinds.filter((k) => k === 'quiz').length;
    const showOrPlay = kinds.filter((k) => k === 'show' || k === 'showMoves' || k === 'showGeometry' || k === 'play').length;
    if (quizCount < 2) at(-1, 8, `narrative derste ${quizCount} quiz var, en az 2 olmalı`);
    if (showOrPlay < 1) at(-1, 8, 'narrative derste en az 1 show veya play olmalı');
  }

  /* ---- madde 9: narrative yasak adım tipleri ---- */
  if (lesson.mode === 'narrative') {
    lesson.steps.forEach((s, i) => {
      if ((NARRATIVE_FORBIDDEN_KINDS as readonly string[]).includes(s.kind)) {
        at(i, 9, `'${s.kind}' narrative derste yasak (motor desteklemiyor)`);
      }
      if (s.kind === 'teleport' && (s as { mode: string }).mode !== 'demo') {
        at(i, 9, "teleport yalnızca mode:'demo' olabilir");
      }
    });
  }
  lesson.steps.forEach((s, i) => {
    if (s.kind === 'teleport' && lesson.mode !== 'narrative') {
      at(i, 9, 'teleport yalnızca narrative derste olabilir');
    }
  });

  /* ---- konum + adım yürüyüşü ---- */
  const start = resolvePosition(lesson.startPosition);
  if (!start.pos) {
    at(-1, 2, `startPosition kurulamadı: ${start.error}`);
    return issues;
  }
  let cur: Position = start.pos;
  for (const p of checkPositionLegality(cur)) at(-1, 2, `startPosition: ${p}`);

  lesson.steps.forEach((step, i) => {
    /* m5 şema: bilinmeyen adım türü */
    const knownKinds: readonly string[] = [
      'say', 'show', 'showMoves', 'showGeometry', 'compare', 'play',
      'awaitMove', 'awaitSquare', 'awaitSquares', 'expectRejection',
      'quiz', 'teleport', 'awaitSwap', 'setPosition', 'finish',
    ];
    if (!knownKinds.includes((step as { kind: string }).kind)) {
      at(i, 5, `bilinmeyen adım türü "${(step as { kind: string }).kind}"`);
      return;
    }

    /* m10 uzunluk + m12 isim linti (tüm koç metinleri) */
    for (const cs of coachStringsOf(step)) {
      if (charLen(cs.value) > MAX_COACH_CHARS) {
        at(i, 10, `${cs.field} ${charLen(cs.value)} karakter, en fazla 110 olmalı`);
      }
      for (const tok of lintTokens(cs.value)) {
        const hit = forbidden.find((f) => f.length > 0 && tok.startsWith(f));
        if (hit !== undefined) {
          at(i, 12, `${cs.field} alanında yasak ad "${hit}" ("${tok}" içinde)`);
          break;
        }
      }
    }

    switch (step.kind) {
      case 'play': {
        const matches = matchMoveRef(cur, step.move);
        if (matches.length === 0) {
          at(i, 3, `play hamlesi ${step.move.from}→${step.move.to} bu konumda legal değil`);
        } else if (matches.length > 1) {
          at(i, 3, `play hamlesi ${step.move.from}→${step.move.to} belirsiz (${matches.length} eşleşme)`);
        } else {
          if (step.move.expectPromotion !== undefined && matches[0].promotion !== step.move.expectPromotion) {
            at(i, 3, `play terfi beklentisi tutmadı (beklenen ${step.move.expectPromotion})`);
          }
          cur = makeMove(cur, matches[0]);
        }
        break;
      }
      case 'awaitMove': {
        if (step.accept.length === 0) at(i, 3, 'awaitMove accept listesi boş');
        for (const ref of step.accept) {
          const matches = matchMoveRef(cur, ref);
          if (matches.length === 0) {
            at(i, 3, `awaitMove kabulü ${ref.from}→${ref.to} bu konumda legal değil`);
          } else if (matches.length > 1) {
            at(i, 3, `awaitMove kabulü ${ref.from}→${ref.to} belirsiz (${matches.length} eşleşme)`);
          } else if (ref.expectPromotion !== undefined && matches[0].promotion !== ref.expectPromotion) {
            at(i, 3, `awaitMove terfi beklentisi tutmadı (beklenen ${ref.expectPromotion})`);
          }
        }
        break;
      }
      case 'expectRejection': {
        const matches = matchMoveRef(cur, step.attempt);
        if (matches.length > 0) {
          at(i, 4, `expectRejection denemesi ${step.attempt.from}→${step.attempt.to} LEGAL — ders var olmayan bir yasak öğretir`);
        }
        break;
      }
      case 'awaitSquare': {
        /* m5: accept, türetilebilir kümenin alt kümesi olmalı:
           sıradaki tarafın yasal varışları ∪ kendi taşlarının kareleri ∪ hisarlar */
        const legal = new Set<number>(generateLegalMoves(cur).map((m) => m.to));
        for (let sq = 0; sq < BOARD_COLS * BOARD_ROWS; sq++) {
          const p = cur.board[sq];
          if (p && p.side === cur.sideToMove) legal.add(sq);
        }
        legal.add(110);
        legal.add(111);
        const bad = step.accept.filter((sq) => !legal.has(sq));
        if (step.accept.length === 0) at(i, 5, 'awaitSquare accept listesi boş');
        if (bad.length > 0) {
          at(i, 5, `awaitSquare accept listesi motordan türetilemiyor: [${bad.join(', ')}]`);
        }
        break;
      }
      case 'awaitSquares': {
        /* m5 şema: literal kare anahtarı REDDEDİLİR */
        const raw = step as unknown as Record<string, unknown>;
        for (const key of ['accept', 'squares', 'targets', 'destinations']) {
          if (key in raw) {
            at(i, 5, `awaitSquares '${key}' alanı taşıyamaz (from + count saklanır, liste motordan türetilir)`);
          }
        }
        const piece = isBoardSquare(step.from) ? cur.board[step.from] : null;
        if (!piece || piece.side !== cur.sideToMove) {
          at(i, 5, `awaitSquares from=${step.from} karesinde sıradaki tarafın taşı yok`);
        } else {
          const dests = legalDestinationsOf(cur, step.from);
          if (step.count !== dests.length) {
            at(i, 5, `awaitSquares count=${step.count}, motorda ${dests.length} hedef var`);
          }
          if (dests.length === 0) {
            at(i, 5, `awaitSquares from=${step.from} karesindeki taşın yasal hedefi yok`);
          }
        }
        break;
      }
      case 'showMoves': {
        const piece = isBoardSquare(step.square) ? cur.board[step.square] : null;
        if (!piece || piece.side !== cur.sideToMove) {
          at(i, 6, `showMoves karesi ${step.square} boş veya rakip taş — gösterim kümesi boş`);
        }
        break;
      }
      case 'showGeometry': {
        checkGeometry(cur, step.square, step.phases, (rule, message) => at(i, rule, message));
        break;
      }
      case 'awaitSwap': {
        const used = cur.flags.hasUsedKingSwap ?? { white: false, black: false };
        const targets = kingSwapTargets(cur.sideToMove, cur.board, cur.citadels, used);
        if (targets.length === 0) {
          at(i, 3, 'awaitSwap: bu konumda kingSwapTargets() boş — takas vadedilemez');
        }
        break;
      }
      case 'setPosition': {
        const built = resolvePosition(step.position);
        if (!built.pos) {
          at(i, 2, `setPosition kurulamadı: ${built.error}`);
        } else {
          for (const p of checkPositionLegality(built.pos)) at(i, 2, `setPosition: ${p}`);
          if (built.pos) cur = built.pos;
        }
        break;
      }
      case 'quiz': {
        if (step.options.length < 2) at(i, 8, 'quiz en az 2 seçenek ister');
        if (step.correctIndex < 0 || step.correctIndex >= step.options.length) {
          at(i, 8, `quiz correctIndex=${step.correctIndex} seçenek dışı`);
        }
        break;
      }
      case 'finish': {
        if (i !== lesson.steps.length - 1) at(i, 11, "'finish' yalnızca son adım olabilir");
        if (canon) {
          const xp = expectedLessonXp(canon.level, canon.indexInLevel, canon.lessonsInLevel);
          if (step.xp !== xp) {
            at(i, 11, `finish xp=${step.xp}, beklenen ${xp} (seviye ${canon.level} dağılımı)`);
          }
          const isLast = canon.indexInLevel === canon.lessonsInLevel - 1;
          if (!isLast && step.badge !== undefined) {
            at(i, 11, 'badge yalnızca seviyenin SON dersinde verilir');
          }
          if (isLast && (step.badge === undefined || step.badge.length === 0)) {
            at(i, 11, 'seviyenin son dersi rozet taşımalı (badge alanı boş)');
          }
        }
        break;
      }
      default:
        break;
    }
  });

  /* m11: son adım finish olmalı */
  const last = lesson.steps[lesson.steps.length - 1];
  if (last && last.kind !== 'finish') {
    at(lesson.steps.length - 1, 11, "ders 'finish' adımıyla bitmeli");
  }
  return issues;
}

function checkGeometry(
  pos: Position,
  square: SquareIndex,
  phases: GeometryPhase[],
  at: (rule: number, message: string) => void,
): void {
  /* m5 şema: fazda literal kare dizisi yok */
  for (let i = 0; i < phases.length; i++) {
    const raw = phases[i] as unknown as Record<string, unknown>;
    for (const key of ['squares', 'accept', 'targets', 'destinations']) {
      if (key in raw) {
        at(5, `showGeometry faz[${i}] '${key}' alanı taşıyamaz (küme motordan türetilir)`);
      }
    }
  }
  const piece = isBoardSquare(square) ? pos.board[square] : null;
  if (!piece || piece.side !== pos.sideToMove) {
    at(6, `showGeometry karesi ${square} boş veya rakip taş — gösterim kümesi boş`);
    return;
  }
  const dests = legalDestinationsOf(pos, square);
  if (dests.length === 0) {
    at(6, `showGeometry karesi ${square} hedefsiz — fazlar boş küme üretir`);
    return;
  }
  const covered = new Set<number>();
  for (let i = 0; i < phases.length; i++) {
    const reveal = phases[i].reveal;
    if (reveal.of === 'destinations') {
      if (dests.length === 0) at(6, `showGeometry faz[${i}] destinations boş`);
      for (const d of dests) covered.add(d);
    } else if (reveal.of === 'direction') {
      const from = squareToCoord(square);
      const subset = dests.filter((d) => {
        const t = squareToCoord(d);
        return !!from && !!t && signOf(t.col - from.col) === reveal.dx && signOf(t.row - from.row) === reveal.dy;
      });
      if (subset.length === 0) {
        at(6, `showGeometry faz[${i}] direction(${reveal.dx},${reveal.dy}) boş küme`);
      }
      for (const d of subset) covered.add(d);
    } else if (reveal.of === 'path') {
      /* YALNIZCA düz-ışınlı kayıcılar (Kale, Nöbetçi). */
      if (piece.kind !== PieceKind.Rook && piece.kind !== PieceKind.Picket) {
        at(6, `showGeometry faz[${i}] path yalnızca kayıcılarda (Kale, Nöbetçi)`);
        continue;
      }
      const transit = new Set<number>();
      for (const d of dests) {
        const mid = rayTransit(square, d);
        if (mid) for (const s of mid) transit.add(s);
      }
      if (transit.size === 0) {
        at(6, `showGeometry faz[${i}] path boş küme`);
      }
    } else if (reveal.of === 'firstStep' || reveal.of === 'ride') {
      /* UYARI hükmü: motor ara-kare API'si YOK → fail-closed. */
      if (piece.kind !== PieceKind.Giraffe) {
        at(6, `showGeometry faz[${i}] ${reveal.of} yalnızca Zürafa'da`);
      }
      at(6, `showGeometry faz[${i}] ${reveal.of} DOĞRULANAMAZ: core/rules ara-kareleri dışa vermiyor (yalnızca nihai hedefler); elle hesaplama yasak — destinations + direction kullan`);
    }
  }
  /* faz birleşimi yasal hedef kümesini kapsamalı (hedef fazları) */
  const hasTargetPhase = phases.some((p) => p.reveal.of === 'destinations' || p.reveal.of === 'direction');
  if (hasTargetPhase) {
    const missing = dests.filter((d) => !covered.has(d));
    if (missing.length > 0) {
      at(6, `showGeometry faz birleşimi ${missing.length} hedefi kapsamıyor: [${missing.join(', ')}]`);
    }
  } else {
    at(6, 'showGeometry hedef fazı yok (destinations/direction) — kapsama kanıtlanamaz');
  }
}

/* ==================== set doğrulama ==================== */

export function findMissingLessons(ids: readonly string[]): string[] {
  const have = new Set(ids);
  const missing: string[] = [];
  for (const lv of LEARN_LEVELS) {
    for (const l of lv.lessons) {
      if (!have.has(l.id)) missing.push(l.id);
    }
  }
  return missing;
}

export function findExtraLessons(ids: readonly string[]): string[] {
  const known = new Set<string>();
  for (const lv of LEARN_LEVELS) {
    for (const l of lv.lessons) known.add(l.id);
  }
  return ids.filter((id) => !known.has(id));
}

export function checkXpTotals(xpByLevel: Record<number, number>): string[] {
  const problems: string[] = [];
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const got = xpByLevel[level] ?? 0;
    const want = LEVEL_XP_TOTAL[level] ?? 0;
    if (got !== want) problems.push(`seviye ${level} toplamı ${got} XP, beklenen ${want} XP`);
  }
  const grand = [1, 2, 3, 4, 5, 6].reduce((n, lv) => n + (xpByLevel[lv] ?? 0), 0);
  if (grand !== GRAND_XP_TOTAL) problems.push(`genel toplam ${grand} XP, beklenen ${GRAND_XP_TOTAL} XP`);
  return problems;
}

/** Tam set: ders-tekil + set-seviyesi (madde 1 kapsama, madde 11 toplamlar). */
export function validateLessonSet(lessons: GuidedLesson[], ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const l of lessons) {
    if (seen.has(l.id)) {
      issues.push({ lessonId: l.id, stepIndex: -1, rule: 1, message: `ders id "${l.id}" yinelenmiş` });
    }
    seen.add(l.id);
  }
  const ids = lessons.map((l) => l.id);
  for (const m of findMissingLessons(ids)) {
    issues.push({ lessonId: m, stepIndex: -1, rule: 1, message: `ders "${m}" eksik (25 ders birebir)` });
  }
  for (const x of findExtraLessons(ids)) {
    issues.push({ lessonId: x, stepIndex: -1, rule: 1, message: `ders "${x}" müfredatta yok (fazla ders)` });
  }
  for (const l of lessons) {
    for (const i of validateLesson(l, ctx)) issues.push(i);
  }
  /* madde 11 toplamlar (yalnızca finish.xp üzerinden) */
  const xpByLevel: Record<number, number> = {};
  for (const l of lessons) {
    const parsed = parseLessonId(l.id);
    const fin = l.steps.length > 0 ? l.steps[l.steps.length - 1] : undefined;
    if (parsed && fin && fin.kind === 'finish') {
      xpByLevel[parsed.level] = (xpByLevel[parsed.level] ?? 0) + fin.xp;
    }
  }
  if (lessons.length > 0) {
    for (const p of checkXpTotals(xpByLevel)) {
      issues.push({ lessonId: '*', stepIndex: -1, rule: 11, message: p });
    }
  }
  return issues;
}

export type { MoveRef };
export type { GeometryPhase };
