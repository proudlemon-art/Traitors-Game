import React from 'react';
import { FORGERY_BRIEF_PAIRS } from '../../data/missions';
import { ClientGameState } from '../../types/game';
import { api } from '../../services/api';
import { Palette, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

interface Props {
  state: ClientGameState;
  isHostDisplay?: boolean;
}

export const ForgeryGalleryMission: React.FC<Props> = ({ state, isHostDisplay }) => {
  const currentPair = FORGERY_BRIEF_PAIRS[0];
  const forgeryState = state.forgeryGalleryState || {
    faithfulBrief: currentPair.faithful,
    traitorBrief: currentPair.traitor,
    qualifiedMilestones: {},
    isDrawingLocked: false,
  };

  const isPostBanishment = [
    'BANISHMENT_OUTCOME',
    'ASSIGNMENT_VERIFICATION',
    'ROUND_SUMMARY',
    'FINAL_RESULTS',
  ].includes(state.phase);

  const handleToggleMilestone = async (
    playerId: string,
    milestone: 'person' | 'setting' | 'threeObjects'
  ) => {
    if (!isHostDisplay) return;
    const current = forgeryState.qualifiedMilestones[playerId] || {
      person: false,
      setting: false,
      threeObjects: false,
    };
    const updated = { ...current, [milestone]: !current[milestone] };

    await api.sendAction(state.roomCode, 'UPDATE_FORGERY_GALLERY', {
      qualifiedMilestones: {
        ...forgeryState.qualifiedMilestones,
        [playerId]: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/40 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase rounded border border-amber-500/40">
              Round 3 Mission · The Forgery Gallery
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Scrap Paper & Pen Artistry
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded text-xs text-amber-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            3-4 Minutes Sketching
          </div>
        </div>

        <h3 className="text-2xl font-serif font-black text-amber-100">
          The Forgery Gallery
        </h3>
        <p className="text-sm font-sans text-amber-200/90 mt-1 max-w-2xl leading-relaxed">
          Grab your pen and scrap paper! Faithful players have received one detailed scene prompt on their phones. The Traitor has received a subtly altered version.
        </p>
        <p className="text-xs font-sans text-zinc-400 italic mt-2">
          When the timer strikes zero, everyone raises their drawings simultaneously. Spot the impostor!
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Drawing Milestones Verification (Up to 3 pts) */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Artwork Qualification Milestones (+1 pt each, max 3)
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Check off the 3 elements in each guest’s drawing: Person (+1), Setting (+1), 3 Specific Items (+1).
            </p>
          </div>

          <div className="space-y-3">
            {state.players.map(p => {
              const ms = forgeryState.qualifiedMilestones[p.id] || {
                person: false,
                setting: false,
                threeObjects: false,
              };
              const pts = (ms.person ? 1 : 0) + (ms.setting ? 1 : 0) + (ms.threeObjects ? 1 : 0);

              return (
                <div
                  key={p.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-500">#{p.seatNumber}</span>
                      <span className="font-serif font-semibold text-sm text-zinc-200">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {pts} / 3 Pts
                    </span>
                  </div>

                  {isHostDisplay && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'person')}
                        className={`flex-1 py-1 px-2 rounded text-[11px] font-mono border transition-all ${
                          ms.person
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ Person
                      </button>
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'setting')}
                        className={`flex-1 py-1 px-2 rounded text-[11px] font-mono border transition-all ${
                          ms.setting
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ Setting
                      </button>
                      <button
                        onClick={() => handleToggleMilestone(p.id, 'threeObjects')}
                        className={`flex-1 py-1 px-2 rounded text-[11px] font-mono border transition-all ${
                          ms.threeObjects
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        ✓ 3 Items
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gallery Guidance / Post Reveal Card */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              Claudia’s Inspection Protocol
            </h4>
          </div>

          <div className="space-y-3 text-xs text-zinc-300 font-sans leading-relaxed">
            <p>
              1. <strong>Do Not Speak:</strong> Players must sketch in absolute silence. No peeking or asking questions.
            </p>
            <p>
              2. <strong>The Reveal:</strong> When the host calls "Turn your slates", everyone turns their paper face-up onto the table.
            </p>
            <p>
              3. <strong>The Debate:</strong> Examine every line. Has someone drawn a crown instead of an Oscar? A throne instead of a red carpet?
            </p>
          </div>

          {isPostBanishment && (
            <div className="p-4 bg-burgundy-950/40 border border-amber-500/60 rounded-lg space-y-2">
              <span className="text-xs font-mono uppercase text-amber-400 block font-bold">
                Secret Drawing Prompts Revealed
              </span>
              <div className="text-xs space-y-1">
                <div>
                  <strong className="text-emerald-400">Faithful Prompt:</strong>{' '}
                  <span className="text-zinc-300">{forgeryState.faithfulBrief}</span>
                </div>
                <div>
                  <strong className="text-rose-400">Traitor Prompt:</strong>{' '}
                  <span className="text-zinc-300">{forgeryState.traitorBrief}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
