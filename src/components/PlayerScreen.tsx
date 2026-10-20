import React, { useState } from 'react';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import { PrivacyShield } from './PrivacyShield';
import { PhoneSlate } from './PhoneSlate';
import { HeistMission } from './Missions/HeistMission';
import { BirthdayMajorityMission } from './Missions/BirthdayMajorityMission';
import { BodyDisposalMission } from './Missions/BodyDisposalMission';
import { GetawayAuctionMission } from './Missions/GetawayAuctionMission';
import {
  Eye,
  EyeOff,
  Shield,
  Skull,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  playerToken: string;
}

export const PlayerScreen: React.FC<Props> = ({ state, playerToken }) => {
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLockingVote, setIsLockingVote] = useState(false);
  const [isShowingSlate, setIsShowingSlate] = useState(false);

  const me = state.players.find(p => p.id === state.myPlayerId);
  const isTraitor = state.myRole === 'TRAITOR';
  const hasLockedVote = state.myHasLockedVote || me?.hasLockedVote;
  const isMyTurnToReveal = state.isMyTurnToReveal;

  // Other players to vote for (cannot vote for self)
  const availableSuspects = state.players.filter(p => p.id !== state.myPlayerId);

  // If tie revote, only tied candidates can be voted for (excluding self)
  const votingCandidates = state.isTieRevote && state.tieCandidateIds.length > 0
    ? availableSuspects.filter(p => state.tieCandidateIds.includes(p.id))
    : availableSuspects;

  const handleLockInVote = async () => {
    if (!selectedSuspectId) return;
    setIsLockingVote(true);
    try {
      await api.sendAction(
        state.roomCode,
        'LOCK_VOTE',
        { targetPlayerId: selectedSuspectId },
        playerToken
      );
      setShowConfirmModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to lock vote');
    } finally {
      setIsLockingVote(false);
    }
  };

  const handleFinishSlateReveal = async () => {
    await api.sendAction(state.roomCode, 'FINISH_PHONE_SLATE', null, playerToken);
    setIsShowingSlate(false);
  };

  // If showing phone slate, render dedicated high-contrast full-screen slate
  if (isShowingSlate && (me?.revealedVoteForName || state.myVotedForId)) {
    const suspectName =
      state.players.find(p => p.id === state.myVotedForId)?.name ||
      me?.revealedVoteForName ||
      'Suspect';

    return (
      <PhoneSlate
        accusedPlayerName={suspectName}
        onFinishReveal={handleFinishSlateReveal}
      />
    );
  }

  return (
    <PrivacyShield>
      <div className="min-h-screen bg-castle-black text-amber-100 flex flex-col justify-between selection:bg-amber-900 selection:text-amber-100 pb-8">
        {/* Mobile Header */}
        <header className="bg-gradient-to-b from-burgundy-950 via-zinc-950 to-castle-black border-b border-amber-900/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-serif font-black tracking-widest text-sm text-amber-200">
                LIBBY’S BIRTHDAY
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-amber-400">
                Seat #{me?.seatNumber || 1}
              </span>
              <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300">
                {me?.score || 0} Pts
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-900 text-[11px] font-mono text-zinc-400">
            <span>Player: <strong className="text-amber-300">{me?.name || 'Guest'}</strong></span>
            <span>Round {state.currentRound} of 4</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 max-w-md w-full mx-auto space-y-5">
          {/* Active Reveal Banner if it's this player's turn to show their phone slate */}
          {isMyTurnToReveal && (
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-black rounded-lg shadow-[0_0_30px_rgba(212,163,69,0.4)] animate-bounce text-center">
              <h3 className="font-serif font-black text-lg uppercase tracking-wider mb-1">
                IT IS YOUR TURN!
              </h3>
              <p className="text-xs font-sans font-semibold mb-3">
                Raise your phone to the Round Table and declare your suspect.
              </p>
              <button
                onClick={() => setIsShowingSlate(true)}
                className="w-full py-3 px-4 bg-black text-amber-200 font-serif font-bold text-sm tracking-widest uppercase rounded shadow transition-all active:scale-95"
              >
                Show My Slate of Betrayal
              </button>
            </div>
          )}

          {/* SECRET ROLE CARD (Deliberate Reveal & Privacy) */}
          <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500">
                Round {state.currentRound} Allegiance
              </span>
              <button
                onClick={() => setRoleRevealed(!roleRevealed)}
                className="text-xs text-amber-400 flex items-center gap-1 font-mono hover:text-amber-200"
              >
                {roleRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {roleRevealed ? 'Hide Role' : 'Reveal Role'}
              </button>
            </div>

            {roleRevealed ? (
              <div className="space-y-3 animate-fadeIn">
                <div
                  className={`p-4 rounded-lg border-2 text-center ${
                    isTraitor
                      ? 'bg-rose-950/40 border-rose-600 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest block mb-1">
                    Your Assigned Role
                  </span>
                  <div className="text-2xl font-serif font-black tracking-widest flex items-center justify-center gap-2">
                    {isTraitor ? <Skull className="w-6 h-6 text-rose-400" /> : <Shield className="w-6 h-6 text-emerald-400" />}
                    {isTraitor ? 'TRAITOR' : 'FAITHFUL'}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded text-xs text-zinc-300 font-sans leading-relaxed">
                  <p className="font-serif font-bold text-amber-300 mb-1">
                    Private Briefing:
                  </p>
                  {state.mySecretBriefing}
                </div>

                {/* Secret Traitor Mission Assignment */}
                {isTraitor && state.mySecretMission && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded text-xs text-rose-200 font-sans leading-relaxed">
                    <p className="font-serif font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5" /> Secret Conversational Mission (+1 Pt):
                    </p>
                    {state.mySecretMission}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => setRoleRevealed(true)}
                className="py-6 px-4 bg-zinc-900/70 border border-dashed border-amber-900/60 rounded-lg text-center cursor-pointer hover:bg-zinc-900 transition-all select-none"
              >
                <Lock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="font-serif font-bold text-amber-200 text-sm">
                  Role Concealed in Wax
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tap to securely inspect your identity for Round {state.currentRound}
                </p>
              </div>
            )}
          </div>

          {/* ACTIVE MISSION INTERACTION (When phase === 'MISSION') */}
          {state.phase === 'MISSION' && (
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-5 shadow-xl space-y-4">
              {state.currentRound === 1 && <HeistMission state={state} isHostDisplay={false} />}
              {state.currentRound === 2 && (
                <BirthdayMajorityMission state={state} isHostDisplay={false} playerToken={playerToken} />
              )}
              {state.currentRound === 3 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                    The Forgery Gallery · Secret Drawing Prompt
                  </span>
                  <div className="p-4 bg-burgundy-950/60 border border-amber-500/60 rounded text-xs text-amber-100 font-sans leading-relaxed">
                    <p className="font-serif font-bold text-amber-300 text-sm mb-1.5">
                      Your Drawing Prompt:
                    </p>
                    <p className="text-sm font-semibold">
                      {isTraitor
                        ? state.forgeryGalleryState?.traitorBrief || 'Libby being crowned Queen (Include: Libby on throne, jewelled crown, royal sceptre, velvet curtain, royal guards)'
                        : state.forgeryGalleryState?.faithfulBrief || 'Libby accepting an Oscar (Include: Libby on red carpet, shiny gold statuette, microphone, red curtain, camera crew)'}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-400 italic">
                    Draw this on your scrap paper with pen in silence. Do not reveal until Claudia counts down!
                  </p>
                </div>
              )}
              {state.currentRound === 4 && <BodyDisposalMission state={state} isHostDisplay={false} />}
              {state.currentRound === 5 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                    The Counterfeit Expert · Your Pitch Words
                  </span>
                  <div className="p-4 bg-burgundy-950/60 border border-amber-500/60 rounded text-xs text-amber-100 font-sans leading-relaxed space-y-2">
                    <p className="font-serif font-bold text-amber-300 text-sm">
                      Invention to Pitch: “{state.counterfeitExpertState?.invention || 'High-Tech Security Birthday Cake'}”
                    </p>
                    {isTraitor ? (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-rose-400 font-bold">
                          Traitor Required Words (Only 2 provided!):
                        </span>
                        <div className="flex gap-2">
                          {(state.counterfeitExpertState?.traitorTwoWords || ['Laser', 'Fondant']).map(w => (
                            <span key={w} className="px-2 py-0.5 bg-zinc-900 border border-rose-500/50 rounded font-mono text-amber-300">
                              {w}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-400 italic pt-1">
                          ⚠️ You are missing the 3rd required word! Listen to earlier pitches, deduce it, and weave it in naturally.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
                          Faithful Required Words (Smuggle all 3 into your 30s pitch):
                        </span>
                        <div className="flex gap-2">
                          {(state.counterfeitExpertState?.faithfulThreeWords || ['Laser', 'Fondant', 'Siren']).map(w => (
                            <span key={w} className="px-2 py-0.5 bg-zinc-900 border border-emerald-500/50 rounded font-mono text-emerald-300">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {state.currentRound === 6 && (
                <GetawayAuctionMission state={state} isHostDisplay={false} playerToken={playerToken} />
              )}
            </div>
          )}

          {/* VOTING INTERFACE (When phase === VOTING or TIE_VOTING) */}
          {(state.phase === 'VOTING' || state.phase === 'TIE_VOTING') && (
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-5 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                  {state.isTieRevote ? 'Tie Revote Ballot' : 'The First Ballot'}
                </span>
                <h3 className="text-lg font-serif font-bold text-amber-200">
                  Select Your Accused Suspect
                </h3>
              </div>

              {hasLockedVote ? (
                <div className="py-6 px-4 bg-zinc-900/80 border border-amber-500/40 rounded-lg text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-serif font-bold text-amber-200 text-base">
                    Vote Locked in Wax
                  </h4>
                  <p className="text-xs text-zinc-400 font-sans max-w-xs mx-auto">
                    Your choice is sealed. Face the Round Table. When called in seating order, your phone will activate your Phone Slate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">
                    Who do you believe is the Traitor? (You cannot vote for yourself).
                  </p>

                  <div className="grid gap-2">
                    {votingCandidates.map(suspect => (
                      <button
                        key={suspect.id}
                        onClick={() => setSelectedSuspectId(suspect.id)}
                        className={`p-3 rounded text-left text-xs font-serif font-semibold border transition-all flex items-center justify-between ${
                          selectedSuspectId === suspect.id
                            ? 'bg-burgundy-900 border-amber-400 text-amber-100 shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-500 text-[10px]">
                            #{suspect.seatNumber}
                          </span>
                          <span className="text-sm">{suspect.name}</span>
                        </div>
                        {selectedSuspectId === suspect.id && (
                          <span className="text-[10px] font-mono text-amber-300 uppercase">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={!selectedSuspectId}
                      className="w-full py-3 px-4 bg-burgundy-800 hover:bg-burgundy-700 border border-amber-500/50 text-amber-100 font-serif font-bold text-xs uppercase tracking-widest rounded transition-all shadow disabled:opacity-40"
                    >
                      Lock In My Vote
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WAITING FOR REVEALS OR OTHER PHASES */}
          {state.phase === 'VOTE_REVEALS' && !isMyTurnToReveal && (
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-center space-y-1">
              <span className="text-[11px] font-mono uppercase text-amber-500">
                The Slates of Betrayal
              </span>
              <p className="text-xs text-zinc-300 font-sans">
                Watch the table as each guest presents their phone slate in seating order.
              </p>
            </div>
          )}
        </main>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-amber-500/60 rounded-lg p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="font-serif font-bold text-amber-200 text-base">
                Confirm Accusation
              </h4>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Are you certain you wish to accuse{' '}
                <strong className="text-amber-300">
                  {state.players.find(p => p.id === selectedSuspectId)?.name}
                </strong>
                ? Once locked in wax, your choice cannot be altered.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2 px-3 bg-zinc-800 text-zinc-300 text-xs font-mono uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLockInVote}
                  disabled={isLockingVote}
                  className="flex-1 py-2 px-3 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 border border-amber-500/50 text-xs font-serif font-bold uppercase tracking-wider rounded"
                >
                  {isLockingVote ? 'Locking...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PrivacyShield>
  );
};
