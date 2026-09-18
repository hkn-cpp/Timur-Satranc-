/**
 * Worker testleri (node-sade): protokol round-trip, legacy adaptör eşlemesi,
 * worker handler (best_move + önceden-cancel), engineClient yönlendirme/
 * cancel/bloklamama. Gerçek `Worker` YOK — sahte enjeksiyon + handler import.
 */

import type { GameState as LegacyGameState } from '../../types/chess';
import { PieceKind } from '../../core/position/Position';
import { MoveSpecialFlag, type Move as EngineMove } from '../../core/move/Move';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { deserializePosition, serializePosition } from '../protocol';
import { engineMoveToLegacy, legacyGameStateToPosition, positionToLegacyBoardAndCitadels } from '../legacyAdapter';
import { EngineClient, type WorkerLike } from '../engineClient';
import { handleAnalyze, handleFindBestMove } from '../engineWorker';

/** Sahte worker: ana thread→worker mesajlarını yakalar, test sürücüsü yanıt verir. */
class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: unknown[] = [];
  terminated = false;
  postMessage(message: unknown): void {
    this.sent.push(message);
  }
  emit(data: unknown): void {
    this.onmessage?.({ data });
  }
  terminate(): void {
    this.terminated = true;
  }
}

function legacyFixture(): LegacyGameState {
  const board = Array.from({ length: 10 }, () => Array(11).fill(null));
  board[0][0] = { id: 'w-k', type: 'king', color: 'white', position: { x: 0, y: 0 } };
  board[9][10] = { id: 'b-k', type: 'king', color: 'black', position: { x: 10, y: 9 } };
  board[1][1] = { id: 'w-q', type: 'queen', color: 'white', position: { x: 1, y: 1 } };
  return {
    board,
    citadels: {
      whiteCitadelPiece: null,
      blackCitadelPiece: { id: 'b-r-h', type: 'rook', color: 'black', position: { x: -1, y: 8, isCitadel: true, citadelSide: 'left' } },
    },
    currentTurn: 'white',
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isGameOver: false,
    status: 'IN_PROGRESS',
    winner: null,
    hasUsedKingSwap: { white: false, black: false },
    turnNumber: 5,
    halfMoveClock: 3,
  };
}

function mateRig() {
  return createTestPosition('white', [
    { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
}

export async function runWorkerTests(): Promise<TestSummary> {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  }

  // ---- W01. protokol round-trip (bigint korunur)
  const pos = mateRig();
  const rt = deserializePosition(serializePosition(pos));
  ok(rt.zobristHash === pos.zobristHash && typeof rt.zobristHash === 'bigint', 'W01: hash round-trip bigint korunur');
  ok(rt.board.length === 112 && rt.sideToMove === 'white', 'W02: tahta/sıra round-trip');

  // ---- W02. legacy adaptör: kritik queen→General swap + hisar slotu
  const legacy = legacyFixture();
  const conv = legacyGameStateToPosition(legacy);
  ok(conv.board[tq(1, 1)]?.kind === PieceKind.General, 'W03: legacy queen → General (kritik swap)');
  ok(conv.board[110]?.kind === PieceKind.Rook && conv.board[110]?.side === 'black', 'W04: blackCitadelPiece → 110');
  ok(conv.citadels.topLeft.occupant?.id === 'b-r-h', 'W05: hisar occupant senkron');
  ok(conv.board[tq(1, 1)]?.id === 'w-q', 'W06: taş id korunur');
  ok(conv.flags.fullMoveNumber === 5 && conv.sideToMove === 'white', 'W07: sıra/tur taşınır');

  // ---- W02b. v3 serileştirme: sürüm + yeni alanlar, iki yönlü round-trip
  const v3pos = createTestPosition(
    'white',
    [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 9), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Pawn, pawnStage: 1, waiting: true },
      { sq: tq(3, 3), kind: PieceKind.AdventurousKing, side: 'white' },
    ],
    { sealed111: true },
  );
  const s1 = serializePosition(v3pos);
  ok(s1.version === 3, 'W07b: serileştirme sürümü 3 yazılır');
  const d1 = deserializePosition(s1);
  const s2 = serializePosition(d1);
  // Anlamsal karşılaştırma: JSON anahtar varlığı değil, alan değerleri
  // (deserialize eksik `waiting` anahtarını `false` ile doldurur — bu
  // doldurma K14 gereğidir, dengesizlik değildir).
  const norm = (p: { kind: unknown; side: unknown; pawnOf?: unknown; pawnStage?: unknown; waiting?: unknown }): string =>
    JSON.stringify([p.kind, p.side, p.pawnOf ?? null, p.pawnStage ?? null, p.waiting ?? false]);
  const b1 = (s1.board as unknown[]).map((p) => (p === null ? null : norm(p as never)));
  const b2 = (s2.board as unknown[]).map((p) => (p === null ? null : norm(p as never)));
  ok(
    JSON.stringify(b1) === JSON.stringify(b2) &&
      s1.zobristHash === s2.zobristHash &&
      (s2.citadels.topLeft.sealed ?? false) === false &&
      (s2.citadels.bottomRight.sealed ?? false) === true,
    'W07c: v3 round-trip iki yönlü stabil (bekleyen + Maceracı Şah + mühür korunur)',
  );
  ok(
    d1.board[tq(5, 9)]?.waiting === true && d1.citadels.bottomRight.sealed === true,
    'W07d: waiting + sealed deserialize sonrası korunur',
  );
  // Eski (sürümsüz) kayıt: eksikler varsayılanla dolar, sıradan piyade bozulmaz.
  const legacyShaped = {
    board: v3pos.board,
    sideToMove: v3pos.sideToMove,
    citadels: {
      topLeft: { occupant: null, sealed: undefined as unknown as boolean },
      bottomRight: { occupant: null, sealed: undefined as unknown as boolean },
    },
    flags: v3pos.flags,
    zobristHash: v3pos.zobristHash.toString(),
  };
  const dOld = deserializePosition(legacyShaped);
  const plainPawn = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(4, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const dPlain = deserializePosition({ ...serializePosition(plainPawn), version: undefined });
  ok(
    dOld.citadels.topLeft.sealed === false && dPlain.board[tq(4, 4)]?.waiting === false,
    'W07e: eski kayıtta waiting/sealed false varsayılır',
  );
  ok(
    dPlain.board[tq(4, 4)]?.pawnStage === undefined,
    'W07f: sıradan piyadenin pawnStage alanı tanımsız kalır (temsilî terfi korunur)',
  );

  // ---- W03. engine hamlesi → legacy hamle
  const dummyPiece = { id: 'w-q', kind: PieceKind.General, side: 'white' as const, hasMoved: false };
  const engMove: EngineMove = {
    from: tq(1, 1),
    to: tq(1, 2),
    piece: dummyPiece,
    capturedPiece: null,
    specialFlags: [],
    metadata: { isCheck: false, isCapture: false, algebraic: 'V?' },
  };
  const leg = engineMoveToLegacy(legacy, engMove);
  ok(
    leg !== null && leg.move.from.x === 1 && leg.move.from.y === 1 && leg.move.to.x === 1 && leg.move.to.y === 2,
    'W08: from/to kare dönüşümü doğru',
  );
  const swapFixture = legacyFixture();
  swapFixture.board[1][5] = { id: 'w-k2', type: 'king', color: 'white', position: { x: 5, y: 1 } };
  swapFixture.board[1][0] = { id: 'w-r2', type: 'rook', color: 'white', position: { x: 0, y: 1 } };
  const swapMove: EngineMove = {
    ...engMove,
    from: tq(5, 1),
    to: tq(0, 1),
    specialFlags: [MoveSpecialFlag.KingSwap],
  };
  const legSwap = engineMoveToLegacy(swapFixture, swapMove);
  ok(
    legSwap !== null && legSwap.move.isKingSwap === true && legSwap.move.swappedPiece?.id === 'w-r2',
    'W09: takas hamlesi swappedPiece ile dönüşür',
  );

  // ---- W04. worker handler: mat-in-1 bulur
  const w4 = await handleFindBestMove(
    {
      type: 'find_best_move',
      requestId: 'w4',
      position: serializePosition(mateRig()),
      profileId: 'V',
      maxDepth: 2,
      movetimeMs: 500,
    },
    new Set<string>(),
  );
  ok(
    w4.type === 'best_move_result' &&
      w4.result.bestMove.to === tq(0, 9) &&
      w4.result.depthReached >= 1 &&
      w4.result.principalVariation.length >= 1,
    'W10: handler mat-in-1 hamlesini döndürür',
  );

  // ---- W05. önceden-cancel → deterministik 'cancelled'
  const cancelled = new Set<string>(['w5']);
  const w5 = await handleFindBestMove(
    {
      type: 'find_best_move',
      requestId: 'w5',
      position: serializePosition(mateRig()),
      profileId: 'V',
      maxDepth: 2,
      movetimeMs: 500,
    },
    cancelled,
  );
  ok(w5.type === 'cancelled' && cancelled.size === 0, 'W11: cancel bayrağı derinlik-öncesi durdurur + küme temizlenir');

  // ---- W06. client yönlendirme (sıra-dışı yanıtlar doğru promise'e)
  const fake = new FakeWorker();
  const client = new EngineClient(() => fake);
  const initId = (fake.sent[0] as { requestId: string }).requestId;
  fake.emit({ type: 'ready', requestId: initId });
  const r1 = client.findBestMove(mateRig(), 'III');
  const r2 = client.analyze(mateRig(), { depth: 1 });
  const id1 = r1.requestId;
  const id2 = r2.requestId;
  ok(id1 !== id2, 'W12: her istek benzersiz requestId alır');
  fake.emit({ type: 'analysis_result', requestId: id2, result: { tag: 'analysis-ok' } });
  fake.emit({ type: 'best_move_result', requestId: id1, result: { tag: 'best-ok' } });
  const [a2, a1] = await Promise.all([r2, r1]);
  ok((a2 as unknown as { tag: string }).tag === 'analysis-ok' && (a1 as unknown as { tag: string }).tag === 'best-ok', 'W13: sıra-dışı yanıtlar doğru promise’e yönlenir');

  // ---- W07. cancel: yerel ret + geç yanıt düşer
  const r3 = client.findBestMove(mateRig(), 'III');
  const id3 = r3.requestId;
  r3.cancel();
  let rejected = false;
  try {
    await r3;
  } catch {
    rejected = true;
  }
  const cancelMsg = fake.sent.find(
    (m) => (m as { type?: string }).type === 'cancel' && (m as { requestId?: string }).requestId === id3,
  );
  ok(rejected && cancelMsg !== undefined, 'W14: cancel worker’a bildirilir + promise reddedilir');
  fake.emit({ type: 'best_move_result', requestId: id3, result: { tag: 'late' } });
  await new Promise((res) => setTimeout(res, 5));
  ok(true, 'W15: geç yanıt sessizce düşer (kilitlenme yok)');

  // ---- W08. bloklamama: istek→yanıt arası event loop döner
  const fake2 = new FakeWorker();
  const client2 = new EngineClient(() => fake2);
  const initId2 = (fake2.sent[0] as { requestId: string }).requestId;
  fake2.emit({ type: 'ready', requestId: initId2 });
  const order: string[] = [];
  const pending = client2.findBestMove(mateRig(), 'III').then((r) => {
    order.push('resolved');
    return r;
  });
  // Sahte worker 30ms sonra yanıt verir (gerçek thread-izolasyonun kaba modeli).
  // Not: istek postMessage'i ready-microtask'inden SONRA gider; o yüzden
  // requestId aramasını da zamanlayıcı içine al (yoksa yarış olur).
  setTimeout(() => {
    const workReq = fake2.sent.find((m) => (m as { type?: string }).type === 'find_best_move') as { requestId: string };
    fake2.emit({ type: 'best_move_result', requestId: workReq.requestId, result: { tag: 'deferred' } });
  }, 30);
  order.push('sync-after-call');
  await new Promise((res) => setTimeout(() => {
    order.push('timer');
    res(null);
  }, 5));
  const got = await pending;
  ok(
    order[0] === 'sync-after-call' && order[1] === 'timer' && order[2] === 'resolved' &&
      (got as unknown as { tag: string }).tag === 'deferred',
    `W16: istemci event loop'u bloklamaz (sıra: ${order.join(' → ')})`,
  );

  // ---- W09. bilinmeyen profil → error
  const w9 = await handleFindBestMove(
    {
      type: 'find_best_move',
      requestId: 'w9',
      position: serializePosition(mateRig()),
      profileId: 'VII' as never,
    },
    new Set<string>(),
  );
  ok(w9.type === 'error', 'W17: bilinmeyen profil error döner (worker ölmez)');

  // ---- W10. bozuk girdi fırlatmaz → error (pending sızıntısı yok, P0)
  let w18Threw = false;
  let w18: Awaited<ReturnType<typeof handleFindBestMove>> | undefined;
  try {
    w18 = await handleFindBestMove(
      {
        type: 'find_best_move',
        requestId: 'w18',
        position: { ...serializePosition(mateRig()), zobristHash: 'bozuk-hash!!' },
        profileId: 'V',
        maxDepth: 1,
        movetimeMs: 50,
      },
      new Set<string>(),
    );
  } catch {
    w18Threw = true;
  }
  ok(!w18Threw && w18?.type === 'error', 'W18: bozuk hash fırlatmaz, error döner');

  // ---- W11. analyze önceden-cancel → 'cancelled' + küme temizlenir (P1)
  const cancelledAnalyze = new Set<string>(['a19']);
  const w19 = await handleAnalyze(
    {
      type: 'analyze',
      requestId: 'a19',
      position: serializePosition(mateRig()),
      limits: { depth: 1 },
    },
    cancelledAnalyze,
  );
  ok(w19.type === 'cancelled' && cancelledAnalyze.size === 0, 'W19: analyze cancel bayrağını tüketir + küme temizlenir');

  // ---- W12. init gönderimi patlayan fabrika → constructor patlamaz, istek reddedilir (P1)
  class ThrowingWorker implements WorkerLike {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    postMessage(): void {
      throw new Error('dead worker');
    }
    terminate(): void {
      /* yok */
    }
  }
  let ctorThrew = false;
  let badClient: EngineClient | null = null;
  try {
    badClient = new EngineClient(() => new ThrowingWorker());
  } catch {
    ctorThrew = true;
  }
  ok(!ctorThrew, 'W20a: init postMessage patlasa da constructor patlamaz');
  if (badClient) {
    const rb = badClient.findBestMove(mateRig(), 'III');
    let badRejected = false;
    try {
      await rb;
    } catch {
      badRejected = true;
    }
    ok(badRejected, 'W20b: init başarısızsa bekleyen istek temiz reddedilir');
    badClient.dispose();
  } else {
    ok(false, 'W20b: init başarısızsa bekleyen istek temiz reddedilir');
  }

  // ---- W13. 12 taşta legacy↔engine ters-yön eşleşmesi
  const pairs: [string, PieceKind][] = [
    ['king', PieceKind.King],
    ['queen', PieceKind.General],
    ['general', PieceKind.Ferz],
    ['rook', PieceKind.Rook],
    ['knight', PieceKind.Knight],
    ['bishop', PieceKind.Alfil],
    ['camel', PieceKind.Camel],
    ['warMachine', PieceKind.Dabbaba],
    ['giraffe', PieceKind.Giraffe],
    ['picket', PieceKind.Picket],
    ['pawn', PieceKind.Pawn],
    ['prince', PieceKind.Prince],
  ];
  let roundTripOk = true;
  for (const [legacyType, kind] of pairs) {
    const fx = legacyFixture();
    fx.board[2][2] = { id: `t-${legacyType}`, type: legacyType as never, color: 'white', position: { x: 2, y: 2 } };
    const convRt = legacyGameStateToPosition(fx);
    const back = positionToLegacyBoardAndCitadels(convRt);
    if (convRt.board[tq(2, 2)]?.kind !== kind || (back.board[2][2]?.type as string) !== legacyType) {
      roundTripOk = false;
      console.error(`❌ FAIL: round-trip ${legacyType}`);
    }
  }
  ok(roundTripOk, 'W21: 12 taşta legacy↔engine eşleşmesi ters-yönde tutarlı');

  client.dispose();
  client2.dispose();
  console.log(`worker: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
