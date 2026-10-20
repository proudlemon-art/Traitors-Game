import React, { useState } from 'react';
import { HEIST_STAGES, HEIST_HOUSEHOLD_ITEMS_POOL } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Sparkles, Check, Trophy, Clock, ShieldCheck, Heart } from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const HeistMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const heistState = state.castleHeistState || {
    currentStage: 1,
    confirmedHouseholdItems: HEIST_HOUSEHOLD_ITEMS_POOL.slice(0, 5),
    targetObjectForTraitor: HEIST_HOUSEHOLD_ITEMS_POOL[0],
    qualifyingPlayers: { 1: [], 2: [], 3: [] },
    stageVotes: { 1: {}, 2: {}, 3: {} },
    stageFavorites: {},
  };

  const currentStageInfo = HEIST_STAGES[heistState.currentStage - 1] || HEIST_STAGES[0];
  const qualifyingList = heistState.qualifyingPlayers[heistState.currentStage] || [];

  const handleToggleQualify = async (playerId: string) => {
    if (!isHostDisplay) return;
    const currentList = [...qualifyingList];
    const exists = currentList.includes(playerId);
    const updated = exists ? currentList.filter(id => id !== playerId) : [...currentList, playerId];

    await api.sendAction(state.roomCode, 'UPDATE_CASTLE_HEIST', {
      qualifyingPlayers: {
        ...heistState.qualifyingPlayers,
        [heistState.currentStage]: updated,
      },
    });
  };

  const handleSetStage = async (stageNum: 1 | 2 | 3) => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'UPDATE_CASTLE_HEIST', {
      currentStage: stageNum,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stage Header Banner */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 1 Mission · The Castle Heist
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Stage {heistState.currentStage} of 3
            </span>
          </div>

          {isHostDisplay && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(st => (
                <button
                  key={st}
                  onClick={() => handleSetStage(st as 1 | 2 | 3)}
                  className={`px-3 py-1 rounded text-xs font-serif font-bold uppercase border transition-all ${
                    heistState.currentStage === st
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-amber-200'
                  }`}
                >
                  Stage {st}
                </button>
              ))}
            </div>
          )}
        </div>

        <h3 className="text-2xl font-serif font-black text-amber-100 tracking-wide">
          {currentStageInfo.title}
        </h3>
        <p className="text-sm font-sans text-amber-200/90 mt-1 max-w-2xl leading-relaxed">
          {currentStageInfo.prompt}
        </p>
        <p className="text-xs font-sans text-zinc-400 italic mt-2">
          💡 {currentStageInfo.hint}
        </p>
      </div>

      {/* Rules & Scavenger Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage Presentation and Qualification */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Stage {heistState.currentStage} Object Qualifications (+1 pt each)
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              {qualifyingList.length}/7 Qualified
            </span>
          </div>

          <p className="text-xs text-zinc-300">
            Each player brings one household object. Players briefly explain their choice. Group confirms if it qualifies (max 3 points across the mission).
          </p>

          <div className="space-y-2">
            {state.players.map(p => {
              const isQualified = qualifyingList.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleToggleQualify(p.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isHostDisplay ? 'cursor-pointer hover:border-amber-500/60' : ''
                  } ${
                    isQualified
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-amber-500">#{p.seatNumber}</span>
                    <span className="font-serif font-semibold text-sm text-zinc-200">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isQualified ? (
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-600/50">
                        <Check className="w-3.5 h-3.5" /> Qualified (+1)
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-zinc-500">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Favorite Object & Comedy Award */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Stage Favorite Vote (Comedy Award)
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              After presentations, players cast a vote for their favorite object. The winner receives Claudia’s theatrical praise (no scoreboard points).
            </p>
          </div>

          <div className="p-4 bg-burgundy-950/30 border border-amber-900/40 rounded-lg space-y-3">
            <span className="text-xs font-mono uppercase text-amber-400 block font-bold">
              Available Household Items Confirmed:
            </span>
            <div className="flex flex-wrap gap-2">
              {heistState.confirmedHouseholdItems.map(item => (
                <span
                  key={item}
                  className="px-2.5 py-1 bg-zinc-900 text-xs font-mono text-zinc-300 rounded border border-zinc-800"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400 italic">
              Note: Players may reuse household objects, but cannot claim an object another player is currently presenting.
            </p>
          </div>

          {heistState.stageFavorites[heistState.currentStage] && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded text-center space-y-1">
              <Heart className="w-5 h-5 text-amber-400 mx-auto" />
              <div className="text-xs font-mono text-amber-300 uppercase">Stage Favorite</div>
              <div className="text-base font-serif font-bold text-amber-100">
                {heistState.stageFavorites[heistState.currentStage].playerName}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
