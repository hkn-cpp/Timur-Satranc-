# Terfi Ekosistemi v3 — Karar Belgesi (FAZ A)

Tarih: 2026-09-18. Kural dondurması bu görevle kontrollü açıldı, Faz F'de yeniden kurulur.
**Konum notu:** `frozen-rules.md` bu dosyanın yazıldığı anda `client/docs/` altında
değil, repo kökündeki `docs/frozen-rules.md` konumundadır. Faz F güncellemesi
oraya yapılır (görev metnindeki `client/docs/frozen-rules.md` yolu mevcut
ağaçla çelişir; en yakın uyumlu yorum budur).

## K1 — Piyade kimlik haritası (11 farklı kimlik)

Orta sıra sütunları (değişmez): x0 Kale, x1 At, x2 Nöbetçi, x3 Zürafa, x4 Fers,
x5 Şah, x6 Vezir, x7 Zürafa, x8 Nöbetçi, x9 At, x10 Kale.
Tekrar eden 4 sütunun (x7, x8, x9, x10) ikinci kopyaları boşaltıldı; x0–x6 aynen
korundu. Nihai piyon dizilimi (beyaz Y=2, siyah Y=7; siyah aynası):

| Sütun | Kimlik (TR) | Figür sütunu? | Legacy `PAWN_COLUMN_PROMOTIONS` değeri |
|---|---|---|---|
| x0 (a) | Kale Piyadesi | evet (x0) | `rook` |
| x1 (b) | At Piyadesi | evet (x1) | `knight` |
| x2 (c) | Nöbetçi Piyadesi | evet (x2) | `picket` |
| x3 (d) | Zürafa Piyadesi | evet (x3) | `giraffe` |
| x4 (e) | Fers Piyadesi | evet (x4) | `general` (=Fers; legacy ad, DİKKAT) |
| x5 (f) | Şah Piyadesi → Şehzade (özel, K2) | evet (x5) | `king` |
| x6 (g) | Vezir Piyadesi | evet (x6) | `queen` (=Vezir; legacy ad, DİKKAT) |
| x7 (h) | Fil Piyadesi | hayır (arka sıra figürü; en yakın boş sütun) | `bishop` |
| x8 (i) | Deve Piyadesi | hayır (arka sıra figürü) | `camel` |
| x9 (j) | Mancınık Piyadesi | hayır (arka sıra figürü) | `warMachine` |
| x10 (k) | Piyadelerin Piyadesi (K4–K10 döngüsü) | — (yeni hat) | `pawn` |

Etkilenen dosyalar: `core/engine/boardSetup.ts` (`PAWN_COLUMN_PROMOTIONS` + 13–14.
satırdaki ters yazılmış hisar yorumu düzeltmesi), `docs/frozen-rules.md` §1.3.

## K2/K3 — Çift hükümdar ve tek royal'e dönüş

Royal kümesi: `royalSquares(position, side)` → aynı renk `King + Prince +
AdventurousKing` (tahta 0..109 + hisar occupant'ları). `findKingSquare()`
silinmez; `royalSquares` üzerine sarılır.
- `royals.length > 1` → o taraf için şah/mat kavramı kapalı (`isCheck=false`),
  hamle yasallığında royal-güvenlik filtresi uygulanmaz, royaller normal taş
  gibi alınabilir.
- `royals.length === 1` → kalan tek royal eski kuralla korunur.
- `royals.length === 0` → taraf kaybeder (`checkmate`, kazanan rakip).
Etkilenen dosyalar: `core/rules/shared.ts` (`royalSquares`, `filterKingSafety`
içinden — pipeline üzerinden —, `kingSwapTargets` çok-royal gevşemesi),
`core/rules/pipeline.ts` (güvenlik filtresi royal mantığı),
`core/rules/gameResult.ts` (`isCheck`, `getGameResult`, `isCitadelDraw`),
`core/rules/index.ts` (yeni exportlar).

## K4/K5 — Bekleyen piyade

1. terfi: yerinde kalır (`waiting=true`, `promotionStage=1`); normal hamlesi yok
(`pseudoTargets` bekleyeni üretmez); alınamaz (`canLand` bekleyen düşman kareyi
reddeder); `isAttacked` bekleyeni hem saldırgan hem kurban olarak dışlar
(piyon çapraz özel dalı dahil); kayan ışınlara dolu kare engelidir.
Etkilenen: `shared.ts`, `Move.ts` (`newWaiting` taşıma), `makeMove.ts`.

## K6 — Işınlanma hamlesi

`MoveSpecialFlag.Teleport` (mevcut KingSwap/Relocation extension örüntüsüyle).
`from`=bekleyen piyade, `to`=çatal karesi, sırayı geçirir (normal `makeMove`
akışı; `waiting=false`). `generateLegalMoves` içinde üretilir (KingSwap
sonrası sıra), arayüz normal listede göstermez (K8 paneli).
Etkilenen: `core/move/Move.ts`, `shared.ts` (`applyMoveToArrays`,
`resolvePawnPromotion` sonucu, `revertMoveInArrays` — tam kopya restore),
`pipeline.ts` (teleport üretimi + `resolveForApply` koruması), `makeMove.ts`.

## K7 — Çatal karesi

`forkSquares(position, pawnSq): { multi, trapped }` (`shared.ts`, yeni fonksiyon;
`findSafeRelocationSquare` silinmez).
- Aday: tüm BOŞ tahta kareleri. Piyon saldırısı = 1 çapraz ileri.
- (a) `multi`: ≥2 rakip taş saldırılıyor (royaller dahil).
- (b) `trapped`: tam 1 rakip taş P saldırılıyor VE P'nin her legal hamlesinden
  sonra P hâlâ aynı piyadenin saldırısında VE hamlelerden hiçbiri piyadeyi
  almıyor. P'nin hamlesi yoksa koşul boş-doğrulukla sağlanır. Rakibin başka
  taşla savunması koşulu bozmaz; P'nin piyadeyi alabilmesi bozar.
- Işınlanma sonrası konumda P'nin hamleleri `generateLegalMoves` ile üretilir
  (sıra P'nin tarafına çevrilmiş kopya konumda).

## K8 — Çatal paneli (arayüz)

Motor teleportu `generateLegalMoves` içinde üretir; liste ayrımı arayüz
katmanındadır. Panel yalnızca yeni çekirdekli ekranda (rehberli ders
görünümü) uygulanır: bekleyen piyade + en az bir çatal karesi varsa
"Taktik Çatal Hazır" butonu parlar → kareler işaretlenir → tıklama teleportu
oynatır (hamle, sıra geçer) → panel kapatılıp normal hamle de yapılabilir.
Legacy oyun ekranları bekleyen piyade üretemez (legacy terfi hattı değişmez);
oraya panel eklenmez.
Etkilenen: `components/learn/guided/` (yeni `ForkPanel`, `GuidedLessonView`
bağlantısı), `components/board/BoardGrid.tsx` (bekleyen görseli — yalnızca
yeni `waiting` işaretli taşları etkiler).

## K9 — Çatal yoksa

Süresiz bekleme; oyun sonu/tekrar kurallarına girmez (bekleyen piyade
`getGameResult` hamle sayımında hamlesizdir ama tarafın başka hamlesi varsa
oyun sürer; `repetitionCount`/ `halfMoveClock` akışı değişmez).

## K10 — Orijin hedefi

2. varış (stage 1): hedef kendi Şah Piyadesi başlangıç karesi (beyaz (5,2),
siyah (5,7)). Doluysa aynı sütunda ileri ilk boş kare; sütun doluysa beklemeye
devam (`waiting=true`, stage 1 korunur, varış karesinde kalır). Yakalama
`to` karesinde olur, iniş hedef karedir (mevcut relocation semantiği).
Etkilenen: `shared.ts` (`resolvePawnPromotion` + yeni `originSquare` yardımcısı).

## K11 — Maceracı Şah

`PieceKind.AdventurousKing`. Tam royal (royal kümesinde; K2/K3 uygulanır).
Hareket: Şehzade gibi (8 komşu, 1 adım). Tek fark: KENDİ hisarına girebilir
(beyaz→111, siyah→110; Şah'ın rakip-hisar komşuluk kuralının aynası).
Şehzade'nin hisara girememesi korunur. Üç royal mümkündür.
Etkilenen: `Position.ts` (enum), `shared.ts` (`pseudoTargets`, `royalSquares`),
zobrist (enumdan otomatik), `evaluate.ts` (300cp), `PieceView.tsx` (görsel
eşleme → `prince` anahtarı; özel PNG yok, raporda belirtilir),
`legacyAdapter.ts` (`KIND_TO_LEGACY` + tahta çevrimi).

## K12 — Hisar kilitleme

Maceracı Şah kendi hisarına girince `sealed=true` (kalıcı; çıkışta korunur).
Kilitli hisar üzerinden hisar beraberliği oluşmaz (giriş fiziken engellenmez).
Maceracı Şah dışında hiçbir taş kendi hisarına giremez (mevcut davranış —
Şah yalnızca rakip hisara girebilir — korunur).
Etkilenen: `shared.ts` (`applyMoveToArrays` mühür yazımı), `gameResult.ts`
(`isCitadelDraw` + yeni `citadel` reason), `fullEvaluation.ts` (mevcut
sealed skorlaması aynen — eşleme yorumu korunur), `CitadelBadge.tsx`/
`BoardGrid.tsx` (kilit görseli, yeni opsiyonel prop).

## K13 — Değer matrisi (cp; 1 piyade=100)

Şehzade 400→300, Maceracı Şah 300, bekleyen piyade 50 (normal 100 yerine),
Şah: royal sayısı 1 iken 0 (mevcut), royal sayısı >1 iken 800.
`materialWhiteCp` taraf başına royal sayar (`royalSquares`).
Arama geçiş testi: çok-royal konumda sonuç sonlu bantta + en iyi hamle legal.
Etkilenen: `engine/evaluate.ts`, `engine/__tests__/` (yeni test).

## K14 — Serileştirme sürümü

`SerializedPosition.version: 3` (`worker/protocol.ts`). `deserializePosition`
eksikleri doldurur: `waiting=false`, `sealed=false`, `promotionStage`: YALNIZCA
`pawnOf===Pawn` piyonlarda tanımsızsa 0 (diğer piyonlarda `undefined` korunur —
`undefined`, sıradan piyade demektir; hepsine 0 yazmak temsilî terfiyi bozar).
Round-trip testi: v3 → v2 alanlarıyla geri dönüş stabil.
Etkilenen: `worker/protocol.ts`, `worker/__tests__/`.

## Faz F `frozen-rules.md` taslağı

Sürüm v3: §1.3 yeni piyon tablosu; §2'ye AdventurousKing + bekleyen-davranış +
royal kümesi; §3'e bekleme/çatal/orijin/Maceracı dalları; §5'e mühür + `citadel`
reason; §6'ya royal-sıfır kaybı notu; §8'e güncel süit sayıları. Dosya konumu
`docs/frozen-rules.md` (kök) olarak kalır.
