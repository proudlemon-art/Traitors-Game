import React, { useState } from 'react';
import { BODY_DISPOSAL_SCENARIO, BODY_DISPOSAL_OBJECTS_POOL } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { ShieldCheck, Clock, Users, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const BodyDisposalMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const bodyState = state.bodyDisposalState || {
    scenario: BODY_DISPOSAL_SCENARIO,
    confirmedHouseholdItems: BODY_DISPOSAL_OBJECTS_POOL.slice(0, 7),
    traitorAssignedObject: BODY_DISPOSAL_OBJECTS_POOL[0],
    chosenFiveObjects: [],
    milestones: {
      fiveObjectsChosen: false,
      allFiveInStory: false,
      presentationUnderOneMinute: false,
    },
  };

  const [storyTimer, setStoryTimer] = useState<number>(60);
  const [isStoryTimerRunning, setIsStoryTimerRunning] = useState<boolean>(false);

  const handleToggleObject = async (obj: string) => {
    if (!isHostDisplay) return;
    const current = [...bodyState.chosenFiveObjects];
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
    if (!isHostDisplay) return;
    const updated = {
      ...bodyState.milestones,
      [key]: !bodyState.milestones[key],
    };

    await api.sendAction(state.roomCode, 'UPDATE_BODY_DISPOSAL', {
      milestones: updated,
    });
  };

  const totalPoints =
    (bodyState.milestones.fiveObjectsChosen ? 1 : 0) +
    (bodyState.milestones.allFiveInStory ? 1 : 0) +
    (bodyState.milestones.presentationUnderOneMinute ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Scenario Banner */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
            Round 4 Mission · The Body Disposal Committee
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            60s Improvised Getaway Pitch
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-serif font-black text-amber-100">
          Emergency at Jasmine’s Castle
        </h3>
        <p className="text-sm font-sans text-amber-200/90 mt-2 max-w-2xl leading-relaxed">
          {bodyState.scenario}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Select 5 Household Objects */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Select 5 Objects for the Getaway
            </h4>
            <span className="text-xs font-mono text-amber-400">
              {bodyState.chosenFiveObjects.length} / 5 Selected
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans">
            Every guest brings one household item to the parlour. As a committee, agree on exactly 5 objects to include in the getaway plan.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {BODY_DISPOSAL_OBJECTS_POOL.map(item => {
              const isSelected = bodyState.chosenFiveObjects.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => handleToggleObject(item)}
                  disabled={!isHostDisplay}
                  className={`p-2.5 rounded text-left text-xs font-mono border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 font-bold shadow'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Storytelling Milestones & Timer */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
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
            Appoint one guest as Spokesperson. They must improvise a plausible getaway story on the tandem bicycle using all 5 objects under 60 seconds!
          </p>

          <div className="space-y-2">
            <div
              onClick={() => handleToggleMilestone('fiveObjectsChosen')}
              className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                isHostDisplay ? 'cursor-pointer' : ''
              } ${
                bodyState.milestones.fiveObjectsChosen
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <span className="text-xs font-serif font-semibold">
                1. Committee agreed on exactly 5 objects
              </span>
              <span className="text-xs font-mono font-bold">
                {bodyState.milestones.fiveObjectsChosen ? '✓ +1 Pt' : '0 Pts'}
              </span>
            </div>

            <div
              onClick={() => handleToggleMilestone('allFiveInStory')}
              className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                isHostDisplay ? 'cursor-pointer' : ''
              } ${
                bodyState.milestones.allFiveInStory
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <span className="text-xs font-serif font-semibold">
                2. All 5 objects smoothly woven into story
              </span>
              <span className="text-xs font-mono font-bold">
                {bodyState.milestones.allFiveInStory ? '✓ +1 Pt' : '0 Pts'}
              </span>
            </div>

            <div
              onClick={() => handleToggleMilestone('presentationUnderOneMinute')}
              className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                isHostDisplay ? 'cursor-pointer' : ''
              } ${
                bodyState.milestones.presentationUnderOneMinute
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <span className="text-xs font-serif font-semibold">
                3. Story finished before the 60s buzzer
              </span>
              <span className="text-xs font-mono font-bold">
                {bodyState.milestones.presentationUnderOneMinute ? '✓ +1 Pt' : '0 Pts'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
