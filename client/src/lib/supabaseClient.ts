import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/**
 * Supabase yapılandırması mevcut mu?
 * `.env` dosyası yoksa veya hosting panelinde değişkenler tanımlı değilse false döner.
 */
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

let cachedClient: SupabaseClient | null = null;

/**
 * Tembel (lazy) Supabase singleton.
 * Yapılandırma yoksa `null` döner — ASLA throw etmez.
 * Böylece çevrim içi altyapı kapalıyken bile uygulama normal açılır,
 * yalnızca online özellikler devre dışı kalır.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.error(
      '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil. ' +
        'Çevrim içi oyun kapalı. Kurulum: README → "Çevrim içi oyun kurulumu".'
    );
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      realtime: {
        params: {
          eventsPerSecond: 10, // Saniyede maks 10 olay — oyun için yeterli
        },
      },
    });
  }
  return cachedClient;
}
