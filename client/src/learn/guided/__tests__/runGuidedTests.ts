/**
 * Rehberli ders test koşusu (çekirdek runTests'e dokunmadan):
 * `npm run test:guided` ile çalışır.
 */
declare const process: { exit: (code: number) => void };

import { runGuidedValidateFixtureTests } from './validate.test';
import { runGuidedMachineTests } from './machine.test';
import { runStagedPositionTests } from './staged-positions.test';
import { runBoardGeometryTests } from './boardGeometry.test';
import { runProgressTests } from '../../progress/__tests__/progress.test';

function main(): void {
  const parts = [
    runGuidedValidateFixtureTests(),
    runGuidedMachineTests(),
    runStagedPositionTests(),
    runBoardGeometryTests(),
    runProgressTests(),
  ];
  const passed = parts.reduce((n, p) => n + p.passed, 0);
  const failed = parts.reduce((n, p) => n + p.failed, 0);
  console.log(`GUIDED TOTAL: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
  if (failed !== 0) throw new Error(`${failed} guided test failed`);
}

main();
