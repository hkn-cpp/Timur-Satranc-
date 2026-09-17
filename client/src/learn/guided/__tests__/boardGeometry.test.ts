/**
 * boardGeometry kanıtı: 112 karenin hepsi tanımlı, NaN yok, çakışma yok,
 * 110 ve 111 açıkça kapsanıyor (satır/sütun aritmetiğiyle değil, cep yoluyla).
 */
import { allSquares, squareCell, squareCenterUnit } from '../../../components/board/boardGeometry';

export interface TestSummary {
  passed: number;
  failed: number;
}

export function runBoardGeometryTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  const ok = (cond: boolean, name: string): void => {
    if (cond) passed++;
    else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  };

  const all = allSquares();
  ok(all.length === 112, 'B01 112 kare');
  ok(all.includes(110) && all.includes(111), 'B02 110 ve 111 kapsanıyor');

  const centers = new Map<string, number>();
  let nan = 0;
  for (const s of all) {
    const c = squareCenterUnit(s);
    if (!c || Number.isNaN(c.x) || Number.isNaN(c.y)) {
      nan++;
      continue;
    }
    const key = `${c.x.toFixed(4)}|${c.y.toFixed(4)}`;
    centers.set(key, (centers.get(key) ?? 0) + 1);
  }
  ok(nan === 0, 'B03 NaN yok');
  ok(centers.size === 112, 'B04 çakışma yok');

  const tl = squareCell(110);
  const br = squareCell(111);
  ok(tl?.kind === 'citadel' && (tl as { side: string }).side === 'left', 'B05 110 sol cep');
  ok(br?.kind === 'citadel' && (br as { side: string }).side === 'right', 'B06 111 sağ cep');
  ok(squareCell(112) === null && squareCenterUnit(112) === null, 'B07 aralık dışı null');

  return { passed, failed };
}
