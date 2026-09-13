import { getSupabase } from '../../lib/supabaseClient';
import { createInitialBoardSetup } from '../engine/boardSetup';

const NOT_CONFIGURED_ERROR = () =>
  new Error('Çevrim içi oyun yapılandırılmadı (Supabase bilgileri eksik).');

export interface RoomTimeControl {
  initialMinutes: number;
  incrementSeconds: number;
  label: string;
}

export interface OnlineGame {
  id: string;
  code: string;
  white_player_id: string;
  black_player_id: string | null;
  white_name: string;
  black_name: string | null;
  status: 'waiting' | 'active' | 'ended';
  current_turn: 'white' | 'black';
  board_state: any;
  citadels_state: any;
  captured_pieces: { white: any[]; black: any[] };
  has_used_king_swap: { white: boolean; black: boolean };
  turn_number: number;
  half_move_clock: number;
  winner: 'white' | 'black' | 'draw' | null;
  end_reason: string | null;
  status_reason: string | null;
  time_control?: RoomTimeControl | null;
  // Faz 2 protokol kolonları (migration 02_online_protocol). Eski satırlarda
  // eksik olabileceği için opsiyonel tutulur.
  draw_offer_by?: string | null;
  takeback_offer_by?: string | null;
  rematch_offer_by?: string | null;
  rematch_of?: string | null;
  last_move: { from: any; to: any; notation: string; player: 'white' | 'black' } | null;
  move_count: number;
  created_at: string;
  updated_at: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    suffix += CODE_ALPHABET[idx];
  }
  return `TM${suffix}`;
}

function normalizeCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

function isValidCode(code: string): boolean {
  return code.length === 6;
}

// Oyuncu adı üst sınırı (PlayAFriendModal input maxLength=20 ile aynı).
const MAX_PLAYER_NAME_LEN = 20;

function isNonBlankId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePlayerName(name: string): string {
  return (name ?? '').trim().slice(0, MAX_PLAYER_NAME_LEN);
}

/** Supabase "satır yok" hatasını kullanıcı dostu mesaja çevirir. */
function isNotFoundError(error: any): boolean {
  return !!error && ((error as any).code === 'PGRST116' || (error as any).status === 406);
}

const ROOM_NOT_FOUND_ERROR = () => new Error('Oda bulunamadı. Kodu kontrol et (örnek: TMAB12).');

export async function createRoom(
  whitePlayerId: string,
  whiteName: string,
  timeControl?: RoomTimeControl | null
): Promise<{ data: OnlineGame | null; error: any }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  if (!isNonBlankId(whitePlayerId)) {
    return { data: null, error: new Error('Oyuncu kimliği üretilemedi. Sayfayı yenileyip tekrar dene.') };
  }
  const cleanWhiteName = normalizePlayerName(whiteName);
  if (!cleanWhiteName) {
    return { data: null, error: new Error('Oyuncu adı gerekli.') };
  }

  const { board, citadels } = createInitialBoardSetup();
  const citadelsWithMeta = {
    ...citadels,
    ...(timeControl ? { timeControl } : {}),
  };

  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
      .from('online_games')
      .insert({
        code,
        white_player_id: whitePlayerId,
        black_player_id: null,
        white_name: cleanWhiteName,
        black_name: null,
        status: 'waiting',
        current_turn: 'white',
        board_state: board,
        citadels_state: citadelsWithMeta,
        captured_pieces: { white: [], black: [] },
        has_used_king_swap: { white: false, black: false },
        turn_number: 1,
        half_move_clock: 0,
        winner: null,
        end_reason: null,
        status_reason: null,
        last_move: null,
        move_count: 0,
      })
      .select()
      .single();

    if (!error && data) {
      const game = data as OnlineGame;
      if (!game.time_control && (game.citadels_state as any)?.timeControl) {
        game.time_control = (game.citadels_state as any).timeControl;
      }
      return { data: game, error: null };
    }

    lastError = error;

    // 23505 = unique violation (code collision) -> retry
    if ((error as any)?.code !== '23505') {
      return { data: null, error };
    }
  }

  return { data: null, error: lastError };
}

export async function findRoom(
  code: string
): Promise<{ data: OnlineGame | null; error: any }> {
  const normalized = normalizeCode(code);

  if (!isValidCode(normalized)) {
    return { data: null, error: new Error('Oda kodu 6 karakter olmali (ornek: TMAB12).') };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  const { data, error } = await supabase
    .from('online_games')
    .select('*')
    .eq('code', normalized)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return { data: null, error: ROOM_NOT_FOUND_ERROR() };
    }
    return { data: null, error };
  }

  const game = data as OnlineGame;
  if (!game.time_control && (game.citadels_state as any)?.timeControl) {
    game.time_control = (game.citadels_state as any).timeControl;
  }
  return { data: game, error: null };
}

export async function joinRoom(
  code: string,
  playerId: string,
  playerName: string
): Promise<{ data: OnlineGame | null; error: any }> {
  const normalized = normalizeCode(code);

  if (!isValidCode(normalized)) {
    return { data: null, error: new Error('Oda kodu 6 karakter olmali (ornek: TMAB12).') };
  }

  if (!isNonBlankId(playerId)) {
    return { data: null, error: new Error('Oyuncu kimliği üretilemedi. Sayfayı yenileyip tekrar dene.') };
  }
  const cleanPlayerName = normalizePlayerName(playerName);
  if (!cleanPlayerName) {
    return { data: null, error: new Error('Oyuncu adı gerekli.') };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  // 1) Odayi bul
  const { data: room, error: findError } = await supabase
    .from('online_games')
    .select('*')
    .eq('code', normalized)
    .single();

  if (findError || !room) {
    if (!findError || isNotFoundError(findError)) {
      return { data: null, error: ROOM_NOT_FOUND_ERROR() };
    }
    return { data: null, error: findError ?? new Error('Oda bulunamadi.') };
  }

  const game = room as OnlineGame;

  // 2) waiting kontrolu
  if (game.status !== 'waiting') {
    return { data: null, error: new Error('Oda artik katilima kapali.') };
  }

  // 3) Kendi odasina katilma engeli
  if (game.white_player_id === playerId) {
    return { data: null, error: new Error('Kendi odana katilamazsin.') };
  }

  // 4) Race korumasi: sadece status hala 'waiting' ise guncelle
  const { data: updated, error: updateError } = await supabase
    .from('online_games')
    .update({
      black_player_id: playerId,
      black_name: cleanPlayerName,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', game.id)
    .eq('status', 'waiting')
    .select()
    .single();

  if (updateError || !updated) {
    return {
      data: null,
      error: updateError ?? new Error('Oda baska bir oyuncu tarafindan alindi.'),
    };
  }

  const updatedGame = updated as OnlineGame;
  if (!updatedGame.time_control && (updatedGame.citadels_state as any)?.timeControl) {
    updatedGame.time_control = (updatedGame.citadels_state as any).timeControl;
  }

  return { data: updatedGame, error: null };
}
