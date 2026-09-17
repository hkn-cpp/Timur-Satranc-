/**
 * K10 kanıtı: migrasyonda XP ve tamamlanmış ders sayısı ASLA azalmaz;
 * açılmış seviye geri kilitlenmez.
 */
import { awardForLesson } from '../xp';
import { migrateV1toV2, totalXpV2, V1_BACKUP_KEY, V1_KEY, V2_KEY, type ProgressV2 } from '../schema';
import { recordLessonComplete, recordLessonAward, isGuidedLevelUnlocked } from '../store';

export interface TestSummary {
  passed: number;
  failed: number;
}

function memStorage(initial: Record<string, string> = {}): {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

export function runProgressTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  const ok = (cond: boolean, name: string): void => {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  };

  // XP azaltma tablosu
  ok(awardForLesson(100, 0, false, false) === 100, 'P01 ipucusuz %100');
  ok(awardForLesson(100, 1, false, false) === 80, 'P02 tek ipucu %80');
  ok(awardForLesson(100, 3, false, false) === 60, 'P03 çok ipucu %60');
  ok(awardForLesson(100, 0, true, false) === 50, 'P04 SKIP %50 tavan');
  ok(awardForLesson(100, 0, false, true) === 0, 'P05 tekrar 0 XP');

  // Migrasyon: v1 korunur + yedek yazılır
  const v1 = { completedLessons: ['1.1', '1.2'], lastLessonIdxByLevel: { 1: 2 } };
  const store = memStorage({ [V1_KEY]: JSON.stringify(v1) });
  const v2 = migrateV1toV2(store);
  ok(v2.completedLessons.includes('1.1') && v2.completedLessons.includes('1.2'), 'P06 ders sayısı azalmaz');
  ok(store.data[V1_BACKUP_KEY] === JSON.stringify(v1), 'P07 v1 yedeği yazılır');

  // XP azalmaz: mevcut v2 + v1 birleşir, tekrar tamamlama toplamı düşürmez
  const withXp: ProgressV2 = {
    ...v2,
    xpByLesson: { '1.1': 25, '1.2': 25 },
    hintsUsed: {},
    completedStepIndex: {},
    skippedLessons: [],
    badges: [],
    titles: [],
  };
  store.data[V2_KEY] = JSON.stringify(withXp);
  const merged = migrateV1toV2(store);
  const before = totalXpV2({ ...merged, xpByLesson: withXp.xpByLesson });
  ok(before === 50, 'P08 mevcut XP korunur');
  const afterRepeat = recordLessonComplete({ ...merged, xpByLesson: { ...withXp.xpByLesson } }, '1.1', { hintsUsed: 0, skipped: false });
  ok(totalXpV2(afterRepeat) === 50, 'P09 tekrar toplamı düşürmez');
  ok(afterRepeat.completedLessons.length === merged.completedLessons.length, 'P10 tekrar listeyi şişirmez');

  // Kilit: seviye 2, seviye 1 bitmeden açılmaz; bitince açılır
  ok(isGuidedLevelUnlocked(merged, 1) === true, 'P11 seviye 1 açık');
  const allL1 = ['1.1', '1.2', '1.3', '1.4'];
  const locked = isGuidedLevelUnlocked({ ...merged, completedLessons: ['1.1'] }, 2);
  ok(locked === false, 'P12 eksik ders kilitli tutar');
  const unlocked = isGuidedLevelUnlocked({ ...merged, completedLessons: allL1 }, 2);
  ok(unlocked === true, 'P13 tamamlama kilidi açar');

  // K12: makine ödülü aynen yazılır (çift indirim yok), tekrar azaltmaz
  const awarded = recordLessonAward(merged, '1.3', 20, { badge: undefined });
  ok(awarded.xpByLesson['1.3'] === 20, 'P14 makine ödülü aynen yazılır');
  ok(totalXpV2(awarded) === totalXpV2({ ...merged, xpByLesson: { ...withXp.xpByLesson } }) + 20, 'P15 toplam artar');
  const awardedAgain = recordLessonAward(awarded, '1.3', 20, { badge: undefined });
  ok(totalXpV2(awardedAgain) === totalXpV2(awarded), 'P16 tekrar toplamı düşürmez/artırmaz');
  const badged = recordLessonAward(awarded, '1.4', 25, { badge: 'Tahta ve Temel Süvari Rozeti' });
  ok(badged.badges.includes('Tahta ve Temel Süvari Rozeti'), 'P17 rozet yazılır');
  ok(badged.titles.includes('Karavul'), 'P18 seviye bitince unvan yazılır');

  return { passed, failed };
}
