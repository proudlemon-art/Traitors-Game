import React from 'react';
import { Volume2, ShieldAlert } from 'lucide-react';

interface PhoneSlateProps {
  accusedPlayerName: string;
  onFinishReveal: () => void;
  isSubmitting?: boolean;
}

export const PhoneSlate: React.FC<PhoneSlateProps> = ({
  accusedPlayerName,
  onFinishReveal,
  isSubmitting = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black text-amber-100 flex flex-col justify-between p-6 select-none animate-fadeIn">
      {/* Top subtle orientation hint - NO secrets shown here */}
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-3 text-xs tracking-widest text-amber-400/80 font-mono uppercase">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          The Slate of Betrayal
        </span>
        <span className="text-[11px] text-zinc-500">Turn phone toward group</span>
      </div>

      {/* Main High-Contrast Slate Display */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-auto px-2">
        <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-zinc-400 mb-3 font-serif">
          I Accuse
        </p>

        {/* Huge High-Contrast Accused Name */}
        <div className="w-full bg-zinc-950/80 border-2 border-amber-500/70 p-6 md:p-10 shadow-[0_0_50px_rgba(212,163,69,0.2)]">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-wider text-amber-300 break-words drop-shadow-[0_2px_15px_rgba(255,223,158,0.4)]">
            {accusedPlayerName.toUpperCase()}
          </h1>
        </div>

        <p className="mt-6 text-sm text-amber-200/70 italic max-w-xs font-serif">
          “Speak your accusation aloud to the Round Table. Explain your suspicion.”
        </p>
      </div>

      {/* Bottom Action: Finish Slate Reveal */}
      <div className="pt-4 border-t border-amber-900/40 flex flex-col gap-2">
        <button
          onClick={onFinishReveal}
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/50 text-amber-100 text-lg font-serif font-bold tracking-widest uppercase transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? 'Recording Vote...' : 'Finish My Reveal'}
        </button>
        <p className="text-center text-[11px] text-zinc-500">
          Tapping records this vote publicly on the host display
        </p>
      </div>
    </div>
  );
};
