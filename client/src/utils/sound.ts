import sahUrl from '../assets/satranç_sesleri/sah.wav';
import yemeUrl from '../assets/satranç_sesleri/yeme.wav';
import hamle06Url from '../assets/satranç_sesleri/tas_hamle_06.wav';
import hamle07Url from '../assets/satranç_sesleri/tas_hamle_07.wav';
import hamle09Url from '../assets/satranç_sesleri/tas_hamle_09.wav';

export interface MoveSoundInfo {
  capturedPiece?: unknown;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

const MOVE_URLS = [hamle06Url, hamle07Url, hamle09Url];
const VOLUME = 0.6;

// İlk hamlede gecikme olmasın diye modül yüklenirken önbelleğe al.
const preloaded: HTMLAudioElement[] = [];
if (typeof Audio !== 'undefined') {
  for (const url of [sahUrl, yemeUrl, ...MOVE_URLS]) {
    try {
      const el = new Audio(url);
      el.preload = 'auto';
      el.volume = VOLUME;
      void el.load?.();
      preloaded.push(el);
    } catch {
      // SSR/test ortamında sessiz geç
    }
  }
}

function playUrl(url: string): void {
  if (typeof Audio === 'undefined') return;
  try {
    const el = new Audio(url);
    el.volume = VOLUME;
    void el.play().catch(() => {
      // Autoplay engeli / dosya yoksa oyunu bozma, sessiz geç
    });
  } catch {
    // Audio oluşturulamazsa sessiz geç
  }
}

/**
 * Hamle sesini seçip çalar. Öncelik: şah/mat > yeme > rastgele normal hamle.
 * Tüm oyun ekranları useGame üzerinden buraya düşer.
 */
export function playMoveSound(info: MoveSoundInfo): void {
  if (info.isCheck || info.isCheckmate) {
    playUrl(sahUrl);
    return;
  }
  if (info.capturedPiece) {
    playUrl(yemeUrl);
    return;
  }
  playUrl(MOVE_URLS[Math.floor(Math.random() * MOVE_URLS.length)]);
}
