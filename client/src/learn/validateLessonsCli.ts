/**
 * `npm run validate:lessons` entry'si (client/ dizininden çalışır).
 *
 *  tsc ... --outDir build/validate-tmp src/learn/validateLessonsCli.ts
 *  node build/validate-tmp/learn/validateLessonsCli.js [isim-tablosu-yolu]
 *
 * Varsayılan isim tablosu: docs/koc-motoru/02-isim-tablosu.md (client'a göre
 * göreli; repo-köküne göre client/docs/koc-motoru/02-isim-tablosu.md).
 * Beklenen format: her satırda bir ad (`- Ad` maddeleri; virgüllü satırlar
 * bölünür, tırnak/backtick temizlenir). İKİNCİ LİSTE BURADA YOK — dosya
 * okunamaz/boşsa doğrulama madde 12 hatası verir, exit 1.
 */
declare const require: unknown;
declare const process: { argv: string[]; exit: (code: number) => void };
declare const __dirname: string;

import { formatReport, validateLessonSet } from './lessonValidator';
import { GUIDED_LESSONS } from './lessons/index';

const req = require as {
  (id: 'fs'): {
    readFileSync: (p: string, enc: string) => string;
    existsSync: (p: string) => boolean;
  };
  (id: 'path'): { resolve: (...parts: string[]) => string };
};
const fs = req('fs');
const path = req('path');

function loadForbiddenNames(file: string): { names: string[]; error: string | null } {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    return { names: [], error: `isim tablosu yok: ${file}` };
  }
  const text = fs.readFileSync(resolved, 'utf8');
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+(.+)$/.exec(line);
    if (!m) continue;
    for (const part of m[1].split(/[,;]/)) {
      const clean = part.replace(/[`'"]/g, '').trim();
      if (clean.length > 0) names.push(clean);
    }
  }
  if (names.length === 0) return { names: [], error: `isim tablosu parse edilemedi (madde listesi yok): ${file}` };
  return { names, error: null };
}

function main(): void {
  const namesFile = process.argv[2] ?? 'docs/koc-motoru/02-isim-tablosu.md';
  const loaded = loadForbiddenNames(namesFile);
  if (loaded.error) {
    console.log(`[madde 12] ders * adım -1: ${loaded.error}`);
    process.exit(1);
  }
  const issues = validateLessonSet(GUIDED_LESSONS, { forbiddenNames: loaded.names });
  console.log(formatReport(issues));
  console.log(`ders: ${GUIDED_LESSONS.length}, sorun: ${issues.length}`);
  process.exit(issues.length === 0 ? 0 : 1);
}

main();
