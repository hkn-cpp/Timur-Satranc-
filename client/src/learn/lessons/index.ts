/**
 * Ders kayıt defteri: 25 rehberli ders `learn/guided/content` içinde yaşar;
 * doğrulayıcı (`validateLessonsCli`) bu diziyi okur (madde 1 tam 25 ders).
 */
import type { GuidedLesson } from '../guidedSteps';
import { GUIDED_LESSONS as CONTENT } from '../guided/content/index';

export const GUIDED_LESSONS: GuidedLesson[] = CONTENT as unknown as GuidedLesson[];
