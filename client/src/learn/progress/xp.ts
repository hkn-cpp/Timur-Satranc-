/**
 * Ders içi XP hesabı (Bölüm 11.2) — saf fonksiyonlar.
 *
 * ipucu yok      -> %100
 * 1 ipucu        -> %80
 * 2+ ipucu       -> %60
 * SKIP           -> %50 tavan
 * tekrar         -> 0 XP (ilerlemeyi bozmaz)
 * tuzak denemesi -> ceza yok
 */
export function awardForLesson(baseXp: number, hintsUsed: number, skipped: boolean, isRepeat: boolean): number {
  if (isRepeat) return 0;
  if (skipped) return Math.floor(baseXp * 0.5);
  if (hintsUsed <= 0) return baseXp;
  if (hintsUsed === 1) return Math.floor(baseXp * 0.8);
  return Math.floor(baseXp * 0.6);
}

export const LEVEL_XP: Record<number, number> = {
  1: 100,
  2: 250,
  3: 500,
  4: 800,
  5: 1200,
  6: 1800,
};

export const GRAND_XP = 4650;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Karavul',
  2: 'Keshik',
  3: 'Bahadır',
  4: 'Yüzbaşı',
  5: 'Emir',
  6: 'Noyan',
};

export const LEVEL_BADGES: Record<number, string> = {
  1: 'Tahta ve Temel Süvari Rozeti',
  2: 'Saray Kalkanı Rozeti',
  3: 'Zürafa & Sıçrayıcılar Nişanı',
  4: 'Temsili Terfi & Şehzade Tacı',
  5: 'Çatal Işınlama Mührü',
  6: 'Altın Hisar & Usta Noyan Sertifikası',
};

/** Seviye geçiş şartı: o seviyenin tüm dersleri tamamlanmış. */
export function isLevelComplete(levelLessonIds: readonly string[], completedLessons: readonly string[]): boolean {
  return levelLessonIds.every((id) => completedLessons.includes(id));
}
