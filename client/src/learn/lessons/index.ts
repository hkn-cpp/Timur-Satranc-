/**
 * FAZ 3+ ders kayıt defteri. FAZ 2'de İÇERİK YOK — yalnızca konvansiyon:
 * her ders `src/learn/lessons/<seviye>-<no>.ts` dosyasında `GuidedLesson`
 * default-export edilir ve buradaki diziye eklenir. Doğrulayıcı
 * (`validateLessonsCli`) bu diziyi okur; madde 1 tam 25 ders ister.
 */
import type { GuidedLesson } from '../guidedSteps';

export const GUIDED_LESSONS: GuidedLesson[] = [];
