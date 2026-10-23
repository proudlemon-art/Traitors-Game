import React, { useState } from 'react';
import { AUCTION_LOTS } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Coins, Gavel, Skull, CheckCircle2, Zap, ArrowRight } from 'lucide-react';

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
  const currentLotBids = (activeLot && auctionState.bids?.[activeLot.lotNumber]) || {};
  const myLockedBid =
    state.myPlayerId && currentLotBids[state.myPlayerId] !== undefined
      ? currentLotBids[state.myPlayerId]
      : undefined;

  const [selectedBid, setSelectedBid] = useState<number>(1);
  const [hostBidAmount, setHostBidAmount] = useState<number>(3);
  const isTraitor = state.myRole === 'TRAITOR';

  const handlePlaceBid = async () => {
    await api.sendAction(
      state.roomCode,
      'SUBMIT_AUCTION_BID',
      { lotNumber: activeLot.lotNumber, bid: selectedBid, targetPlayerId: state.myPlayerId },
      playerToken
    );
  };

  const handleResolveLot = async (winnerId: string, winningBid?: number) => {
    if (!isHostDisplay) return;
    const bidToUse =
      winningBid !== undefined
        ? winningBid
        : currentLotBids[winnerId] !== undefined
        ? currentLotBids[winnerId]
        : hostBidAmount;
    await api.sendAction(state.roomCode, 'RESOLVE_AUCTION_LOT', {
      lotNumber: activeLot.lotNumber,
      winnerId,
      winningBid: bidToUse,
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

  const handlePrevLot = async () => {
    if (!isHostDisplay) return;
    const prevIdx = Math.max(0, auctionState.currentLotIndex - 1);
    await api.sendAction(state.roomCode, 'UPDATE_GETAWAY_AUCTION', {
      currentLotIndex: prevIdx,
      activeLotBidsLocked: false,
    });
  };

  const handleAutoSimulateAuction = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_AUCTION');
  };

  const handleConcludeAuctionToFinale = async () => {
    await api.sendAction(state.roomCode, 'CONCLUDE_AUCTION_TO_FINALE');
  };

  const currentWinnerId = activeLot ? auctionState.lotWinners?.[activeLot.lotNumber] : undefined;
  const currentWinnerName = currentWinnerId
    ? state.players.find(p => p.id === currentWinnerId)?.name
    : undefined;

  return (
    <div className="space-y-6 animate-fadeIn">
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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-amber-500/30 rounded text-xs text-amber-400 font-mono">
              <Coins className="w-3.5 h-3.5" /> 12 Starting Coins
            </div>
            {isHostDisplay && (
              <button
                type="button"
                onClick={handleAutoSimulateAuction}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-200 text-xs font-mono font-bold rounded flex items-center gap-1 transition"
                title="Automatically simulate all 6 lots, tally Round 6 points, and enter the Finale"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Simulate Auction & Enter Finale</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-xl md:text-2xl font-serif font-black text-amber-100">
            Lot #{activeLot.lotNumber}: {activeLot.title}
          </h3>
          <span className="px-2.5 py-0.5 bg-amber-500 text-zinc-950 font-bold font-mono text-xs rounded uppercase">
            +{activeLot.escapePoints} Escape Pts
          </span>
          {currentWinnerName && (
            <span className="px-2.5 py-0.5 bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-mono text-xs rounded">
              ✓ Won by {currentWinnerName}
            </span>
          )}
        </div>

        <p className="text-sm font-sans text-amber-200/90 mt-2 max-w-2xl leading-relaxed">
          {activeLot.description}
        </p>

        {isHostDisplay && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevLot}
                disabled={auctionState.currentLotIndex === 0}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs uppercase rounded border border-zinc-700 disabled:opacity-40"
              >
                ← Prev Lot
              </button>
              <button
                type="button"
                onClick={handleNextLot}
                disabled={auctionState.currentLotIndex >= auctionState.lots.length - 1}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs font-mono uppercase rounded border border-amber-400 disabled:opacity-40"
              >
                Next Lot ({auctionState.currentLotIndex + 1}/{auctionState.lots.length}) →
              </button>
            </div>

            <button
              type="button"
              onClick={handleConcludeAuctionToFinale}
              className="px-5 py-2 bg-gradient-to-r from-burgundy-800 via-amber-600 to-burgundy-800 hover:from-burgundy-700 hover:to-amber-500 text-white font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow-xl flex items-center gap-1.5"
            >
              <span>Conclude Auction & Enter Finale Banishments</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Private Traitor Sabotage Target (Phone Only, Never on TV Host Display) */}
      {!isHostDisplay && isTraitor && auctionState.traitorTargetFaithfulName && (
        <div className="p-4 bg-rose-950/60 border-2 border-rose-500/70 rounded-xl space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-rose-300 font-bold">
            <Skull className="w-4 h-4 text-rose-400" />
            Secret Traitor Sabotage Target (+2 Pts)
          </div>
          <p className="text-xs text-amber-100 font-serif leading-relaxed">
            Your target is <strong className="text-amber-300 underline">{auctionState.traitorTargetFaithfulName}</strong>.
            Bait them into bidding wars so they drain their coins early or finish outside the top Escape Points!
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player Balances & Escape Points */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              Coin Bags & Escape Points (Top Scorers Earn Up to +3 Mission Pts)
            </h4>
          </div>

          <div className="space-y-2">
            {state.players.map(p => {
              const coins = auctionState.playerCoins[p.id] ?? 12;
              const escPoints = auctionState.playerEscapePoints[p.id] ?? 0;
              const wonLots = auctionState.purchasedLots[p.id] || [];
              const hasBidOnCurrent = currentLotBids[p.id] !== undefined;

              return (
                <div
                  key={p.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-500">#{p.seatNumber}</span>
                    <span className="font-serif font-semibold text-sm text-zinc-200">{p.name}</span>
                    {wonLots.length > 0 && (
                      <span className="text-[10px] bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                        Lots #{wonLots.join(', #')}
                      </span>
                    )}
                    {hasBidOnCurrent && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-1.5 py-0.5 rounded font-mono">
                        Bid Sealed
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
                Your Secret Sealed Bid for Lot #{activeLot.lotNumber}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                You have <strong className="text-amber-300">{myCoins} coins</strong> remaining.
              </p>
            </div>

            {myLockedBid !== undefined && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center justify-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sealed Bid Locked: {myLockedBid} Coins (You may update before hammer falls)</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedBid(Math.max(0, selectedBid - 1))}
                  className="w-10 h-10 rounded bg-zinc-800 text-amber-300 font-bold text-lg border border-zinc-700"
                >
                  -
                </button>
                <div className="text-3xl font-mono font-black text-amber-400">
                  {selectedBid} <span className="text-xs text-zinc-400">Coins</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBid(Math.min(myCoins, selectedBid + 1))}
                  className="w-10 h-10 rounded bg-zinc-800 text-amber-300 font-bold text-lg border border-zinc-700"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handlePlaceBid}
                className="w-full py-3 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 font-serif font-bold text-xs uppercase tracking-widest rounded border border-amber-500/50 shadow"
              >
                Submit Sealed Bid ({selectedBid} Coins)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-400" />
                  Host Auctioneer Controls
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Award Lot #{activeLot.lotNumber} to the highest bidder (uses their phone bid or the fallback coin amount below).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-lg text-xs font-mono">
              <span className="text-zinc-300">Fallback Bid Price (if verbal bid):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHostBidAmount(Math.max(0, hostBidAmount - 1))}
                  className="px-2 py-0.5 bg-zinc-800 text-amber-300 rounded border border-zinc-700"
                >
                  -
                </button>
                <span className="text-amber-300 font-bold">{hostBidAmount} Coins</span>
                <button
                  type="button"
                  onClick={() => setHostBidAmount(Math.min(12, hostBidAmount + 1))}
                  className="px-2 py-0.5 bg-zinc-800 text-amber-300 rounded border border-zinc-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-300">Click Winner to Award Lot #{activeLot.lotNumber}:</p>
              <div className="grid grid-cols-2 gap-2">
                {state.players.map(p => {
                  const playerSealedBid = currentLotBids[p.id];
                  const isLotWinner = currentWinnerId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleResolveLot(p.id, playerSealedBid)}
                      className={`p-2.5 border rounded text-xs text-left font-serif font-semibold transition flex items-center justify-between ${
                        isLotWinner
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {playerSealedBid !== undefined ? `Bid: ${playerSealedBid}c` : `${hostBidAmount}c`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

