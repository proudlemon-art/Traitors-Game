import React, { useState } from 'react';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import {
  Monitor,
  Smartphone,
  Zap,
  RotateCcw,
  BookOpen,
  ChevronDown,
  Layers,
  Shield,
  Skull,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  currentRoleView: 'HOST' | string; // 'HOST' or playerToken
  onSelectView: (view: 'HOST' | string) => void;
  onOpenAdminPlan?: () => void;
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

export const DemoSwitcher: React.FC<Props> = ({
  state,
  currentRoleView,
  onSelectView,
  onOpenAdminPlan,
}) => {
  if (!state.isDemoRoom) return null;

  const [isJumping, setIsJumping] = useState(false);
  const [showRoleSpoilers, setShowRoleSpoilers] = useState(false);

  const handleJumpRound = async (round: number, phase: string = 'INTRO') => {
    setIsJumping(true);
    try {
      await api.sendAction(state.roomCode, 'DEMO_JUMP_TO_ROUND', { round, phase });
    } finally {
      setIsJumping(false);
    }
  };

  const handleAutoVote = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_VOTES');
  };

  const handleRevealAllSlates = async () => {
    await api.sendAction(state.roomCode, 'REVEAL_ALL_SLATES');
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
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_MAJORITY_ANSWERS', { allQuestions: true });
  };

  const handleSimulateAuction = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_AUCTION');
  };

  const handleSimulateEndOrBanish = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_END_OR_BANISH');
  };

  const handleResetDemo = async () => {
    await api.setupDemoRoom();
  };

  const exhibitState = state.exhibitAState;

  return (
    <div className="bg-zinc-950/98 border-b-2 border-amber-500/70 p-2 text-xs text-amber-200 sticky top-0 z-50 backdrop-blur-md shadow-2xl">
      <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-2.5">
        
        {/* 1. LEFT: DEMO BADGE & QUICK ROUND / PHASE JUMPER */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/60 rounded text-[11px] font-mono font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DEMO FLOW TESTER</span>
          </div>

          {/* Quick Round Selector */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded">
            <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5">Round:</span>
            {[1, 2, 3, 4, 5, 6].map(r => (
              <button
                key={r}
                onClick={() => handleJumpRound(r, 'INTRO')}
                disabled={isJumping}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  state.currentRound === r
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-800'
                }`}
                title={`Jump to Round ${r} (Carries over R1–R${r - 1} scores)`}
              >
                R{r}
              </button>
            ))}
          </div>

          {/* Quick Mission Shortcut */}
          <button
            onClick={() => handleJumpRound(state.currentRound, 'MISSION')}
            disabled={isJumping}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 ${
              state.phase === 'MISSION'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-emerald-400 border border-emerald-900/60 hover:bg-zinc-800'
            }`}
            title="Jump to current round's Mission phase"
          >
            <Zap className="w-3 h-3" />
            <span>Mission View</span>
          </button>

          {/* Toggle Role Spoilers in Nav */}
          <button
            onClick={() => setShowRoleSpoilers(!showRoleSpoilers)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition flex items-center gap-1 ${
              showRoleSpoilers
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Hide or peek Traitor icons on player tabs (kept hidden by default for zero spoilers!)"
          >
            <Eye className="w-3 h-3" />
            <span>{showRoleSpoilers ? 'Spoilers: ON' : 'Spoilers: OFF'}</span>
          </button>
        </div>

        {/* 2. CENTER: TOP NAV DEVICE SWITCHER (TV HOST + ALL 7 PLAYERS) */}
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {/* TV Host Button */}
          <button
            onClick={() => onSelectView('HOST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 shadow ${
              currentRoleView === 'HOST'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black ring-2 ring-amber-300 shadow-[0_0_15px_rgba(212,163,69,0.5)]'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-amber-500" />
            <span>TV Host Screen</span>
          </button>

          <span className="text-zinc-700 font-bold mx-0.5">|</span>

          {/* 7 Player Devices */}
          {DEMO_PLAYERS.map(dp => {
            const isSelected = currentRoleView === dp.token;
            const isTraitor = dp.id === state.traitorId;
            const playerInState = state?.players?.find(p => p.id === dp.id);
            const hasRegisteredObject = exhibitState?.objects?.some(
              o => o.contributorId === dp.id && typeof o.name === 'string' && o.name.trim().length > 0
            );
            const hasVoted = playerInState?.hasLockedVote;

            return (
              <button
                key={dp.token}
                onClick={() => onSelectView(dp.token)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-burgundy-950 border-2 border-amber-400 text-amber-100 font-bold shadow-lg ring-1 ring-amber-400'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title={`Switch to ${dp.name}’s mobile device screen (Seat #${dp.seat})`}
              >
                <Smartphone className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{dp.name.replace(' (Host)', '')}</span>

                {/* Optional Role badge only when Spoilers toggled ON */}
                {showRoleSpoilers && (
                  isTraitor ? (
                    <span
                      className="px-1 py-0.2 bg-red-950 text-red-400 border border-red-700/60 rounded text-[9px] font-mono font-bold"
                      title="Traitor for this round"
                    >
                      🗡️
                    </span>
                  ) : (
                    <span
                      className="px-1 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-700/60 rounded text-[9px] font-mono"
                      title="Faithful"
                    >
                      🛡️
                    </span>
                  )
                )}

                {/* Action status dots */}
                {state.currentRound === 1 && exhibitState?.stage === 'COLLECTION' && hasRegisteredObject && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Object registered" />
                )}
                {hasVoted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Vote locked" />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. RIGHT: FAST-FORWARDS & ADMIN PLAN SHORTCUT */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Exhibit A: Fill all objects */}
          {state.currentRound === 1 && state.phase === 'MISSION' && exhibitState?.stage === 'COLLECTION' && (
            <button
              onClick={handleAutoSubmitAllObjects}
              className="py-1 px-2.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Fill 7 Items</span>
            </button>
          )}

          {/* Exhibit A: Acknowledge briefing for all */}
          {state.currentRound === 1 && state.phase === 'MISSION' && exhibitState?.stage === 'SECRET_BRIEFING' && (
            <button
              onClick={handleAcknowledgeAll}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Ack 7/7 & Present</span>
            </button>
          )}

          {/* Exhibit A: Open voting from presentations */}
          {state.currentRound === 1 && state.phase === 'MISSION' && exhibitState?.stage === 'PRESENTATIONS' && (
            <button
              onClick={() => api.sendAction(state.roomCode, 'EXHIBIT_A_OPEN_VOTING')}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Open Item Vote</span>
            </button>
          )}

          {/* Exhibit A: Simulate evidence votes */}
          {state.currentRound === 1 && state.phase === 'MISSION' && exhibitState?.stage === 'EVIDENCE_VOTING' && (
            <button
              onClick={handleSimulateEvidenceVotes}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Sim Votes & Reveal</span>
            </button>
          )}

          {/* Exhibit A: Advance from Evidence Reveal to Round Table */}
          {state.currentRound === 1 &&
            state.phase === 'MISSION' &&
            (exhibitState?.stage === 'EVIDENCE_REVEAL' || exhibitState?.stage === 'COMPLETED') && (
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE')}
                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[11px] font-mono rounded flex items-center gap-1 shadow"
              >
                <Zap className="w-3 h-3" />
                <span>To Round Table →</span>
              </button>
            )}

          {/* Birthday Majority (Round 2): Simulate all 7 answers */}
          {state.currentRound === 2 && state.phase === 'MISSION' && (
            <button
              onClick={handleSimulateMajorityAnswers}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Sim All 5 Qs</span>
            </button>
          )}

          {/* Round 6 Auction: Simulate all 6 lots */}
          {state.currentRound === 6 && state.phase === 'MISSION' && (
            <button
              onClick={handleSimulateAuction}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Sim Auction → Finale</span>
            </button>
          )}

          {/* Voting Phases */}
          {(state.phase === 'VOTING' ||
            state.phase === 'TIE_VOTING' ||
            state.phase === 'FINALE_VOTING') && (
            <button
              onClick={handleAutoVote}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Auto-Vote All</span>
            </button>
          )}

          {/* Slate Reveal Phases: Reveal All Slates */}
          {(state.phase === 'VOTE_REVEALS' ||
            state.phase === 'TIE_REVEALS' ||
            state.phase === 'FINALE_VOTE_REVEALS') && (
            <button
              onClick={handleRevealAllSlates}
              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3" />
              <span>Reveal All Slates</span>
            </button>
          )}

          {/* Finale End or Banish */}
          {state.phase === 'FINALE_END_OR_BANISH' && (
            <button
              onClick={handleSimulateEndOrBanish}
              className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 text-[11px] font-mono rounded flex items-center gap-1 shadow"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Sim Choices</span>
            </button>
          )}

          {/* Admin Game Plan Button */}
          {onOpenAdminPlan && (
            <button
              onClick={onOpenAdminPlan}
              className="py-1 px-2.5 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-200 text-[11px] font-serif font-bold rounded flex items-center gap-1.5 shadow active:scale-95 transition"
              title="View all rounds plan & timeline in Admin"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>All Rounds Plan</span>
            </button>
          )}

          {/* Reset Demo */}
          <button
            onClick={handleResetDemo}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-300 rounded transition"
            title="Reset Demo Castle to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
