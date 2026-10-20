import React from 'react';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import { Monitor, Smartphone, Zap, RotateCcw } from 'lucide-react';

interface Props {
  state: ClientGameState;
  currentRoleView: 'HOST' | string; // 'HOST' or playerToken
  onSelectView: (view: 'HOST' | string) => void;
}

export const DEMO_PLAYERS = [
  { name: 'Libby (Host)', token: 'demo_token_libby', id: 'p_libby', seat: 1 },
  { name: 'Arthur', token: 'demo_token_arthur', id: 'p_arthur', seat: 2 },
  { name: 'Beatrice', token: 'demo_token_beatrice', id: 'p_beatrice', seat: 3 },
  { name: 'Callum', token: 'demo_token_callum', id: 'p_callum', seat: 4 },
  { name: 'Daphne', token: 'demo_token_daphne', id: 'p_daphne', seat: 5 },
  { name: 'Edgar', token: 'demo_token_edgar', id: 'p_edgar', seat: 6 },
  { name: 'Fiona', token: 'demo_token_fiona', id: 'p_fiona', seat: 7 },
];

export const DemoSwitcher: React.FC<Props> = ({ state, currentRoleView, onSelectView }) => {
  if (!state.isDemoRoom) return null;

  const handleAutoVote = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_VOTES');
  };

  const handleResetDemo = async () => {
    await api.setupDemoRoom();
  };

  return (
    <div className="bg-zinc-950/95 border-b border-amber-500/50 p-2.5 text-xs text-amber-200 sticky top-0 z-40 backdrop-blur shadow-md">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono uppercase text-[11px] text-amber-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Demo Castle Mode (7 Players)</span>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => onSelectView('HOST')}
            className={`px-2.5 py-1 rounded text-xs font-serif font-bold transition-all flex items-center gap-1 ${
              currentRoleView === 'HOST'
                ? 'bg-amber-500 text-black shadow'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> TV Host Screen
          </button>

          <span className="text-zinc-600">|</span>

          {DEMO_PLAYERS.map(dp => {
            const isSelected = currentRoleView === dp.token;
            return (
              <button
                key={dp.token}
                onClick={() => onSelectView(dp.token)}
                className={`px-2 py-1 rounded text-[11px] font-sans transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-burgundy-900 border border-amber-400 text-amber-200 font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                {dp.name}
              </button>
            );
          })}
        </div>

        {/* Demo Fast-Forward Actions */}
        <div className="flex items-center gap-1.5">
          {state.phase === 'VOTING' && (
            <button
              onClick={handleAutoVote}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Auto-Vote 7 Players
            </button>
          )}

          <button
            onClick={handleResetDemo}
            className="p-1 text-zinc-500 hover:text-zinc-300"
            title="Reset Demo Castle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
