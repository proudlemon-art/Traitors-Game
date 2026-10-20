import React, { useState } from 'react';
import { AUCTION_LOTS } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Coins, Gavel, Award, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
  playerToken?: string;
}

export const GetawayAuctionMission: React.FC<Props> = ({ state, isHostDisplay, playerToken }) => {
  const auctionState = state.getawayAuctionState || {
    currentLotIndex: 0,
    lots: AUCTION_LOTS,
    playerCoins: {},
    playerEscapePoints: {},
    purchasedLots: {},
    bids: {},
    activeLotBidsLocked: false,
    tieRebidActive: false,
    tieCandidateIds: [],
    tieRebids: {},
    lotWinners: {},
  };

  const activeLot = auctionState.lots[auctionState.currentLotIndex] || auctionState.lots[0];
  const myCoins: number =
    state.myPlayerId && typeof auctionState.playerCoins[state.myPlayerId] === 'number'
      ? auctionState.playerCoins[state.myPlayerId]
      : 12;
  const myBids =
    state.myPlayerId && activeLot && auctionState.bids?.[activeLot.lotNumber]?.[state.myPlayerId]
      ? auctionState.bids[activeLot.lotNumber][state.myPlayerId]
      : 0;
  const [selectedBid, setSelectedBid] = useState<number>(1);

  const handlePlaceBid = async () => {
    if (!playerToken) return;
    await api.sendAction(
      state.roomCode,
      'SUBMIT_AUCTION_BID',
      { lotNumber: activeLot.lotNumber, bid: selectedBid },
      playerToken
    );
  };

  const handleResolveLot = async (winnerId: string, winningBid: number) => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'RESOLVE_AUCTION_LOT', {
      lotNumber: activeLot.lotNumber,
      winnerId,
      winningBid,
    });
  };

  const handleNextLot = async () => {
    if (!isHostDisplay) return;
    const nextIdx = Math.min(auctionState.lots.length - 1, auctionState.currentLotIndex + 1);
    await api.sendAction(state.roomCode, 'UPDATE_GETAWAY_AUCTION', {
      currentLotIndex: nextIdx,
      activeLotBidsLocked: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 6 Climax · The Getaway Auction
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Lot {activeLot.lotNumber} of {auctionState.lots.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-amber-500/30 rounded text-xs text-amber-400 font-mono">
            <Coins className="w-3.5 h-3.5" /> 12 Starting Coins
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-xl md:text-2xl font-serif font-black text-amber-100">
            Lot #{activeLot.lotNumber}: {activeLot.title}
          </h3>
          <span className="px-2.5 py-0.5 bg-amber-500 text-zinc-950 font-bold font-mono text-xs rounded uppercase">
            +{activeLot.escapePoints} Escape Pts
          </span>
        </div>

        <p className="text-sm font-sans text-amber-200/90 mt-2 max-w-2xl leading-relaxed">
          {activeLot.description}
        </p>

        {isHostDisplay && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleNextLot}
              disabled={auctionState.currentLotIndex >= auctionState.lots.length - 1}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs font-mono uppercase rounded border border-amber-400 disabled:opacity-40"
            >
              Advance to Next Lot ({auctionState.currentLotIndex + 1}/{auctionState.lots.length})
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player Balances & Escape Points */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              Coin Bags & Escape Points
            </h4>
          </div>

          <div className="space-y-2">
            {state.players.map(p => {
              const coins = auctionState.playerCoins[p.id] ?? 12;
              const escPoints = auctionState.playerEscapePoints[p.id] ?? 0;
              const wonLots = auctionState.purchasedLots[p.id] || [];

              return (
                <div
                  key={p.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-500">#{p.seatNumber}</span>
                    <span className="font-serif font-semibold text-sm text-zinc-200">{p.name}</span>
                    {wonLots.length > 0 && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                        Lots: {wonLots.join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {coins} Coins
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {escPoints} Esc Pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bidding Panel (Player Phone vs Host) */}
        {!isHostDisplay ? (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm">
                Your Secret Sealed Bid
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                You have <strong className="text-amber-300">{myCoins} coins</strong> remaining.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 py-3">
                <button
                  onClick={() => setSelectedBid(Math.max(0, selectedBid - 1))}
                  className="w-10 h-10 rounded bg-zinc-800 text-amber-300 font-bold text-lg border border-zinc-700"
                >
                  -
                </button>
                <div className="text-3xl font-mono font-black text-amber-400">
                  {selectedBid} <span className="text-xs text-zinc-400">Coins</span>
                </div>
                <button
                  onClick={() => setSelectedBid(Math.min(myCoins, selectedBid + 1))}
                  className="w-10 h-10 rounded bg-zinc-800 text-amber-300 font-bold text-lg border border-zinc-700"
                >
                  +
                </button>
              </div>

              <button
                onClick={handlePlaceBid}
                className="w-full py-3 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 font-serif font-bold text-xs uppercase tracking-widest rounded border border-amber-500/50 shadow"
              >
                Submit Sealed Bid ({selectedBid} Coins)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-400" />
                Host Auctioneer Controls
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Collect bids, break ties with a 30s re-bid, or award the lot.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-300">Award Lot #{activeLot.lotNumber} to Winner:</p>
              <div className="grid grid-cols-2 gap-2">
                {state.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleResolveLot(p.id, 3)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-xs text-left font-serif font-semibold"
                  >
                    Award to {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
