import React from 'react';
import { BookOpen, X, CheckSquare, Clock, Tv, Smartphone, ShieldCheck, Trophy, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PartyGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-amber-900/60 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto text-amber-100 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-xl text-amber-200">
              Libby’s Party Master Guide & Rehearsal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-amber-200 p-1 rounded hover:bg-zinc-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Device Setup */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg">
            <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2 mb-2 text-base">
              <Tv className="w-4 h-4 text-amber-500" />
              1. The Device Topology
            </h4>
            <div className="space-y-2 text-xs text-zinc-300 font-sans leading-relaxed">
              <p>
                <strong>The Public Host (Laptop or TV):</strong> One screen connected to the living room TV or laptop. This screen acts as the castle digital stage. It presents all scripted announcements, plays your custom voice clips, displays mission puzzles, runs the Round Table discussion clock, and shows the live voting board.
              </p>
              <p>
                <strong>The 7 Player Phones:</strong> Libby and all 6 guests join from their mobile phones. Each player’s phone displays ONLY their private role, personal briefing, voting controls, and their dramatic <em>Phone Slate</em> during reveals.
              </p>
              <p className="text-amber-400/90 italic">
                *Libby is both the party organiser and player #1. The host screen never reveals who the Traitor is during play, so Libby plays completely blind like everyone else!
              </p>
            </div>
          </div>

          {/* Schedule Breakdown */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg">
            <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2 mb-2 text-base">
              <Clock className="w-4 h-4 text-amber-500" />
              2. Two-Hour Party Schedule (Jasmine’s Castle · 120 Minutes)
            </h4>
            <ul className="space-y-2 text-xs text-zinc-300 font-mono">
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Introduction & Prologue</span>
                <span className="text-amber-400">10 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 1: The Castle Heist (3 Scavenger Stages)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 2: The Birthday Majority (5 Questions)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 3: The Forgery Gallery (Paper Sketches)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 4: The Body Disposal Committee (Emergency Story)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 5: The Counterfeit Expert (Invention Pitches)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between border-b border-zinc-800/80 pb-1">
                <span>Round 6: The Getaway Auction (Sealed Bid Lots)</span>
                <span className="text-amber-400">17 mins</span>
              </li>
              <li className="flex justify-between">
                <span>Final Results & Grand Awards</span>
                <span className="text-amber-400">8 mins</span>
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-zinc-400 italic">
              Suggested round timing: Briefing (1 min) · Mission (7 mins) · Discussion (5 mins) · Voting & Slates (4 mins). Timers include pause and extend controls.
            </p>
          </div>

          {/* Scoring Rules */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg">
            <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2 mb-2 text-base">
              <Trophy className="w-4 h-4 text-amber-500" />
              3. Authoritative Scoring (Max 6 Points Per Round)
            </h4>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 bg-burgundy-950/40 border border-amber-900/40 rounded">
                <strong className="text-amber-300 font-serif block mb-1">0 to 3 Mission Pts</strong>
                Earned from individual/group mission qualification, predictions, and milestones.
              </div>
              <div className="p-3 bg-burgundy-950/40 border border-amber-900/40 rounded">
                <strong className="text-amber-300 font-serif block mb-1">+2 Main Objective Pts</strong>
                Faithful: Correctly vote Traitor on first ballot. Traitor: Avoid banishment.
              </div>
              <div className="p-3 bg-burgundy-950/40 border border-amber-900/40 rounded">
                <strong className="text-amber-300 font-serif block mb-1">+1 Bonus Point</strong>
                Traitor: Complete secret assignment. Faithful: Detective / mission excellence.
              </div>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              *Nobody is permanently eliminated! All roles are revealed after each round, then fresh roles are dealt for the next.
            </p>
          </div>


          {/* Rehearsal Checklist */}
          <div className="bg-burgundy-950/30 border border-amber-600/40 p-4 rounded-lg">
            <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2 mb-3 text-base">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              4. Libby’s Rehearsal Checklist
            </h4>
            <div className="space-y-2 text-xs text-zinc-300">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-amber-500" defaultChecked />
                <span>Laptop or TV display connected to the room. Use the Admin Studio to record or upload voice clips and customize scripts & visuals.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-amber-500" defaultChecked />
                <span>Have scrap paper and 7 pens ready for Round 3: The Forgery.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-amber-500" defaultChecked />
                <span>Scan the QR code on your own phone to take Seat 1 (Libby).</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-amber-500" defaultChecked />
                <span>Organise seating order clockwise so the phone-slate reveals circle the table naturally.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-amber-500" defaultChecked />
                <span>Try the “Instant Demo Castle” button first to see all 6 missions in action before guests arrive!</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-amber-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 font-serif uppercase tracking-wider text-xs font-bold border border-amber-500/50 rounded shadow"
          >
            I am Ready to Host
          </button>
        </div>
      </div>
    </div>
  );
};
