import React, { useState } from 'react';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import { PrivacyShield } from './PrivacyShield';
import { PhoneSlate } from './PhoneSlate';
import { ExhibitAMission } from './Missions/ExhibitAMission';
import { BirthdayMajorityMission } from './Missions/BirthdayMajorityMission';
import { BodyDisposalMission } from './Missions/BodyDisposalMission';
import { GetawayAuctionMission } from './Missions/GetawayAuctionMission';
import { JASMINE_FORFEIT_APOLOGY } from '../data/dialogue';
import {
  Eye,
  EyeOff,
  Shield,
  Skull,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Crown,
  Sparkles,
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
  const [endOrBanishChoice, setEndOrBanishChoice] = useState<'END' | 'BANISH' | null>(null);
  const [isSubmittingEndOrBanish, setIsSubmittingEndOrBanish] = useState(false);

  const me = state.players.find(p => p.id === state.myPlayerId);
  const isTraitor = state.myRole === 'TRAITOR';
  const isEliminated = !!me?.isEliminated || !!state.isMyEliminated;
  const hasLockedVote = state.myHasLockedVote || me?.hasLockedVote;
  const isMyTurnToReveal = state.isMyTurnToReveal;
  const finale = state.finaleState;

  // Active voting candidates:
  // In rounds 1-5: all other players (excluding self)
  // In finale: only non-eliminated survivors (excluding self)
  const availableSuspects = state.players.filter(p => p.id !== state.myPlayerId && !p.isEliminated);

  // If tie revote, only tied candidates can be voted for (excluding self)
  const votingCandidates =
    state.isTieRevote && state.tieCandidateIds.length > 0
      ? availableSuspects.filter(p => state.tieCandidateIds.includes(p.id))
      : availableSuspects;

  const handleLockInVote = async () => {
    if (!selectedSuspectId) return;
    setIsLockingVote(true);
    try {
      const actionName = state.phase === 'FINALE_VOTING' ? 'FINALE_LOCK_VOTE' : 'LOCK_VOTE';
      await api.sendAction(
        state.roomCode,
        actionName,
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
    const actionName =
      state.phase === 'FINALE_VOTE_REVEALS' ? 'FINALE_FINISH_SLATE' : 'FINISH_PHONE_SLATE';
    await api.sendAction(state.roomCode, actionName, null, playerToken);
    setIsShowingSlate(false);
  };

  const handleSubmitEndOrBanish = async (choice: 'END' | 'BANISH') => {
    setIsSubmittingEndOrBanish(true);
    setEndOrBanishChoice(choice);
    try {
      await api.sendAction(
        state.roomCode,
        'FINALE_SUBMIT_END_OR_BANISH',
        { choice },
        playerToken
      );
    } finally {
      setIsSubmittingEndOrBanish(false);
    }
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

  // If eliminated in the finale: show spectator screen
  if (isEliminated && state.currentRound === 6 && state.phase !== 'FINAL_RESULTS') {
    return (
      <PrivacyShield>
        <div className="min-h-screen bg-castle-black text-amber-100 flex flex-col justify-between p-6 text-center select-none">
          <div className="space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 mx-auto flex items-center justify-center">
              <Skull className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-serif font-black text-amber-200">
              Permanently Banished
            </h2>
            <p className="text-sm font-serif italic text-zinc-400 max-w-xs mx-auto leading-relaxed">
              “You have been eliminated from Jasmine’s Castle. Your role remains secret. You may observe public events on the Host Display, but cannot vote or advise survivors.”
            </p>
          </div>
          <div className="text-[11px] font-mono text-zinc-600">
            Libby’s Birthday: Trust Nobody · Spectator Mode
          </div>
        </div>
      </PrivacyShield>
    );
  }

  const isLoser =
    state.myPlayerId === finale?.loserPlayerId ||
    (me && finale?.jointLoserNames?.includes(me.name));
  const isWinner =
    state.myPlayerId === finale?.overallWinnerId ||
    (me && finale?.jointWinnerNames?.includes(me.name));

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
            <span>
              Player: <strong className="text-amber-300">{me?.name || 'Guest'}</strong>
            </span>
            <span>
              {state.currentRound <= 5 ? `Round ${state.currentRound} of 6` : 'Round 6: Finale'}
            </span>
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
                {state.currentRound === 6 ? 'Final Allegiance' : `Round ${state.currentRound} Allegiance`}
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
                    {isTraitor ? (
                      <Skull className="w-6 h-6 text-rose-400" />
                    ) : (
                      <Shield className="w-6 h-6 text-emerald-400" />
                    )}
                    {isTraitor ? 'TRAITOR' : 'FAITHFUL'}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded text-xs text-zinc-300 font-sans leading-relaxed">
                  <p className="font-serif font-bold text-amber-300 mb-1">Private Briefing:</p>
                  {state.mySecretBriefing}
                </div>

                {isTraitor && state.mySecretMission && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded text-xs text-rose-200 font-sans leading-relaxed">
                    <p className="font-serif font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5" /> Secret Mission (+2 Pts):
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
                <p className="font-serif font-bold text-amber-200 text-sm">Role Concealed in Wax</p>
                <p className="text-[11px] text-zinc-400 mt-1">Tap to securely inspect your identity</p>
              </div>
            )}
          </div>

          {/* ACTIVE MISSION INTERACTION (When phase === 'MISSION') */}
          {state.phase === 'MISSION' && (
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-5 shadow-xl space-y-4">
              {state.currentRound === 1 && (
                <ExhibitAMission state={state} isHostDisplay={false} playerToken={playerToken} />
              )}
              {state.currentRound === 2 && (
                <BirthdayMajorityMission
                  state={state}
                  isHostDisplay={false}
                  playerToken={playerToken}
                />
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
                        ? state.forgeryGalleryState?.traitorBrief ||
                          'Libby being crowned Queen (Include: Libby on throne, jewelled crown, royal sceptre, velvet curtain, royal guards)'
                        : state.forgeryGalleryState?.faithfulBrief ||
                          'Libby accepting an Oscar (Include: Libby on red carpet, shiny gold statuette, microphone, red curtain, camera crew)'}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-400 italic">
                    Draw this on your scrap paper with pen in silence. Do not reveal until Claudia counts down!
                  </p>
                </div>
              )}
              {state.currentRound === 4 && (
                <BodyDisposalMission state={state} isHostDisplay={false} />
              )}
              {state.currentRound === 5 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                    The Counterfeit Expert · Your Pitch Words
                  </span>
                  <div className="p-4 bg-burgundy-950/60 border border-amber-500/60 rounded text-xs text-amber-100 font-sans leading-relaxed space-y-3">
                    <p className="font-serif font-bold text-amber-300 text-sm">
                      Invention to Pitch: “{state.counterfeitExpertState?.invention || 'High-Tech Security Birthday Cake'}”
                    </p>
                    {isTraitor ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-mono text-rose-400 font-bold">
                            Your 2 Known Codewords (Smuggle both into your pitch):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(state.counterfeitExpertState?.traitorTwoWords || ['Laser', 'Fondant']).map(w => (
                              <span
                                key={w}
                                className="px-2.5 py-1 bg-zinc-900 border border-rose-500/50 rounded font-mono text-amber-300 font-bold"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rose-900/60 space-y-2">
                          <span className="text-[10px] uppercase font-mono text-amber-300 font-bold block">
                            Traitor Bonus (+2 Pts): Deduce the Faithful’s Missing 3rd Word!
                          </span>
                          <p className="text-[11px] text-zinc-300">
                            Listen carefully to the Faithful pitches. Which word below are they all smuggling in? Tap it to lock your deduction:
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(
                              state.counterfeitExpertState?.candidateWords || [
                                'Biometric',
                                'Frosting',
                                'Decibel',
                                'Sprinkles',
                                'Titanium',
                                'Tripwire',
                              ]
                            )
                              .filter(
                                w =>
                                  !(
                                    state.counterfeitExpertState?.traitorTwoWords || []
                                  ).includes(w)
                              )
                              .map(word => {
                                const isGuessed =
                                  state.counterfeitExpertState?.traitorGuessedWord === word;
                                return (
                                  <button
                                    key={word}
                                    type="button"
                                    onClick={() =>
                                      api.sendAction(
                                        state.roomCode,
                                        'COUNTERFEIT_TRAITOR_GUESS_WORD',
                                        { guessedWord: word },
                                        playerToken
                                      )
                                    }
                                    className={`p-2 rounded border font-mono text-xs transition flex items-center justify-between ${
                                      isGuessed
                                        ? 'bg-amber-500 text-black font-bold border-amber-300 shadow'
                                        : 'bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-amber-500/50'
                                    }`}
                                  >
                                    <span>{word}</span>
                                    {isGuessed && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
                          Faithful Required Words (Smuggle all 3 into your 30s pitch):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(state.counterfeitExpertState?.faithfulThreeWords || ['Laser', 'Fondant', 'Siren']).map(w => (
                            <span
                              key={w}
                              className="px-2.5 py-1 bg-zinc-900 border border-emerald-500/50 rounded font-mono text-emerald-300 font-bold"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-400 italic pt-1">
                          ⚠️ The Traitor only knows 2 of these words! Slip all 3 into your pitch naturally so you don’t give the 3rd word away too easily.
                        </p>
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

          {/* VOTING INTERFACE (When phase === VOTING, TIE_VOTING, or FINALE_VOTING) */}
          {(state.phase === 'VOTING' ||
            state.phase === 'TIE_VOTING' ||
            state.phase === 'FINALE_VOTING') && (
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-5 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                  {state.phase === 'FINALE_VOTING'
                    ? 'Permanent Elimination Ballot'
                    : state.isTieRevote
                    ? 'Tie Revote Ballot'
                    : 'The First Ballot'}
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

          {/* ROUND SUMMARY & PERSONAL SCORE BREAKDOWN ON PHONE */}
          {(state.phase === 'ROUND_SUMMARY' || state.phase === 'BANISHMENT_OUTCOME') && me && (
            <div className="bg-zinc-950/95 border-2 border-amber-500/50 rounded-xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500">
                  Round {state.currentRound} Outcome
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  Total: {me.score} pts
                </span>
              </div>

              {state.roundHistory.length > 0 && (
                (() => {
                  const latest = state.roundHistory[state.roundHistory.length - 1];
                  const myBreakdown = latest?.scoreBreakdown?.[me.id];
                  return (
                    <div className="space-y-2">
                      <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between text-zinc-300">
                          <span>Mission Performance:</span>
                          <strong className="text-amber-300">{myBreakdown?.missionPoints ?? 0}/3 pts</strong>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Personal Objective:</span>
                          <strong className="text-amber-300">{myBreakdown?.personalObjectivePoints ?? 0}/2 pts</strong>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Round Outcome:</span>
                          <strong className="text-amber-300">{myBreakdown?.roundOutcomePoints ?? 0}/1 pt</strong>
                        </div>
                        <div className="flex justify-between text-amber-200 border-t border-zinc-700/80 pt-1.5 font-bold">
                          <span>This Round:</span>
                          <span className="text-emerald-400">+{myBreakdown?.totalRoundPoints ?? (me.lastRoundScore || 0)} pts</span>
                        </div>
                      </div>

                      {latest.banishedPlayerName ? (
                        <p className="text-xs text-zinc-400 text-center italic font-serif">
                          Banished: <strong className="text-amber-300">{latest.banishedPlayerName}</strong> ({latest.wasTraitorBanished ? 'Traitor' : 'Faithful'})
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 text-center italic font-serif">
                          No banishment occurred this round.
                        </p>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* FINALE: END OR BANISH (FINAL FOUR) */}
          {state.phase === 'FINALE_END_OR_BANISH' && (
            <div className="bg-zinc-950/95 border-2 border-amber-500/60 rounded-xl p-5 shadow-2xl space-y-4 text-center">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 block">
                Final Four Decision
              </span>
              <h3 className="text-lg font-serif font-bold text-amber-100">
                End the Game or Banish Again?
              </h3>
              <p className="text-xs text-zinc-300 font-serif leading-relaxed">
                Choose privately on your phone. If all 4 choose END, the game concludes. If anyone chooses BANISH, another elimination takes place.
              </p>

              {endOrBanishChoice ? (
                <div className="p-4 bg-zinc-900 border border-amber-500/40 rounded-lg space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-xs font-mono text-amber-300 font-bold uppercase">
                    You Chose: {endOrBanishChoice}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Awaiting remaining survivors before simultaneous reveal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleSubmitEndOrBanish('END')}
                    disabled={isSubmittingEndOrBanish}
                    className="p-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/70 text-emerald-200 rounded-lg font-serif font-bold text-xs uppercase"
                  >
                    END THE GAME
                    <span className="text-[10px] font-sans font-normal block text-emerald-400/80 mt-1">
                      Everyone remaining is Faithful
                    </span>
                  </button>

                  <button
                    onClick={() => handleSubmitEndOrBanish('BANISH')}
                    disabled={isSubmittingEndOrBanish}
                    className="p-3 bg-rose-950 hover:bg-rose-900 border border-rose-500/70 text-rose-200 rounded-lg font-serif font-bold text-xs uppercase"
                  >
                    BANISH AGAIN
                    <span className="text-[10px] font-sans font-normal block text-rose-400/80 mt-1">
                      The Traitor is still here
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FINAL RESULTS / FORFEIT DISPLAY ON LOSER'S PHONE */}
          {state.phase === 'FINAL_RESULTS' && isLoser && (
            <div className="bg-zinc-950/95 border-2 border-rose-600 rounded-xl p-5 shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 block">
                  The Solemn Forfeit
                </span>
                <h3 className="text-xl font-serif font-bold text-amber-100">
                  Read Aloud to Jasmine
                </h3>
                <p className="text-xs text-zinc-400">
                  You have the lowest completed score. You must read the exact text below aloud:
                </p>
              </div>

              <div className="p-4 bg-black/80 border border-rose-800/60 rounded-lg text-xs font-serif text-amber-100 leading-relaxed whitespace-pre-line shadow">
                {JASMINE_FORFEIT_APOLOGY}
              </div>

              <button
                onClick={() => api.sendAction(state.roomCode, 'FINALE_FORFEIT_COMPLETE')}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-200 font-serif font-bold text-xs uppercase rounded"
              >
                Forfeit Complete
              </button>
            </div>
          )}

          {/* FINAL RESULTS FOR WINNER */}
          {state.phase === 'FINAL_RESULTS' && isWinner && (
            <div className="bg-gradient-to-b from-amber-950/80 to-zinc-950 border-2 border-amber-400 rounded-xl p-5 shadow-2xl text-center space-y-3">
              <Crown className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-2xl font-serif font-black text-amber-200">
                RULER OF JASMINE’S CASTLE
              </h3>
              <p className="text-xs text-zinc-300 font-serif leading-relaxed">
                You have triumphed! Accept your royal crown or household hat and pose for the victory photograph while your friends bow.
              </p>
            </div>
          )}
        </main>

        {/* Confirmation Modal for Banishment Vote */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-amber-500/60 rounded-lg p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="font-serif font-bold text-amber-200 text-base">Confirm Accusation</h4>
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
