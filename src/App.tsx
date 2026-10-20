import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { ClientGameState } from './types/game';
import { HostScreen } from './components/HostScreen';
import { PlayerScreen } from './components/PlayerScreen';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { PartyGuideModal } from './components/PartyGuideModal';
import { AdminStudioModal } from './components/AdminStudioModal';
import { DemoSwitcher, DEMO_PLAYERS } from './components/DemoSwitcher';
import { CastleGatekeeper } from './components/CastleGatekeeper';
import {
  Flame,
  Shield,
  Users,
  Play,
  HelpCircle,
  Settings,
  Sparkles,
  Smartphone,
  Tv,
  ArrowRight,
  Lock,
  Unlock,
  Film,
} from 'lucide-react';

export default function App() {
  const [isCastleUnlocked, setIsCastleUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('traitors_castle_unlocked') === 'true';
    }
    return false;
  });

  // Verify cached passcode with server on mount so changes to CASTLE_PASSWORD are immediately enforced
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('traitors_castle_passcode');
    if (!stored) {
      setIsCastleUnlocked(false);
      localStorage.removeItem('traitors_castle_unlocked');
      return;
    }

    fetch('/api/auth/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: stored }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          localStorage.removeItem('traitors_castle_unlocked');
          localStorage.removeItem('traitors_castle_passcode');
          setIsCastleUnlocked(false);
        } else {
          setIsCastleUnlocked(true);
        }
      })
      .catch(() => {
        // Ignore offline network error
      });
  }, []);

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState<string>('');
  const [playerToken, setPlayerToken] = useState<string>('');
  const [viewMode, setViewMode] = useState<'HOST' | 'PLAYER'>('HOST');

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAdminStudio, setShowAdminStudio] = useState(false);
  const [adminStudioSceneId, setAdminStudioSceneId] = useState<string | undefined>(undefined);

  const handleLockCastle = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('traitors_castle_unlocked');
      localStorage.removeItem('traitors_castle_passcode');
    }
    setIsCastleUnlocked(false);
  };

  const handleOpenAdminStudio = (sceneId?: string) => {
    setAdminStudioSceneId(sceneId);
    setShowAdminStudio(true);
  };

  // Form states for Lobby
  const [hostName, setHostName] = useState('Libby');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse URL query parameter for room code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setJoinCode(roomParam.toUpperCase());
        // Try restoring session
        const stored = api.getStoredSession(roomParam.toUpperCase());
        if (stored) {
          setCurrentRoomCode(roomParam.toUpperCase());
          setPlayerToken(stored.playerToken);
          setViewMode('PLAYER');
        }
      }
    }
  }, []);

  // Subscribe to SSE updates when roomCode is active
  useEffect(() => {
    if (!currentRoomCode) return;

    const unsub = api.subscribeToRoom(
      currentRoomCode,
      playerToken,
      viewMode === 'HOST',
      state => {
        setGameState(state);
      }
    );

    return unsub;
  }, [currentRoomCode, playerToken, viewMode]);

  // Handle Demo Castle Setup
  const handleLaunchDemo = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const demo = await api.setupDemoRoom();
      setCurrentRoomCode(demo.roomCode);
      setPlayerToken(demo.playerToken);
      setViewMode('HOST');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start demo castle');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Create Real Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.createRoom(hostName.trim());
      setCurrentRoomCode(res.roomCode);
      setPlayerToken(res.playerToken);
      setViewMode('HOST');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Join Real Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.joinRoom(joinCode.trim(), joinName.trim());
      setCurrentRoomCode(res.roomCode);
      setPlayerToken(res.playerToken);
      setViewMode('PLAYER');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo player view switcher
  const handleSelectDemoView = async (view: 'HOST' | string) => {
    const code = currentRoomCode || 'DEMO7';
    if (view === 'HOST') {
      setViewMode('HOST');
      api.setActivePlayerToken('demo_token_libby', true);
      const hostState = await api.fetchState(code, 'demo_token_libby', true);
      if (hostState) setGameState(hostState);
    } else {
      setPlayerToken(view);
      setViewMode('PLAYER');
      const found = DEMO_PLAYERS.find(p => p.token === view);
      if (found) {
        api.saveSession(code, view, found.id);
        api.setActivePlayerToken(view, false);
        const playerState = await api.fetchState(code, view, false);
        if (playerState) setGameState(playerState);
      }
    }
  };

  // If locked behind castle gatekeeper:
  if (!isCastleUnlocked) {
    return <CastleGatekeeper onUnlock={() => setIsCastleUnlocked(true)} />;
  }

  // If inside an active room:
  if (gameState) {
    return (
      <div className="relative min-h-screen bg-castle-black text-amber-100 flex flex-col">
        {/* Demo Switcher Bar if active demo */}
        {gameState.isDemoRoom && (
          <DemoSwitcher
            state={gameState}
            currentRoleView={viewMode === 'HOST' ? 'HOST' : playerToken}
            onSelectView={handleSelectDemoView}
          />
        )}

        {/* Global View Mode Switcher (Host TV vs Player Phone) */}
        {!gameState.isDemoRoom && (
          <div className="bg-zinc-950 border-b border-zinc-800 p-2 text-xs flex items-center justify-between px-4">
            <span className="font-mono text-amber-400">
              Room: <strong>{gameState.roomCode}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('HOST')}
                className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'HOST'
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Tv className="w-3 h-3" /> TV Host Display
              </button>
              <button
                onClick={() => setViewMode('PLAYER')}
                className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'PLAYER'
                    ? 'bg-burgundy-900 border border-amber-500/60 text-amber-200'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3 h-3" /> My Phone Seat
              </button>
              <button
                onClick={handleLockCastle}
                className="p-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 transition"
                title="Lock Castle (Sign Out)"
              >
                <Lock className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Main Display: Host or Player */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'HOST' ? (
            <HostScreen
              state={gameState}
              onOpenSettings={() => setShowSettings(true)}
              onOpenGuide={() => setShowGuide(true)}
              onOpenAdminStudio={handleOpenAdminStudio}
            />
          ) : (
            <PlayerScreen state={gameState} playerToken={playerToken} />
          )}
        </div>

        {/* Settings, Guide & Admin Modals */}
        <AudioSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onOpenAdminStudio={handleOpenAdminStudio}
        />
        <PartyGuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
        />
        {showAdminStudio && (
          <AdminStudioModal
            isOpen={showAdminStudio}
            onClose={() => setShowAdminStudio(false)}
            initialSceneId={adminStudioSceneId}
          />
        )}
      </div>
    );
  }

  // Welcome / Lobby Entry Screen
  return (
    <div className="min-h-screen bg-castle-black text-amber-100 flex flex-col justify-between selection:bg-amber-900 selection:text-amber-100 p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-amber-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-burgundy-950 border border-amber-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(212,163,69,0.3)]">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-black tracking-widest text-amber-200">
              LIBBY’S BIRTHDAY
            </h1>
            <span className="text-[10px] font-mono tracking-widest uppercase text-amber-500 block">
              Trust Nobody · 7-Player Castle Experience
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdminStudio()}
            className="py-1.5 px-3 bg-burgundy-950 hover:bg-burgundy-900 text-amber-300 border border-amber-600/50 text-xs font-mono uppercase rounded flex items-center gap-1.5 transition-all shadow"
            title="Castle Media & Host Studio: Custom Voice Clips, Script & Images"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" /> Admin Studio
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono uppercase rounded flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Party Guide
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-200 border border-zinc-800 rounded"
            title="Audio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleLockCastle}
            className="p-2 bg-burgundy-950/80 hover:bg-burgundy-900 text-amber-400/90 hover:text-amber-200 border border-burgundy-800/80 rounded"
            title="Lock Castle (Sign Out)"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero & Entry Options */}
      <main className="max-w-4xl mx-auto w-full py-8 md:py-12 flex-1 flex flex-col justify-center space-y-8">
        <div className="text-center space-y-3">
          <div className="relative w-full max-w-2xl mx-auto h-52 md:h-72 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_40px_rgba(212,163,69,0.3)] mb-4 group">
            <img
              src="/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png"
              alt="Claudia Winkleman at Jasmine’s Castle"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                  Location: Jasmine’s Castle · Scottish Highlands
                </span>
                <span className="font-serif font-black text-amber-200 text-lg md:text-xl">
                  Libby’s Birthday: Trust Nobody
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/70 border border-amber-500/40 px-2.5 py-1 rounded text-[11px] font-mono text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Claudia Host Live
              </div>
            </div>
          </div>

          <span className="text-xs uppercase tracking-[0.3em] text-amber-500 font-mono">
            Welcome to Jasmine’s Castle
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-amber-100 tracking-wide drop-shadow-md">
            TRUST NOBODY
          </h2>
          <p className="text-sm md:text-base text-zinc-300 font-serif italic max-w-lg mx-auto leading-relaxed">
            “Seven arrive to celebrate Libby’s birthday at Jasmine’s Castle. Four standalone rounds of deception, scrap-paper missions, and phone-slate betrayals. Who among you is living a lie?”
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded text-center max-w-md mx-auto">
            {errorMessage}
          </div>
        )}

        {/* 1-CLICK INSTANT DEMO CASTLE CALLOUT */}
        <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border-2 border-amber-500/70 p-6 rounded-xl shadow-[0_0_40px_rgba(212,163,69,0.2)] text-center max-w-xl mx-auto space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
            Instant Test & Rehearsal
          </span>
          <h3 className="text-2xl font-serif font-bold text-amber-200">
            Launch Instant Demo Castle
          </h3>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Spawns a ready-to-play castle with 7 simulated guests (Libby, Arthur, Beatrice, Callum, Daphne, Edgar, Fiona). Switch between the public TV display and individual phone slates with 1 click!
          </p>
          <button
            onClick={handleLaunchDemo}
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-500 text-black font-serif font-bold text-sm tracking-widest uppercase rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? 'Entering Castle...' : 'Play Demo Castle (7 Players)'}
          </button>
        </div>

        {/* Room Creation & Joining Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full pt-4">
          {/* Create Real Castle Room */}
          <div className="bg-zinc-950/90 border border-amber-900/50 p-6 rounded-xl shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500 block">
                Party Organiser
              </span>
              <h3 className="text-xl font-serif font-bold text-amber-200">
                Create Game Room
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Creates a new room for the TV host display and reserves Seat #1 for Libby.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 mt-4">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Host / Birthday Name:
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  placeholder="Libby"
                  className="w-full bg-black border border-amber-900/60 p-2.5 text-xs text-amber-200 rounded focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 border border-amber-500/50 font-serif font-bold text-xs uppercase tracking-wider rounded transition-all shadow"
              >
                Create Castle Room
              </button>
            </form>
          </div>

          {/* Join from Mobile Phone */}
          <div className="bg-zinc-950/90 border border-amber-900/50 p-6 rounded-xl shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500 block">
                Guest Phone
              </span>
              <h3 className="text-xl font-serif font-bold text-amber-200">
                Join by Room Code
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Guests join using the 5-letter code displayed on the TV screen.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Room Code:
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CASTL"
                    maxLength={5}
                    className="w-full bg-black border border-amber-900/60 p-2.5 text-xs text-amber-200 font-mono tracking-widest uppercase rounded focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Your Name:
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    placeholder="e.g. James"
                    className="w-full bg-black border border-amber-900/60 p-2.5 text-xs text-amber-200 rounded focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim() || !joinName.trim()}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-200 border border-zinc-700 font-serif font-bold text-xs uppercase tracking-wider rounded transition-all shadow disabled:opacity-40"
              >
                Enter Castle
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full border-t border-amber-900/40 pt-4 flex flex-wrap items-center justify-between text-xs text-zinc-500 font-mono gap-2">
        <span>Libby’s Birthday: Trust Nobody</span>
        <span>Zero-Cost Backend · No live AI agent · Pure deterministic suspense</span>
      </footer>

      {/* Modals */}
      <AudioSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenAdminStudio={handleOpenAdminStudio}
      />
      <PartyGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
      {showAdminStudio && (
        <AdminStudioModal
          isOpen={showAdminStudio}
          onClose={() => setShowAdminStudio(false)}
          initialSceneId={adminStudioSceneId}
        />
      )}
    </div>
  );
}
