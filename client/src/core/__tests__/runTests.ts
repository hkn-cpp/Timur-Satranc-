/**
 * Faz 1+2 (+4/5/6/8) test entry'si: Game Core + Engine + Eval + Bot + Worker + Analyzer.
 * Çalıştırma (client/ dizininden):
 *   npx tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node \
 *     --outDir "<TEMP>/timur-tests" "src/core/__tests__/runTests.ts"
 *   node "<TEMP>/timur-tests/core/__tests__/runTests.js"
 *veya kısaca: npm test
 */
declare const process: any;
import { runGameCoreTests } from './gameCore.test';
import { runExportTests } from '../notation/__tests__/export.test';
import { runEngineTests } from '../../engine/__tests__/engine.test';
import { runEvalTests } from '../../engine/__tests__/evaluation.test';
import { runHardeningTests } from '../../engine/__tests__/hardening.test';
import { runBotTests } from '../../bot/__tests__/profiles.test';
import { runCalibrationTests } from '../../bot/__tests__/calibration.test';
import { runWorkerTests } from '../../worker/__tests__/worker.test';
import { runAnalyzerTests } from '../../analyzer/__tests__/analyzer.test';
import { runBotGameTests } from '../../bot/__tests__/botgame.test';
import { runThresholdTests } from '../../analyzer/__tests__/thresholds.test';
import { runLearnTests } from '../../learn/__tests__/learn.test';
import { runGuidedLessonTests } from '../../learn/__tests__/guidedLessons.test';
import { runReviewRegressionTests } from '../../analyzer/__tests__/reviewRegression.test';
import { runReviewConcurrencyTests } from '../../analyzer/__tests__/reviewConcurrency.test';
import { runGameHooksTests } from '../../hooks/__tests__/gameHooks.test';
import { runAgent1RegressionTests } from '../rules/__tests__/agent1.regression.test';
import { runPromotionCycleTests } from '../rules/__tests__/promotionCycle.test';
import { runSearchAuditTests } from '../../engine/__tests__/searchAudit.test';
import { runSelectionTests } from '../../bot/__tests__/selection.test';
import { runAnalysisLineFixesTests } from '../../analyzer/__tests__/analysisLineFixes.test';

async function main(): Promise<void> {
  const core = runGameCoreTests();
  const exp = runExportTests();
  const eng = await runEngineTests();
  const ev = runEvalTests();
  const hard = await runHardeningTests();
  const bot = runBotTests();
  const calib = runCalibrationTests();
  const worker = await runWorkerTests();
  const analyzer = await runAnalyzerTests();
  const botgame = await runBotGameTests();
  const thresholds = runThresholdTests();
  const learn = runLearnTests();
  const guided = runGuidedLessonTests();
  const review = await runReviewRegressionTests();
  const concur = await runReviewConcurrencyTests();
  const hooksT = runGameHooksTests();
  const agent1 = runAgent1RegressionTests();
  const promo = runPromotionCycleTests();
  const audit = runSearchAuditTests();
  const select = runSelectionTests();
  const linefix = runAnalysisLineFixesTests();
  const passed = core.passed + exp.passed + eng.passed + ev.passed + hard.passed + bot.passed + calib.passed + worker.passed + analyzer.passed + botgame.passed + thresholds.passed + learn.passed + guided.passed + review.passed + concur.passed + hooksT.passed + agent1.passed + promo.passed + audit.passed + select.passed + linefix.passed;
  const failed = core.failed + exp.failed + eng.failed + ev.failed + hard.failed + bot.failed + calib.failed + worker.failed + analyzer.failed + botgame.failed + thresholds.failed + learn.failed + guided.failed + review.failed + concur.failed + hooksT.failed + agent1.failed + promo.failed + audit.failed + select.failed + linefix.failed;
  console.log(`TOTAL: ${passed} passed, ${failed} failed`);
  if (typeof process !== 'undefined') process.exit(failed === 0 ? 0 : 1);
  if (failed !== 0) throw new Error(`${failed} test failed`);
}

main();
