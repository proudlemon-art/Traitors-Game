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
import { createFallbackDemoClientState } from './services/demoFallback';
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
  UserPlus,
  Eye,
  EyeOff,
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
  const [isPrivacyConfirmed, setIsPrivacyConfirmed] = useState<boolean>(false);
  const [failsafeNewPlayerName, setFailsafeNewPlayerName] = useState<string>('');
  const [showAddPlayerInput, setShowAddPlayerInput] = useState<boolean>(false);

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
      api.setActivePlayerToken(demo.playerToken, true);

      if (demo.state) {
        setGameState(demo.state);
      } else {
        const state = await api.fetchState(demo.roomCode, demo.playerToken, true);
        setGameState(state || createFallbackDemoClientState(demo.playerToken, true));
      }
    } catch (err: any) {
      console.warn('Demo initialization notice:', err);
      setCurrentRoomCode('DEMO7');
      setPlayerToken('demo_token_libby');
      setViewMode('HOST');
      api.setActivePlayerToken('demo_token_libby', true);
      setGameState(createFallbackDemoClientState('demo_token_libby', true));
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
      api.setActivePlayerToken(res.playerToken, true);

      if (res.state) {
        setGameState(res.state);
      } else {
        const state = await api.fetchState(res.roomCode, res.playerToken, true);
        if (state) {
          setGameState(state);
        }
      }
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
      api.setActivePlayerToken(res.playerToken, false);

      if (res.state) {
        setGameState(res.state);
      } else {
        const state = await api.fetchState(res.roomCode, res.playerToken, false);
        if (state) {
          setGameState(state);
        }
      }
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
      if (hostState) {
        setGameState(hostState);
      } else {
        setGameState(prev =>
          prev
            ? {
                ...prev,
                myPlayerId: undefined,
                myRole: undefined,
                traitorId: 'p_arthur',
                traitorName: 'Arthur',
              }
            : createFallbackDemoClientState('demo_token_libby', true)
        );
      }
    } else {
      setPlayerToken(view);
      setViewMode('PLAYER');
      const found = DEMO_PLAYERS.find(p => p.token === view);
      if (found) {
        api.saveSession(code, view, found.id);
        api.setActivePlayerToken(view, false);
        const playerState = await api.fetchState(code, view, false);
        if (playerState) {
          setGameState(playerState);
        } else {
          setGameState(createFallbackDemoClientState(view, false));
        }
      }
    }
  };

  // Real room failsafe player view switcher (with mandatory privacy confirmation gate)
  const handleSelectRealRoomView = async (targetView: 'HOST' | string) => {
    const code = currentRoomCode || gameState?.roomCode || '';
    if (!code) return;

    if (targetView === 'HOST') {
      setViewMode('HOST');
      setIsPrivacyConfirmed(false);
      api.setActivePlayerToken(playerToken || '', true);
      const hostState = await api.fetchState(code, playerToken || '', true);
      if (hostState) setGameState(hostState);
    } else {
      // Switching to a specific player's simulated phone tab in a real room:
      // Always lock behind the privacy confirmation screen first!
      setIsPrivacyConfirmed(false);
      setPlayerToken(targetView);
      setViewMode('PLAYER');
      api.setActivePlayerToken(targetView, false);
      const pState = await api.fetchState(code, targetView, false);
      if (pState) setGameState(pState);
    }
  };

  // Generate a new failsafe player on the fly in a real castle room
  const handleAddFailsafePlayer = async (e?: React.FormEvent, customName?: string) => {
    if (e) e.preventDefault();
    const code = currentRoomCode || gameState?.roomCode || '';
    if (!code) return;
    const count = (gameState?.players?.length || 0) + 1;
    const nameToCreate = (customName ?? failsafeNewPlayerName).trim() || `Guest ${count}`;
    setFailsafeNewPlayerName('');
    await api.sendAction(code, 'ADD_FAILSAFE_PLAYER', { name: nameToCreate });
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

    // Real room sorted players for the failsafe top nav bar
    const realRoomPlayers = [...(gameState.players || [])].sort(
      (a, b) => (a.seatNumber || 0) - (b.seatNumber || 0)
    );
    const activeRealPlayer =
      realRoomPlayers.find(p => p.id === playerToken || p.id === gameState.myPlayerId) ||
      realRoomPlayers[0];

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

        {/* REAL CASTLE ROOM TOP NAV: TV HOST + FAILSAFE SIMULATED PLAYER TABS + UNLIMITED PLAYER GENERATOR */}
        {!gameState.isDemoRoom && (
          <div className="bg-zinc-950/98 border-b-2 border-amber-500/60 p-2 text-xs sticky top-0 z-50 backdrop-blur-md shadow-xl">
            <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-2">
              {/* Left: Room Code & TV Host Switcher */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-amber-400 bg-zinc-900 border border-amber-900/50 px-2.5 py-1 rounded">
                  Room: <strong className="tracking-widest text-amber-200">{gameState.roomCode}</strong>
                </span>

                <button
                  onClick={() => handleSelectRealRoomView('HOST')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 shadow ${
                    viewMode === 'HOST'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black ring-2 ring-amber-300'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>TV Host Display</span>
                </button>
              </div>

              {/* Center: Simulated Phone Tabs for All Seated Players (Failsafe Mode) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mr-1 hidden sm:inline">
                  Failsafe Phone Tabs ({realRoomPlayers.length}):
                </span>
                {realRoomPlayers.map(rp => {
                  const isSelected =
                    viewMode === 'PLAYER' &&
                    (playerToken === rp.id || gameState.myPlayerId === rp.id);
                  const hasRegisteredObject = gameState.exhibitAState?.objects?.some(
                    o => o.contributorId === rp.id && typeof o.name === 'string' && o.name.trim().length > 0
                  );
                  return (
                    <button
                      key={rp.id}
                      onClick={() => handleSelectRealRoomView(rp.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-burgundy-950 border-2 border-amber-400 text-amber-100 font-bold shadow-lg ring-1 ring-amber-400'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                      title={`Simulate ${rp.name}’s Phone Slate (Protected by Private Viewing Confirmation)`}
                    >
                      <Smartphone className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span className="text-[10px] font-mono text-amber-500">#{rp.seatNumber}</span>
                      <span>{rp.name}</span>
                      {gameState.currentRound === 1 &&
                        gameState.exhibitAState?.stage === 'COLLECTION' &&
                        hasRegisteredObject && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Object registered" />
                        )}
                      {rp.hasLockedVote && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Vote locked" />
                      )}
                    </button>
                  );
                })}

                {/* + Add Failsafe Player Controls */}
                {showAddPlayerInput ? (
                  <form
                    onSubmit={e => {
                      handleAddFailsafePlayer(e);
                      setShowAddPlayerInput(false);
                    }}
                    className="flex items-center gap-1 bg-zinc-900 border border-amber-500/60 rounded-lg p-1"
                  >
                    <input
                      type="text"
                      value={failsafeNewPlayerName}
                      onChange={e => setFailsafeNewPlayerName(e.target.value)}
                      placeholder="Guest name..."
                      autoFocus
                      className="bg-black border border-zinc-800 px-2 py-1 text-xs text-amber-200 rounded w-28 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[11px]"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFailsafePlayer(undefined, `Guest ${realRoomPlayers.length + 1}`)}
                      className="px-2 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/50 rounded text-[10px] font-mono"
                      title="Instantly spawn another guest without typing"
                    >
                      +1 Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPlayerInput(false)}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-200 text-[10px]"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowAddPlayerInput(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 flex items-center gap-1 shadow transition"
                      title="Add a player who cannot join via QR code"
                    >
                      <UserPlus className="w-3 h-3 text-emerald-400" />
                      <span>+ Add Player</span>
                    </button>
                    <button
                      onClick={() => handleAddFailsafePlayer(undefined, `Guest ${realRoomPlayers.length + 1}`)}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 transition"
                      title="Instantly generate another player tab with 1 click"
                    >
                      +1 Quick Spawn
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Lock Castle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLockCastle}
                  className="p-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 transition"
                  title="Lock Castle (Sign Out)"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>
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
          ) : !isPrivacyConfirmed ? (
            /* REAL CASTLE ROOM: PRIVATE VIEWING CONFIRMATION SHIELD */
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-castle-black via-zinc-950 to-castle-black">
              <div className="w-full max-w-lg bg-zinc-950 border-2 border-amber-500/70 rounded-2xl p-8 text-center space-y-6 shadow-[0_0_60px_rgba(212,163,69,0.2)]">
                <div className="w-16 h-16 rounded-full bg-burgundy-950 border-2 border-amber-500/60 flex items-center justify-center mx-auto shadow-lg">
                  <EyeOff className="w-8 h-8 text-amber-400" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-500 block">
                    Castle Privacy Shield · Seat #{activeRealPlayer?.seatNumber || 1}
                  </span>
                  <h2 className="text-3xl font-serif font-black text-amber-200">
                    {activeRealPlayer?.name || 'Guest'}’s Private Slate
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
                    You are opening the simulated phone view for{' '}
                    <strong className="text-amber-300">{activeRealPlayer?.name || 'this player'}</strong>.
                    This screen contains secret allegiance details (Faithful or Traitor), secret mission briefings, and private ballots.
                  </p>
                </div>

                <div className="bg-burgundy-950/60 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-200/90 font-serif italic">
                  “Please confirm that you are viewing this screen in private and nobody else at the Round Table is looking over your shoulder.”
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setIsPrivacyConfirmed(true)}
                    className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>I Confirm I Am Viewing in Private — Reveal {activeRealPlayer?.name}’s Phone</span>
                  </button>

                  <button
                    onClick={() => handleSelectRealRoomView('HOST')}
                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono uppercase tracking-wider rounded-xl transition"
                  >
                    Cancel & Return to TV Host Display
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* REAL CASTLE ROOM: UNLOCKED FAILSAFE SIMULATED PHONE VIEW */
            <div className="flex-1 flex flex-col items-center justify-start p-2 sm:p-6 bg-gradient-to-b from-castle-black via-zinc-950 to-castle-black">
              <div className="w-full max-w-2xl bg-zinc-900/95 border border-amber-900/60 rounded-xl p-3 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleSelectRealRoomView('HOST')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold rounded flex items-center gap-1.5 shadow transition"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Lock & Return to TV Host</span>
                  </button>

                  <button
                    onClick={() => setIsPrivacyConfirmed(false)}
                    className="px-2.5 py-1.5 bg-burgundy-950 hover:bg-burgundy-900 border border-amber-500/50 text-amber-200 font-mono rounded flex items-center gap-1 transition"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hide Screen</span>
                  </button>

                  <div className="flex items-center gap-1.5 font-mono pl-1">
                    <span className="text-zinc-400">Active Slate:</span>
                    <strong className="text-amber-200">{activeRealPlayer?.name}</strong>
                    <span className="text-zinc-500">(Seat #{activeRealPlayer?.seatNumber})</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsDeviceFrameMode(!isDeviceFrameMode)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 rounded text-xs font-mono flex items-center gap-1"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isDeviceFrameMode ? 'Full Screen' : 'Phone Frame'}</span>
                  </button>
                </div>
              </div>

              {isDeviceFrameMode ? (
                <div className="w-full max-w-[420px] rounded-[42px] border-[10px] border-zinc-800 bg-castle-black shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(212,163,69,0.15)] overflow-hidden relative flex flex-col my-2">
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

                  <div className="p-4 overflow-y-auto max-h-[750px] min-h-[580px] custom-scrollbar flex-1 bg-castle-black">
                    <PlayerScreen state={gameState} playerToken={activeRealPlayer?.id || playerToken} />
                  </div>

                  <div className="bg-zinc-950 py-2 flex justify-center border-t border-zinc-900 select-none">
                    <div className="w-32 h-1 bg-zinc-600 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl mx-auto p-4">
                  <PlayerScreen state={gameState} playerToken={activeRealPlayer?.id || playerToken} />
                </div>
              )}
            </div>
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
