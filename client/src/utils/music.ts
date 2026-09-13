import track1Url from '../assets/satranç_sesleri/Strategic Silence.mp3';
import track2Url from '../assets/satranç_sesleri/Strategic Silence (1).mp3';

/**
 * Arka plan müziği yöneticisi — modül seviyesinde TEKİL (singleton).
 *
 * Kesintisizlik garantisi: Audio nesneleri React ağacının DIŞINDA, modül
 * kapsamında yaşar. SPA sayfa geçişleri (currentPage state değişimi) bu
 * nesnelere dokunmaz; App köke bir kez bağlanır, bir daha oluşturulmaz.
 * Bu yüzden müzik sayfa değişiminde duraksamaz / başa sarmaz.
 *
 * Oyun SFX'lerine (utils/sound.ts) dokunulmaz: ayrı element, ayrı ses
 * seviyesi. Müzik bilerek düşük seste çalar.
 */

const MUSIC_VOLUME = 0.02;
const STORAGE_KEY = 'timur-music-enabled';

const TRACK_URLS = [track1Url, track2Url];

type Listener = (enabled: boolean) => void;

let audios: HTMLAudioElement[] = [];
let currentIndex = 0;
let enabled = true;
let started = false;
let initialized = false;
const listeners = new Set<Listener>();

function readStoredPreference(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    // private mode vb. — varsayılan açık
  }
  return true;
}

function notify(): void {
  for (const l of listeners) {
    try {
      l(enabled);
    } catch {
      // dinleyici hatası müziği durdurmasın
    }
  }
}

function playCurrent(): void {
  if (typeof Audio === 'undefined') return;
  if (!enabled) return;
  const el = audios[currentIndex];
  if (!el) return;
  try {
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Autoplay engeli: ilk kullanıcı etkileşiminde unlock ile denenecek
      });
    }
  } catch {
    // sessiz geç
  }
}

/** Bir kez kurulur (App kökünden çağrılır). Tekrar çağrılar no-op'tur. */
export function initBackgroundMusic(): void {
  if (initialized || typeof Audio === 'undefined') return;
  initialized = true;
  enabled = readStoredPreference();

  audios = TRACK_URLS.map((url, i) => {
    const el = new Audio(url);
    el.preload = 'auto';
    el.volume = MUSIC_VOLUME;
    // Parça bitince sıradakine geç → iki müzik sonsuz döngü
    el.addEventListener('ended', () => {
      currentIndex = (i + 1) % audios.length;
      // Kısa gecikmesiz geçiş; pause edilmişse (kapalıysa) çalma
      if (enabled) playCurrent();
    });
    try {
      void el.load?.();
    } catch {
      // yoksay
    }
    return el;
  });

  // Otomatik başlatmayı dene (çoğu tarayıcı etkileşim öncesi engeller;
  // unlock için ilk pointer/keydown'da tekrar denenecek).
  ensureMusicPlaying();
}

/** Kullanıcı etkileşimi sonrası / periyodik olarak çalmayı güvenceye al. */
export function ensureMusicPlaying(): void {
  if (!initialized || typeof Audio === 'undefined') return;
  if (!enabled) return;
  const el = audios[currentIndex];
  if (!el) return;
  if (!el.paused && !el.ended) {
    started = true;
    return;
  }
  started = true;
  playCurrent();
}

export function isMusicEnabled(): boolean {
  return enabled;
}

/**
 * Aç/kapat. Kapatınca `pause()` ile dondurulur (currentTime korunur) →
 * tekrar açılınca kaldığı yerden devam eder, başa sarmaz.
 */
export function setMusicEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // yoksay
  }
  if (typeof Audio !== 'undefined' && initialized) {
    if (!next) {
      for (const el of audios) {
        try {
          el.pause();
        } catch {
          // yoksay
        }
      }
    } else {
      playCurrent();
    }
  }
  notify();
}

export function toggleMusic(): boolean {
  setMusicEnabled(!enabled);
  return enabled;
}

export function subscribeMusic(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Modül ilk import edildiğinde tercihi belleğe al (Audio kurulumu init'te).
enabled = typeof localStorage !== 'undefined' ? readStoredPreference() : true;
export { started };
