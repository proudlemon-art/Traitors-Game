import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import { audioHost, AudioPlaybackState } from '../services/audioHost';
import { adminMediaService } from '../services/adminMediaService';
import { ClaudiaBroadcastVideo } from './ClaudiaBroadcastVideo';
import { HostSidebarLeaderboard } from './HostSidebarLeaderboard';
import { ExhibitAMission } from './Missions/ExhibitAMission';
import { BirthdayMajorityMission } from './Missions/BirthdayMajorityMission';
import { BodyDisposalMission } from './Missions/BodyDisposalMission';
import { GetawayAuctionMission } from './Missions/GetawayAuctionMission';
import { JASMINE_FORFEIT_APOLOGY, HOST_SCRIPTS } from '../data/dialogue';
import {
  Flame,
  Shield,
  Skull,
  Trophy,
  Users,
  Coins,
  Settings,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Film,
  Camera,
  Heart,
  Crown,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenAdminStudio?: (sceneId?: string) => void;
}

export const HostScreen: React.FC<Props> = ({
  state,
  onOpenSettings,
  onOpenGuide,
  onOpenAdminStudio,
}) => {
  const [caption, setCaption] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [audioUnlocked, setAudioUnlocked] = useState(true);
  const [playback, setPlayback] = useState<AudioPlaybackState>(audioHost.getPlaybackState());
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isBanishedRoleRevealed, setIsBanishedRoleRevealed] = useState(false);

  // Round 3 Forgery Gallery 2-minute (120s) sketch timer state
  const [forgeryTimerSec, setForgeryTimerSec] = useState<number>(120);
  const [isForgeryTimerRunning, setIsForgeryTimerRunning] = useState<boolean>(false);
  const [hasForgeryTimerFinished, setHasForgeryTimerFinished] = useState<boolean>(false);

  // Reset role reveal & Round 3 timer whenever the phase, round, or banished player changes
  useEffect(() => {
    setIsBanishedRoleRevealed(false);
    if (state.phase !== 'MISSION' || state.currentRound !== 3) {
      setIsForgeryTimerRunning(false);
      setHasForgeryTimerFinished(false);
      setForgeryTimerSec(120);
    }
  }, [state.phase, state.currentRound, state.finaleState?.currentEliminatedPlayerId]);

  const triggerRound3PensDown = () => {
    setIsForgeryTimerRunning(false);
    setForgeryTimerSec(0);
    setHasForgeryTimerFinished(true);
    const pensDownScene = adminMediaService.getActiveScene('ROUND_3_PENS_DOWN', 3);
    const pensDownText =
      pensDownScene?.customText ||
      pensDownScene?.defaultText ||
      "Pens down! Your masterpieces are complete — I'm using that word very generously. Hold up your drawings in three, two, one! Have a good look around. The Faithful were all working from the same secret brief. The Traitor had something different. Who's drawn something suspicious, and who is simply terrible at drawing?";
    setCaption(pensDownText);
    audioHost.speak(pensDownText, 'ROUND_3_PENS_DOWN', 3, { force: true });
  };

  // Countdown tick for Round 3 2-minute sketch timer
  useEffect(() => {
    if (!isForgeryTimerRunning) return;
    const interval = setInterval(() => {
      setForgeryTimerSec(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            triggerRound3PensDown();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isForgeryTimerRunning]);

  // Subscribe to audio playback state for header Pause/Restart controls
  useEffect(() => {
    const unsub = audioHost.subscribePlaybackState(s => {
      setPlayback(s);
    });
    return unsub;
  }, []);

  // Generate QR code for mobile joining (embeds passcode if available for auto-unlock)
  useEffect(() => {
    if (typeof window !== 'undefined' && state.roomCode) {
      const storedPasscode = localStorage.getItem('traitors_castle_passcode') || '';
      const joinUrl = storedPasscode
        ? `${window.location.origin}?room=${state.roomCode}&pwd=${encodeURIComponent(storedPasscode)}`
        : `${window.location.origin}?room=${state.roomCode}`;
      try {
        const toDataUrlFn = QRCode?.toDataURL || (QRCode as any)?.default?.toDataURL;
        if (typeof toDataUrlFn === 'function') {
          toDataUrlFn(joinUrl, {
            width: 200,
            margin: 1,
            color: { dark: '#d4a345', light: '#09090b' },
          })
            .then(url => setQrDataUrl(url))
            .catch(err => console.warn('QR code error', err));
        }
      } catch (err) {
        console.warn('QR code generation notice:', err);
      }
    }
  }, [state.roomCode]);

  // Subscribe to host speech captions
  useEffect(() => {
    const unsub = audioHost.subscribeCaptions(text => {
      setCaption(text);
    });
    return unsub;
  }, []);

  // Keep caption synchronized with latest dialogue
  useEffect(() => {
    if (state.latestDialogue) {
      setCaption(state.latestDialogue);
    }
  }, [state.latestDialogue]);

  // Trigger scene voice clip when phase or round changes
  useEffect(() => {
    if (state.phase === 'LOBBY') {
      audioHost.stop();
      audioHost.resetAutoSceneTracking();
      return;
    }
    const activeScene = adminMediaService.getActiveScene(state.phase, state.currentRound);
    const dialogueText = state.latestDialogue || activeScene?.defaultText || '';
    audioHost.speak(dialogueText, state.phase, state.currentRound);
  }, [state.phase, state.currentRound]);

  const effectiveBroadcastPhase =
    state.phase === 'MISSION' && state.currentRound === 3 && hasForgeryTimerFinished
      ? 'ROUND_3_PENS_DOWN'
      : state.phase;

  const handleUnlockAudio = () => {
    audioHost.unlockAudio();
    setAudioUnlocked(true);
    const activeScene = adminMediaService.getActiveScene(effectiveBroadcastPhase, state.currentRound);
    audioHost.togglePlayPause(activeScene?.voiceClip);
  };

  const handleHeaderAudioPlayPause = () => {
    const activeScene = adminMediaService.getActiveScene(effectiveBroadcastPhase, state.currentRound);
    audioHost.togglePlayPause(activeScene?.voiceClip);
  };

  const handleHeaderAudioRestart = () => {
    const activeScene = adminMediaService.getActiveScene(effectiveBroadcastPhase, state.currentRound);
    audioHost.restart(activeScene?.voiceClip);
  };

  const handleTimerToggle = async () => {
    await api.sendAction(state.roomCode, 'TIMER_PLAY_PAUSE');
  };

  const handleTimerAdjust = async (seconds: number) => {
    await api.sendAction(state.roomCode, 'TIMER_ADJUST', { seconds });
  };

  const handleMoveSeat = async (index: number, direction: 'UP' | 'DOWN') => {
    const seating = Array.isArray(state.seatingOrder) ? [...state.seatingOrder] : [];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= seating.length) return;

    const temp = seating[index];
    seating[index] = seating[targetIdx];
    seating[targetIdx] = temp;

    await api.sendAction(state.roomCode, 'UPDATE_SEATING_ORDER', { seatingOrder: seating });
  };

  // Timer formatting
  const remainingSec =
    typeof state.phaseTimeRemaining === 'number' && !isNaN(state.phaseTimeRemaining)
      ? Math.max(0, state.phaseTimeRemaining)
      : 480;
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const finale = state.finaleState;
  const playersList = Array.isArray(state.players) ? state.players : [];
  const seatingList = Array.isArray(state.seatingOrder) ? state.seatingOrder : [];
  const survivors = playersList.filter(p => !p.isEliminated);
  const eliminatedPlayers = playersList.filter(p => p.isEliminated);
  const currentSceneClip =
    adminMediaService.getActiveScene(effectiveBroadcastPhase, state.currentRound)?.voiceClip ||
    playback.activeClip;

  return (
    <div className="min-h-screen bg-castle-black text-amber-100 flex flex-col justify-between selection:bg-amber-900 selection:text-amber-100">
      {/* 1. TOP GOTHIC HEADER & AUDIO CONTROL BAR */}
      <header className="bg-gradient-to-b from-burgundy-950 via-zinc-950 to-castle-black border-b border-amber-900/50 p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Title & Castle Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-burgundy-900/80 border border-amber-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(212,163,69,0.3)]">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-serif font-black tracking-widest text-amber-200">
                LIBBY’S BIRTHDAY
              </h1>
              <span className="text-[11px] font-mono tracking-widest uppercase text-amber-500 block">
                Trust Nobody · Castle Host Display
              </span>
            </div>
          </div>

          {/* Round & Compact Status */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-zinc-900/80 border border-amber-900/40 px-3 py-1.5 rounded flex items-center gap-2">
              <span className="text-zinc-400 uppercase">Round:</span>
              <span className="text-amber-300 font-bold">
                {state.currentRound <= 5 ? `${state.currentRound} of 6` : '6: Finale'}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-amber-900/40 px-3 py-1.5 rounded flex items-center gap-2">
              <span className="text-zinc-400 uppercase">Phase:</span>
              <span className="text-amber-300 font-bold uppercase">{state.phase.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-amber-900/40 px-3 py-1 rounded">
            <span className="text-xs font-mono text-zinc-400 uppercase mr-1">Timer:</span>
            <span
              className={`text-lg font-mono font-bold tracking-widest ${
                state.phaseTimeRemaining <= 30 && !state.isTimerPaused
                  ? 'text-rose-500 animate-pulse'
                  : 'text-amber-300'
              }`}
            >
              {timeFormatted}
            </span>

            <button
              onClick={handleTimerToggle}
              className="p-1 hover:text-amber-300 text-zinc-400 ml-1"
              title={state.isTimerPaused ? 'Resume Timer' : 'Pause Timer'}
            >
              {state.isTimerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => handleTimerAdjust(30)}
              className="p-1 hover:text-amber-300 text-zinc-400 text-xs font-mono"
              title="Add 30 Seconds"
            >
              +30s
            </button>
            <button
              onClick={() => handleTimerAdjust(-30)}
              className="p-1 hover:text-amber-300 text-zinc-400 text-xs font-mono"
              title="Subtract 30 Seconds"
            >
              -30s
            </button>
          </div>

          {/* Host Voice Audio Transport Controls (Play/Pause & Restart) */}
          <div className="flex items-center gap-2">
            {currentSceneClip?.audioUrl && (
              <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-amber-500/50 px-2.5 py-1 rounded shadow">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase hidden sm:inline">
                  Audio:
                </span>
                <button
                  onClick={handleHeaderAudioPlayPause}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 transition ${
                    playback.isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  title={
                    playback.isPlaying
                      ? 'Pause Host Audio'
                      : playback.isPaused
                      ? 'Resume Host Audio'
                      : 'Play Host Audio'
                  }
                >
                  {playback.isPlaying ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>{playback.isPaused ? 'Resume' : 'Play'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleHeaderAudioRestart}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-200 border border-amber-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition"
                  title="Restart Host Audio from Beginning"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Restart</span>
                </button>
              </div>
            )}

            {onOpenAdminStudio && (
              <button
                onClick={() => {
                  const next = !isAdminMode;
                  setIsAdminMode(next);
                  if (next) onOpenAdminStudio();
                }}
                className={`py-1 px-2.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow ${
                  isAdminMode
                    ? 'bg-amber-500 text-black border border-amber-400'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
                title="Toggle Admin View & Studio"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Admin Studio {isAdminMode ? '(Active)' : ''}</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-1.5 text-zinc-400 hover:text-amber-200 bg-zinc-900 rounded border border-zinc-800"
              title="Voice & Audio Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenGuide}
              className="p-1.5 text-zinc-400 hover:text-amber-200 bg-zinc-900 rounded border border-zinc-800"
              title="Party Guide & Rules"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Claudia Live Caption Banner */}
        {caption && (
          <div className="mt-4 max-w-7xl mx-auto bg-black/60 border-l-4 border-amber-500 py-2.5 px-4 rounded-r text-sm font-serif italic text-amber-200/90 shadow">
            “{caption}”
          </div>
        )}
      </header>

      {/* 2. MAIN HOST ARENA */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-start space-y-6">
        {/* CENTER STAGE HERO: WIDESCREEN CINEMATIC TELEVISION BROADCAST & SCENE PHOTO */}
        <section className="w-full flex justify-center">
          <ClaudiaBroadcastVideo
            caption={caption}
            phase={effectiveBroadcastPhase}
            currentRound={state.currentRound}
            isHostAudioUnlocked={audioUnlocked}
            onUnlockAudio={handleUnlockAudio}
            isAdminModeOn={isAdminMode}
            onOpenAdminStudio={onOpenAdminStudio}
          />
        </section>

        {state.phase === 'LOBBY' ? (
          /* PHASE: LOBBY */
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto bg-zinc-950/90 border border-amber-900/50 p-6 md:p-10 rounded-xl shadow-2xl w-full">
            {/* Left: QR Code & Join Info */}
            <div className="space-y-4 text-center md:text-left">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                The Gathering of Seven
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
                Join Jasmine’s Castle
              </h2>
              <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                Scan the QR code on your mobile phone or enter the 5-letter room code.
              </p>

              <div className="bg-burgundy-950/70 border border-amber-500/50 rounded-lg p-3 text-xs text-amber-200 font-sans leading-relaxed text-left">
                <strong className="text-amber-400 font-serif block mb-0.5">
                  📱 Playing on your phone while this TV is the Host Screen?
                </strong>
                Scan the QR code (or enter code <strong className="font-mono text-amber-300">{state.roomCode}</strong>) on your phone and tap <strong className="text-amber-300">#{1} {playersList[0]?.name || 'Libby'} (Host)</strong> to control Seat #1 from your phone while this TV stays on the Host Display!
              </div>

              <div className="inline-block p-3 bg-black border-2 border-amber-500/60 rounded-lg shadow-lg">
                {qrDataUrl && <img src={qrDataUrl} alt="Room QR Code" className="w-44 h-44 mx-auto" />}
              </div>

              <div className="bg-zinc-900/80 p-3 rounded border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase">Room Code:</span>
                <span className="text-xl font-bold tracking-widest text-amber-300 font-mono">
                  {state.roomCode}
                </span>
              </div>
            </div>

            {/* Right: Seating Order & Connected Players */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="font-serif font-bold text-amber-300 flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-amber-500" />
                  Seating Order ({playersList.length} Seated)
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Order determines reveals
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {seatingList.map((playerId, idx) => {
                  const player = playersList.find(p => p.id === playerId);
                  return (
                    <div
                      key={playerId}
                      className="flex items-center justify-between p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-500 font-bold w-6">
                          #{idx + 1}
                        </span>
                        <strong className="text-amber-200 font-serif text-sm">
                          {player?.name || 'Guest'}
                        </strong>
                        {player?.isRoomCreator && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-mono">
                            Host Seat
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveSeat(idx, 'UP')}
                          disabled={idx === 0}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-[10px] font-mono"
                          title="Move Seat Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveSeat(idx, 'DOWN')}
                          disabled={idx === seatingList.length - 1}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-[10px] font-mono"
                          title="Move Seat Down"
                        >
                          ▼
                        </button>
                        {playersList.length > 1 && (
                          <button
                            onClick={() => api.sendAction(state.roomCode, 'REMOVE_PLAYER', { playerId })}
                            className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-mono ml-1"
                            title={`Remove ${player?.name || 'Player'}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'START_GAME')}
                  disabled={playersList.length < 1}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-black text-sm uppercase tracking-wider rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(212,163,69,0.5)] transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Begin Libby’s Birthday: Trust Nobody</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-zinc-400 text-center mt-2 font-mono">
                  {playersList.length} player{playersList.length === 1 ? '' : 's'} seated · Anyone can also rejoin mid-game on their phone by entering Room Code {state.roomCode} & their name!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Primary Center Stage: Current Phase Controls */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
        {/* PHASE: INTRO */}
        {state.phase === 'INTRO' && (
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Round {state.currentRound} Commences
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-black text-amber-200">
              {state.currentRound === 1
                ? 'Welcome to Jasmine’s Castle'
                : `Round ${state.currentRound}: Fresh Cloaks in the Dark`}
            </h2>
            <p className="text-base text-zinc-300 font-serif leading-relaxed max-w-xl mx-auto italic whitespace-pre-line">
              “{(HOST_SCRIPTS[state.currentRound] || HOST_SCRIPTS[1]).intro}”
            </p>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROLE_BRIEFING')}
                className="py-3 px-8 bg-gradient-to-r from-burgundy-900 to-burgundy-800 hover:from-burgundy-800 hover:to-burgundy-700 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-2 mx-auto"
              >
                <span>Deal Secret Roles & Cloaks</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE: ROLE BRIEFING */}
        {state.phase === 'ROLE_BRIEFING' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Deadly Silence at the Table
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Inspect Your Screens in Secret
            </h2>
            <p className="text-sm text-zinc-300 font-serif italic max-w-md mx-auto whitespace-pre-line">
              “{(HOST_SCRIPTS[state.currentRound] || HOST_SCRIPTS[1]).roleBriefing}”
            </p>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_MISSION')}
                className="py-3 px-8 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-sm uppercase tracking-widest rounded-lg shadow-lg transition"
              >
                Begin Mission
              </button>
            </div>
          </div>
        )}

        {/* PHASE: MISSION */}
        {state.phase === 'MISSION' && (
          <div className="max-w-5xl mx-auto w-full">
            {state.currentRound === 1 && <ExhibitAMission state={state} isHostDisplay />}
            {state.currentRound === 2 && <BirthdayMajorityMission state={state} isHostDisplay />}
            {state.currentRound === 3 && (
              <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-6 md:p-8 space-y-6 text-center">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                    Mission 3 · The Forgery Gallery (Zero-Spoiler Broadcast)
                  </span>
                  <h3 className="text-3xl font-serif font-black text-amber-200 mt-1">
                    {hasForgeryTimerFinished
                      ? 'Pens Down! Hold Up Your Masterpieces!'
                      : 'Deadly Silence: Sketch Your Secret Briefs'}
                  </h3>
                  <p className="text-sm text-zinc-300 max-w-xl mx-auto font-serif mt-2">
                    {hasForgeryTimerFinished
                      ? "“Pens down! Your masterpieces are complete — I'm using that word very generously. Hold up your drawings in three, two, one! Have a good look around.”"
                      : 'One random prompt pair has been dealt with a 50/50 coin-flip between Faithful and Traitor. Check your phones privately — the prompts are hidden from this TV screen so nobody has an advantage!'}
                  </p>
                </div>

                {/* 2-MINUTE FORGERY GALLERY SKETCHING TIMER */}
                <div
                  className={`max-w-xl mx-auto rounded-2xl border-2 p-6 space-y-4 transition-all shadow-2xl ${
                    hasForgeryTimerFinished
                      ? 'bg-burgundy-950/70 border-amber-400 shadow-[0_0_40px_rgba(212,163,69,0.35)]'
                      : isForgeryTimerRunning
                      ? 'bg-black/80 border-amber-500/80 shadow-[0_0_30px_rgba(212,163,69,0.25)]'
                      : 'bg-black/60 border-amber-900/60'
                  }`}
                >
                  <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                    {hasForgeryTimerFinished
                      ? '⏰ 2-Minute Sketching Time Up — Pens Down Audio Triggered!'
                      : isForgeryTimerRunning
                      ? '⏱️ Deadly Silence — Sketching in Progress'
                      : '⏱️ 2-Minute Silent Sketching Countdown'}
                  </div>

                  <div
                    className={`text-5xl md:text-6xl font-mono font-black tracking-widest ${
                      hasForgeryTimerFinished
                        ? 'text-amber-300 animate-bounce'
                        : forgeryTimerSec <= 15 && isForgeryTimerRunning
                        ? 'text-rose-500 animate-pulse'
                        : 'text-amber-200'
                    }`}
                  >
                    {Math.floor(forgeryTimerSec / 60)}:
                    {forgeryTimerSec % 60 < 10 ? '0' : ''}
                    {forgeryTimerSec % 60}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {!hasForgeryTimerFinished ? (
                      <>
                        <button
                          onClick={() => setIsForgeryTimerRunning(prev => !prev)}
                          className={`py-3 px-6 rounded-xl font-serif font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95 ${
                            isForgeryTimerRunning
                              ? 'bg-amber-500 hover:bg-amber-400 text-black'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isForgeryTimerRunning ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Pause 2-Min Timer</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>
                                {forgeryTimerSec < 120
                                  ? 'Resume 2-Min Timer'
                                  : 'Start 2-Minute Sketch Timer'}
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setIsForgeryTimerRunning(false);
                            setHasForgeryTimerFinished(false);
                            setForgeryTimerSec(120);
                          }}
                          className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset 2:00</span>
                        </button>

                        <button
                          onClick={triggerRound3PensDown}
                          className="py-3 px-4 bg-burgundy-900/80 hover:bg-burgundy-800 border border-amber-500/50 text-amber-200 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition"
                          title="Finish timer immediately and play Pens Down audio"
                        >
                          <span>Skip to 0:00 (Play Pens Down Audio)</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={triggerRound3PensDown}
                          className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Replay “Pens Down” Audio</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsForgeryTimerRunning(false);
                            setHasForgeryTimerFinished(false);
                            setForgeryTimerSec(120);
                            const missionScene = adminMediaService.getActiveScene('MISSION', 3);
                            const missionText =
                              missionScene?.customText ||
                              missionScene?.defaultText ||
                              HOST_SCRIPTS[3].missionStart;
                            setCaption(missionText);
                            audioHost.speak(missionText, 'MISSION', 3);
                          }}
                          className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-mono text-xs flex items-center gap-1.5 transition"
                        >
                          <span>Reset 2:00 Timer & Return to Mission Intro</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Forgery Milestones (+1 pt each, max 3 pts) */}
                <div className="max-w-xl mx-auto bg-black/60 border border-zinc-800 rounded-xl p-4 space-y-2.5 text-left">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-400 border-b border-zinc-800 pb-2">
                    <span>Gallery Mission Milestones (+1 pt each, max 3)</span>
                    <span>
                      {(state.forgeryGalleryState?.milestones?.allFinishedUnderTwoMinutes ? 1 : 0) +
                        (state.forgeryGalleryState?.milestones?.majorityCompletedFiveDetails ? 1 : 0) +
                        (state.forgeryGalleryState?.milestones?.groupDiscussedAllDrawings ? 1 : 0)}{' '}
                      / 3 Pts
                    </span>
                  </div>

                  {[
                    {
                      key: 'allFinishedUnderTwoMinutes' as const,
                      label: '1. All 7 artists finished sketching before the 2-minute timer',
                    },
                    {
                      key: 'majorityCompletedFiveDetails' as const,
                      label: '2. At least 5 sketches included all 5 required details',
                    },
                    {
                      key: 'groupDiscussedAllDrawings' as const,
                      label: '3. Every artist held up and explained their masterpiece',
                    },
                  ].map(m => {
                    const checked = !!state.forgeryGalleryState?.milestones?.[m.key];
                    return (
                      <div
                        key={m.key}
                        onClick={() =>
                          api.sendAction(state.roomCode, 'UPDATE_FORGERY_GALLERY', {
                            milestones: {
                              ...(state.forgeryGalleryState?.milestones || {
                                allFinishedUnderTwoMinutes: false,
                                majorityCompletedFiveDetails: false,
                                groupDiscussedAllDrawings: false,
                              }),
                              [m.key]: !checked,
                            },
                          })
                        }
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                          checked
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                            : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-serif font-semibold">{m.label}</span>
                        <span className="text-xs font-mono font-bold">
                          {checked ? '✓ +1 Pt' : 'Tap to Confirm'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE')}
                  className="py-3.5 px-8 bg-gradient-to-r from-burgundy-800 via-amber-600 to-burgundy-800 hover:from-burgundy-700 hover:to-amber-500 text-white font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-xl flex items-center gap-2 mx-auto"
                >
                  <span>Sketches Complete: Enter Round Table & Banishment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {state.currentRound === 4 && <BodyDisposalMission state={state} isHostDisplay />}
            {state.currentRound === 5 && (
              <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-6 md:p-8 space-y-6 text-center">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                    Mission 5 · The Counterfeit Expert (Zero-Spoiler Broadcast)
                  </span>
                  <h3 className="text-3xl font-serif font-black text-amber-200 mt-1">
                    Pitching: “{state.counterfeitExpertState?.invention || 'High-Tech Castle Invention'}”
                  </h3>
                  <p className="text-sm text-zinc-300 max-w-xl mx-auto font-serif mt-2">
                    Each guest has 30 seconds to pitch this invention. Faithful secretly received 3 codewords on their phones; the Traitor only received 2 and must listen closely to deduce the missing 3rd word on their phone!
                  </p>
                </div>

                {/* Pitch Completion Checklist */}
                <div className="max-w-2xl mx-auto bg-black/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-400 border-b border-zinc-800 pb-2">
                    <span>Click Each Guest as They Complete Their 30s Pitch</span>
                    <span>
                      {
                        Object.values(
                          state.counterfeitExpertState?.pitchCompletedByPlayerId || {}
                        ).filter(Boolean).length
                      }{' '}
                      / {state.players.length || 7} Pitched
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {state.players.map(p => {
                      const pitched =
                        !!state.counterfeitExpertState?.pitchCompletedByPlayerId?.[p.id];
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            api.sendAction(state.roomCode, 'UPDATE_COUNTERFEIT_EXPERT', {
                              pitchCompletedByPlayerId: {
                                ...(state.counterfeitExpertState?.pitchCompletedByPlayerId || {}),
                                [p.id]: !pitched,
                              },
                            })
                          }
                          className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                            pitched
                              ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-bold'
                              : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span className="font-serif truncate">{p.name}</span>
                          {pitched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE')}
                  className="py-3.5 px-8 bg-gradient-to-r from-burgundy-800 via-amber-600 to-burgundy-800 hover:from-burgundy-700 hover:to-amber-500 text-white font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-xl flex items-center gap-2 mx-auto"
                >
                  <span>Pitches Complete: Enter Round Table & Banishment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {state.currentRound === 6 && <GetawayAuctionMission state={state} isHostDisplay />}
          </div>
        )}

        {/* PHASE: ROUND TABLE (ROUNDS 1 TO 5) */}
        {state.phase === 'ROUND_TABLE' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/90 border border-amber-900/60 p-6 md:p-10 rounded-xl shadow-2xl text-center">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Round {state.currentRound} · The Round Table
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-black text-amber-200">
              The Debate of Accusation
            </h2>
            <p className="text-sm md:text-base text-zinc-300 font-serif italic max-w-2xl mx-auto">
              “{(HOST_SCRIPTS[state.currentRound] || HOST_SCRIPTS[1]).roundTable}”
            </p>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_VOTING')}
                className="py-3.5 px-8 bg-gradient-to-r from-burgundy-900 to-amber-600 hover:from-burgundy-800 hover:to-amber-500 text-white font-serif font-bold text-sm uppercase tracking-widest rounded-lg shadow-xl"
              >
                Call for Banishment (Vote for a PERSON)
              </button>
            </div>
          </div>
        )}

        {/* PHASE: VOTING (ROUNDS 1 TO 5) */}
        {(state.phase === 'VOTING' || state.phase === 'TIE_VOTING') && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Banishment Ballot
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Banishment — Vote for a PERSON
            </h2>
            <p className="text-xs text-zinc-400">
              Pick up your phones. Select your suspect and lock in your vote in secret wax.
            </p>

            <div className="py-6 px-10 bg-zinc-900/80 border border-amber-500/40 rounded-xl inline-block">
              <span className="text-xs text-zinc-400 uppercase font-mono block mb-1">
                Votes Sealed in Wax
              </span>
              <div className="text-4xl md:text-5xl font-mono font-bold text-amber-300">
                {playersList.filter(p => p.hasLockedVote).length} / {playersList.length}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => api.sendAction(state.roomCode, 'DEMO_SIMULATE_VOTES')}
                className="py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-200 text-xs font-mono font-bold rounded shadow"
              >
                ⚡ Auto-Lock Remaining Votes
              </button>
            </div>
          </div>
        )}

        {/* PHASE: VOTE REVEALS */}
        {(state.phase === 'VOTE_REVEALS' || state.phase === 'TIE_REVEALS') && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/90 border border-amber-900/60 p-6 md:p-10 rounded-xl shadow-2xl">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                {state.isTieRevote ? 'Tie Revote Slates' : 'The First Ballot'}
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
                The Slates of Betrayal
              </h2>
              <p className="text-xs text-zinc-300 font-sans">
                Each player raises their mobile slate to the table in strict seating order — or reveal all slates simultaneously below.
              </p>
            </div>

            {/* Current Active Turn Player */}
            <div className="p-6 bg-gradient-to-r from-burgundy-950/80 via-zinc-900 to-burgundy-950/80 border-2 border-amber-500 rounded-lg text-center shadow-[0_0_30px_rgba(212,163,69,0.2)]">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-mono block mb-1 animate-pulse">
                {state.currentRevealIndex < state.seatingOrder.length
                  ? `Now Presenting Slate #${state.currentRevealIndex + 1} of ${state.seatingOrder.length}`
                  : 'All Slates Ready for Verdict'}
              </span>
              <h3 className="text-3xl md:text-4xl font-serif font-black text-amber-300">
                {state.players
                  .find(p => p.id === state.seatingOrder[state.currentRevealIndex])
                  ?.name?.toUpperCase() || 'TALLYING VOTES'}
              </h3>
              <p className="text-xs text-zinc-300 italic mt-2 font-serif">
                Turn your phone toward the room and declare your accusation aloud!
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINISH_PHONE_SLATE')}
                  className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-amber-200 text-xs font-mono uppercase rounded border border-zinc-600"
                >
                  Reveal Next Slate ({Math.min(state.currentRevealIndex + 1, state.seatingOrder.length)}/{state.seatingOrder.length})
                </button>

                <button
                  onClick={() => api.sendAction(state.roomCode, 'REVEAL_ALL_SLATES')}
                  className="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded shadow-lg"
                >
                  ⚡ Reveal All Slates & Tally Verdict
                </button>
              </div>
            </div>

            {/* Public Reveal Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs uppercase tracking-widest text-zinc-400 font-mono border-b border-zinc-800 pb-2">
                Revealed Accusations:
              </h4>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {state.seatingOrder.map((playerId, idx) => {
                  const voter = state.players.find(p => p.id === playerId);
                  const isRevealed = voter?.hasRevealedSlate;
                  const isCurrent = idx === state.currentRevealIndex;

                  return (
                    <div
                      key={playerId}
                      className={`p-3 rounded border text-xs flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-burgundy-900/60 border-amber-400 text-amber-100 shadow'
                          : isRevealed
                          ? 'bg-zinc-900/80 border-zinc-700 text-zinc-200'
                          : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-500 font-bold">#{idx + 1}</span>
                        <strong className="font-serif text-sm">{voter?.name || 'Guest'}</strong>
                      </div>

                      <div>
                        {isRevealed ? (
                          <span className="font-serif font-bold text-amber-300 bg-black/60 px-2.5 py-1 border border-amber-900/40 rounded">
                            Voted for: {voter?.revealedVoteForName?.toUpperCase()}
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[11px] font-mono text-amber-400 animate-pulse">
                            Presenting Slate...
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-600">Slate Sealed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PHASE: TIE DEFENCE */}
        {state.phase === 'TIE_DEFENCE' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Castle Deadlock
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Tied Vote at the Round Table
            </h2>
            <p className="text-sm text-zinc-300 font-sans max-w-md mx-auto">
              An equal number of slates were cast. The tied suspects have 60 seconds to plead their innocence before a final revote.
            </p>

            <div className="py-4 px-8 bg-zinc-900 border border-amber-500/40 rounded-xl inline-block">
              <span className="text-xs text-zinc-400 uppercase font-mono block mb-1">
                Defence Timer
              </span>
              <div className="text-5xl font-mono font-bold text-amber-400">{timeFormatted}</div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'START_TIE_REVOTE')}
                className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg"
              >
                Commence Tied Revote
              </button>
            </div>
          </div>
        )}

        {/* PHASE: BANISHMENT OUTCOME (ROUNDS 1 TO 5) */}
        {state.phase === 'BANISHMENT_OUTCOME' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border-2 border-amber-500/60 p-8 md:p-12 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Verdict of Jasmine’s Castle
            </span>

            {state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName ? (
              <div className="space-y-5">
                <h2 className="text-4xl md:text-5xl font-serif font-black text-amber-200">
                  {state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName?.toUpperCase()}
                </h2>
                <p className="text-sm text-zinc-300 font-serif italic max-w-xl mx-auto leading-relaxed">
                  “The votes are in. The decision is final. One of you has just been banished by your own friends. Happy birthday, Libby. If you’ve received the most votes, please stand. Take a moment. Look around at the people who’ve done this to you. Some look terribly pleased with themselves. We’ll see how long that lasts. Before you leave, there is one thing we need to know. Are you a Faithful, or a Traitor?”
                </p>

                {!isBanishedRoleRevealed ? (
                  <div className="p-6 rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-burgundy-950/70 via-zinc-950 to-black text-center space-y-4 my-4 shadow-[0_0_30px_rgba(212,163,69,0.2)]">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-mono block animate-pulse">
                      The Circle of Truth Awaits
                    </span>
                    <p className="text-xs text-zinc-300 font-serif max-w-md mx-auto">
                      Wait for <strong className="text-amber-200">{state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName}</strong> to stand and declare their allegiance aloud, then click below to reveal the truth on screen:
                    </p>
                    <button
                      onClick={() => setIsBanishedRoleRevealed(true)}
                      className="py-4 px-8 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-black text-sm md:text-base uppercase tracking-widest rounded-lg shadow-[0_0_25px_rgba(212,163,69,0.45)] transition transform hover:scale-105 inline-flex items-center gap-2.5"
                    >
                      <Eye className="w-5 h-5" />
                      Click to Reveal Role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div
                      className={`p-6 rounded-lg border-2 text-center my-4 ${
                        state.roundHistory[state.roundHistory.length - 1]?.wasTraitorBanished
                          ? 'bg-rose-950/60 border-rose-600 text-rose-200 shadow-[0_0_30px_rgba(225,29,72,0.3)]'
                          : 'bg-emerald-950/50 border-emerald-600 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                      }`}
                    >
                      <span className="text-xs uppercase tracking-widest font-mono block mb-1">
                        True Role Revealed
                      </span>
                      <div className="text-3xl md:text-4xl font-serif font-black tracking-widest">
                        {state.roundHistory[state.roundHistory.length - 1]?.wasTraitorBanished
                          ? '🗡️ THE TRAITOR'
                          : '🛡️ 100% FAITHFUL'}
                      </div>
                    </div>

                    {state.currentRound === 1 && state.revealedPlantedObjectName && (
                      <div className="p-4 bg-black/60 border border-amber-900/60 rounded-lg text-xs font-serif text-amber-200">
                        The Traitor’s planted evidence was: <strong>"{state.revealedPlantedObjectName}"</strong>
                        <br />
                        {state.roundHistory[state.roundHistory.length - 1]?.exhibitAWon ? (
                          <span className="text-emerald-400 font-bold block mt-1">
                            ✓ It became Exhibit A! The Traitor succeeds in their mission.
                          </span>
                        ) : (
                          <span className="text-zinc-400 block mt-1">
                            ✗ It was not chosen as Exhibit A.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold text-amber-200">No Banishment Tonight</h2>
                <p className="text-sm text-zinc-300 font-sans max-w-md mx-auto">
                  A second tie has occurred. By castle law, no player is banished. The Traitor survives among you!
                </p>
              </div>
            )}

            {(isBanishedRoleRevealed || !state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName) && (
              <div className="pt-4 border-t border-zinc-800 animate-fadeIn">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'CONFIRM_ASSIGNMENT_RESULT', { success: state.roundHistory[state.roundHistory.length - 1]?.traitorAssignmentCompleted })}
                  className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg"
                >
                  View Round Summary & Standings
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHASE: ROUND SUMMARY & COMPACT SCOREBOARD (BETWEEN ROUNDS) */}
        {state.phase === 'ROUND_SUMMARY' && (
          <div className="max-w-5xl mx-auto space-y-6 bg-zinc-950/95 border-2 border-amber-500/50 p-6 md:p-8 rounded-xl shadow-2xl animate-fadeIn">
            <div className="text-center space-y-1">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                Round {state.currentRound} Completed
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-amber-200">
                Castle Standings & Scoreboard
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Each round: Up to 3 Mission pts + 2 Personal Objective pts + 1 Round Outcome pt (Max 6 pts).
              </p>
            </div>

            {/* Scoreboard showing all 7 players without scrolling */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-mono uppercase text-zinc-400 px-3 py-1 border-b border-zinc-800">
                <span className="col-span-1">Rank</span>
                <span className="col-span-4">Player</span>
                <span className="col-span-2 text-center">Mission</span>
                <span className="col-span-2 text-center">Objective</span>
                <span className="col-span-1 text-center">Outcome</span>
                <span className="col-span-2 text-right">Total Pts</span>
              </div>

              {[...state.players]
                .sort((a, b) => b.score - a.score)
                .map((player, rank) => {
                  const lastRoundBreakdown =
                    state.roundHistory[state.roundHistory.length - 1]?.scoreBreakdown?.[player.id];
                  const isLeader = rank === 0;

                  return (
                    <div
                      key={player.id}
                      className={`grid grid-cols-12 items-center p-3 rounded-lg border text-xs transition ${
                        isLeader
                          ? 'bg-amber-950/40 border-amber-500/60 text-amber-100 shadow'
                          : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="col-span-1 font-mono font-bold text-amber-400">#{rank + 1}</div>
                      <div className="col-span-4 flex items-center gap-1.5 font-serif font-bold text-sm text-amber-100 truncate">
                        {player.name}
                        {player.isRoomCreator && (
                          <span className="text-[10px] text-amber-400 font-mono shrink-0">(Host)</span>
                        )}
                        {isLeader && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>

                      <div className="col-span-2 text-center font-mono text-zinc-300">
                        {lastRoundBreakdown ? `${lastRoundBreakdown.missionPoints}/3` : '-'}
                      </div>
                      <div className="col-span-2 text-center font-mono text-zinc-300">
                        {lastRoundBreakdown ? `${lastRoundBreakdown.personalObjectivePoints}/2` : '-'}
                      </div>
                      <div className="col-span-1 text-center font-mono text-zinc-300">
                        {lastRoundBreakdown ? `${lastRoundBreakdown.roundOutcomePoints}/1` : '-'}
                      </div>
                      <div className="col-span-2 text-right font-mono font-black text-amber-300 text-sm">
                        {player.score} pts
                        {player.lastRoundScore !== undefined && (
                          <span className="text-[10px] text-emerald-400 font-normal ml-1">
                            (+{player.lastRoundScore})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Next Round Button */}
            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_NEXT_ROUND')}
                className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg flex items-center gap-2"
              >
                <span>{state.currentRound < 5 ? `Begin Round ${state.currentRound + 1}` : 'Begin Round 6: Getaway Auction & Finale'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* ROUND 6 & FINALE PHASES */}
        {/* ------------------------------------------------------------------- */}

        {/* FINALE: AUCTION RECAP */}
        {state.phase === 'FINALE_AUCTION_RECAP' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/95 border-2 border-amber-500/60 p-6 md:p-10 rounded-xl shadow-2xl text-center animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Getaway Auction Concluded
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-black text-amber-200">
              The Grand Finale Begins
            </h2>
            <p className="text-base font-serif italic text-amber-100 max-w-xl mx-auto leading-relaxed">
              “The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you’re finished.”
            </p>

            <div className="p-4 bg-black/60 border border-amber-900/60 rounded-xl max-w-lg mx-auto text-xs font-mono text-zinc-300 space-y-2">
              <div className="text-amber-400 font-bold uppercase">Rules of the Finale:</div>
              <p>• Three mandatory permanent banishments will reduce the castle from 7 to 4 players.</p>
              <p>• Roles remain strictly secret upon banishment.</p>
              <p>• Final Four survivors decide: END THE GAME or BANISH AGAIN.</p>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'FINALE_START_DISCUSSION')}
                className="py-3.5 px-8 bg-gradient-to-r from-burgundy-900 via-amber-600 to-burgundy-900 text-white font-serif font-bold text-sm uppercase tracking-widest rounded-lg shadow-xl"
              >
                Commence Finale Banishment Cycle 1
              </button>
            </div>
          </div>
        )}

        {/* FINALE: DISCUSSION */}
        {state.phase === 'FINALE_DISCUSSION' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/90 border border-amber-900/60 p-6 md:p-10 rounded-xl shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                Finale · Discussion Cycle {finale?.cycleNumber || 1}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {survivors.length} Survivors Remaining · {eliminatedPlayers.length}/3 Eliminations
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              The Search for the Traitor
            </h2>
            <p className="text-sm text-zinc-300 font-serif italic max-w-lg mx-auto">
              “Question the survivors. One Traitor walks among you with the prize in sight. Banish the wrong person, and they are gone forever.”
            </p>

            {/* Survivor badges */}
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto pt-2">
              {survivors.map(sP => (
                <span
                  key={sP.id}
                  className="px-3 py-1.5 bg-zinc-900 border border-amber-500/40 rounded-lg text-xs font-serif font-bold text-amber-100"
                >
                  {sP.name}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => api.sendAction(state.roomCode, 'FINALE_OPEN_VOTING')}
                className="py-3 px-8 bg-gradient-to-r from-burgundy-900 to-amber-600 text-white font-serif font-bold text-sm uppercase tracking-widest rounded-lg shadow-lg"
              >
                Open Finale Banishment Vote
              </button>
            </div>
          </div>
        )}

        {/* FINALE: VOTING */}
        {state.phase === 'FINALE_VOTING' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Permanent Elimination Ballot
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Banishment — Vote for a PERSON
            </h2>
            <p className="text-xs text-zinc-400">
              Only active survivors may vote. Lock in your choice in secret.
            </p>

            <div className="py-6 px-10 bg-zinc-900/80 border border-amber-500/40 rounded-xl inline-block">
              <span className="text-xs text-zinc-400 uppercase font-mono block mb-1">
                Survivor Slates Locked
              </span>
              <div className="text-4xl md:text-5xl font-mono font-bold text-amber-300">
                {survivors.filter(p => p.hasLockedVote).length} / {survivors.length}
              </div>
            </div>

            {state.isDemoRoom && (
              <div>
                <button
                  onClick={() => api.sendAction(state.roomCode, 'DEMO_SIMULATE_VOTES')}
                  className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-mono rounded"
                >
                  ⚡ Auto-Simulate Demo Votes
                </button>
              </div>
            )}
          </div>
        )}

        {/* FINALE: VOTE REVEALS */}
        {state.phase === 'FINALE_VOTE_REVEALS' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/90 border border-amber-900/60 p-6 md:p-10 rounded-xl shadow-2xl">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                Finale Banishment Reveals
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
                The Final Slates Turn
              </h2>
            </div>

            {/* Current Revealing Survivor */}
            <div className="p-6 bg-gradient-to-r from-burgundy-950/80 via-zinc-900 to-burgundy-950/80 border-2 border-amber-500 rounded-lg text-center shadow-lg">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-mono block mb-1 animate-pulse">
                {state.currentRevealIndex < survivors.length
                  ? `Revealing Slate #${state.currentRevealIndex + 1} of ${survivors.length}`
                  : 'All Slates Ready for Verdict'}
              </span>
              <h3 className="text-3xl md:text-4xl font-serif font-black text-amber-300">
                {survivors[state.currentRevealIndex]?.name?.toUpperCase() || 'TALLYING VOTES'}
              </h3>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINALE_FINISH_SLATE')}
                  className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-amber-200 text-xs font-mono uppercase rounded border border-zinc-600"
                >
                  Reveal Next Slate ({Math.min(state.currentRevealIndex + 1, survivors.length)}/{survivors.length})
                </button>

                <button
                  onClick={() => api.sendAction(state.roomCode, 'REVEAL_ALL_SLATES')}
                  className="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded shadow-lg"
                >
                  ⚡ Reveal All Slates & Tally Verdict
                </button>
              </div>
            </div>

            {/* Revealed votes */}
            <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
              {survivors.map(survivor => (
                <div
                  key={survivor.id}
                  className="p-3 rounded border bg-zinc-900/80 border-zinc-700 text-xs flex items-center justify-between"
                >
                  <strong className="font-serif text-sm">{survivor.name}</strong>
                  {survivor.hasRevealedSlate ? (
                    <span className="font-serif font-bold text-amber-300 bg-black/60 px-2 py-0.5 border border-amber-900/40 rounded">
                      Voted: {survivor.revealedVoteForName?.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-mono text-[11px]">Sealed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINALE: ELIMINATION OUTCOME (CLICK TO REVEAL ROLE) */}
        {state.phase === 'FINALE_ELIMINATION' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border-2 border-amber-500/60 p-8 md:p-12 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              Permanent Elimination · The Verdict of Jasmine’s Castle
            </span>

            <h2 className="text-4xl md:text-5xl font-serif font-black text-amber-200">
              {state.players.find(p => p.id === finale?.currentEliminatedPlayerId)?.name?.toUpperCase()}{' '}
              HAS BEEN BANISHED
            </h2>

            <p className="text-sm text-zinc-300 font-serif italic max-w-xl mx-auto leading-relaxed">
              “The votes are in. The decision is final. One of you has just been banished by your own friends. Happy birthday, Libby. If you’ve received the most votes, please stand. Take a moment. Look around at the people who’ve done this to you. Some look terribly pleased with themselves. We’ll see how long that lasts. Before you leave, there is one thing we need to know. Are you a Faithful, or a Traitor?”
            </p>

            {!isBanishedRoleRevealed ? (
              <div className="p-6 rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-burgundy-950/70 via-zinc-950 to-black text-center space-y-4 my-4 shadow-[0_0_30px_rgba(212,163,69,0.2)]">
                <span className="text-xs uppercase tracking-widest text-amber-400 font-mono block animate-pulse">
                  The Circle of Truth Awaits
                </span>
                <p className="text-xs text-zinc-300 font-serif max-w-md mx-auto">
                  Wait for <strong className="text-amber-200">{state.players.find(p => p.id === finale?.currentEliminatedPlayerId)?.name}</strong> to stand and declare their allegiance aloud, then click below to reveal the truth on screen:
                </p>
                <button
                  onClick={() => setIsBanishedRoleRevealed(true)}
                  className="py-4 px-8 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-black font-serif font-black text-sm md:text-base uppercase tracking-widest rounded-lg shadow-[0_0_25px_rgba(212,163,69,0.45)] transition transform hover:scale-105 inline-flex items-center gap-2.5"
                >
                  <Eye className="w-5 h-5" />
                  Click to Reveal Role
                </button>
              </div>
            ) : (
              <div
                className={`p-6 rounded-lg border-2 text-center my-4 animate-fadeIn ${
                  state.players.find(p => p.id === finale?.currentEliminatedPlayerId)?.revealedRole === 'TRAITOR'
                    ? 'bg-rose-950/60 border-rose-600 text-rose-200 shadow-[0_0_30px_rgba(225,29,72,0.3)]'
                    : 'bg-emerald-950/50 border-emerald-600 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                }`}
              >
                <span className="text-xs uppercase tracking-widest font-mono block mb-1">
                  True Role Revealed
                </span>
                <div className="text-3xl md:text-4xl font-serif font-black tracking-widest">
                  {state.players.find(p => p.id === finale?.currentEliminatedPlayerId)?.revealedRole === 'TRAITOR'
                    ? '🗡️ THE TRAITOR'
                    : '🛡️ 100% FAITHFUL'}
                </div>
              </div>
            )}

            {isBanishedRoleRevealed && (
              <div className="pt-4 border-t border-zinc-800 animate-fadeIn">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINALE_NEXT_CYCLE')}
                  className="py-3.5 px-8 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg"
                >
                  {survivors.length > 4 ? 'Next Finale Banishment Cycle' : 'Proceed to Final Four: End or Banish'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* FINALE: END OR BANISH (FINAL FOUR) */}
        {state.phase === 'FINALE_END_OR_BANISH' && (
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-zinc-950/95 border-2 border-amber-500/60 p-6 md:p-10 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Final Four Crucible
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-black text-amber-200">
              End the Game or Banish Again?
            </h2>
            <p className="text-sm font-serif italic text-zinc-300 max-w-lg mx-auto">
              Each of the four survivors must privately decide. The game ends ONLY if EVERY survivor votes to END. If any player votes to BANISH, another elimination takes place.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
              {survivors.map(survivor => {
                const choice = finale?.endOrBanishChoices[survivor.id];
                const isRevealed = finale?.endOrBanishRevealed;

                return (
                  <div
                    key={survivor.id}
                    className="p-3.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center space-y-1.5"
                  >
                    <div className="font-serif font-bold text-sm text-amber-200">{survivor.name}</div>
                    {isRevealed ? (
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded block ${
                          choice === 'END'
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : 'bg-rose-950 border border-rose-500 text-rose-300'
                        }`}
                      >
                        {choice}
                      </span>
                    ) : choice ? (
                      <span className="text-emerald-400 font-mono text-[11px] block">✓ Decided</span>
                    ) : (
                      <span className="text-zinc-500 font-mono text-[11px] block animate-pulse">Choosing...</span>
                    )}
                  </div>
                );
              })}
            </div>

            {finale?.endOrBanishRevealed && (
              <div className="pt-4 border-t border-zinc-800">
                {survivors.every(p => finale.endOrBanishChoices[p.id] === 'END') ? (
                  <button
                    onClick={() => api.sendAction(state.roomCode, 'FINALE_REVEAL_NEXT_SURVIVOR')}
                    className="py-3.5 px-8 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-serif font-black text-sm uppercase tracking-wider rounded-lg shadow-xl"
                  >
                    Unanimous Agreement: Commence Final Role Reveals!
                  </button>
                ) : (
                  <button
                    onClick={() => api.sendAction(state.roomCode, 'FINALE_START_DISCUSSION')}
                    className="py-3.5 px-8 bg-burgundy-900 text-amber-100 font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-xl"
                  >
                    A Survivor Demanded Banishment: Continue Hunt
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* FINALE: FINAL REVEAL (STEP-BY-STEP REVEAL) */}
        {state.phase === 'FINALE_FINAL_REVEAL' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/95 border-2 border-amber-500/70 p-6 md:p-10 rounded-xl shadow-2xl text-center animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Hour of Truth
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-black text-amber-200">
              Unmasking the Survivors
            </h2>
            <p className="text-xs text-zinc-400 font-sans">
              Revealing surviving allegiances one by one before the champion is crowned.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
              {survivors.map(survivor => {
                const isRevealed = finale?.revealedSurvivorIds.includes(survivor.id);
                return (
                  <div
                    key={survivor.id}
                    className={`p-4 rounded-xl border text-center space-y-2 transition-all ${
                      isRevealed
                        ? survivor.revealedRole === 'TRAITOR'
                          ? 'bg-rose-950/80 border-rose-500 text-rose-100 shadow-xl'
                          : 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-xl'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="font-serif font-bold text-base text-amber-200">{survivor.name}</div>
                    {isRevealed ? (
                      <span className="font-serif font-black text-xs uppercase tracking-wider block">
                        {survivor.revealedRole === 'TRAITOR' ? '🗡️ THE TRAITOR' : '🛡️ FAITHFUL'}
                      </span>
                    ) : (
                      <span className="text-xs font-mono">???</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              {!finale?.allSurvivorsRevealed ? (
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINALE_REVEAL_NEXT_SURVIVOR')}
                  className="py-3.5 px-8 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg"
                >
                  Reveal Next Survivor
                </button>
              ) : (
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINALE_REVEAL_ALL_OUTCOMES')}
                  className="py-4 px-10 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black font-serif font-black text-base uppercase tracking-widest rounded-lg shadow-2xl hover:scale-105 transition"
                >
                  Crown the Ruler & Announce Grand Results
                </button>
              )}
            </div>
          </div>
        )}

        {/* PHASE: FINAL RESULTS (WINNER CELEBRATION & JASMINE FORFEIT) */}
        {state.phase === 'FINAL_RESULTS' && (
          <div className="max-w-5xl mx-auto space-y-8 bg-zinc-950/95 border-2 border-amber-500/70 p-6 md:p-12 rounded-2xl shadow-2xl text-center animate-fadeIn">
            {/* Crown Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-black flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(212,163,69,0.5)]">
              <Crown className="w-12 h-12" />
            </div>

            {/* SECTION 8: WINNER CELEBRATION */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.3em] text-amber-400 font-mono">
                Ruler of Jasmine’s Castle
              </span>
              <h2 className="text-4xl md:text-6xl font-serif font-black text-amber-200 drop-shadow">
                {finale?.overallWinnerName?.toUpperCase() || 'CHAMPION'}
              </h2>
              <p className="text-sm font-serif italic text-amber-300/80 max-w-lg mx-auto">
                {finale?.isTraitorWinner
                  ? 'A surviving Traitor has stolen the victory outright! The castle falls to deceit.'
                  : 'The Faithful have prevailed! The surviving Faithful with the highest completed score takes the crown.'}
              </p>
            </div>

            {/* Coronation Prompt Card */}
            <div className="p-5 bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/50 rounded-xl max-w-xl mx-auto space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-serif font-bold text-sm uppercase">
                <Sparkles className="w-4 h-4" /> The Royal Coronation <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Present <strong>{finale?.overallWinnerName}</strong> with a paper crown or ridiculous household hat! All other players must bow as you take a royal victory photograph.
              </p>
            </div>

            {/* SECTION 7: COMPLETED 6-ROUND SCOREBOARD */}
            <div className="space-y-3 text-left pt-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h4 className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
                  Completed Six-Round Standings (All 36 Points):
                </h4>
                <span className="text-[11px] font-mono text-amber-400">
                  Highest Score: {[...state.players].sort((a, b) => b.score - a.score)[0]?.name} (
                  {[...state.players].sort((a, b) => b.score - a.score)[0]?.score} pts)
                </span>
              </div>

              <div className="grid gap-2">
                {[...state.players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => {
                    const isWinner =
                      p.id === finale?.overallWinnerId || finale?.jointWinnerNames?.includes(p.name);
                    const isLoser =
                      p.id === finale?.loserPlayerId || finale?.jointLoserNames?.includes(p.name);

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3.5 rounded-lg border text-sm ${
                          isWinner
                            ? 'bg-amber-950/60 border-amber-400 text-amber-100 font-bold shadow'
                            : isLoser
                            ? 'bg-rose-950/30 border-rose-800/60 text-zinc-300'
                            : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-amber-500 font-bold w-6">#{idx + 1}</span>
                          <span className="font-serif font-bold text-base">{p.name}</span>
                          {p.survivedFinale ? (
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono rounded">
                              Survivor
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-mono rounded">
                              Banished
                            </span>
                          )}
                          {isWinner && (
                            <span className="px-2.5 py-0.5 bg-amber-500 text-black text-[10px] font-mono font-bold rounded">
                              OVERALL WINNER
                            </span>
                          )}
                          {isLoser && (
                            <span className="px-2 py-0.5 bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[10px] font-mono rounded">
                              Forfeit Required
                            </span>
                          )}
                        </div>

                        <div className="font-mono font-bold text-amber-300 text-base">
                          {p.score} pts
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* SECTION 9: LOSER AND SINGLE FORFEIT */}
            <div className="mt-8 pt-8 border-t border-amber-900/60 text-center space-y-4">
              <span className="text-xs uppercase tracking-[0.25em] text-rose-400 font-mono block">
                The Solemn Forfeit
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-amber-200">
                Apology to Jasmine: {finale?.jointLoserNames?.join(' & ') || finale?.loserPlayerName}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                The player with the lowest completed score must read the apology aloud to Jasmine (or her photograph). The host voice does not read it for them.
              </p>

              <div className="p-6 md:p-8 bg-black/80 border-2 border-rose-800/80 rounded-xl max-w-2xl mx-auto text-left space-y-3 font-serif text-amber-100 text-sm md:text-base leading-relaxed whitespace-pre-line shadow-2xl">
                {JASMINE_FORFEIT_APOLOGY}
              </div>

              {!finale?.forfeitCompleted ? (
                <button
                  onClick={() => api.sendAction(state.roomCode, 'FINALE_FORFEIT_COMPLETE')}
                  className="py-3 px-8 bg-zinc-800 hover:bg-zinc-700 text-amber-200 font-serif font-bold text-xs uppercase tracking-wider rounded border border-zinc-700 shadow"
                >
                  Forfeit Complete
                </button>
              ) : (
                <div className="text-emerald-400 font-mono text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Forfeit has been solemnised. Long live Libby and Jasmine!
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Permanent Leaderboard on Side of Host Screen */}
        <div className="lg:col-span-4 xl:col-span-3 sticky top-4 space-y-4">
          <HostSidebarLeaderboard
            state={state}
            hideLatestRoundScore={state.phase === 'BANISHMENT_OUTCOME' && !isBanishedRoleRevealed}
          />
        </div>
      </div>
    )}
  </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-amber-900/40 p-3 bg-black/90 text-center text-xs text-zinc-500 font-mono">
        Libby’s Birthday: Trust Nobody · 7-Player Interactive Castle Experience
      </footer>
    </div>
  );
};
