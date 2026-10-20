import React, { useState } from 'react';
import { BIRTHDAY_MAJORITY_QUESTION_POOL } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Users, CheckCircle2, Award, ChevronRight, HelpCircle } from 'lucide-react';

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

  const activeQuestion = majorityState.questions[majorityState.activeQuestionIndex] || majorityState.questions[0];
  const me = state.players.find(p => p.id === state.myPlayerId);
  const myAnswers = (majorityState.initialAnswers && state.myPlayerId && majorityState.initialAnswers[state.myPlayerId]) || {};
  const myPredictions = (majorityState.predictions && majorityState.predictions[activeQuestion?.id] && state.myPlayerId && majorityState.predictions[activeQuestion?.id][state.myPlayerId]) || '';

  const handleSelectInitialAnswer = async (questionId: number, chosenName: string) => {
    if (!playerToken) return;
    await api.sendAction(
      state.roomCode,
      'SUBMIT_MAJORITY_INITIAL_ANSWER',
      { questionId, chosenName },
      playerToken
    );
  };

  const handleSelectPrediction = async (questionId: number, predictedName: string) => {
    if (!playerToken) return;
    await api.sendAction(
      state.roomCode,
      'SUBMIT_MAJORITY_PREDICTION',
      { questionId, predictedName },
      playerToken
    );
  };

  const handleNextQuestion = async () => {
    if (!isHostDisplay) return;
    const nextIdx = Math.min(majorityState.questions.length - 1, majorityState.activeQuestionIndex + 1);
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', {
      activeQuestionIndex: nextIdx,
    });
  };

  const handlePrevQuestion = async () => {
    if (!isHostDisplay) return;
    const prevIdx = Math.max(0, majorityState.activeQuestionIndex - 1);
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', {
      activeQuestionIndex: prevIdx,
    });
  };

  const handleSwitchStep = async (step: 'INITIAL_ANSWERS' | 'PREDICTION_REVEAL' | 'COMPLETED') => {
    if (!isHostDisplay) return;
    await api.sendAction(state.roomCode, 'UPDATE_BIRTHDAY_MAJORITY', { step });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 2 Mission · The Birthday Majority
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Question {majorityState.activeQuestionIndex + 1} of {majorityState.questions.length}
            </span>
          </div>

          {isHostDisplay && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSwitchStep('INITIAL_ANSWERS')}
                className={`px-3 py-1 rounded text-xs font-serif font-bold uppercase border ${
                  majorityState.step === 'INITIAL_ANSWERS'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                1. Initial Answers
              </button>
              <button
                onClick={() => handleSwitchStep('PREDICTION_REVEAL')}
                className={`px-3 py-1 rounded text-xs font-serif font-bold uppercase border ${
                  majorityState.step === 'PREDICTION_REVEAL'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                2. Majority Reveal
              </button>
            </div>
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-serif font-bold text-amber-100">
          "{activeQuestion.prompt}"
        </h3>
        <p className="text-xs font-sans text-zinc-400 mt-1">
          {majorityState.step === 'INITIAL_ANSWERS'
            ? 'All 7 guests submit who they genuinely think fits this best.'
            : 'Reveal the room’s consensus and see who predicted the majority correctly!'}
        </p>

        {isHostDisplay && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handlePrevQuestion}
              disabled={majorityState.activeQuestionIndex === 0}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-mono uppercase rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40"
            >
              Previous Question
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={majorityState.activeQuestionIndex >= majorityState.questions.length - 1}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs font-mono uppercase rounded border border-amber-400 disabled:opacity-40 flex items-center gap-1"
            >
              Next Question <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guest Voting Status */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Submission Status
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              {Object.keys(majorityState.initialAnswers || {}).length}/7 Submitted
            </span>
          </div>

          <div className="space-y-2">
            {state.players.map(p => {
              const hasAnswered = !!majorityState.initialAnswers?.[p.id]?.[activeQuestion.id];
              const score = majorityState.playerCorrectCount?.[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-500">#{p.seatNumber}</span>
                    <span className="font-serif font-semibold">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-amber-400">
                      Score: {score} / 5
                    </span>
                    {hasAnswered ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">Waiting...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Action Card (If on phone / mobile) */}
        {!isHostDisplay && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm">
                Your Answer for Question {majorityState.activeQuestionIndex + 1}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Select one of the 7 guests who best fits this description:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {state.players.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectInitialAnswer(activeQuestion.id, p.name)}
                  className={`p-3 rounded text-left text-xs font-serif font-bold border transition-all ${
                    myAnswers[activeQuestion.id] === p.name
                      ? 'bg-burgundy-900 border-amber-400 text-amber-100 shadow'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-mono text-[10px] text-amber-500">#{p.seatNumber}</div>
                  <div>{p.name}</div>
                </button>
              ))}
            </div>

            {myAnswers[activeQuestion.id] && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded text-center text-xs text-emerald-300 font-mono">
                ✓ Locked in: {myAnswers[activeQuestion.id]}
              </div>
            )}
          </div>
        )}

        {/* Host Majority Reveal Card */}
        {isHostDisplay && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Majority Consensus & Score
              </h4>
            </div>

            <p className="text-xs text-zinc-300">
              Each correct prediction earns +1 point toward the 3-point mission maximum.
            </p>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center space-y-2">
              <span className="text-xs font-mono uppercase text-amber-400 block">
                Question {majorityState.activeQuestionIndex + 1}
              </span>
              <div className="text-base font-serif font-semibold text-zinc-200">
                "{activeQuestion.prompt}"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
