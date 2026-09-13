import React, { FC, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Spinner, SignIn } from '@phosphor-icons/react';
import { NotificationType, PlayerColor } from '../types';
import { createRoom, joinRoom } from '../core/online/roomService';
import type { OnlineGame } from '../core/online/roomService';
import { getOrCreatePlayerId, getPlayerName, setPlayerName } from '../lib/auth';
import { getRating } from '../core/online/ratingService';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface PlayAFriendModalProps {
  onClose: () => void;
  onStartOnlineGame: (gameData: OnlineGame, myColor: PlayerColor, gameCode: string) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error) return error;
  if (error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}

export const PlayAFriendModal: FC<PlayAFriendModalProps> = ({
  onClose,
  onStartOnlineGame,
  showNotification,
}) => {
  const [playerNameInput, setPlayerNameInput] = useState(() => getPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRatingLoading(true);
    void getRating(getOrCreatePlayerId())
      .then(({ data }) => {
        if (!cancelled) setMyRating(data?.rating ?? null);
      })
      .catch(() => {
        if (!cancelled) setMyRating(null);
      })
      .finally(() => {
        if (!cancelled) setRatingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveName = useCallback(() => {
    const name = playerNameInput.trim() || getPlayerName() || 'Misafir';
    setPlayerName(name);
    return name;
  }, [playerNameInput]);

  const handleCreateRoom = useCallback(async () => {
    if (isCreating) return;
    if (!isSupabaseConfigured()) {
      showNotification('Çevrim içi oyun yapılandırılmadı. Önce Supabase kurulumu gerekli (README).', 'error');
      return;
    }
    const name = resolveName();
    setIsCreating(true);
    try {
      const { data, error } = await createRoom(getOrCreatePlayerId(), name);
      if (error || !data) {
        showNotification(toErrorMessage(error, 'Oda oluşturulamadı.'), 'error');
        return;
      }
      onStartOnlineGame(data, 'white', data.code);
    } catch {
      showNotification('Oda oluşturulamadı. Bağlantını kontrol et.', 'error');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, resolveName, onStartOnlineGame, showNotification]);

  const handleJoinRoom = useCallback(async () => {
    if (isJoining) return;
    if (!isSupabaseConfigured()) {
      showNotification('Çevrim içi oyun yapılandırılmadı. Önce Supabase kurulumu gerekli (README).', 'error');
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      showNotification('Lütfen geçerli bir 6 haneli oda kodu girin.', 'error');
      return;
    }
    const name = resolveName();
    setIsJoining(true);
    try {
      const { data, error } = await joinRoom(code, getOrCreatePlayerId(), name);
      if (error || !data) {
        showNotification(toErrorMessage(error, 'Odaya katılınamadı.'), 'error');
        return;
      }
      showNotification('Odaya katıldın! Oyun başlıyor...', 'success');
      onStartOnlineGame(data, 'black', data.code);
    } catch {
      showNotification('Odaya katılınamadı. Bağlantını kontrol et.', 'error');
    } finally {
      setIsJoining(false);
    }
  }, [isJoining, joinCode, resolveName, onStartOnlineGame, showNotification]);

  return (
    <div className="fixed inset-0 z-50 bg-[#122b1e]/95 flex flex-col justify-between overflow-y-auto custom-scrollbar animate-fade-in select-none">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-8 pb-3 border-b border-white/10 sticky top-0 bg-[#122b1e]/95 z-20">
          <button
            onClick={onClose}
            className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Geri"
          >
            <ArrowLeft size={26} weight="bold" />
          </button>
          <div className="flex items-center gap-2">
            <Users size={26} weight="duotone" className="text-white" />
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Arkadaşınla Oyna
            </h2>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
          <p className="text-[#A7BDB1] text-xs">
            Arkadaşına davet kodu gönder veya onun oluşturduğu odaya katıl!
          </p>

          {/* İsim Girişi */}
          <div className="bg-[#1a4228] rounded-xl p-3 border border-white/10">
            <label className="text-white/70 text-xs mb-1 block">
              Oyuncu Adın {ratingLoading ? '(…)' : myRating != null ? `(${myRating})` : '(-)'}
            </label>
            <input
              type="text"
              placeholder="Bir isim gir (opsiyonel)"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              maxLength={20}
              className="w-full bg-[#0a1710] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00d4c4] placeholder:text-white/30"
            />
          </div>

          {/* Oda Oluştur Kartı (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce]">
            <span className="text-[#141f1b] font-bold text-sm">Oda Oluştur</span>
            <p className="text-[#5c6c66] text-xs">
              Yeni bir oda oluştur ve kodunu arkadaşınla paylaş. Odayı kuran beyaz taşlarla oynar.
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full mt-1 bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-batangas font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Spinner size={18} weight="bold" className="animate-spin" />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <span>Odayı Oluştur & Başlat</span>
              )}
            </button>
          </div>

          {/* Odaya Katıl Kartı (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce]">
            <span className="text-[#141f1b] font-bold text-sm">Odaya Katıl</span>
            <p className="text-[#5c6c66] text-xs">Arkadaşından aldığın 6 haneli kodu buraya gir:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Örn: TM8X9A"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 bg-[#e4dac6] border border-[#cfc4ad] rounded-xl px-4 py-2.5 text-[#141f1b] font-mono text-lg font-bold tracking-widest focus:outline-none focus:border-[#00d4c4] uppercase"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isJoining || joinCode.trim().length !== 6}
                className="bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-95 text-[#0d2818] font-bold px-5 rounded-xl transition-all cursor-pointer font-batangas disabled:opacity-50 flex items-center gap-1.5"
              >
                {isJoining ? (
                  <Spinner size={16} weight="bold" className="animate-spin" />
                ) : (
                  <>
                    <SignIn size={16} weight="bold" />
                    <span>Katıl</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
