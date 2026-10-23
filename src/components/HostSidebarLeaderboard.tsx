import React from 'react';
import { ClientGameState } from '../types/game';
import { Trophy, Crown, Skull, Shield, AlertCircle } from 'lucide-react';

interface Props {
  state: ClientGameState;
}

export const HostSidebarLeaderboard: React.FC<Props> = ({ state }) => {
  const currentRound = state.currentRound || 1;
  const completedRounds = [...(state.roundHistory || [])].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );
  const hasCompletedRounds = completedRounds.length > 0;

  // Compute cumulative points and round-by-round breakdown for all 7 seated players
  const playerRankings = state.players
    .map(p => {
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

      const displayScore =
        typeof p.score === 'number' && p.score >= calculatedTotal ? p.score : calculatedTotal;

      return {
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        isRoomCreator: p.isRoomCreator,
        isEliminated: p.isEliminated,
        displayScore,
        roundByRoundPoints,
      };
    })
    .sort((a, b) => b.displayScore - a.displayScore || a.seatNumber - b.seatNumber);

  const highestScore = playerRankings.length > 0 ? playerRankings[0].displayScore : 0;
  const lowestScore =
    playerRankings.length > 0 ? playerRankings[playerRankings.length - 1].displayScore : 0;

  return (
    <aside className="w-full bg-gradient-to-b from-zinc-950/95 via-burgundy-950/40 to-zinc-950/95 border-2 border-amber-500/50 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,163,69,0.3)]">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-serif font-black text-sm uppercase tracking-widest text-amber-100 flex items-center gap-1.5">
              <span>Castle Standings</span>
              <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 block">
              {hasCompletedRounds
                ? `Cumulative: ${completedRounds.length === 1 ? 'Round 1' : `Rounds 1–${completedRounds.length}`} Banked`
                : 'Round 1 in Progress (Max 6 pts/round)'}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300 font-bold">
          R{currentRound}/6
        </span>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        {playerRankings.map((p, idx) => {
          const isLeader = hasCompletedRounds && highestScore > 0 && p.displayScore === highestScore;
          const isLowest =
            hasCompletedRounds &&
            highestScore !== lowestScore &&
            p.displayScore === lowestScore;
          const rankBadge =
            idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                isLeader && !p.isEliminated
                  ? 'bg-gradient-to-r from-amber-950/70 via-burgundy-950/60 to-zinc-950/80 border-amber-400 shadow-[0_0_15px_rgba(212,163,69,0.25)]'
                  : p.isEliminated
                  ? 'bg-zinc-950/60 border-zinc-900 opacity-65 text-zinc-400'
                  : isLowest
                  ? 'bg-rose-950/25 border-rose-800/60 text-zinc-200'
                  : 'bg-zinc-900/70 border-zinc-800/90 hover:border-amber-900/60 text-zinc-200'
              }`}
            >
              {/* Top Row: Rank, Seat, Name, and Total Points */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-amber-400 w-5 shrink-0 text-center">
                    {rankBadge}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-serif font-black text-sm text-amber-100 truncate">
                        {p.name}
                      </span>
                      {p.isEliminated && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-red-950 border border-red-800 text-red-300 rounded uppercase">
                          Finale Banished
                        </span>
                      )}
                      {isLeader && !p.isEliminated && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded uppercase">
                          Leader
                        </span>
                      )}
                      {isLowest && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-rose-950 border border-rose-700/60 text-rose-300 rounded uppercase">
                          Forfeit Risk
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 block">
                      Seat #{p.seatNumber}
                    </span>
                  </div>
                </div>

                {/* Cumulative Score */}
                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-base text-amber-300 tracking-tight leading-none">
                    {p.displayScore}
                  </div>
                  <span className="text-[9px] font-mono text-amber-500/80 uppercase">
                    TOTAL PTS
                  </span>
                </div>
              </div>

              {/* Bottom Row: Round-by-Round Score Badges */}
              {hasCompletedRounds && (
                <div className="mt-1.5 pt-1.5 border-t border-zinc-800/60 flex items-center gap-1 overflow-x-auto text-[9px] font-mono">
                  {completedRounds.map(r => {
                    const pts = p.roundByRoundPoints[r.roundNumber] ?? 0;
                    return (
                      <span
                        key={r.roundNumber}
                        className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${
                          pts > 0
                            ? 'bg-amber-950/40 border-amber-600/40 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                        title={`Round ${r.roundNumber}: +${pts} pts`}
                      >
                        R{r.roundNumber}: <strong className="font-bold">+{pts}</strong>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final Objective & Stakes Callout */}
      <div className="p-3 rounded-xl bg-black/70 border border-amber-500/40 space-y-2 text-[11px] font-sans">
        <div className="font-serif font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 text-xs border-b border-zinc-800 pb-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Final Objective & Stakes</span>
        </div>
        <div className="space-y-1.5 text-zinc-300 leading-snug">
          <p className="flex items-start gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-300">Faithful Victory:</strong> Banish the Round 6 Traitor in the Finale — the <strong className="text-amber-200">surviving Faithful with the most cumulative points (R1–R6)</strong> wins the Crown!
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-300">Traitor Heist:</strong> If the Round 6 Traitor survives the Finale banishments, they <strong className="text-amber-200">steal the Crown outright</strong> regardless of points!
            </span>
          </p>
          <p className="text-[10px] font-mono text-rose-300/90 pt-1 border-t border-zinc-800/80">
            🐾 <strong>Jasmine’s Forfeit:</strong> The player with the <strong>lowest 6-round total score</strong> (even if banished) must read the solemn Apology to Jasmine aloud!
          </p>
        </div>
      </div>
    </aside>
  );
};

