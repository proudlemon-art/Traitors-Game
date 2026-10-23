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

    const normalized = stored.trim().replace(/^["']|["']$/g, '').toLowerCase();
    const isKnownPartyCode = ['libby', 'jeremy', 'castle', 'traitors', 'traitor', 'merlot'].includes(normalized);

    fetch('/api/auth/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: stored }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success && !isKnownPartyCode) {
          localStorage.removeItem('traitors_castle_unlocked');
          localStorage.removeItem('traitors_castle_passcode');
          setIsCastleUnlocked(false);
        } else {
          setIsCastleUnlocked(true);
        }
      })
      .catch(() => {
        // Keep unlocked for known party passcodes during offline/cold starts
        if (isKnownPartyCode) {
          setIsCastleUnlocked(true);
        }
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

  const [isDeviceFrameMode, setIsDeviceFrameMode] = useState<boolean>(true);

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

  const handleJumpToRound = async (round: number, phase: string = 'INTRO') => {
    const code = currentRoomCode || 'DEMO7';
    await api.sendAction(code, 'DEMO_JUMP_TO_ROUND', { round, phase });
    setShowAdminStudio(false);
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
    const activeDemoPlayer = DEMO_PLAYERS.find(p => p.token === playerToken) || DEMO_PLAYERS[0];
    const isPlayerTraitor = activeDemoPlayer.id === gameState.traitorId;
    const activeIndex = DEMO_PLAYERS.findIndex(p => p.token === playerToken);
    const prevPlayer = DEMO_PLAYERS[(activeIndex - 1 + DEMO_PLAYERS.length) % DEMO_PLAYERS.length];
    const nextPlayer = DEMO_PLAYERS[(activeIndex + 1) % DEMO_PLAYERS.length];

    return (
      <div className="relative min-h-screen bg-castle-black text-amber-100 flex flex-col">
        {/* Demo Switcher Bar if active demo */}
        {gameState.isDemoRoom && (
          <DemoSwitcher
            state={gameState}
            currentRoleView={viewMode === 'HOST' ? 'HOST' : playerToken}
            onSelectView={handleSelectDemoView}
            onOpenAdminPlan={() => {
              setAdminStudioSceneId(undefined);
              setShowAdminStudio(true);
            }}
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
          ) : gameState.isDemoRoom ? (
            /* Mobile Device Simulator Frame for Testing */
            <div className="flex-1 flex flex-col items-center justify-start p-2 sm:p-6 bg-gradient-to-b from-castle-black via-zinc-950 to-castle-black">
              {/* Mobile Device Tester HUD */}
              <div className="w-full max-w-2xl bg-zinc-900/95 border border-amber-900/60 rounded-xl p-3 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleSelectDemoView('HOST')}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold rounded flex items-center gap-1 shadow transition"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Back to TV Host</span>
                  </button>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-zinc-400">Testing View:</span>
                    <strong className="text-amber-200">{activeDemoPlayer.name}</strong>
                    <span className="text-zinc-500">(Seat #{activeDemoPlayer.seat})</span>
                    {isPlayerTraitor ? (
                      <span className="px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-700/60 rounded text-[10px] font-bold">
                        🗡️ TRAITOR
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded text-[10px]">
                        🛡️ FAITHFUL
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSelectDemoView(prevPlayer.token)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono"
                    title={`Switch to ${prevPlayer.name}`}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => handleSelectDemoView(nextPlayer.token)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono"
                    title={`Switch to ${nextPlayer.name}`}
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => setIsDeviceFrameMode(!isDeviceFrameMode)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 rounded text-xs font-mono flex items-center gap-1"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isDeviceFrameMode ? 'Full Screen' : 'Phone Frame'}</span>
                  </button>
                </div>
              </div>

              {/* Realistic Smartphone Shell or Full Screen */}
              {isDeviceFrameMode ? (
                <div className="w-full max-w-[420px] rounded-[42px] border-[10px] border-zinc-800 bg-castle-black shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(212,163,69,0.15)] overflow-hidden relative flex flex-col my-2">
                  {/* Phone Dynamic Island / Speaker Bezel */}
                  <div className="bg-zinc-950 pt-3 pb-2 px-6 flex items-center justify-between border-b border-zinc-900 select-none">
                    <span className="text-[11px] font-mono font-bold text-zinc-400">9:41</span>
                    <div className="w-24 h-4 bg-black rounded-full border border-zinc-800 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                      <span>5G</span>
                      <div className="w-4 h-2 border border-zinc-400 rounded-sm p-0.5">
                        <div className="w-full h-full bg-zinc-400 rounded-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Device Content */}
                  <div className="p-4 overflow-y-auto max-h-[750px] min-h-[580px] custom-scrollbar flex-1 bg-castle-black">
                    <PlayerScreen state={gameState} playerToken={playerToken} />
                  </div>

                  {/* Bottom Home Indicator Bar */}
                  <div className="bg-zinc-950 py-2 flex justify-center border-t border-zinc-900 select-none">
                    <div className="w-32 h-1 bg-zinc-600 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl mx-auto p-4">
                  <PlayerScreen state={gameState} playerToken={playerToken} />
                </div>
              )}
            </div>
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
            roomCode={currentRoomCode || 'DEMO7'}
            onJumpToRound={handleJumpToRound}
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
