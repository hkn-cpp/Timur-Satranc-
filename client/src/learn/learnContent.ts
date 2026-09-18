/**
 * Öğren Modülü — PDF Sadık İçerik Modeli
 * Kaynak: "Timur Satrancı Öğrenme Seviyelendirme Rehberi.pdf" (timursatrancı.com)
 *
 * Kapsam: SADECE ARAYÜZ. Bulmacalar statik karttır, motor bağlanmaz.
 * Kural anlatımı PDF'e sadıktır; motorla çelişen yerlerde EngineNote gösterilir.
 */

export interface LearnSlide {
  emoji: string;
  title: string;
  body: string;
}

export interface LearnPuzzle {
  title: string;
  desc: string;
}

export interface LearnLesson {
  /** "1.1" gibi PDF ders kodu */
  id: string;
  title: string;
  goal: string;
  slides: LearnSlide[];
  puzzles: LearnPuzzle[];
}

export interface LearnLevel {
  id: number; // 1..6
  title: string;
  sub: string;
  unvan: string;
  sureDakika: number;
  xp: number;
  /** [gerekli, toplam] bulmaca barajı */
  baraj: [number, number];
  rozet: string;
  color: string;
  icon: string;
  lessons: LearnLesson[];
}

export interface PieceGuide {
  key: string;
  name: string;
  symbol: string;
  /** PDF Tablo-2 puanı (görsel metin) */
  value: string;
  color: string;
  /** PDF §4 hareket metni */
  move: string;
  /** PDF temsilî terfi eşleşmesi */
  terfi: string;
  /** Motorla çelişiyorsa gösterilecek not */
  engineNote?: string;
}

export interface RuleEntry {
  title: string;
  icon: string;
  desc: string;
  engineNote?: string;
}

// ─── Yardımcı: her derse 3 statik bulmaca kartı üret (PDF toplamlarıyla uyumlu) ──
function puzzlesFor(lessonId: string, titles: [string, string, string] | [string, string], descs?: string): LearnPuzzle[] {
  const fallback =
    'Statik tanıtım kartı — bulmaca motoru sonraki fazda eklenecek. Kuralları bu dersin teori slaytlarından tekrar et.';
  return titles.map((t, i) => ({
    title: `${lessonId} Bulmaca ${i + 1}: ${t}`,
    desc: descs ?? fallback,
  }));
}

export const LEARN_LEVELS: LearnLevel[] = [
  {
    id: 1,
    title: 'Temel Kuvvetler ve 112 Karelik Meydan',
    sub: 'Süvari Nöbetçisi',
    unvan: 'Süvari Nöbetçisi',
    sureDakika: 4,
    xp: 100,
    baraj: [10, 12],
    rozet: 'Tahta Kâşifi & Süvari Rozeti',
    color: '#00d4c4',
    icon: '📜',
    lessons: [
      {
        id: '1.1',
        title: '112 Karelik Saha ve Hisarlar',
        goal: '10x11 ana matris, H-SOL ve H-SAĞ hisar cepleri ve koordinat mantığını kavrama.',
        slides: [
          {
            emoji: '🗺️',
            title: '112 Karelik Meydan',
            body: 'Timur Satrancı 10 yatay sıra ve 11 dikey hattan oluşan 110 karelik ana gövde + 2 hisar cebi ile toplam 112 karedir. Standart satrançtaki siyah-beyaz dama deseni tarihsel olarak yoktur; hareketler zemin rengine göre değil, koordinat ve mesafe vektörlerine göre hesaplanır.',
          },
          {
            emoji: '🏰',
            title: 'Hisarlar: H-SOL ve H-SAĞ',
            body: 'Beyazın sol kanadında (9. yatayda dışa taşan) H-SOL, siyahın sağ kanadında (2. yatayda dışa taşan) H-SAĞ bulunur. Bunlar bağımsız sığınak kareleridir; oyun sonu beraberlik ve kilitleme kuralları bu ceplerde çalışır.',
          },
          {
            emoji: '🔢',
            title: 'Notasyon',
            body: 'Sayısal ve PGN kaydı için dikey hatlar a–k, yatay sıralar 1–10 olarak kodlanır. Dış cepler H-SOL (Beyaz Hisarı) ve H-SAĞ (Siyah Hisarı) olarak kaydedilir.',
          },
        ],
        puzzles: puzzlesFor('1.1', ['Hisarı bul', 'Koordinat avı', '112 kare sayımı']),
      },
      {
        id: '1.2',
        title: 'Şah (King)',
        goal: 'Şahın 8 komşu kareye 1 adım hareketini ve rok yasağını içselleştirme.',
        slides: [
          {
            emoji: '👑',
            title: 'Şah: 8 Komşu Kare',
            body: 'Şah komşu 8 kareye 1 adım hareket eder ve taş alır. Timur Satrancı’nda rok hamlesi kesinlikle yoktur — standart satrançtaki rok alışkanlığını burada kır.',
          },
          {
            emoji: '🚫',
            title: 'Rok Yok, Geçerken Alma Yok',
            body: 'Rok ve geçerken alma (en passant) bu oyunda bulunmaz. Şah güvenliği tamamen yakın koruma taşları (Vezir-Fers) ve hat kontrolüyle sağlanır.',
          },
        ],
        puzzles: puzzlesFor('1.2', ['Şah kaçış ağı', 'Rok tuzağını atlat', 'Komşu kare sayımı']),
      },
      {
        id: '1.3',
        title: 'Kale (Rook)',
        goal: 'Yatay-dikey kesintisiz kayışı ve 112 karede açık hat denetimini kavrama.',
        slides: [
          {
            emoji: '♜',
            title: 'Kale: Kesintisiz Hat',
            body: 'Kale yatay ve dikey yönde kesintisiz kayar, taş üzerinden atlayamaz. 112 karelik tahtada açık hatların denetimi ağır taş gücünün temelidir. Güç skalası: 5.5 puan.',
          },
          {
            emoji: '🛤️',
            title: 'Açık Hat Denetimi',
            body: 'Geniş tahtada kaleler merkeze ve 10. yataya baskı kurar. Piyon zincirleri kale hatlarını kapatır; hat açmak için değişimler planlanır.',
          },
        ],
        puzzles: puzzlesFor('1.3', ['Açık hat yakala', 'Kale ile taş topla', 'Hat kapatma']),
      },
      {
        id: '1.4',
        title: 'At (Knight)',
        goal: 'Klasik 2+1 L sıçramasını ve geniş tahtada menzil kısıtını anlama.',
        slides: [
          {
            emoji: '♞',
            title: 'At: Klasik L Sıçrama',
            body: 'At 2 düz + 1 dik klasik L şeklinde sıçrar, aradaki taşların üzerinden atlar. Güç skalası: 2.8 puan. Geniş tahtada menzili kısıtlıdır; merkez karelere erişim kritiktir.',
          },
          {
            emoji: '🎯',
            title: 'Merkez Erişimi',
            body: 'Atı kenarda bırakma: 11 hatlı tahtada kenar atı oyuna geç girer. Önce merkeze yakın karelere taşı, sonra kanat çatalları kur.',
          },
        ],
        puzzles: puzzlesFor('1.4', ['Merkeze zıpla', '3 hamlede taş topla', 'At çatısı']),
      },
    ],
  },
  {
    id: 2,
    title: 'Saray Muhafızları ve Dar Hat Savunması',
    sub: 'Keshik (Saray Muhafızı)',
    unvan: 'Keshik (Saray Muhafızı)',
    sureDakika: 3,
    xp: 250,
    baraj: [8, 9],
    rozet: 'Saray Kalkanı Rozeti',
    color: '#60a5fa',
    icon: '🛡️',
    lessons: [
      {
        id: '2.1',
        title: 'Vezir (Vizier)',
        goal: 'Vezirin yalnızca 1 kare ortogonal gittiğini, çapraz gidemediğini kavrama.',
        slides: [
          {
            emoji: '🤴',
            title: 'Vezir: Kısa Menzilli Muhafız',
            body: 'Vezir yatay veya dikey yalnızca 1 kare gider ve taş alır; çapraz gidemez. Standart satrançtaki güçlü vezir beklentisini yık — burada vezir 1.3 puanlık yakın koruma birimidir.',
          },
        ],
        puzzles: puzzlesFor('2.1', ['Vezir kalkanı', 'Sızmayı durdur', '1 kare zinciri']),
      },
      {
        id: '2.2',
        title: 'Fers (General)',
        goal: 'Fersin yalnızca 1 kare çapraz gittiğini, düz gidemediğini kavrama.',
        slides: [
          {
            emoji: '🧙',
            title: 'Fers: Çapraz Muhafız',
            body: 'Fers çapraz yönde yalnızca 1 kare gider ve taş alır; düz gidemez. Güç skalası: 1.2 puan. Vezirle birlikte şah etrafında kilit savunma kurar.',
          },
        ],
        puzzles: puzzlesFor('2.2', ['Çapraz kilit', 'Fers duvarı', 'Köşe savunması']),
      },
      {
        id: '2.3',
        title: 'Saray İkilisi Savunma Simbiyozu',
        goal: 'Vezir + Fers + Şah koordineli yakın savunma ve hücumu anlama.',
        slides: [
          {
            emoji: '🤝',
            title: 'Kilit Savunma Zinciri',
            body: 'Vezir (düz 1) ve Fers (çapraz 1) şah etrafında birbirini tamamlar: vezir artı-yönleri, fers çarpı-yönleri tutar. Sızmaya çalışan rakip At ve Kaleyi bu ikiliyle bloke et.',
          },
        ],
        puzzles: puzzlesFor('2.3', ['At sızmasını kes', 'Kale baskısını soğur', 'Koordineli hücum']),
      },
    ],
  },
  {
    id: 3,
    title: 'Egzotik Sıçrayıcılar ve Kanat Birlikleri',
    sub: 'Bahadır (Akıncı)',
    unvan: 'Bahadır (Akıncı)',
    sureDakika: 6,
    xp: 500,
    baraj: [13, 15],
    rozet: 'Zürafa & Egzotik Taşlar Madalyası',
    color: '#34d399',
    icon: '⚔️',
    lessons: [
      {
        id: '3.1',
        title: 'Fil (Elephant)',
        goal: 'Filin çapraz tam-2 sıçramasını ve tek-renk kilidini kavrama.',
        slides: [
          {
            emoji: '🐘',
            title: 'Fil: Tam-2 Çapraz Sıçrar',
            body: 'Fil çapraz doğrultuda tam 2 kare sıçrar; önündeki veya aradaki taşa takılmaz. Tek renk ızgarasına kilitlidir. Güç skalası: 1.5 puan.',
          },
        ],
        puzzles: puzzlesFor('3.1', ['2 kare hesabı', 'Renk kilidi', 'Sıçrama avı']),
      },
      {
        id: '3.2',
        title: 'Mancınık (WarEngine)',
        goal: 'Mancınığın ortogonal tam-2 sıçramasını kavrama.',
        slides: [
          {
            emoji: '💣',
            title: 'Mancınık: Tam-2 Düz Sıçrar',
            body: 'Mancınık yatay veya dikey tam 2 kare sıçrar; aradaki dost ya da düşman taşa takılmadan hedef kareye konar. Güç skalası: 1.8 puan.',
          },
        ],
        puzzles: puzzlesFor('3.2', ['Siper arkası vuruş', 'Tam-2 hesabı', 'Kale ile karşılaştır']),
      },
      {
        id: '3.3',
        title: 'Deve (Camel)',
        goal: 'Devenin 3+1 geniş L sıçramasıyla derin çatal atmayı anlama.',
        slides: [
          {
            emoji: '🐪',
            title: 'Deve: 3 Düz + 1 Dik',
            body: 'Deve 3 düz + 1 dik geniş L şeklinde taşların üzerinden sıçrar; derin hat çatalları atar. Güç skalası: 2.5 puan.',
          },
        ],
        puzzles: puzzlesFor('3.3', ['Derin çatal', 'Geniş L hesabı', 'At ile farkı']),
      },
      {
        id: '3.4',
        title: 'Nöbetçi (Picket)',
        goal: 'Nöbetçinin çapraz min-2 kayışını (1 gidemez, sıçrayamaz) kavrama.',
        slides: [
          {
            emoji: '🚧',
            title: 'Nöbetçi: Min-2 Çapraz Kayar',
            body: 'Nöbetçi çapraz yönde kayar ancak en az 2 kare ilerlemek zorundadır; 1 kare gidemez ve sıçrayamaz. Güç skalası: 3.5 puan. Ders arayüzünde: üzerinden geçilen ama durulamayan ara kareler turuncu nokta, yasal varışlar yeşil halka efsanesiyle anlatılır.',
          },
        ],
        puzzles: puzzlesFor('3.4', ['Durulamaz kareler', 'Ulaşılabilir hedefler', 'Min-2 tuzağı']),
      },
      {
        id: '3.5',
        title: 'Zürafa (Giraffe)',
        goal: 'Zürafanın 1 çapraz + min-3 düz hibrit kayışını kavrama.',
        slides: [
          {
            emoji: '🦒',
            title: 'Zürafa: 1 Çapraz + Min-3 Düz',
            body: 'Zürafa 1 kare çapraz adım atar, ardından aynı doğrultuda düz yönde en az 3 kare kayar; sıçrayamaz, yolu açık olmalıdır. Güç skalası: 4.0 puan.',
          },
        ],
        puzzles: puzzlesFor('3.5', ['Hibrit yol hesabı', 'Yolu açma', 'Kanat akını']),
      },
    ],
  },
  {
    id: 4,
    title: 'Temsilî Piyade Ekosistemi ve Şehzade Kuralı',
    sub: 'Bölük Komutanı',
    unvan: 'Bölük Komutanı',
    sureDakika: 4,
    xp: 800,
    baraj: [10, 12],
    rozet: 'Şehzade Tacı Rozeti',
    color: '#a78bfa',
    icon: '♟️',
    lessons: [
      {
        id: '4.1',
        title: 'Piyade Adımları',
        goal: 'Tüm piyadelerin 1 düz yürüyüp 1 çapraz aldığını, çift adım/geçerken alma olmadığını kavrama.',
        slides: [
          {
            emoji: '🚶',
            title: 'Tek Tempo Piyade',
            body: 'Tüm piyadeler daima 1 kare ileri düz yürür, 1 kare çaprazındaki taşı alır. Çift adım ve geçerken alma yoktur. 11 farklı piyadeyi ayırt etmek için taş sağ-alt köşesindeki temsil silueti (mikro-rozet) efsanesini kullan.',
          },
        ],
        puzzles: puzzlesFor('4.1', ['Tek tempo sürüş', 'Çapraz alma', 'Zincir kurma']),
      },
      {
        id: '4.2',
        title: 'Temsilî Terfi İlkesi',
        goal: 'Her piyadenin 10. yatayda yalnızca temsil ettiği figüre dönüştüğünü kavrama.',
        slides: [
          {
            emoji: '🔄',
            title: 'Aynı Figüre Terfi',
            body: 'Her piyade 10. yataya ulaştığında yalnızca arkasındaki figüre dönüşür: Mancınık Piyadesi → Mancınık, Deve Piyadesi → Deve. Serbest figür seçimi yoktur.',
          },
        ],
        puzzles: puzzlesFor('4.2', ['Doğru figüre terfi', '10. yatay yarışı', 'Terfi zamanlaması']),
      },
      {
        id: '4.3',
        title: 'Şehzade Kuralı (Prince Rule)',
        goal: 'Şah Piyadesinin Şehzade olarak girmesini kavrama.',
        slides: [
          {
            emoji: '🤴',
            title: 'Şehzade Doğar',
            body: 'Şah Piyadesi son yataya vardığında tahtaya yeni bir Şah değil, Şehzade olarak girer. Şehzade şah gibi her yöne 1 kare hareket eder.',
          },
        ],
        puzzles: puzzlesFor('4.3', ['Şehzade terfisi', 'Tek tehdidi boşa çıkar', 'Çift cepheye çevir']),
      },
      {
        id: '4.4',
        title: 'Çift Hükümdar Tehdidi',
        goal: 'Şah + Şehzade varken oyunun bitmediğini, rakibin ikisini de bertaraf etmesi gerektiğini kavrama.',
        slides: [
          {
            emoji: '👑👑',
            title: 'İki Hükümdar',
            body: 'Tahtada hem Şah hem Şehzade varken oyun bitmez; rakip her iki hükümdarı da bertaraf etmek zorundadır. Bu, kayıp görünen oyunu çift cepheli taarruza çevirir.',
          },
        ],
        puzzles: puzzlesFor('4.4', ['Çift cephe kur', 'Mat tehdidini ertele', 'Hükümdar koordinasyonu']),
      },
    ],
  },
  {
    id: 5,
    title: 'Piyadelerin Piyadesi Döngüsü (Baidhaq al-baidhaq)',
    sub: 'Emir (Büyük Taktikçi)',
    unvan: 'Emir (Büyük Taktikçi)',
    sureDakika: 4,
    xp: 1200,
    baraj: [9, 10],
    rozet: 'Çatal Işınlama Mührü',
    color: '#f59e0b',
    icon: '✨',
    lessons: [
      {
        id: '5.1',
        title: '1. Terfi (Bekleme Aşaması)',
        goal: 'Piyadelerin Piyadesinin 10. yatayda taşa dönüşmeden beklediğini kavrama.',
        slides: [
          {
            emoji: '⏳',
            title: 'Kenarda Bekler',
            body: 'Piyadelerin Piyadesi 10. yataya vardığında derhal taşa dönüşmez; tahta kenarında hareketsiz ve dokunulmaz bekler. Bu, oyunun en sofistike döngüsünün ilk adımıdır.',
          },
        ],
        puzzles: puzzlesFor('5.1', ['Bekleyen piyade', 'Kenar kare hesabı', 'Dokunulmazlık']),
      },
      {
        id: '5.2',
        title: 'Taktik Çatal Işınlanması',
        goal: 'Çatal atabilecek boş kare oluştuğunda piyadenin oraya ışınlandığını kavrama.',
        slides: [
          {
            emoji: '⚡',
            title: 'Çatal Karesine Işınlan',
            body: 'Tahtada rakibin iki taşını aynı anda tehdit edebilecek (çatal atabilecek) boş bir kare oluştuğunda, oyuncu sırası geldiğinde piyadeyi doğrudan bu kareye ışınlar. Arayüzde bu durum altın renkli “Çatal Işınlama Mevcut” butonu efsanesiyle anlatılır.',
          },
        ],
        puzzles: puzzlesFor('5.2', ['Çatal karesini bul', 'Işınla ve kazan', 'Ağır materyal avı']),
      },
      {
        id: '5.3',
        title: '2. Terfi (Orijine Dönüş)',
        goal: 'İkinci kez 10. yataya varışta Şah Piyadesi başlangıç karesine dönüşü kavrama.',
        slides: [
          {
            emoji: '🏠',
            title: 'Orijine Dönüş',
            body: 'İkinci kez 10. yataya vardığında, kendi Şah Piyadesinin başlangıç karesine ışınlanır ve sıfırdan yürür.',
          },
        ],
        puzzles: puzzlesFor('5.3', ['Orijin karesi', 'Sıfırdan yürüyüş'], undefined),
      },
      {
        id: '5.4',
        title: '3. Terfi (Maceracı Şah)',
        goal: 'Üçüncü varışta Maceracı Şah unvanını ve hisar kilitleme gücünü kavrama.',
        slides: [
          {
            emoji: '🏵️',
            title: 'Maceracı Şah',
            body: 'Üçüncü kez son yataya ulaştığında nihayet Maceracı Şah unvanını alır; Şah gibi hareket eder ve hisar kilitleme gücü kazanır.',
          },
        ],
        puzzles: puzzlesFor('5.4', ['Maceracı Şah terfisi', 'Kilitleme hazırlığı'], undefined),
      },
    ],
  },
  {
    id: 6,
    title: 'Hükümdarlık Hakları, Hisar Savunması ve Zafer Şartları',
    sub: 'Noyan (Başkomutan)',
    unvan: 'Noyan (Başkomutan)',
    sureDakika: 5,
    xp: 1800,
    baraj: [11, 12],
    rozet: 'Altın Hisar & Usta Noyan Beratı',
    color: '#f43f5e',
    icon: '👑',
    lessons: [
      {
        id: '6.1',
        title: 'Şah Takası Manevrası',
        goal: 'Maçta 1 kez, şah tehdit altındayken dost taşla yer değiştirme hakkını kavrama.',
        slides: [
          {
            emoji: '🔀',
            title: 'Tek Seferlik Takas',
            body: 'Müsabaka boyunca yalnızca 1 defaya mahsus, Şah tehdit altındayken tahtadaki herhangi bir dost taşla anında yer değiştirebilir. Bu hak oyun sonu kurtuluş manevrasıdır.',
          },
        ],
        puzzles: puzzlesFor('6.1', ['Takas ile kurtul', 'Doğru dost taşı seç', 'Tek hakkı sakla']),
      },
      {
        id: '6.2',
        title: 'Hisar Beraberliği',
        goal: 'Zayıf tarafın rakip hisara girerek berabereyi koparmasını kavrama.',
        slides: [
          {
            emoji: '🏰',
            title: 'Sığınağa Gir, Berabere Kal',
            body: 'Materyalce zayıflayan tarafın Şahı rakip hisar karesine girmeyi başarırsa oyun anında berabere sonuçlanır. Dış hisar cepleri kalın altın sarısı bordür ve kale mazgalı ikonuyla tahtadan ayrılır.',
          },
        ],
        puzzles: puzzlesFor('6.2', ['Hisara sığın', 'Kayıp oyunda beraberlik', 'Sığınma yolu aç']),
      },
      {
        id: '6.3',
        title: 'Hisar Kilitleme',
        goal: 'Kendi hisarına girebilen tek figürün Maceracı Şah olduğunu kavrama.',
        slides: [
          {
            emoji: '🔒',
            title: 'Kilitleme: Yalnızca Maceracı Şah',
            body: 'Kendi hisarına girebilen yegane figür Maceracı Şah’tır. Oraya girerek rakip Şahın sığınmasını kilitler.',
          },
        ],
        puzzles: puzzlesFor('6.3', ['Kilit karesine gir', 'Rakip sığınağı kapat'], undefined),
      },
      {
        id: '6.4',
        title: 'Pat ile Kesin Zafer',
        goal: 'Rakibi hamlesiz bırakmanın kesin galibiyet olduğunu kavrama.',
        slides: [
          {
            emoji: '⛓️',
            title: 'Pat = Galibiyet',
            body: 'Rakibi yasal hamlesiz bırakarak pat durumuna sokan taraf oyunu kesin galibiyetle kazanır. Standart satrançtaki beraberlik burada yoktur; pat bırakan kazanır.',
          },
        ],
        puzzles: puzzlesFor('6.4', ['Pat ağı kur', 'Hamlesiz bırak', 'Zaferi kilitle'], undefined),
      },
      {
        id: '6.5',
        title: 'Yalın Şah (Soyutlama) Zaferi',
        goal: 'Rakip orduyu yok edip şahı yalnız bırakmanın doğrudan zafer olduğunu kavrama.',
        slides: [
          {
            emoji: '🏆',
            title: 'Yapayalnız Şah',
            body: 'Rakibin tüm ordusunu yok edip Şahını yapayalnız bırakan taraf doğrudan kazanır. Materyal üstünlüğünü zorla değişimlerle somut zafere çevir.',
          },
        ],
        puzzles: puzzlesFor('6.5', ['Orduyu erit', 'Yalın şah bırak', 'Doğrudan zafer'], undefined),
      },
    ],
  },
];

// ─── PDF Tablo-2: Taş rehberi (arayüz sırası) ────────────────────────────────
export const PIECE_GUIDES: PieceGuide[] = [
  { key: 'king', name: 'Şah', symbol: 'Ş', value: '∞', color: '#f59e0b', move: 'Komşu 8 kareye 1 adım hareket eder ve taş alır. Rok yapamaz.', terfi: 'Şehzade (Prince)' },
  { key: 'rook', name: 'Kale', symbol: 'K', value: '5.5', color: '#60a5fa', move: 'Yatay ve dikey yönde kesintisiz kayar. Taş üzerinden atlayamaz.', terfi: 'Kale' },
  { key: 'giraffe', name: 'Zürafa', symbol: 'Z', value: '4.0', color: '#facc15', move: '1 kare çapraz adım atar, ardından aynı doğrultuda düz yönde en az 3 kare kayar (sıçrayamaz, yolu açık olmalıdır).', terfi: 'Zürafa' },
  { key: 'picket', name: 'Nöbetçi', symbol: 'N', value: '3.5', color: '#fb923c', move: 'Çapraz yönde kayar; ancak en az 2 kare ilerlemek zorundadır (1 kare gidemez, sıçrayamaz).', terfi: 'Nöbetçi' },
  { key: 'knight', name: 'At', symbol: 'A', value: '2.8', color: '#00d4c4', move: '2 düz + 1 dik klasik “L” şeklinde sıçrar. Aradaki taşların üzerinden atlar.', terfi: 'At' },
  { key: 'camel', name: 'Deve', symbol: 'D', value: '2.5', color: '#fb7185', move: '3 düz + 1 dik geniş “L” şeklinde sıçrar. Dost ya da düşman taşların üzerinden atlar.', terfi: 'Deve' },
  { key: 'warMachine', name: 'Mancınık', symbol: 'M', value: '1.8', color: '#f87171', move: 'Yatay veya dikey yönde tam 2 kare sıçrar. Önündeki taşa takılmadan hedef kareye konar.', terfi: 'Mancınık' },
  { key: 'bishop', name: 'Fil', symbol: 'F', value: '1.5', color: '#34d399', move: 'Çapraz yönde tam 2 kare sıçrar. Önündeki veya aradaki taşa takılmaz; tek renk ızgarasına kilitlidir.', terfi: 'Fil' },
  { key: 'queen', name: 'Vezir', symbol: 'V', value: '1.3', color: '#a78bfa', move: 'Yatay veya dikey yalnızca 1 kare gider ve taş alır. Çapraz gidemez.', terfi: 'Vezir' },
  { key: 'general', name: 'Fers', symbol: 'Fe', value: '1.2', color: '#94a3b8', move: 'Çapraz yönde yalnızca 1 kare gider ve taş alır. Düz gidemez.', terfi: 'Fers' },
  { key: 'pawn', name: 'Piyade', symbol: 'P', value: '1', color: '#d1d5db', move: 'Daima 1 kare ileri düz yürür, 1 kare çaprazındaki taşı alır. Çift adım ve geçerken alma yoktur.', terfi: 'Temsil ettiği figür' },
  {
    key: 'prince', name: 'Şehzade', symbol: 'Şz', value: '—', color: '#fde68a',
    move: 'Şah Piyadesinin terfisiyle girer; Şah gibi her yöne 1 kare hareket eder. Şah + Şehzade varken oyun bitmez.',
    terfi: 'Terfi ile girer', engineNote: 'Geleneksel kural anlatımı esastır.',
  },
  {
    key: 'adventurousKing', name: 'Maceracı Şah', symbol: 'MŞ', value: '3.0', color: '#fbbf24',
    move: 'Piyadelerin Piyadesi döngüsünün 3. terfisiyle girer; Şah gibi hareket eder ve hisar kilitleme gücü kazanır.',
    terfi: 'Piyadelerin Piyadesi döngüsü',
  },
];

// ─── PDF §3 + §6: Kural kartları ─────────────────────────────────────────────
export const RULE_ENTRIES: RuleEntry[] = [
  { title: 'Tahta: 112 Kare', icon: '📐', desc: '10x11 ana gövde (110) + 2 hisar cebi = 112 kare. Renksiz zemin; hareketler koordinat ve mesafe vektörlerine göre hesaplanır.' },
  { title: 'Ordu: 28 Taş', icon: '♟️', desc: '17 figür + 11 piyade. Standart satrançtaki 16 taşlık ordudan çok daha geniştir.' },
  { title: 'Piyade Temposu', icon: '🚶', desc: 'Tüm piyadeler yalnızca 1 kare ilerler. İlk hamlede 2 kare çıkış yoktur.' },
  { title: 'Rok ve Geçerken Alma Yok', icon: '🚫', desc: 'Rok kesinlikle yoktur, geçerken alma yoktur.' },
  { title: 'Pat = Kesin Galibiyet', icon: '⛓️', desc: 'Pat bırakan oyuncu kazanır (0.5–0.5 yok). Rakibi yasal hamlesiz bırak, oyunu al.' },
  { title: 'Temsilî Terfi', icon: '🔄', desc: 'Her piyade yalnızca temsil ettiği figüre dönüşür; serbest figür seçimi yoktur.' },
  { title: 'Şah Takası (1x)', icon: '🔀', desc: 'Müsabakada 1 defaya mahsus, Şah tehdit altındayken dost taşla anında yer değiştirme.' },
  { title: 'Hisar Beraberliği', icon: '🏰', desc: 'Zayıf tarafın Şahı rakip hisara girerse oyun anında berabere biter.' },
  { title: 'Hisar Kilitleme', icon: '🔒', desc: 'Kendi hisarına girebilen tek figür Maceracı Şah’tır; rakip sığınmayı kilitler.' },
  { title: 'Yalın Şah Zaferi', icon: '🏆', desc: 'Rakip ordunun tamamını yok edip Şahı yapayalnız bırakan taraf doğrudan kazanır.', engineNote: 'Geleneksel kural anlatımı esastır; oyun motoruna sonraki fazda eklenecek.' },
  { title: 'Notasyon: a–k + H-SOL/H-SAĞ', icon: '🔢', desc: 'Dikey hatlar a–k, yataylar 1–10; dış cepler H-SOL ve H-SAĞ olarak kaydedilir.' },
];

export const TOTAL_LESSONS = LEARN_LEVELS.reduce((n, l) => n + l.lessons.length, 0); // 25
export const TOTAL_PUZZLES = LEARN_LEVELS.reduce(
  (n, l) => n + l.lessons.reduce((m, d) => m + d.puzzles.length, 0),
  0,
); // 70
export const TOTAL_XP = LEARN_LEVELS.reduce((n, l) => n + l.xp, 0); // 4650

// ─── Bozuk localStorage verisi toleransı (saf; react importu YOK — node test harness uyumlu) ──
/**
 * Bozuk/elle düzenlenmiş ilerleme verisini güvenli duruma indirger:
 * bilinmeyen ders id'lerini atar, yinelenenleri tekler, "devam et" imleçlerini
 * sayı + seviye aralığına kelepçeler. learnProgress.loadInitial burayı kullanır.
 */
export function sanitizeLearnProgress(raw: unknown): {
  completedLessons: string[];
  lastLessonIdxByLevel: Record<number, number>;
} {
  const empty = { completedLessons: [] as string[], lastLessonIdxByLevel: {} as Record<number, number> };
  if (typeof raw !== 'object' || raw === null) return empty;
  const rec = raw as Record<string, unknown>;
  const knownIds = new Set<string>(LEARN_LEVELS.flatMap((l) => l.lessons.map((d) => d.id)));
  const completed = Array.isArray(rec.completedLessons)
    ? Array.from(
        new Set(
          rec.completedLessons.filter(
            (id): id is string => typeof id === 'string' && knownIds.has(id),
          ),
        ),
      )
    : [];
  const last: Record<number, number> = {};
  if (typeof rec.lastLessonIdxByLevel === 'object' && rec.lastLessonIdxByLevel !== null) {
    for (const [k, v] of Object.entries(rec.lastLessonIdxByLevel)) {
      const levelId = Number(k);
      if (!Number.isInteger(levelId)) continue;
      const level = LEARN_LEVELS.find((l) => l.id === levelId);
      if (!level || typeof v !== 'number' || !Number.isFinite(v)) continue;
      last[levelId] = Math.min(Math.max(0, Math.floor(v)), Math.max(0, level.lessons.length - 1));
    }
  }
  return { completedLessons: completed, lastLessonIdxByLevel: last };
}
