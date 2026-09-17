/**
 * 25 rehberli ders (Seviye 1 → 6).
 */
import type { GuidedLesson } from '../types';
import { LEVEL1_LESSONS } from './level1';
import { LEVEL2_LESSONS } from './level2';
import { LEVEL3_LESSONS } from './level3';
import { LEVEL4_LESSONS } from './level4';
import { LEVEL5_LESSONS } from './level5';
import { LEVEL6_LESSONS } from './level6';

export const GUIDED_LESSONS: GuidedLesson[] = [
  ...LEVEL1_LESSONS,
  ...LEVEL2_LESSONS,
  ...LEVEL3_LESSONS,
  ...LEVEL4_LESSONS,
  ...LEVEL5_LESSONS,
  ...LEVEL6_LESSONS,
];
