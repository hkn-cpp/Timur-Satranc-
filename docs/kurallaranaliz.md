# FAZ 1 — Kural Kapsama Denetimi

> **Not:** Görev "kod yazma, dosya değiştirme yok" dediği için `client/docs/koc-motoru/01-kural-kapsama.md` dosyasını **yazmadım**. Aşağıdaki içerik o dosyanın gövdesidir — yazım onayı verirsen aynen yazılır.
> **Kaynak notu:** Ekte PDF yoktu. Müfredat olarak `client/src/learn/learnContent.ts` esas alındı (25 ders: 4+3+5+4+4+5 = 25, `TOTAL_LESSONS` satır 553). Kod esastır; PDF'e atıf yapılamadı.

## Tahta / Notasyon çözümü (önce, çünkü her dersi ilgilendirir)

**Kodun kesin hükmü:**

- Boyut: `BOARD_COLS = 11` (x 0..10), `BOARD_ROWS = 10` (y 0..9) — `client/src/core/position/Position.ts:64-65`. Ana ızgara 110 kare (`BOARD_SQUARES = 110`), +2 hisar = 112 (`TOTAL_SQUARES = 112`, `Position.ts:59-62`).
- Kare tipi: row-major indeks `row*11+col` (`Position.ts:53`); hisar ayrı indeks, `squareToCoord()` hisar için `null` döner (`Position.ts:146-149`).
- Hisar temsili: `110 = topLeft` (beyaz Şah'ın hedefi, sol), `111 = bottomRight` (siyah Şah'ın hedefi, sağ). Legacy karşılık: `{x:-1, y:8, citadelSide:'left'}` (`BLACK_CITADEL_POS`, `client/src/core/engine/moveRules.ts:28`) ve `{x:11, y:1, citadelSide:'right'}` (`WHITE_CITADEL_POS`, `moveRules.ts:29`). Senkron değişmezi: `board[110/111] ↔ occupant` her zaman aynı (`client/src/core/rules/shared.ts:506-517`).
- Hat isimleri: `FILES = a..k` (11 hat, `client/src/core/rules/pipeline.ts:63`). Hisar adları kodda `'Hisar(S)'/'Hisar(B)'` (`pipeline.ts:65-71`) — PDF'in `H-SOL/H-SAĞ` ifadesinden farklı (bkz. Açık Soru 2).

**PDF çelişkisinin hükmü:** "Dikeyde 10 sütun" **YANLIŞ**, "a'dan k'ye 11 dikey hat" **DOĞRU**. `(11, 10)` sağ-üst köşe ifadesi 1-tabanlı okunuşta `k10` = indeks 109'a denk gelir, kodla tutarlıdır. Ek kod-içi hata: `client/src/core/engine/boardSetup.ts:13-14` başlık yorumunda hisar satırları ters yazılmış (`X=-1,Y=1` / `X=11,Y=8`); gerçek değerler `moveRules.ts:28-29` uyarınca `(-1,8)` ve `(11,1)`'dir — yorum satırı hatalı, davranış doğru.

## 25 ders kapsama tablosu

| Ders | Tahtada yaşatılması gereken mekanik (tek cümle) | core/rules durumu + dosya:satır | Dışa açık imza / YOK tarifi | Mod |
|---|---|---|---|---|
| 1.1 112 Karelik Saha ve Hisarlar | 11×10 ızgara + 2 hisar cebi ve a–k/1–10 koordinatını kavrama. | VAR — `position/Position.ts:59-65` (sabitler), `position/Position.ts:146-156` (koordinat), `rules/pipeline.ts:63-71` (hat adları + kare adı) | `squareName(sq: number): string`, `coordToSquare(col,row): SquareIndex\|null`, `squareToCoord(sq): {col,row}\|null` | interaktif |
| 1.2 Şah | Şahın 8 komşuya 1 adım gitmesi, rokun olmaması. | VAR — `rules/shared.ts:145-162` (King dalı), port kaynağı `core/engine/moveRules.ts:240-263`; rok kodu yok (frozen §7) | `pseudoTargets(piece, from, board, citadels): PseudoTarget[]` | interaktif |
| 1.3 Kale | Düz yönlerde kesintisiz kayış, taştan atlayamama. | VAR — `rules/shared.ts:250-254` (`slideRay` min1), `moveRules.ts:353-359` | `pseudoTargets(...)` (aynı) | interaktif |
| 1.4 At | Klasik 2+1 L sıçrama, engel atlama. | VAR — `rules/shared.ts:237-247`, `moveRules.ts:341-350` | `pseudoTargets(...)` (aynı) | interaktif |
| 2.1 Vezir | Yalnızca 1 kare düz gitme, çapraz gidememe. | VAR — `rules/shared.ts:165-172` (`PieceKind.General`), `moveRules.ts:275-281` (legacy `queen`) | `pseudoTargets(...)` (aynı) | interaktif |
| 2.2 Fers | Yalnızca 1 kare çapraz gitme, düz gidememe. | VAR — `rules/shared.ts:175-182` (`PieceKind.Ferz`), `moveRules.ts:266-272` (legacy `general`) | `pseudoTargets(...)` (aynı) | interaktif |
| 2.3 Saray İkilisi | Vezir+Fers+Şah koordineli yakın savunma. | VAR (bileşenler) — 2.1/2.2 vektörleri + `rules/shared.ts:438-465` `isAttacked()`; "koordinasyon" diye ayrı fonksiyon yok, kompozisyon bulmacada kurulur | `generateLegalMoves(position: Position): Move[]` (`rules/generateLegalMoves.ts:21`) | interaktif |
| 3.1 Fil | Çapraz tam-2 sıçrama, aradaki taşa takılmama. | VAR — `rules/shared.ts:257-264`, `moveRules.ts:362-368` | `pseudoTargets(...)` (aynı) | interaktif |
| 3.2 Mancınık | Düz tam-2 sıçrama, sipere takılmama. | VAR — `rules/shared.ts:280-287`, `moveRules.ts:383-389` | `pseudoTargets(...)` (aynı) | interaktif |
| 3.3 Deve | 3+1 geniş L sıçrama, engel atlama. | VAR — `rules/shared.ts:267-277`, `moveRules.ts:371-380` | `pseudoTargets(...)` (aynı) | interaktif |
| 3.4 Nöbetçi (a) | Çapraz en-az-2 kayış; 1 gidemez, sıçrayamaz. | VAR — `rules/shared.ts:230-234` (`slideRay(dx,dy,2,10)`), `moveRules.ts:332-338` + ara-kare kontrolü `moveRules.ts:201-209` | `pseudoTargets(...)` (aynı) | interaktif |
| 3.5 Zürafa (b) | 1 çapraz (boş olmalı) + en-az-3 düz hibrit kayış. | VAR — `rules/shared.ts:185-227`, `moveRules.ts:284-329` | `pseudoTargets(...)` (aynı) | interaktif |
| 4.1 Piyade Adımları | 1 düz yürü, 1 çapraz al; çift adım ve geçerken alma yok. | VAR — `rules/shared.ts:292-306`, `moveRules.ts:392-429`; çift-sürüş/en-passant kodu yok (= yasak korunur) | `pseudoTargets(...)` (aynı) | interaktif |
| 4.2 Temsilî Terfi (c) | Her piyade 10. yatayda yalnızca temsil ettiği figüre dönüşür. | KISMEN VAR — alt-subay hattı: `rules/shared.ts:353` (`customType ?? pawn.pawnOf`), `moveRules.ts:661-663`; terfi hattı `rules/pipeline.ts:279-285` üzerinden üretilir. **Eksik:** "11 farklı kimlik" iddiası kurulumda tutmuyor — `PAWN_COLUMN_PROMOTIONS` 11 sütun ama içeriği `rook,knight,picket,giraffe,general,king,queen,giraffe,picket,knight,rook` (`core/engine/boardSetup.ts:21-33`); `pawn` girdisi yok, x=5 `king` hattı. `pawnOf===Pawn` üreten sütun yok (bkz. Açık Soru 1). | `resolvePawnPromotion(pawn, board, citadels, customType?): PawnPromotionResolution` (`rules/shared.ts:333-354`) | interaktif (alt-subay terfisi için; 11-kimlik iddiası şerhli) |
| 4.3 Şehzade Kuralı (d-1) | Şah Piyadesi son yatayda Şehzade olarak girer. | VAR — `rules/shared.ts:339-341` (`pawnOf===King → Prince`), `moveRules.ts:638-643`; test `core/__tests__/gameCore.test.ts:264` | `resolvePawnPromotion(...)` (aynı) | interaktif |
| 4.4 Çift Hükümdar (d-2) | Şah+Şehzade varken oyun bitmez, rakip ikisini de bertaraf eder. | YOK — Prince royal değil (`position/Position.ts:80`, `rules/shared.ts:22`); `findKingSquare()` yalnız `King` arar (`rules/shared.ts:407-425`), `isKingInCheck` yalnız `king` tipine bakar (`moveRules.ts:443-465`); `getGameResult()` mat/patı yalnız Şah'a göre keser (`rules/gameResult.ts:84-89`). Şah mat olursa Prince tahtadayken de oyun biter. Eksik olan: çift-royal sonlandırma koşulu. | YOK | anlatım |
| 5.1 Bekleme (e-1) | Piyadelerin Piyadesi 10. yatayda taşa dönüşmeden bekler (dokunulmaz). | YOK (yakın davranış VAR ama semantik farklı) — kod bekletmez, aynı hamlede güvenli-kareye taşır: `rules/shared.ts:345-349`, `moveRules.ts:647-656`. "Bekleyen/dokunulmaz" durum temsili kodda yok. | YOK (bekleme durumu); yakın imza `resolvePawnPromotion(...)` relocation dalı | anlatım |
| 5.2 Çatal Işınlanması (e-2) | Çatal atabilecek boş kare doğunca piyade oraya ışınlanır. | YOK — kodun relocation hedefi `findSafeRelocationSquare()` kendi kamp bandında (`[2,1,0]/[7,8,9]`) rakip saldırısı dışı ilk boş karedir (`rules/shared.ts:361-404`, `moveRules.ts:574-616`); çatal hesabı, kullanıcı tetiklemesi, altın buton kavramı kodda mevcut değil. | YOK | anlatım |
| 5.3 Orijine Dönüş (e-3) | 2. varışta Şah Piyadesi başlangıç karesine dönüş. | YOK — kodda stage≥1 → Prince (`rules/shared.ts:351`, `moveRules.ts:658`); "orijin karesi" kavramı ve dönüş kodu yok. | YOK | anlatım |
| 5.4 Masnu'a (e-4) | 3. varışta Yedek Şah unvanı + hisar kilitleme gücü. | YOK — `PieceKind` enum'unda Masnua yok (`position/Position.ts:67-81`: King..Pawn + Prince); stage-2 Prince üretir, Masnua değil. `learnContent.ts:532-535` `masnua` rehberi `engineNote: 'oyun motoruna sonraki fazda eklenecek'` ile bunu doğrular. | YOK | anlatım |
| 6.1 Şah Takası (f) | Maçta 1 kez dost taşla yer değiştirme. | VAR — `rules/shared.ts:612-647` `kingSwapTargets()`, `moveRules.ts:499-569` `validateKingSwap`/`generateKingSwapMoves`, bayrak `hasUsedKingSwap` (`position/Position.ts:115`). **Fark:** PDF "şah tehdit altındayken" diyor; kod tehdit şartı aramaz — tek doğrulama takas-sonrası şahın çekilmemesi (`shared.ts:634-644`, `moveRules.ts:518-519`). | `kingSwapTargets(side, board, citadels, kingSwapUsed): {from,to}[]` | interaktif (tehdit-şartı şerhiyle) |
| 6.2 Hisar Beraberliği (g) | Zayıf taraf Şahı rakip hisara girerse anında berabere. | VAR (Şah-kapsamlı) — `rules/gameResult.ts:62-71` + `102-104` `isCitadelDraw()`, `moveRules.ts:736-763` `DRAW_BY_CITADEL`. Koşul yalnız `King` tipini kapsar (`gameResult.ts:45-56`); Prince/Masnua dahil değil. Yan not: yeni çekirdek reason'ı `agreement`'e eşler (`gameResult.ts:70`), spec'te `citadel` reason yok. | `getGameResult(position): GameResult\|null`, `isCitadelDraw(position): boolean` | interaktif |
| 6.3 Hisar Kilitleme (h) | Kendi hisarına yalnızca Masnu'a girer, rakip sığınmayı kilitler. | YOK — `sealed` alanı var (`position/Position.ts:100-108`) ama rules içinde `true` yazan kod yok (yalnızca test/strateji okur); Masnua taşı yok; giriş kuralı "yalnızca Masnu'a" denetlenmiyor (Prince giremez `shared.ts:156-160`, King girebilir). Eksik olan: Masnua taşı + kendi-hisar girişi + seal yazma. | YOK | anlatım |
| 6.4 Pat = Zafer | Hamlesiz bırakma kesin galibiyettir. | VAR — `rules/gameResult.ts:86-88` (`stalemate_win`), `moveRules.ts:780-791` (`LOSS_BY_STALEMATE`) | `getGameResult(...)` (aynı), `isCheck(position, side): boolean` (`gameResult.ts:34`) | interaktif |
| 6.5 Yalın Şah | Rakip orduyu yok edip Şahı yalnız bırakma doğrudan zaferdir. | YOK — `GameResult` tipinde yalın-şah dalı yok (`position/Position.ts:118-123`); `getGameResult()` ordu sayımı yapmaz (`gameResult.ts:62-91`); `learnContent.ts:549` `engineNote: 'oyun motoruna sonraki fazda eklenecek'` eksikliği doğrular. | YOK | anlatım |

## 8 egzotik mekanik — toplu hüküm

- **a. Talia min-2:** VAR (`shared.ts:230-234`, `moveRules.ts:332-338`).
- **b. Zürafa 1 çapraz + min-3 düz:** VAR (`shared.ts:185-227`, `moveRules.ts:284-329`).
- **c. 11 farklı piyon kimliği:** KISMEN — terfi hattı VAR (`shared.ts:353`), ama kurulum 11 sütunda `pawn` kimliği üretmiyor (`boardSetup.ts:21-33`); x=5 `king` hattı ve yorumu "Pawn of King (Pawn of Pawns / Prince)" iki kavramı birleştiriyor.
- **d. Şehzade + çift hükümdar:** terfi VAR (`shared.ts:339-341`), çift-hükümdar oyun-sonu YOK (Prince non-royal).
- **e. Piyonların Piyadesi 3-faz + çatal ışınlaması:** YOK — kodda yalnızca 2-kademeli relocation→Prince hattı var (`shared.ts:342-352`); bekleme/çatal/orijin/Masnua yok.
- **f. Şah Takası 1x:** VAR (`shared.ts:612-647`), tehdit-şartı farkıyla.
- **g. Hisar beraberliği:** VAR, yalnız-Şah kapsamıyla (`gameResult.ts:45-71`).
- **h. Hisar kilitleme:** YOK (`sealed` alanı ölü, Masnua yok).

## MOTOR EKSİKLERİ (anlatım moduna düşmek zorunda kalan dersler)

- 4.4 Çift Hükümdar Tehdidi
- 5.1 Bekleme Aşaması
- 5.2 Çatal Işınlanması
- 5.3 Orijine Dönüş
- 5.4 Masnu'a
- 6.3 Hisar Kilitleme
- 6.5 Yalın Şah Zaferi

## AÇIK SORULAR (kesin bulunamayanlar)

1. Merkez (x=5) piyonun kimliği nedir — `boardSetup.ts:27` onu "Pawn of King (Pawn of Pawns / Prince)" diye etiketler; kurulumda `pawnOf===Pawn` üreten sütun yok. 5.x döngüsü hangi piyonla başlıyor?
2. Hisar notasyonu kanoniği ne — `pipeline.ts:65-71` `'Hisar(S)'/'Hisar(B)'` mi, PDF/`learnContent`'in `H-SOL/H-SAĞ` ifadesi mi?
3. 6.1'deki "şah tehdit altındayken" şartı kural mı (PDF) yoksa serbest mi (kod `shared.ts:612-647` şartsız)?
4. 5.1'deki "dokunulmaz bekleme" gerçek kural mı, arayüz efsanesi mi? Kod bekletmiyor.
5. 5.2 ışınlama tetikleyicisi hamle-hakkı mı otomatik mi? Kodda hiç yok.
6. 6.5 sayımında Prince/Masnua "ordu" sayılıyor mu? (4.4 ile etkileşim.)
7. `pipeline.ts:292-301` hisar-çıkış quirk'i (beyaz yalnız 111'e, siyah yalnız 110'a bakar; ters slot hamlesiz) kasıtlı mı, legacy artığı mı?
8. Hisar beraberliği reason'ı `agreement` eşlemesi (`gameResult.ts:70`) kalıcı mı, spec'e `citadel` reason eklenmeli mi?