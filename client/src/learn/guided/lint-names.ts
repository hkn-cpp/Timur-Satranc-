/**
 * İsim lint'i (madde 12). Yasak liste DOSYADAN OKUNUR
 * (`client/docs/koc-motoru/02-isim-tablosu.md`); ikinci liste yazılmaz.
 */
export function parseForbiddenNames(markdown: string): string[] {
  const names: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+(.+)$/.exec(line);
    if (!m) continue;
    for (const part of m[1].split(/[,;]/)) {
      const clean = part.replace(/[`'"]/g, '').trim();
      if (clean.length > 0) names.push(clean);
    }
  }
  return names;
}

function lintTokens(s: string): string[] {
  return s.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
}

/** Metinde yasak ad geçiyor mu (çekimli haller prefix-eşleşmeyle yakalanır)? */
export function findForbiddenHit(text: string, forbiddenNames: string[]): string | null {
  const forbidden = forbiddenNames.map((n) => n.toLocaleLowerCase('tr-TR'));
  for (const tok of lintTokens(text)) {
    const hit = forbidden.find((f) => f.length > 0 && tok.startsWith(f));
    if (hit !== undefined) return hit;
  }
  return null;
}
