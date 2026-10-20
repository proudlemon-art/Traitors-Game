import React, { useState } from 'react';
import { COUNTERFEIT_INVENTIONS } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Mic, Clock, Sparkles, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const CounterfeitExpertMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const currentInvention = COUNTERFEIT_INVENTIONS[0];
  const counterfeitState = state.counterfeitExpertState || {
    invention: currentInvention.invention,
    faithfulThreeWords: currentInvention.faithfulThreeWords,
    traitorTwoWords: currentInvention.traitorTwoWords,
    missingThirdWord: currentInvention.missingThirdWord,
    speakingOrder: state.seatingOrder,
    playerMilestones: {},
  };

  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState<number>(0);
  const activeSpeakerId = counterfeitState.speakingOrder[activeSpeakerIndex] || state.seatingOrder[0];
  const activeSpeaker = state.players.find(p => p.id === activeSpeakerId);

  const handleToggleMilestone = async (
    playerId: string,
    key: 'under30Seconds' | 'word1Used' | 'word2Used' | 'word3Attempted'
  ) => {
    if (!isHostDisplay) return;
    const current = counterfeitState.playerMilestones[playerId] || {
      under30Seconds: false,
      word1Used: false,
      word2Used: false,
      word3Attempted: false,
    };
    const updated = { ...current, [key]: !current[key] };

    await api.sendAction(state.roomCode, 'UPDATE_COUNTERFEIT_EXPERT', {
      playerMilestones: {
        ...counterfeitState.playerMilestones,
        [playerId]: updated,
      },
    });
  };

  const isPostBanishment = [
    'BANISHMENT_OUTCOME',
    'ASSIGNMENT_VERIFICATION',
    'ROUND_SUMMARY',
    'FINAL_RESULTS',
  ].includes(state.phase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
            Round 5 Mission · The Counterfeit Expert
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            30s Pitch Per Guest
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-serif font-black text-amber-100">
          "{counterfeitState.invention}"
        </h3>
        <p className="text-sm font-sans text-amber-200/90 mt-1 max-w-2xl leading-relaxed">
          Every guest must pitch this exact invention to the castle for 30 seconds. Faithful have 3 required secret words to smuggle in naturally. The Traitor only has 2 words!
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pitch Order & Scores */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              Speaking Order & Pitch Scores (+1 pt each, max 3)
            </h4>
          </div>

          <div className="space-y-2">
            {state.players.map((p, idx) => {
              const ms = counterfeitState.playerMilestones[p.id] || {
                under30Seconds: false,
                word1Used: false,
                word2Used: false,
                word3Attempted: false,
              };
              const pts = (ms.under30Seconds ? 1 : 0) + (ms.word1Used ? 1 : 0) + (ms.word2Used ? 1 : 0);
              const isCurrent = activeSpeakerId === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-burgundy-950/60 border-amber-400'
                      : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-500">#{idx + 1}</span>
                      <span className="font-serif font-semibold text-sm text-zinc-200">
                        {p.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded uppercase">
                          Speaking Now
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {pts} / 3 Pts
                    </span>
                  </div>

                  {isHostDisplay && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'under30Seconds')}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-mono border transition-all ${
                          ms.under30Seconds
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ 30s Time
                      </button>
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'word1Used')}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-mono border transition-all ${
                          ms.word1Used
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ Word 1
                      </button>
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'word2Used')}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-mono border transition-all ${
                          ms.word2Used
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ Word 2/3
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Guidance and Post-Banishment Reveal */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Claudia’s Pitch Rules
            </h4>
          </div>

          <div className="text-xs text-zinc-300 font-sans space-y-3 leading-relaxed">
            <p>
              1. <strong>Pitch Like a Dragon:</strong> You are selling this magnificent, ridiculous contraption to the castle.
            </p>
            <p>
              2. <strong>Smuggle Naturally:</strong> You must weave your required words into your pitch without shouting them or pausing awkwardly.
            </p>
            <p>
              3. <strong>The Traitor’s Dilemma:</strong> The Traitor only has 2 words! They must deduce the 3rd word from earlier pitches. If the Traitor is first in order, pure luck and audacity are required!
            </p>
          </div>

          {isPostBanishment && (
            <div className="p-4 bg-burgundy-950/40 border border-amber-500/60 rounded-lg space-y-2">
              <span className="text-xs font-mono uppercase text-amber-400 block font-bold">
                Secret Words Revealed
              </span>
              <div className="text-xs space-y-1">
                <div>
                  <strong className="text-emerald-400">Faithful Required Words (3):</strong>{' '}
                  <span className="text-zinc-200 font-mono">
                    {counterfeitState.faithfulThreeWords.join(', ')}
                  </span>
                </div>
                <div>
                  <strong className="text-rose-400">Traitor’s Missing Word:</strong>{' '}
                  <span className="text-amber-300 font-mono font-bold">
                    {counterfeitState.missingThirdWord}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
