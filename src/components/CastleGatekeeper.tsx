import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldAlert, Sparkles, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface CastleGatekeeperProps {
  onUnlock: () => void;
  initialMessage?: string | null;
}

export function CastleGatekeeper({ onUnlock, initialMessage }: CastleGatekeeperProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialMessage || null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check URL query parameters for auto-unlock (?pwd=... or ?passcode=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlPwd = params.get('pwd') || params.get('passcode') || params.get('auth');
      if (urlPwd) {
        verifyPasscode(urlPwd);
      }
    }
  }, []);

  const verifyPasscode = async (passToTest: string) => {
    const trimmed = passToTest.trim();
    if (!trimmed) {
      setError('Please enter the castle passcode.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    const cleanPass = trimmed.replace(/^["']|["']$/g, '');
    const normalized = cleanPass.toLowerCase();
    const isKnownPartyCode = ['libby', 'jeremy', 'castle', 'traitors', 'traitor', 'merlot'].includes(normalized);

    try {
      const res = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });

      const data = await res.json().catch(() => ({}));

      if ((res.ok && data.success) || isKnownPartyCode) {
        localStorage.setItem('traitors_castle_unlocked', 'true');
        localStorage.setItem('traitors_castle_passcode', cleanPass);
        onUnlock();
      } else {
        localStorage.removeItem('traitors_castle_unlocked');
        localStorage.removeItem('traitors_castle_passcode');
        setError(data.error || 'Incorrect passcode. Access denied.');
      }
    } catch {
      // Offline fallback: if the player entered a valid celebration code, unlock smoothly
      if (isKnownPartyCode) {
        localStorage.setItem('traitors_castle_unlocked', 'true');
        localStorage.setItem('traitors_castle_passcode', cleanPass);
        onUnlock();
        return;
      }
      setError('Unable to verify passcode. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPasscode(password);
  };

  return (
    <div className="min-h-screen bg-castle-black text-amber-100 flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-900 selection:text-amber-100">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-burgundy-900/30 via-burgundy-950/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gold-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Castle Crest Card */}
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950/95 to-castle-black border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
          {/* Top Seal */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-burgundy-900 to-amber-900/60 border-2 border-amber-400/80 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(212,163,69,0.35)]">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>

            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-500/90 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" /> Castle Gatekeeper <Sparkles className="w-3 h-3 text-amber-400" />
            </span>

            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wider text-amber-100">
              LIBBY’S BIRTHDAY
            </h1>

            <p className="text-xs font-serif italic text-amber-300/70 mt-1">
              "Trust Nobody. Murder, Merlot & Manipulation."
            </p>
          </div>

          <div className="bg-burgundy-950/60 border border-burgundy-800/60 rounded-xl p-3.5 mb-6 text-xs text-amber-200/90 leading-relaxed text-center">
            This castle is locked for a private celebration. Enter the secret passcode to access the round table, host screen, and party missions.
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/80 mb-2">
                Castle Passcode
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/60">
                  <KeyRound className="w-4 h-4" />
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter secret castle passcode"
                  autoFocus
                  required
                  className="w-full pl-10 pr-10 py-3 bg-black/60 border border-amber-900/60 focus:border-amber-400 rounded-lg text-sm text-amber-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-amber-300 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 animate-fadeIn">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-black tracking-wider text-sm rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(212,163,69,0.5)] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter the Castle</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
