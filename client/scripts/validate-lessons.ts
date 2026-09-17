/**
 * `npm run validate:lessons` çekirdeği (Bölüm 6).
 * client/ dizininden: node ile çalışır; isim tablosunu
 * `docs/koc-motoru/02-isim-tablosu.md` dosyasından OKUR.
 */
declare const require: unknown;
declare const process: { argv: string[]; exit: (code: number) => void };

import { validateGuidedSet, formatReport } from '../src/learn/guided/validate';
import { GUIDED_LESSONS } from '../src/learn/guided/content/index';
import { parseForbiddenNames } from '../src/learn/guided/lint-names';

const req = require as {
  (id: 'fs'): { readFileSync: (p: string, enc: string) => string; existsSync: (p: string) => boolean };
  (id: 'path'): { resolve: (...parts: string[]) => string };
};
const fs = req('fs');
const path = req('path');

function main(): void {
  const namesFile = process.argv[2] ?? 'docs/koc-motoru/02-isim-tablosu.md';
  const resolved = path.resolve(namesFile);
  if (!fs.existsSync(resolved)) {
    console.log(`[madde 12] ders * adım -1: isim tablosu yok: ${namesFile}`);
    process.exit(1);
  }
  const names = parseForbiddenNames(fs.readFileSync(resolved, 'utf8'));
  if (names.length === 0) {
    console.log(`[madde 12] ders * adım -1: isim tablosu parse edilemedi: ${namesFile}`);
    process.exit(1);
  }
  const issues = validateGuidedSet(GUIDED_LESSONS, { forbiddenNames: names });
  console.log(formatReport(issues));
  console.log(`ders: ${GUIDED_LESSONS.length}, sorun: ${issues.length}`);
  process.exit(issues.length === 0 ? 0 : 1);
}

main();
