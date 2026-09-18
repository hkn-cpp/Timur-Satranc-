# Koç Motoru — İsim Tablosu (otorite: learnContent.ts + müfredat PDF)

Bu dosya isim lint'inin (`lint-names`) insan-okunur kaynağıdır.
Makine-okunur yasak listesi: `02-isim-tablosu.md` (ikinci liste yazılmaz; o dosya buradan üretilir).

## 1. Kullanılacak taş adları (12 + 1)

| # | Kullanılacak ad | Kod kimliği (kullanıcıya GÖSTERİLMEZ) | Yasak eşanlamlılar |
|---|---|---|---|
| 1 | Şah | `king` | — |
| 2 | Kale | `rook` | — |
| 3 | Zürafa | `giraffe` | — |
| 4 | Nöbetçi | `picket` | Öncü, Talia |
| 5 | At | `knight` | — |
| 6 | Deve | `camel` | — |
| 7 | Mancınık | `dabbaba` | Dabbabe |
| 8 | Fil | `alfil` | — |
| 9 | Vezir | `general` | — |
| 10 | Fers | `ferz` | Ferz, Müsteşar |
| 11 | Piyade | `pawn` | Piyon, Öncü |
| 12 | Şehzade | `prince` | — |
| 13 | Maceracı Şah | `adventurousKing` | Masnu'a, Yedek Şah (v3 öncesi adlar; yasak) |

Kural: PDF'de "Ferz / Müsteşar" → **Fers**; "Dabbabe" → **Mancınık**;
"Öncü / Talia" → **Nöbetçi**; "Piyon" → **Piyade**; "Yedek Şah / Masnu'a" (v3 öncesi) → **Maceracı Şah**.
Legacy motor kimlikleri yanıltıcıdır: legacy `queen` = **Vezir**, legacy `general` = **Fers**.
Kod içi İngilizce kimlikler (`queen`, `general`, `picket`, `giraffe`, `rook`,
`knight`, `pawn`, `king`, `prince`) kullanıcıya asla gösterilmez.

## 2. Ders başlıkları (25, learnContent.ts ile BİREBİR)

| Ders | Başlık |
|---|---|
| 1.1 | 112 Karelik Saha ve Hisarlar |
| 1.2 | Şah (King) |
| 1.3 | Kale (Rook) |
| 1.4 | At (Knight) |
| 2.1 | Vezir (Vizier) |
| 2.2 | Fers (General) |
| 2.3 | Saray İkilisi Savunma Simbiyozu |
| 3.1 | Fil (Elephant) |
| 3.2 | Mancınık (WarEngine) |
| 3.3 | Deve (Camel) |
| 3.4 | Nöbetçi (Picket) |
| 3.5 | Zürafa (Giraffe) |
| 4.1 | Piyade Adımları |
| 4.2 | Temsilî Terfi İlkesi |
| 4.3 | Şehzade Kuralı (Prince Rule) |
| 4.4 | Çift Hükümdar Tehdidi |
| 5.1 | 1. Terfi (Bekleme Aşaması) |
| 5.2 | Taktik Çatal Işınlanması |
| 5.3 | 2. Terfi (Orijine Dönüş) |
| 5.4 | 3. Terfi (Maceracı Şah) |
| 6.1 | Şah Takası Manevrası |
| 6.2 | Hisar Beraberliği |
| 6.3 | Hisar Kilitleme |
| 6.4 | Pat ile Kesin Zafer |
| 6.5 | Yalın Şah (Soyutlama) Zaferi |

## 3. Unvanlar (6)

| Seviye | Unvan |
|---|---|
| 1 | Karavul |
| 2 | Keshik |
| 3 | Bahadır |
| 4 | Yüzbaşı |
| 5 | Emir |
| 6 | Noyan |

## 4. Rozetler (6, yalnızca seviyenin SON dersinde)

| Seviye | Rozet |
|---|---|
| 1 | Tahta ve Temel Süvari Rozeti |
| 2 | Saray Kalkanı Rozeti |
| 3 | Zürafa & Sıçrayıcılar Nişanı |
| 4 | Temsili Terfi & Şehzade Tacı |
| 5 | Çatal Işınlama Mührü |
| 6 | Altın Hisar & Usta Noyan Sertifikası |

## 5. Yasak adlar (makine kaynağı 02-isim-tablosu.md'dedir)

Yasak (çekimli halleri dahil): Ferz, Müsteşar, Dabbabe, Öncü, Talia, Piyon,
Masnu, Yedek
ve İngilizce kimlikler: queen, general, picket, giraffe, rook, knight,
pawn, king, prince.

Not: "Masnu" öneki Masnu’a/Masnu'a/Masnua yazımlarını yakalar. "Yedek Şah"
ikilisinin ilk sözcüğü ("Yedek") yasaktır; "Şah" tek başına royal adı olarak
serbesttir.
