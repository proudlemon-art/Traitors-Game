import React, { useState } from 'react';
import { BIRTHDAY_MAJORITY_QUESTION_POOL } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { DEMO_PLAYERS } from '../DemoSwitcher';
import {
  Users,
  CheckCircle2,
  Award,
  ChevronRight,
  ChevronLeft,
  Crown,
  Flame,
  Sparkles,
  Shield,
  Skull,
  Eye,
  Check,
  Zap,
  FastForward,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
  playerToken?: string;
}

export const BirthdayMajorityMission: React.FC<Props> = ({ state, isHostDisplay, playerToken }) => {
  const majorityState = state.birthdayMajorityState || {
    questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
    step: 'INITIAL_ANSWERS',
    activeQuestionIndex: 0,
    initialAnswers: {},
    allInitialAnswersLocked: false,
    predictions: {},
    playerCorrectCount: {},
  };

  const demoPlayer = DEMO_PLAYERS.find(p => p.token === playerToken);
  const effectivePlayerId = demoPlayer?.id || state.myPlayerId || state.players[0]?.id;
  const isTraitor = state.myRole === 'TRAITOR';

  // Local active question state for mobile view (allows player to jump between Q1-Q5 independently)
  const [localQuestionIdx, setLocalQuestionIdx] = useState<number | null>(null);
  const [optimisticVotes, setOptimisticVotes] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // On host, use shared activeQuestionIndex; on player, default to shared or local tab
  const activeIndex = isHostDisplay
    ? majorityState.activeQuestionIndex
    : (localQuestionIdx !== null ? localQuestionIdx : majorityState.activeQuestionIndex);

  const activeQuestion =
    majorityState.questions[activeIndex] ||
    majorityState.questions[0] ||
    BIRTHDAY_MAJORITY_QUESTION_POOL[0];

  const serverAnswers =
    (majorityState.initialAnswers && effectivePlayerId && majorityState.initialAnswers[effectivePlayerId]) || {};
  const myAnswers: Record<number | string, string> = {
    ...serverAnswers,
    ...optimisticVotes,
  };
  const currentVote = myAnswers[activeQuestion.id] || myAnswers[String(activeQuestion.id)];

  // Actions
  const handleSelectInitialAnswer = async (questionId: number, chosenName: string) => {
    setOptimisticVotes(prev => ({ ...prev, [questionId]: chosenName }));
    setIsSubmitting(true);
    try {
      await api.sendAction(
        state.roomCode,
        'SUBMIT_MAJORITY_INITIAL_ANSWER',
        { questionId, chosenName, targetPlayerId: effectivePlayerId },
        playerToken
      );
    } catch (err) {
      console.error('Failed to submit majority answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!isHostDisplay) {
      setLocalQuestionIdx(prev =>
        Math.min(
          majorityState.questions.length - 1,
          (prev !== null ? prev : majorityState.activeQuestionIndex) + 1
        )
      );
      return;
    }
    const nextIdx = Math.min(majorityState.questions.length - 1, majorityState.activeQuestionIndex + 1);
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', {
      activeQuestionIndex: nextIdx,
      step: 'INITIAL_ANSWERS',
    });
  };

  const handlePrevQuestion = async () => {
    if (!isHostDisplay) {
      setLocalQuestionIdx(prev =>
        Math.max(0, (prev !== null ? prev : majorityState.activeQuestionIndex) - 1)
      );
      return;
    }
    const prevIdx = Math.max(0, majorityState.activeQuestionIndex - 1);
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', {
      activeQuestionIndex: prevIdx,
      step: 'INITIAL_ANSWERS',
    });
  };

  const handleSwitchStep = async (step: 'INITIAL_ANSWERS' | 'PREDICTION_REVEAL' | 'COMPLETED') => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', { step });
  };

  const handleSelectQuestionIndex = async (idx: number) => {
    if (isHostDisplay) {
      await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', {
        activeQuestionIndex: idx,
        step: 'INITIAL_ANSWERS',
      });
    } else {
      setLocalQuestionIdx(idx);
    }
  };

  const handleProceedToRoundTable = async () => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE');
  };

  // Demo actions
  const handleDemoAutoFillCurrent = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_MAJORITY_ANSWERS', { allQuestions: false });
  };

  const handleDemoAutoFillAll = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SIMULATE_MAJORITY_ANSWERS', { allQuestions: true });
  };

  const handleDemoSkipMission = async () => {
    await api.sendAction(state.roomCode, 'DEMO_SKIP_MAJORITY_MISSION');
  };

  // Compute stats for active question
  const tallies: Record<string, number> = {};
  let totalVotesForCurrentQ = 0;
  Object.values(majorityState.initialAnswers || {}).forEach(ans => {
    const chosen = ans[activeQuestion.id] || (ans as any)[String(activeQuestion.id)];
    if (chosen) {
      tallies[chosen] = (tallies[chosen] || 0) + 1;
      totalVotesForCurrentQ += 1;
    }
  });

  const maxVotes = Math.max(0, ...Object.values(tallies));
  const topCandidates = maxVotes > 0 ? Object.keys(tallies).filter(k => tallies[k] === maxVotes) : [];

  // =========================================================================
  // 1. INDIVIDUAL PLAYER / MOBILE VIEW (Pure Pick & Answer UI)
  // =========================================================================
  if (!isHostDisplay) {
    const totalAnsweredByMe = Object.keys(myAnswers).length;

    return (
      <div className="space-y-4 animate-fadeIn select-none">
        {/* Demo Fast-Test Banner on Mobile Slate */}
        {state.isDemoRoom && (
          <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="font-mono text-amber-300 font-bold flex items-center gap-1 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Demo Testing
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDemoAutoFillAll}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[10px] uppercase rounded shadow"
              >
                Auto-Fill All 5
              </button>
              <button
                type="button"
                onClick={handleDemoSkipMission}
                className="px-2.5 py-1 bg-burgundy-900 hover:bg-burgundy-800 text-amber-200 border border-amber-500/50 font-serif font-bold text-[10px] uppercase rounded"
              >
                Skip to Round Table
              </button>
            </div>
          </div>
        )}

        {/* Question Selector Tabs */}
        <div className="flex items-center justify-between gap-1.5 p-1.5 bg-zinc-900/90 border border-amber-900/40 rounded-xl overflow-x-auto">
          {majorityState.questions.map((q, idx) => {
            const isAnswered = !!myAnswers[q.id] || !!myAnswers[String(q.id)];
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuestionIndex(idx)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                  isCurrent
                    ? 'bg-amber-500 text-black shadow ring-1 ring-amber-300'
                    : isAnswered
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span>Q{idx + 1}</span>
                {isAnswered && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Active Question Prompt Card */}
        <div className="bg-gradient-to-b from-burgundy-950 via-zinc-950 to-castle-black border-2 border-amber-500/60 rounded-xl p-5 shadow-xl space-y-2 text-center">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-amber-400">
            <span>Question {activeIndex + 1} of 5</span>
            <span className="text-zinc-400">
              Your Answered: {totalAnsweredByMe} / 5
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-serif font-black text-amber-100 leading-snug py-1">
            "{activeQuestion.prompt}"
          </h3>

          <p className="text-xs text-zinc-400 font-sans">
            Tap a guest below to cast your secret answer. Match the majority of the room to bank points!
          </p>
        </div>

        {/* Traitor's Secret Assignment Callout (Visible only to Traitor) */}
        {isTraitor && majorityState.traitorTargetFaithfulName && (
          <div className="p-3 bg-burgundy-950/70 border border-rose-600/50 rounded-xl text-xs font-sans text-rose-200 space-y-1">
            <div className="font-serif font-bold text-rose-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              Traitor Assignment (+2 Pts):
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Target: <strong className="text-amber-100">{majorityState.traitorTargetFaithfulName}</strong>.
              Steer them so their answer on Question {majorityState.traitorAssignedQuestionId || 1} does not match the room's majority!
            </p>
          </div>
        )}

        {/* Locked Feedback Banner */}
        {currentVote ? (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-center space-y-0.5 animate-fadeIn">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
              Answer Locked For Question {activeIndex + 1}
            </span>
            <div className="text-base font-serif font-black text-emerald-200 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              "{currentVote}"
            </div>
            <p className="text-[10px] text-zinc-400">Tap any other guest below to change your choice anytime before reveal.</p>
          </div>
        ) : (
          <div className="text-center text-xs text-amber-400/90 font-mono py-1">
            Tap a guest to lock your answer:
          </div>
        )}

        {/* Candidate Voting Buttons (All 7 Seated Guests) */}
        <div className="grid grid-cols-2 gap-2.5">
          {state.players.map(p => {
            const isSelected = currentVote === p.name;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSelectInitialAnswer(activeQuestion.id, p.name)}
                className={`p-3.5 rounded-xl text-left border transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-gradient-to-r from-burgundy-900 to-burgundy-950 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(212,163,69,0.3)] ring-2 ring-amber-400/50'
                    : 'bg-zinc-950/90 border-zinc-800 text-zinc-300 hover:border-amber-600/50 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-500 mb-1">
                  <span>Seat #{p.seatNumber}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="font-serif font-bold text-sm tracking-wide text-amber-100 truncate">
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Next / Prev Navigation for Mobile */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handlePrevQuestion}
            disabled={activeIndex === 0}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-mono uppercase disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          <span className="text-xs font-mono text-zinc-500">
            {activeIndex + 1} / 5
          </span>

          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={activeIndex >= majorityState.questions.length - 1}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold border border-amber-400 rounded-lg text-xs font-mono uppercase disabled:opacity-30 flex items-center gap-1 shadow"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. HOST TV DISPLAY (Grand Castle Arena View)
  // =========================================================================
  const isRevealMode = majorityState.step === 'PREDICTION_REVEAL';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 2 Mission · The Birthday Majority
            </span>
            <span className="text-xs font-mono text-zinc-400">
              Question {activeIndex + 1} of {majorityState.questions.length}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-wider text-amber-100">
            THE BIRTHDAY MAJORITY
          </h2>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono text-amber-400/80 block uppercase tracking-wider">
            Consensus Mission
          </span>
          <span className="text-xs text-zinc-300 italic max-w-xs block font-serif">
            Vote for who fits best. Match the room's majority to bank points!
          </span>
        </div>
      </div>

      {/* Demo Controls Bar on Host View */}
      {state.isDemoRoom && (
        <div className="bg-amber-950/50 border-2 border-amber-500/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-black rounded font-mono font-bold text-xs flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>DEMO CONTROLS</span>
            </div>
            <span className="text-xs text-amber-200/90 font-mono hidden sm:inline">
              Instant test automation for Round 2:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDemoAutoFillCurrent}
              className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-200 text-xs font-mono rounded flex items-center gap-1 transition"
              title="Auto-fill answers for just this question across all 7 players"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Fill Q{activeIndex + 1}</span>
            </button>

            <button
              onClick={handleDemoAutoFillAll}
              className="py-1.5 px-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono rounded flex items-center gap-1 transition shadow"
              title="Auto-fill all 5 questions for all 7 players with consensus answers"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Fill All 5 Questions</span>
            </button>

            <button
              onClick={handleDemoSkipMission}
              className="py-1.5 px-3.5 bg-gradient-to-r from-burgundy-900 to-burgundy-800 hover:from-burgundy-800 hover:to-burgundy-700 text-amber-200 border border-amber-500/60 font-serif font-bold text-xs uppercase tracking-wider rounded flex items-center gap-1 transition shadow"
              title="Auto-fills all answers, tallies scores, and skips directly to Round Table"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Skip to Round Table</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Question Arena Card */}
      <div className="bg-zinc-950/90 border-2 border-amber-500/50 rounded-xl p-6 md:p-8 shadow-2xl text-center space-y-6">
        {/* Navigation Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {majorityState.questions.map((q, idx) => {
            const isCurrent = idx === activeIndex;
            const qVotesCount = Object.values(majorityState.initialAnswers || {}).filter(
              a => !!a[q.id] || !!(a as any)[String(q.id)]
            ).length;
            return (
              <button
                key={q.id}
                onClick={() => handleSelectQuestionIndex(idx)}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-amber-500 text-black shadow-lg ring-2 ring-amber-300 scale-105'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span>Question {idx + 1}</span>
                <span className="text-[10px] opacity-75">({qVotesCount}/7)</span>
              </button>
            );
          })}
        </div>

        {/* Big Prominent Question Prompt */}
        <div className="py-5 px-6 md:px-10 bg-black/70 border border-amber-900/60 rounded-2xl max-w-4xl mx-auto shadow-inner">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-3">
            Council Inquiry #{activeIndex + 1}
          </span>
          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-amber-200 drop-shadow leading-snug">
            "{activeQuestion.prompt}"
          </h3>
        </div>

        {/* Mode Toggle Controls on Host */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleSwitchStep('INITIAL_ANSWERS')}
            className={`py-2.5 px-6 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all border ${
              !isRevealMode
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            1. Player Submissions ({totalVotesForCurrentQ}/7 Locked)
          </button>

          <button
            onClick={() => handleSwitchStep('PREDICTION_REVEAL')}
            className={`py-2.5 px-7 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
              isRevealMode
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black border-amber-400 shadow-xl scale-105'
                : 'bg-burgundy-900/80 hover:bg-burgundy-800 text-amber-200 border-amber-500/50'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>2. Reveal Room Majority</span>
          </button>
        </div>

        {/* VIEW A: SUBMISSION STATUS (HOST ONLY) */}
        {!isRevealMode && (
          <div className="max-w-2xl mx-auto bg-black/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-amber-400 border-b border-zinc-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                Player Votes Sealed in Secret
              </span>
              <span>{totalVotesForCurrentQ} / {state.players.length || 7} Ready</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {state.players.map(p => {
                const hasVoted =
                  !!majorityState.initialAnswers?.[p.id]?.[activeQuestion.id] ||
                  !!(majorityState.initialAnswers?.[p.id] as any)?.[String(activeQuestion.id)];
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border text-left transition ${
                      hasVoted
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span>Seat #{p.seatNumber}</span>
                      {hasVoted ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="text-zinc-500 animate-pulse">Voting...</span>
                      )}
                    </div>
                    <div className="font-serif font-bold text-sm text-amber-100 truncate">
                      {p.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW B: REVEAL RESULTS (HOST ONLY) */}
        {isRevealMode && (
          <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
            {/* Crowned Winner Banner */}
            {topCandidates.length > 0 && (
              <div className="bg-gradient-to-r from-amber-950/80 via-burgundy-950 to-amber-950/80 border-2 border-amber-400 p-6 rounded-2xl shadow-[0_0_40px_rgba(212,163,69,0.3)]">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest mb-1.5">
                  <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
                  Room Majority Consensus
                </div>
                <h4 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-amber-200 drop-shadow">
                  {topCandidates.join(' & ')}
                </h4>
                <p className="text-xs sm:text-sm text-amber-300/80 font-mono mt-2">
                  Received {maxVotes} vote{maxVotes !== 1 ? 's' : ''}! Players who picked {topCandidates.join(' or ')} earn +1 pt.
                </p>
              </div>
            )}

            {/* Vote Distribution Bar Graph */}
            <div className="bg-black/60 border border-zinc-800 rounded-xl p-5 space-y-3 text-left">
              <h5 className="font-serif font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">
                Vote Breakdown for Question {activeIndex + 1}:
              </h5>
              <div className="space-y-2.5">
                {state.players.map(p => {
                  const votes = tallies[p.name] || 0;
                  const isMajorityWinner = topCandidates.includes(p.name);
                  const percentage =
                    totalVotesForCurrentQ > 0 ? Math.round((votes / totalVotesForCurrentQ) * 100) : 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span
                          className={`font-serif font-bold text-sm ${
                            isMajorityWinner ? 'text-amber-300 font-black' : 'text-zinc-300'
                          }`}
                        >
                          {p.name} {isMajorityWinner && '👑'}
                        </span>
                        <span className="text-zinc-400">
                          {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isMajorityWinner
                              ? 'bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(212,163,69,0.5)]'
                              : 'bg-zinc-700'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation & Advance to Round Table */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevQuestion}
              disabled={activeIndex === 0}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono uppercase rounded-lg border border-zinc-800 disabled:opacity-30 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Question
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={activeIndex >= majorityState.questions.length - 1}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs font-mono uppercase rounded-lg border border-amber-400 disabled:opacity-30 flex items-center gap-1.5 shadow"
            >
              Next Question <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleProceedToRoundTable}
            className="py-3 px-8 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-900 hover:from-burgundy-800 hover:to-burgundy-700 border border-amber-500/60 text-amber-100 font-serif font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl hover:shadow-[0_0_20px_rgba(212,163,69,0.3)] transition"
          >
            Conclude Mission: Enter Round Table
          </button>
        </div>
      </div>
    </div>
  );
};
