import React from 'react';
import { ClientGameState } from '../types/game';
import { Trophy, Award } from 'lucide-react';

interface Props {
  state: ClientGameState;
}

export const PreviousRoundsLeaderboard: React.FC<Props> = ({ state }) => {
  const currentRound = state.currentRound || 1;
  const completedRounds = state.roundHistory || [];
  const hasCompletedRounds = completedRounds.length > 0;

  // Compute total points and round-by-round breakdown for all seated players
  const playerRankings = state.players.map(p => {
    const roundByRoundPoints: Record<number, number> = {};
    let calculatedTotal = 0;

    completedRounds.forEach(r => {
      const roundPts =
        r.roundScores && r.roundScores[p.id] !== undefined
          ? r.roundScores[p.id]
          : (r.scoreBreakdown?.[p.id]?.totalRoundPoints ?? 0);
      roundByRoundPoints[r.roundNumber] = roundPts;
      calculatedTotal += roundPts;
    });

    const displayScore = p.score !== undefined ? p.score : calculatedTotal;

    return {
      id: p.id,
      name: p.name,
      seatNumber: p.seatNumber,
      isRoomCreator: p.isRoomCreator,
      displayScore,
      roundByRoundPoints,
    };
  }).sort((a, b) => b.displayScore - a.displayScore || a.seatNumber - b.seatNumber);

  const highestScore = playerRankings.length > 0 ? playerRankings[0].displayScore : 0;

  return (
    <div className="w-full bg-zinc-950/90 border border-amber-900/50 rounded-xl px-4 py-2.5 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-200">
            {hasCompletedRounds
              ? `Castle Leaderboard (${completedRounds.length === 1 ? 'Round 1' : `Rounds 1–${completedRounds.length}`} Recorded)`
              : 'Castle Leaderboard (Round 1 in Progress)'}
          </span>
        </div>

        <span className="text-[11px] font-mono text-zinc-400">
          {hasCompletedRounds ? (
            <span>
              Live standings · <strong className="text-amber-400">Round {currentRound}</strong> points tally upon its banishment
            </span>
          ) : (
            <span>All 7 players seated · Round 1 points record upon banishment</span>
          )}
        </span>
      </div>

      {/* Compact Horizontal Grid of All 7 Players */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {playerRankings.map((p, idx) => {
          const isLeader = hasCompletedRounds && highestScore > 0 && p.displayScore === highestScore;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

          return (
            <div
              key={p.id}
              className={`px-2.5 py-1.5 rounded-lg border flex flex-col justify-between text-xs transition ${
                isLeader
                  ? 'bg-amber-950/40 border-amber-400 text-amber-100 shadow-[0_0_10px_rgba(212,163,69,0.2)]'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                <span className="text-amber-400 font-bold">{medal}</span>
                <span className="text-zinc-500">Seat {p.seatNumber}</span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="font-serif font-bold truncate text-amber-100 text-xs" title={p.name}>
                  {p.name}
                </span>
                <span className="font-mono font-bold text-amber-300 text-xs shrink-0">
                  {p.displayScore} <span className="text-[10px] text-zinc-400 font-normal">pts</span>
                </span>
              </div>

              {/* Round-by-round point badges if completed rounds exist */}
              {hasCompletedRounds && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-zinc-800/60 text-[9px] font-mono overflow-x-auto">
                  {completedRounds.map(r => (
                    <span
                      key={r.roundNumber}
                      className="px-1 py-0.2 rounded bg-zinc-800/80 text-zinc-400 whitespace-nowrap"
                      title={`Round ${r.roundNumber}: ${p.roundByRoundPoints[r.roundNumber] ?? 0} pts`}
                    >
                      R{r.roundNumber}:{p.roundByRoundPoints[r.roundNumber] ?? 0}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
