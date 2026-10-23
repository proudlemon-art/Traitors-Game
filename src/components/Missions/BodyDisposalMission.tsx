import React, { useState, useEffect } from 'react';
import { BODY_DISPOSAL_SCENARIO, BODY_DISPOSAL_OBJECTS_POOL } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Skull,
  ArrowRight,
  Play,
  RotateCcw,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const BodyDisposalMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const round1Objects =
    state.exhibitAState?.objects && state.exhibitAState.objects.length > 0
      ? state.exhibitAState.objects.map(o => o.name)
      : [];

  const bodyState = state.bodyDisposalState || {
    scenario: BODY_DISPOSAL_SCENARIO,
    confirmedHouseholdItems:
      round1Objects.length > 0 ? round1Objects : BODY_DISPOSAL_OBJECTS_POOL.slice(0, 7),
    carriedOverFromRound1: round1Objects.length > 0,
    traitorAssignedObject: '',
    chosenFiveObjects: [],
    milestones: {
      fiveObjectsChosen: false,
      allFiveInStory: false,
      presentationUnderOneMinute: false,
    },
  };

  const availableItems =
    Array.isArray(bodyState.confirmedHouseholdItems) && bodyState.confirmedHouseholdItems.length > 0
      ? bodyState.confirmedHouseholdItems
      : round1Objects.length > 0
      ? round1Objects
      : BODY_DISPOSAL_OBJECTS_POOL.slice(0, 7);

  const isTraitor = state.myRole === 'TRAITOR';

  const [storyTimer, setStoryTimer] = useState<number>(60);
  const [isStoryTimerRunning, setIsStoryTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isStoryTimerRunning) return;
    const interval = setInterval(() => {
      setStoryTimer(prev => {
        if (prev <= 1) {
          setIsStoryTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStoryTimerRunning]);

  const handleToggleObject = async (obj: string) => {
    const current = Array.isArray(bodyState.chosenFiveObjects)
      ? [...bodyState.chosenFiveObjects]
      : [];
    const exists = current.includes(obj);
    let updated = exists ? current.filter(o => o !== obj) : [...current, obj];
    if (updated.length > 5) updated = updated.slice(0, 5);

    const fiveChosen = updated.length === 5;

    await api.sendAction(state.roomCode, 'UPDATE_BODY_DISPOSAL', {
      chosenFiveObjects: updated,
      milestones: {
        ...bodyState.milestones,
        fiveObjectsChosen: fiveChosen,
      },
    });
  };

  const handleToggleMilestone = async (
    key: 'fiveObjectsChosen' | 'allFiveInStory' | 'presentationUnderOneMinute'
  ) => {
    const updated = {
      ...bodyState.milestones,
      [key]: !bodyState.milestones[key],
    };

    await api.sendAction(state.roomCode, 'UPDATE_BODY_DISPOSAL', {
      milestones: updated,
    });
  };

  const handleProceedToRoundTable = async () => {
    await api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE');
  };

  const totalPoints =
    (bodyState.milestones.fiveObjectsChosen ? 1 : 0) +
    (bodyState.milestones.allFiveInStory ? 1 : 0) +
    (bodyState.milestones.presentationUnderOneMinute ? 1 : 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Scenario Banner */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 4 Mission · The Body Disposal Committee
            </span>
            {(bodyState.carriedOverFromRound1 || round1Objects.length > 0) && (
              <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Continuity: Round 1 Evidence Objects Returned!
              </span>
            )}
          </div>

          {/* Interactive 60s Pitch Timer */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className={storyTimer <= 10 ? 'text-rose-400 font-bold animate-pulse' : 'text-amber-300 font-bold'}>
              {storyTimer}s Pitch Timer
            </span>
            <button
              type="button"
              onClick={() => setIsStoryTimerRunning(!isStoryTimerRunning)}
              className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[10px] uppercase flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5" />
              {isStoryTimerRunning ? 'Pause' : 'Start 60s'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsStoryTimerRunning(false);
                setStoryTimer(60);
              }}
              className="p-1 text-zinc-400 hover:text-amber-200"
              title="Reset 60s Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-serif font-black text-amber-100">
          Emergency at Jasmine’s Castle
        </h3>
        <p className="text-sm font-sans text-amber-200/90 max-w-3xl leading-relaxed">
          {bodyState.scenario}
        </p>
      </div>

      {/* Private Traitor Contraband Object Callout (ONLY on Traitor's Phone, NEVER on TV Host Display) */}
      {!isHostDisplay && isTraitor && bodyState.traitorAssignedObject && (
        <div className="p-4 bg-rose-950/60 border-2 border-rose-500/70 rounded-xl space-y-1.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-rose-300 font-bold">
            <Skull className="w-4 h-4 text-rose-400" />
            Secret Traitor Contraband (+2 Personal Objective Pts)
          </div>
          <p className="text-xs text-amber-100 leading-relaxed font-serif">
            You must subtly convince the committee to include{' '}
            <strong className="text-amber-300 underline">"{bodyState.traitorAssignedObject}"</strong>{' '}
            among the 5 chosen getaway objects — without making it obvious why you need it!
          </p>
          <div className="text-[11px] font-mono">
            Status:{' '}
            {bodyState.chosenFiveObjects.includes(bodyState.traitorAssignedObject) ? (
              <span className="text-emerald-400 font-bold">
                ✓ Included in the 5 Getaway Objects!
              </span>
            ) : (
              <span className="text-amber-400">
                Not yet selected — steer the group to pick "{bodyState.traitorAssignedObject}"!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Select 5 Household Objects */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Select 5 Objects for the Getaway
            </h4>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {bodyState.chosenFiveObjects.length} / 5 Selected
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans">
            The household evidence objects from Round 1 are back on the table! As a committee, agree on <strong className="text-amber-300">exactly 5 objects</strong> to use in your escape plan. Beware: the Traitor has been secretly ordered to smuggle one specific contraband item into the final 5!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableItems.map(item => {
              const isSelected = bodyState.chosenFiveObjects.includes(item);
              const r1Contributor = state.exhibitAState?.objects?.find(o => o.name === item)?.contributorName;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToggleObject(item)}
                  className={`p-3 rounded-lg text-left text-xs font-mono border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 font-bold shadow'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-serif text-sm block truncate">"{item}"</span>
                      {r1Contributor && (
                        <span className="text-[10px] text-zinc-400 block">
                          R1: {r1Contributor}
                        </span>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Storytelling Milestones & Timer */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Getaway Milestones (+1 pt each, max 3)
              </h4>
              <span className="text-xs font-mono font-bold text-amber-400">
                {totalPoints} / 3 Points Earned
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-sans">
              Appoint one guest as Spokesperson. They must improvise a plausible getaway story on the tandem bicycle using all 5 chosen objects in under 60 seconds! Tap each milestone below as the committee completes it:
            </p>

            <div className="space-y-2.5">
              <div
                onClick={() => handleToggleMilestone('fiveObjectsChosen')}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  bodyState.milestones.fiveObjectsChosen
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-serif font-semibold">
                  1. Committee agreed on exactly 5 objects ({bodyState.chosenFiveObjects.length}/5)
                </span>
                <span className="text-xs font-mono font-bold">
                  {bodyState.milestones.fiveObjectsChosen ? '✓ +1 Pt' : 'Tap to Confirm'}
                </span>
              </div>

              <div
                onClick={() => handleToggleMilestone('allFiveInStory')}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  bodyState.milestones.allFiveInStory
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-serif font-semibold">
                  2. All 5 objects smoothly woven into the escape story
                </span>
                <span className="text-xs font-mono font-bold">
                  {bodyState.milestones.allFiveInStory ? '✓ +1 Pt' : 'Tap to Confirm'}
                </span>
              </div>

              <div
                onClick={() => handleToggleMilestone('presentationUnderOneMinute')}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  bodyState.milestones.presentationUnderOneMinute
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-serif font-semibold">
                  3. Story finished before the 60s buzzer
                </span>
                <span className="text-xs font-mono font-bold">
                  {bodyState.milestones.presentationUnderOneMinute ? '✓ +1 Pt' : 'Tap to Confirm'}
                </span>
              </div>
            </div>
          </div>

          {isHostDisplay && (
            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={handleProceedToRoundTable}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-burgundy-800 via-amber-600 to-burgundy-800 hover:from-burgundy-700 hover:to-amber-500 text-white font-serif font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl transition flex items-center justify-center gap-2"
              >
                <span>Conclude Mission: Enter Round Table & Banishment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

