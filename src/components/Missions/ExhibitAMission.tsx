import React, { useState } from 'react';
import { ClientGameState, ExhibitAObject } from '../../types/game';
import { api } from '../../services/api';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Vote,
  PackageCheck,
  HelpCircle,
  Flame,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const ExhibitAMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const exhibitState = state.exhibitAState;
  const myPlayerId = state.myPlayerId;
  const isTraitor = state.myRole === 'TRAITOR';

  // Local state for registering/editing object
  const [objectNameInput, setObjectNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!exhibitState) {
    return (
      <div className="p-8 text-center text-zinc-400 font-serif">
        Exhibit A state is initializing...
      </div>
    );
  }

  const myObject = exhibitState.objects.find(o => o.contributorId === myPlayerId);
  const hasSubmittedMyObject = !!myObject && myObject.name.trim().length > 0;
  const hasAcknowledgedBriefing = myPlayerId ? exhibitState.acknowledgedPlayerIds.includes(myPlayerId) : false;
  const myEvidenceVote = myPlayerId ? exhibitState.evidenceVotes[myPlayerId] : undefined;
  const hasVotedEvidence = !!myEvidenceVote;

  // -------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------
  const handleSubmitObject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectNameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await api.sendAction(state.roomCode, 'EXHIBIT_A_SUBMIT_OBJECT', {
        objectName: objectNameInput.trim(),
      });
      setIsEditing(false);
      setObjectNameInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockObjects = async () => {
    if (!isHostDisplay) return;
    setIsSubmitting(true);
    try {
      await api.sendAction(state.roomCode, 'EXHIBIT_A_LOCK_OBJECTS');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await api.sendAction(state.roomCode, 'EXHIBIT_A_ACKNOWLEDGE');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPresentations = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'EXHIBIT_A_START_PRESENTATIONS');
  };

  const handleTogglePresented = async (contributorId: string) => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'EXHIBIT_A_TOGGLE_PRESENTED', { contributorId });
  };

  const handleOpenEvidenceVoting = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'EXHIBIT_A_OPEN_VOTING');
  };

  const handleSubmitEvidenceVote = async () => {
    if (!selectedObjectId) return;
    setIsSubmitting(true);
    try {
      await api.sendAction(state.roomCode, 'EXHIBIT_A_CAST_VOTE', { objectId: selectedObjectId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealEvidenceVotes = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'EXHIBIT_A_REVEAL_VOTES');
  };

  const handleTieRevote = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'EXHIBIT_A_TIE_REVOTE');
  };

  const handleProceedToRoundTable = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE');
  };

  // -------------------------------------------------------------------
  // RENDER: HOST DISPLAY
  // -------------------------------------------------------------------
  if (isHostDisplay) {
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
                Round 1 Mission
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Stage:{' '}
                {exhibitState.stage === 'COLLECTION' && 'Object Collection'}
                {exhibitState.stage === 'SECRET_BRIEFING' && 'Secret Briefing'}
                {exhibitState.stage === 'PRESENTATIONS' && 'Evidence Presentations'}
                {exhibitState.stage === 'EVIDENCE_VOTING' && 'Evidence Voting'}
                {exhibitState.stage === 'EVIDENCE_REVEAL' && 'Exhibit A Revealed'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wider text-amber-100">
              EXHIBIT A: THE CRIME SCENE
            </h2>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-amber-400/80 block uppercase tracking-wider">
              Forensic Objective
            </span>
            <span className="text-xs text-zinc-300 italic max-w-xs block font-serif">
              One object will become Exhibit A. The Traitor secretly wants their planted item selected.
            </span>
          </div>
        </div>

        {/* STAGE 1: COLLECTION (HOST) */}
        {exhibitState.stage === 'COLLECTION' && (
          <div className="bg-zinc-950/80 border border-amber-900/40 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-amber-200">
                  Registered Household Contenders ({exhibitState.objects.length}/7)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Each player must fetch one ordinary household object, bring it to the table, and enter its name on their phone.
                </p>
              </div>

              {exhibitState.objects.length >= 7 && (
                <button
                  onClick={handleLockObjects}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(212,163,69,0.4)] transition"
                >
                  Confirm & Lock Object List
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {state.players.map((p, idx) => {
                const obj = exhibitState.objects.find(o => o.contributorId === p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-lg border transition ${
                      obj
                        ? 'bg-zinc-900/90 border-amber-500/50 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
                      <span>Seat {p.seatNumber}</span>
                      {obj ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-amber-500 animate-pulse">Fetching...</span>
                      )}
                    </div>
                    <div className="font-serif font-bold text-amber-100 text-base">{p.name}</div>
                    <div className="mt-2 text-sm text-amber-300/90 font-mono italic truncate">
                      {obj ? `"${obj.name}"` : 'Awaiting submission...'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 2: SECRET BRIEFING (HOST) */}
        {exhibitState.stage === 'SECRET_BRIEFING' && (
          <div className="bg-zinc-950/90 border border-amber-500/40 rounded-xl p-6 text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-burgundy-900/80 border border-amber-500/60 mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(212,163,69,0.3)]">
              <Sparkles className="w-7 h-7 text-amber-300" />
            </div>

            <div className="max-w-lg mx-auto space-y-2">
              <h3 className="text-xl font-serif font-bold text-amber-100">
                The Planted Evidence Has Been Selected
              </h3>
              <p className="text-sm text-zinc-300 font-serif leading-relaxed">
                The Traitor is currently reading which object they planted. Faithful are receiving their final briefing. Everyone must tap their phone to acknowledge before we begin presentations.
              </p>
            </div>

            {/* Neutral Readiness checklist */}
            <div className="max-w-md mx-auto bg-black/60 border border-amber-900/50 rounded-xl p-4">
              <div className="text-xs font-mono uppercase text-amber-400 mb-3 flex items-center justify-between">
                <span>Player Acknowledgement</span>
                <span>{exhibitState.acknowledgedPlayerIds.length} / 7 Ready</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                {state.players.map(p => {
                  const ack = exhibitState.acknowledgedPlayerIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`text-xs px-2.5 py-1.5 rounded flex items-center justify-between ${
                        ack ? 'bg-amber-950/50 text-amber-200 border border-amber-600/40' : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <span>{p.name}</span>
                      {ack && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {exhibitState.acknowledgedPlayerIds.length >= 7 && (
              <button
                onClick={handleStartPresentations}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-[0_0_25px_rgba(212,163,69,0.5)] transition"
              >
                Begin Forensic Presentations
              </button>
            )}
          </div>
        )}

        {/* STAGE 3: PRESENTATIONS (HOST) */}
        {exhibitState.stage === 'PRESENTATIONS' && (
          <div className="bg-zinc-950/80 border border-amber-900/40 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-amber-200">
                  Forensic Presentations (30 Seconds Each)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Each investigator presents why their item is suspicious. Then allow 2 minutes of open debate. Click the checkbox once a player presents to confirm their mission point.
                </p>
              </div>

              <button
                onClick={handleOpenEvidenceVoting}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow transition"
              >
                Open Evidence Voting (Choose Exhibit A)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {exhibitState.objects.map((obj, idx) => (
                <div
                  key={obj.id}
                  onClick={() => handleTogglePresented(obj.contributorId)}
                  className={`p-4 rounded-lg border cursor-pointer transition select-none ${
                    obj.hasPresented
                      ? 'bg-amber-950/40 border-amber-500/70 shadow-lg'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Item #{idx + 1}</span>
                    <span className={obj.hasPresented ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                      {obj.hasPresented ? '✓ Presented' : 'Click to confirm'}
                    </span>
                  </div>
                  <div className="text-lg font-serif font-bold text-amber-100">"{obj.name}"</div>
                  <div className="text-xs text-amber-300/80 mt-1 font-mono">
                    Brought by: <strong>{obj.contributorName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 4: EVIDENCE VOTING (HOST) */}
        {exhibitState.stage === 'EVIDENCE_VOTING' && (
          <div className="bg-zinc-950/80 border border-amber-900/40 rounded-xl p-6 text-center space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-1">
                Forensic Ballot
              </span>
              <h3 className="text-2xl font-serif font-black text-amber-100">
                Choose Exhibit A — Vote for an OBJECT
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                Every player is privately voting on their phone for which object should be sealed in the evidence bag.
              </p>
            </div>

            {/* Progress counter */}
            <div className="max-w-xs mx-auto bg-zinc-900/80 border border-amber-900/50 p-4 rounded-xl">
              <span className="text-3xl font-mono font-bold text-amber-300 block">
                {Object.keys(exhibitState.evidenceVotes).length} / 7
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Ballots Locked
              </span>
            </div>

            {Object.keys(exhibitState.evidenceVotes).length >= 7 && (
              <button
                onClick={handleRevealEvidenceVotes}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-[0_0_25px_rgba(212,163,69,0.4)] transition"
              >
                Reveal Exhibit A Votes
              </button>
            )}
          </div>
        )}

        {/* STAGE 5: EVIDENCE REVEAL (HOST) */}
        {exhibitState.stage === 'EVIDENCE_REVEAL' && (
          <div className="bg-zinc-950/90 border border-amber-500/50 rounded-xl p-6 md:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-black mx-auto flex items-center justify-center shadow-[0_0_35px_rgba(212,163,69,0.5)]">
              <Award className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400">
                The Forensic Decision
              </span>
              <h3 className="text-3xl sm:text-4xl font-serif font-black text-amber-200">
                EXHIBIT A: "{exhibitState.winningObjectName}"
              </h3>
              <p className="text-sm font-serif italic text-zinc-300">
                Contributed by {exhibitState.winningObjectContributorName}
              </p>
            </div>

            {/* Tie notice if occurred */}
            {exhibitState.tiedObjectIds.length > 1 && !exhibitState.winningObjectId && (
              <div className="p-4 bg-burgundy-950/80 border border-amber-500/60 rounded-xl max-w-md mx-auto space-y-3">
                <span className="text-sm font-serif font-bold text-amber-200 block">
                  A tie has occurred between candidate objects!
                </span>
                <button
                  onClick={handleTieRevote}
                  className="px-4 py-2 bg-amber-500 text-black font-serif font-bold text-xs uppercase tracking-wider rounded shadow"
                >
                  Hold Private Tie Revote
                </button>
              </div>
            )}

            {/* Votes breakdown */}
            <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {exhibitState.objects.map(obj => {
                const votesCount = Object.values(exhibitState.evidenceVotes).filter(v => v === obj.id).length;
                const isWinner = obj.id === exhibitState.winningObjectId;
                return (
                  <div
                    key={obj.id}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      isWinner
                        ? 'bg-amber-950/70 border-amber-400 text-amber-100 font-bold shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-serif text-sm">"{obj.name}"</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{obj.contributorName}</div>
                    </div>
                    <span className="text-base font-mono font-bold text-amber-300">
                      {votesCount} {votesCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-zinc-900">
              <button
                onClick={handleProceedToRoundTable}
                className="px-8 py-3.5 bg-gradient-to-r from-burgundy-800 via-amber-600 to-burgundy-800 hover:from-burgundy-700 hover:to-amber-500 text-white font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-xl transition flex items-center gap-2 mx-auto"
              >
                <span>Proceed to Round Table & Banishment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] font-mono text-zinc-500 mt-2">
                Whether the winning object was planted remains strictly secret until banishment concludes.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // RENDER: PLAYER PHONE DISPLAY
  // -------------------------------------------------------------------
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* STAGE 1: COLLECTION (PHONE) */}
      {exhibitState.stage === 'COLLECTION' && (
        <div className="bg-zinc-950 border border-amber-900/50 rounded-xl p-5 space-y-4">
          <div className="border-b border-amber-900/40 pb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
              Mission 1 · Exhibit A
            </span>
            <h3 className="text-lg font-serif font-bold text-amber-100">
              Bring Your Household Evidence
            </h3>
            <p className="text-xs text-zinc-300 font-serif leading-relaxed mt-1">
              Go fetch one harmless household object from around the house, place it on the table, and register it below.
            </p>
          </div>

          {hasSubmittedMyObject && !isEditing ? (
            <div className="p-4 bg-zinc-900/90 border border-emerald-500/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4" /> Registered
                </span>
                <button
                  onClick={() => {
                    setObjectNameInput(myObject.name);
                    setIsEditing(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 text-xs underline font-mono"
                >
                  Edit Object
                </button>
              </div>
              <div className="text-xl font-serif font-bold text-amber-200">"{myObject.name}"</div>
              <p className="text-xs text-zinc-400 font-sans">
                Waiting for remaining players to place their objects. List will lock when all 7 are confirmed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitObject} className="space-y-3">
              <div>
                <label className="text-xs font-mono uppercase text-amber-400/80 block mb-1">
                  Object Name
                </label>
                <input
                  type="text"
                  value={objectNameInput}
                  onChange={e => setObjectNameInput(e.target.value)}
                  placeholder="e.g. Wooden Spoon, Tea Towel, Screwdriver..."
                  maxLength={40}
                  required
                  autoFocus
                  className="w-full bg-black border border-amber-900/70 rounded-lg p-3 text-sm text-amber-100 font-serif focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !objectNameInput.trim()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Register My Evidence'}
              </button>
            </form>
          )}

          <div className="text-[11px] font-mono text-zinc-500 text-center">
            {exhibitState.objects.length} of 7 objects registered across the castle
          </div>
        </div>
      )}

      {/* STAGE 2: SECRET BRIEFING (PHONE) */}
      {exhibitState.stage === 'SECRET_BRIEFING' && (
        <div className="bg-gradient-to-b from-burgundy-950 via-zinc-950 to-castle-black border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400 block mb-1">
              Top Secret Briefing
            </span>
            <h3 className="text-xl font-serif font-black text-amber-100">
              {isTraitor ? 'YOUR SECRET ASSIGNMENT' : 'THE EVIDENCE IS IN'}
            </h3>
          </div>

          {/* Traitor View */}
          {isTraitor ? (
            <div className="space-y-4">
              <div className="bg-black/70 border border-amber-500/60 p-4 rounded-xl text-center space-y-2">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                  Your Planted Evidence Is:
                </span>
                <div className="text-2xl font-serif font-black text-amber-300 drop-shadow">
                  "{exhibitState.plantedObjectName || 'Secret Object'}"
                </div>
              </div>

              <div className="text-xs text-amber-100/90 font-serif leading-relaxed bg-burgundy-900/40 border border-burgundy-700/50 p-4 rounded-xl">
                Get this object chosen as Exhibit A. Everyone knows you’re pushing for something. Nobody knows which object it is. Make them believe it was their idea.
              </div>
            </div>
          ) : (
            /* Faithful View */
            <div className="space-y-4">
              <div className="text-sm text-amber-100/90 font-serif leading-relaxed bg-zinc-900/80 border border-amber-900/60 p-4 rounded-xl text-center">
                “The objects are in. The Traitor now knows which one they need you to choose. Listen carefully. Enthusiasm is not evidence.”
              </div>
            </div>
          )}

          {/* Acknowledgement button */}
          {hasAcknowledgedBriefing ? (
            <div className="p-3 bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs text-center rounded-lg font-mono flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> You have acknowledged. Waiting for others...
            </div>
          ) : (
            <button
              onClick={handleAcknowledge}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black font-serif font-black text-sm uppercase tracking-wider rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(212,163,69,0.4)] transition disabled:opacity-50"
            >
              {isTraitor ? 'I Understand My Assignment' : 'I Am Ready'}
            </button>
          )}

          <p className="text-[11px] text-zinc-500 text-center font-mono">
            {exhibitState.acknowledgedPlayerIds.length} of 7 players acknowledged
          </p>
        </div>
      )}

      {/* STAGE 3: PRESENTATIONS (PHONE) */}
      {exhibitState.stage === 'PRESENTATIONS' && (
        <div className="bg-zinc-950 border border-amber-900/50 rounded-xl p-5 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block">
            Stage D: Forensic Pitches
          </span>
          <h3 className="text-xl font-serif font-bold text-amber-100">
            Explain Your Suspicion
          </h3>
          <p className="text-xs text-zinc-300 font-serif leading-relaxed max-w-sm mx-auto">
            When called upon, you have 30 seconds to explain why your object is suspicious evidence from the murder. Invent ridiculous backstories!
          </p>

          {isTraitor && exhibitState.plantedObjectName && (
            <div className="p-3 bg-burgundy-950/80 border border-amber-500/40 rounded-lg text-xs font-serif text-amber-200">
              Remember your goal: secretly steer the group toward{' '}
              <strong>"{exhibitState.plantedObjectName}"</strong> without exposing yourself.
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: EVIDENCE VOTING (PHONE) */}
      {exhibitState.stage === 'EVIDENCE_VOTING' && (
        <div className="bg-zinc-950 border border-amber-900/50 rounded-xl p-5 space-y-4">
          <div className="border-b border-amber-900/40 pb-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
              Evidence Ballot
            </span>
            <h3 className="text-lg font-serif font-bold text-amber-100">
              Choose Exhibit A — vote for an OBJECT
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select one object from the table. Voting for your own object is allowed.
            </p>
          </div>

          {hasVotedEvidence ? (
            <div className="p-5 bg-zinc-900/80 border border-amber-500/40 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-serif font-bold text-amber-200">
                Your Evidence Vote is Sealed
              </div>
              <p className="text-xs text-zinc-400">
                Awaiting remaining investigators. Votes will be revealed simultaneously on the host display.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {exhibitState.objects.map(obj => {
                  const isSelected = selectedObjectId === obj.id;
                  return (
                    <div
                      key={obj.id}
                      onClick={() => setSelectedObjectId(obj.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 text-amber-100 shadow'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-bold text-sm">"{obj.name}"</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Brought by {obj.contributorName}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-400 bg-amber-400' : 'border-zinc-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmitEvidenceVote}
                disabled={isSubmitting || !selectedObjectId}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Locking Ballot...' : 'Lock My Evidence Vote'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STAGE 5: EVIDENCE REVEAL (PHONE) */}
      {exhibitState.stage === 'EVIDENCE_REVEAL' && (
        <div className="bg-zinc-950 border border-amber-500/50 rounded-xl p-5 text-center space-y-3">
          <Award className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-amber-200">
            Exhibit A Has Been Chosen!
          </h3>
          <div className="text-2xl font-serif font-black text-amber-300">
            "{exhibitState.winningObjectName}"
          </div>
          <p className="text-xs text-zinc-400 font-serif">
            Look up at the Castle Host Display. Prepare for the Round Table and Banishment!
          </p>
        </div>
      )}
    </div>
  );
};
