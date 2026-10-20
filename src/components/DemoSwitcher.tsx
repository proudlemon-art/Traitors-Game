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

  const handleAutoSubmitAllObjects = async () => {
    await api.sendAction(state.roomCode, 'DEMO_AUTO_SUBMIT_ALL_OBJECTS');
  };

  const handleAcknowledgeAll = async () => {
    await api.sendAction(state.roomCode, 'DEMO_ACKNOWLEDGE_ALL');
  };

  const handleSimulateEvidenceVotes = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_EVIDENCE_VOTES');
  };

  const handleSimulateMajorityAnswers = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_MAJORITY_ANSWERS');
  };

  const handleSimulateEndOrBanish = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_END_OR_BANISH');
  };

  const handleResetDemo = async () => {
    await api.setupDemoRoom();
  };

  const exhibitState = state.exhibitAState;

  return (
    <div className="bg-zinc-950/95 border-b border-amber-500/50 p-2.5 text-xs text-amber-200 sticky top-0 z-40 backdrop-blur shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono uppercase text-[11px] text-amber-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Demo Castle Mode (7 Players)</span>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectView('HOST')}
            className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              currentRoleView === 'HOST'
                ? 'bg-amber-500 text-black shadow-lg ring-2 ring-amber-300'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> TV Host Screen
          </button>

          <span className="text-zinc-600 font-bold">|</span>

          {DEMO_PLAYERS.map(dp => {
            const isSelected = currentRoleView === dp.token;
            const playerInState = state.players.find(p => p.id === dp.id);
            const hasRegisteredObject = exhibitState?.objects.some(
              o => o.contributorId === dp.id && o.name.trim().length > 0
            );
            const hasVoted = playerInState?.hasLockedVote;

            return (
              <button
                key={dp.token}
                onClick={() => onSelectView(dp.token)}
                className={`px-2.5 py-1 rounded text-[11px] font-sans transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-burgundy-900 border-2 border-amber-400 text-amber-100 font-bold shadow-md ring-1 ring-amber-400/50'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                title={`Switch to ${dp.name}’s phone slate`}
              >
                <Smartphone className="w-3 h-3 text-amber-500" />
                <span>{dp.name}</span>
                {/* Status indicators */}
                {state.currentRound === 1 && exhibitState?.stage === 'COLLECTION' && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasRegisteredObject ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                    title={hasRegisteredObject ? 'Object registered' : 'No object yet'}
                  />
                )}
                {hasVoted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Vote locked" />
                )}
              </button>
            );
          })}
        </div>

        {/* Demo Fast-Forward Actions */}
        <div className="flex items-center gap-1.5">
          {/* Exhibit A: Fill all objects */}
          {state.currentRound === 1 && exhibitState?.stage === 'COLLECTION' && (
            <button
              onClick={handleAutoSubmitAllObjects}
              className="py-1 px-2.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              Pre-Fill All 7 Objects
            </button>
          )}

          {/* Exhibit A: Acknowledge briefing for all */}
          {state.currentRound === 1 && exhibitState?.stage === 'SECRET_BRIEFING' && (
            <button
              onClick={handleAcknowledgeAll}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Acknowledge All (7/7)
            </button>
          )}

          {/* Exhibit A: Simulate evidence votes */}
          {state.currentRound === 1 && exhibitState?.stage === 'EVIDENCE_VOTING' && (
            <button
              onClick={handleSimulateEvidenceVotes}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Auto-Vote Evidence (7/7)
            </button>
          )}

          {/* Voting Phases */}
          {(state.phase === 'VOTING' ||
            state.phase === 'TIE_VOTING' ||
            state.phase === 'FINALE_VOTING') && (
            <button
              onClick={handleAutoVote}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Auto-Vote 7 Players
            </button>
          )}

          {/* Finale End or Banish */}
          {state.phase === 'FINALE_END_OR_BANISH' && (
            <button
              onClick={handleSimulateEndOrBanish}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Simulate 4 Choices
            </button>
          )}

          <button
            onClick={handleResetDemo}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition"
            title="Reset Demo Castle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
