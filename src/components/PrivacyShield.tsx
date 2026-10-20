import React, { useEffect, useState } from 'react';
import { EyeOff, ShieldCheck } from 'lucide-react';

interface PrivacyShieldProps {
  children: React.ReactNode;
}

export const PrivacyShield: React.FC<PrivacyShieldProps> = ({ children }) => {
  const [isConcealed, setIsConcealed] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsConcealed(true);
      }
    };

    const handleBlur = () => {
      setIsConcealed(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  if (isConcealed) {
    return (
      <div className="min-h-screen bg-black text-amber-100 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-burgundy-950 border-2 border-amber-600/60 flex items-center justify-center shadow-[0_0_40px_rgba(115,19,63,0.5)] mb-6">
          <EyeOff className="w-10 h-10 text-amber-400" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-amber-300 tracking-wider mb-2">
          Secrets Concealed
        </h2>
        <p className="text-sm text-zinc-400 max-w-xs mb-8 font-sans leading-relaxed">
          Your screen was hidden to protect your secret role from curious eyes at the table.
        </p>

        <button
          onClick={() => setIsConcealed(false)}
          className="py-3 px-8 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-200 font-serif tracking-widest uppercase text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Resume Safely
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
