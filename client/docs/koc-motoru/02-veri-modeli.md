# Koç Motoru — Veri Modeli

Özet: `client/src/learn/guided/types.ts` birebir uygulanır.

- `MoveRef { from, to, expectPromotion? }`: `generateLegalMoves()` çıktısındaki
  bir `Move` ile from+to eşleşir. Terfi temsilîdir; yalnızca doğrulama içindir.
- `PlacedPiece { square, side, kind, pawnOf?, promotionStage? }`:
  `pawnOf` yalnızca Piyadede; `promotionStage` tanımlıysa Piyadelerin Piyadesi
  döngüsüne girer (TANIMSIZ = sıradan piyade, varsayılan 0 yazılmaz).
- `PositionRef`: `pieces` (sahnelenmiş, az taş) veya `serialized` (Dizilim Editörü).
- `GeometryReveal`: `destinations | path | direction | firstStep | ride`.
  Küme ASLA elle yazılmaz; `core/rules`'tan türetilir.
  `firstStep`/`ride` motorun dışa vermediği ara yapıdır → doğrulanamaz
  (fail-closed); Zürafa dersi `destinations` + `direction` ile yazılır.
- Adımlar: `say | show | showMoves | showGeometry | compare | play |
  awaitMove | awaitSquare | awaitSquares | expectRejection | quiz |
  teleport(demo, yalnızca narrative) | awaitSwap | setPosition | finish`.
- `GuidedLesson { id, level, title, mode, startPosition, stagingNote?,
  orientation, steps, xp, badge? }`: başlık `learnContent.ts` ile birebir;
  `badge` yalnızca seviyenin son dersinde; `xp` seviye dağılımına uyar
  (100/250/500/800/1200/1800, toplam 4650).

Durum makinesi (`machine.ts`) saftır: React/DOM/timer/random yok.
Konumun tek sahibi makinedir; yanlış girdide konum değişmez.
`expectRejection` başarısı ceza yazmaz. `awaitSquares` kısmi ilerler.
