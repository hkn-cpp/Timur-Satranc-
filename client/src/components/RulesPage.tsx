import React, { FC } from 'react';
import { ArrowLeft, Sword, BookOpen } from '@phosphor-icons/react';
import { PageState } from '../types';
import { PIECE_GUIDES, RULE_ENTRIES } from '../learn/learnContent';
import { EngineNote } from './learn/EngineNote';
import { MicroBadgeLegend } from './learn/MicroBadgeLegend';

// Taş görselleri (PDF sırasına göre; Şehzade/Maceracı Şah için şah görseli yedeği — özel PNG yok)
import sSah from '../assets/pieces/s_sah.png';
import sVezir from '../assets/pieces/s_vezir.png';
import sKale from '../assets/pieces/s_kale.png';
import sFil from '../assets/pieces/s_fil.png';
import sAt from '../assets/pieces/s_at.png';
import sDeve from '../assets/pieces/s_deve.png';
import sZurafa from '../assets/pieces/s_zurafa.png';
import sMancinik from '../assets/pieces/s_mancinik.png';
import sPiyon from '../assets/pieces/s_piyon.png';
import sGeneral from '../assets/pieces/s_general.png';
import sKazik from '../assets/pieces/s_kazik.png';

const PIECE_IMGS: Record<string, string> = {
  king: sSah,
  queen: sVezir,
  rook: sKale,
  bishop: sFil,
  knight: sAt,
  camel: sDeve,
  giraffe: sZurafa,
  warMachine: sMancinik,
  pawn: sPiyon,
  general: sGeneral,
  picket: sKazik,
  prince: sSah,
  adventurousKing: sSah,
};

interface RulesPageProps {
  onNavigate: (page: PageState) => void;
  rulesTab: 'pieces' | 'rules';
  setRulesTab: (tab: 'pieces' | 'rules') => void;
  selectedPiece: PieceData | null;
  setSelectedPiece: (p: PieceData | null) => void;
}

interface PieceData {
  name: string;
  symbol: string;
  img: string;
  move: string;
  value: string;
  color: string;
  terfi?: string;
  engineNote?: string;
}

export const RulesPage: FC<RulesPageProps> = ({ onNavigate, rulesTab, setRulesTab, selectedPiece, setSelectedPiece }) => {
  const piecesData: PieceData[] = PIECE_GUIDES.map((g) => ({
    name: g.name,
    symbol: g.symbol,
    img: PIECE_IMGS[g.key] ?? sPiyon,
    move: g.move,
    value: g.value,
    color: g.color,
    terfi: g.terfi,
    engineNote: g.engineNote,
  }));

  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-3 relative z-10 flex-shrink-0">
        <button onClick={() => onNavigate('LEARN_MENU')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} weight="bold" />
          </div>
        </button>
        <div>
          <h1 className="font-batangas text-[2rem] font-bold text-white tracking-wide leading-none">Kurallar</h1>
          <p className="text-[#A7BDB1] text-sm mt-0.5">11 taş + Şehzade + Maceracı Şah</p>
        </div>
      </div>

      {/* Tab switcher (krem pill) */}
      <div className="px-5 pb-3 flex-shrink-0 relative z-10">
        <div className="flex gap-2 bg-[#f5eedc] p-1.5 rounded-2xl border border-[#e5dcce] shadow-xl">
          {[
            { key: 'pieces' as const, label: 'Taşlar',  icon: <Sword size={14} weight="bold" /> },
            { key: 'rules'  as const, label: 'Kurallar', icon: <BookOpen size={14} weight="bold" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRulesTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background:   rulesTab === tab.key ? '#00d4c4'   : 'transparent',
                color:        rulesTab === tab.key ? '#0d2818'   : '#5c6c66',
                boxShadow:    rulesTab === tab.key ? '0 4px 14px rgba(0,212,196,0.4)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-8 relative z-10">
        {rulesTab === 'pieces' ? (
          <>
            {/* Taş ızgarası */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              {piecesData.map((piece) => {
                const isSelected = selectedPiece?.name === piece.name;
                return (
                <button
                  key={piece.name}
                  onClick={() => setSelectedPiece(isSelected ? null : piece)}
                  className="rounded-2xl p-3 flex flex-col items-center gap-2 border border-[#e5dcce] bg-[#f5eedc] shadow-md transition-all active:scale-95"
                  style={{
                    outline: isSelected ? '2.5px solid #1A1A1A' : 'none',
                    outlineOffset: isSelected ? 2 : 0,
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#141f1b]/5 border border-[#141f1b]/10">
                    <img src={piece.img} alt={piece.name} className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[13px] font-bold text-center leading-tight text-[#141f1b]">
                    {piece.name}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#00d4c4]/20 text-[#0c4e48] border border-[#00d4c4]/40">
                    {piece.value === '∞' ? '♾' : piece.value === '—' ? '★' : `${piece.value} puan`}
                  </span>
                </button>
                );
              })}
            </div>

            {/* Seçili taş detayı (krem lüks kart) */}
            {selectedPiece && (
              <div className="rounded-2xl p-5 border border-[#e5dcce] bg-[#f5eedc] shadow-xl mb-4 animate-slide-down">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#141f1b]/5 border border-[#141f1b]/10">
                    <img src={selectedPiece.img} alt={selectedPiece.name} className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <div className="font-batangas text-xl font-bold text-[#141f1b]">
                      {selectedPiece.name} <span className="text-sm text-[#5c6c66]">({selectedPiece.symbol})</span>
                    </div>
                    <div className="text-[#5c6c66] text-sm">
                      Güç: {selectedPiece.value === '∞' ? '∞' : `${selectedPiece.value} puan`}
                      {selectedPiece.terfi ? ` • Terfi: ${selectedPiece.terfi}` : ''}
                    </div>
                  </div>
                </div>
                <p className="text-[#3a4a44] text-[15px] md:text-base leading-7">{selectedPiece.move}</p>
                {selectedPiece.engineNote && <EngineNote text={selectedPiece.engineNote} />}
              </div>
            )}

            <MicroBadgeLegend />
            <div className="mt-3 text-xs text-white/45 leading-relaxed">
              Notasyon: dikey hatlar a–k, yataylar 1–10; hisarlar H-SOL / H-SAĞ.
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {RULE_ENTRIES.map((rule, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 border border-[#e5dcce] bg-[#f5eedc] shadow-md flex flex-col gap-2"
              >
                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl bg-amber-100 border border-amber-600/25">
                    {rule.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-batangas text-lg font-bold text-[#141f1b] mb-1">{rule.title}</div>
                    <p className="text-[#5c6c66] text-sm leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
                {rule.engineNote && <EngineNote text={rule.engineNote} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export type { PieceData };
