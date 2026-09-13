/**
 * Hafif SPA router — sıfır bağımlılık, History API (pushState/popstate).
 *
 * İlke: aynı bileşenler, reload yok (hız korunur); sadece URL senkron tutulur
 * ki browser Geri/İleri çalışsın. Alt durum (ders/slayt, maç config) URL'ye
 * girmez — karar: sadece sayfa yolu.
 *
 * Yollar (İngilizce, karar):
 *   /            → MAIN_MENU (ilk açılışta SPLASH gösterir, sonra replace)
 *   /play        → PLAY_MENU
 *   /bot         → BOT_SELECT
 *   /learn       → LEARN_MENU
 *   /roadmap     → ROADMAP
 *   /lesson      → LESSON_DETAIL
 *   /lesson-1    → LESSON_1
 *   /rules       → RULES
 *   /setup       → CUSTOM_SETUP
 *   /local       → SCREEN_PLAY
 *   /game        → GAME_PLAY
 *   /online      → ONLINE_PLAY
 *   /review      → GAME_REVIEW (tek başına veri taşımaz; App guard'ı PLAY_MENU'ye yönlendirir)
 *   /analysis    → SELF_ANALYSIS (tek başına veri taşımaz; App guard'ı PLAY_MENU'ye yönlendirir)
 * Bilinmeyen yol → MAIN_MENU + URL '/'ye normalize edilir.
 */

import { useCallback, useEffect, useState } from 'react';
import type { PageState } from '../types';

const ROUTES: Record<string, PageState> = {
  '/': 'MAIN_MENU',
  '/play': 'PLAY_MENU',
  '/bot': 'BOT_SELECT',
  '/learn': 'LEARN_MENU',
  '/roadmap': 'ROADMAP',
  '/lesson': 'LESSON_DETAIL',
  '/lesson-1': 'LESSON_1',
  '/rules': 'RULES',
  '/setup': 'CUSTOM_SETUP',
  '/local': 'SCREEN_PLAY',
  '/game': 'GAME_PLAY',
  '/online': 'ONLINE_PLAY',
  '/review': 'GAME_REVIEW',
  '/analysis': 'SELF_ANALYSIS',
};

const PATHS: Record<PageState, string> = {
  SPLASH: '/',
  MAIN_MENU: '/',
  PLAY_MENU: '/play',
  BOT_SELECT: '/bot',
  LEARN_MENU: '/learn',
  ROADMAP: '/roadmap',
  LESSON_DETAIL: '/lesson',
  LESSON_1: '/lesson-1',
  RULES: '/rules',
  CUSTOM_SETUP: '/setup',
  SCREEN_PLAY: '/local',
  GAME_PLAY: '/game',
  ONLINE_PLAY: '/online',
  GAME_REVIEW: '/review',
  SELF_ANALYSIS: '/analysis',
};

const TITLES: Record<string, string> = {
  '/': 'Timur Satrancı',
  '/play': 'Oyna | Timur Satrancı',
  '/bot': 'Bota Karşı | Timur Satrancı',
  '/learn': 'Öğren | Timur Satrancı',
  '/roadmap': 'Yol Haritası | Timur Satrancı',
  '/lesson': 'Ders | Timur Satrancı',
  '/lesson-1': 'Ders | Timur Satrancı',
  '/rules': 'Kurallar | Timur Satrancı',
  '/setup': 'Dizilim Editörü | Timur Satrancı',
  '/local': 'Ekranda Oyna | Timur Satrancı',
  '/game': 'Maç | Timur Satrancı',
  '/online': 'Online Maç | Timur Satrancı',
  '/review': 'Oyun Analizi | Timur Satrancı',
  '/analysis': 'Analiz Motoru | Timur Satrancı',
};

export interface NavigateOptions {
  /** true ise history'e yeni kayıt atmaz (splash çıkışı, guard yönlendirmeleri). */
  replace?: boolean;
}

export type NavigateFn = (page: PageState, opts?: NavigateOptions) => void;

/** Bilinmeyen yolda null döner. */
export function pathToPage(pathname: string): PageState | null {
  return ROUTES[pathname] ?? null;
}

export function pageToPath(page: PageState): string {
  return PATHS[page] ?? '/';
}

function syncTitle(path: string): void {
  if (typeof document !== 'undefined') {
    document.title = TITLES[path] ?? 'Timur Satrancı';
  }
}

/** İlk sayfa: '/' → SPLASH (sadece taze açılış), bilinen yol → karşılığı, bilinmeyen → MAIN_MENU. */
function initialPage(): PageState {
  if (typeof window === 'undefined') return 'SPLASH';
  const path = window.location.pathname;
  if (path === '/') return 'SPLASH';
  return pathToPage(path) ?? 'MAIN_MENU';
}

/**
 * App.tsx'teki `useState<PageState>` yerine geçer.
 * Dönüş imzası setState ile uyumludur: mevcut `onNavigate={setCurrentPage}`
 * prop'larına dokunmak gerekmez.
 */
export function useRoute(): [PageState, NavigateFn] {
  const [page, setPage] = useState<PageState>(initialPage);

  // Mount: bilinmeyen yolu '/'ye normalize et + başlığı eşitle.
  useEffect(() => {
    const path = window.location.pathname;
    if (pathToPage(path) === null) {
      window.history.replaceState(null, '', '/');
      syncTitle('/');
    } else {
      syncTitle(path);
    }
  }, []);

  // Browser Geri/İleri.
  useEffect(() => {
    const onPopState = () => {
      const next = pathToPage(window.location.pathname) ?? 'MAIN_MENU';
      syncTitle(window.location.pathname);
      setPage(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate: NavigateFn = useCallback((next, opts) => {
    const path = pageToPath(next);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      if (opts?.replace) window.history.replaceState(null, '', path);
      else window.history.pushState(null, '', path);
    }
    syncTitle(path);
    setPage(next);
  }, []);

  return [page, navigate];
}
