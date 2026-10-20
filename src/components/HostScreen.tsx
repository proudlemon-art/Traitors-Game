import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { ClientGameState } from '../types/game';
import { api } from '../services/api';
import { audioHost } from '../services/audioHost';
import { HOST_SCRIPTS, ROUND_TABLE_PROMPTS } from '../data/dialogue';
import { HeistMission } from './Missions/HeistMission';
import { BirthdayMajorityMission } from './Missions/BirthdayMajorityMission';
import { ForgeryGalleryMission } from './Missions/ForgeryGalleryMission';
import { BodyDisposalMission } from './Missions/BodyDisposalMission';
import { CounterfeitExpertMission } from './Missions/CounterfeitExpertMission';
import { GetawayAuctionMission } from './Missions/GetawayAuctionMission';
import { ClaudiaBroadcastVideo } from './ClaudiaBroadcastVideo';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  RotateCcw,
  Settings,
  HelpCircle,
  Users,
  Clock,
  Coins,
  Shield,
  Skull,
  Trophy,
  ChevronRight,
  Flame,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Film,
} from 'lucide-react';

interface Props {
  state: ClientGameState;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenAdminStudio?: (sceneId?: string) => void;
}

export const HostScreen: React.FC<Props> = ({ state, onOpenSettings, onOpenGuide, onOpenAdminStudio }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>(state.latestDialogue || '');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(audioHost.isAudioUnlocked());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [promptIndex, setPromptIndex] = useState(0);

  // Generate QR code for mobile joining
  useEffect(() => {
    if (typeof window !== 'undefined' && state.roomCode) {
      const joinUrl = `${window.location.origin}?room=${state.roomCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#d4a345', light: '#09090b' },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.warn('QR code error', err));
    }
  }, [state.roomCode]);

  // Subscribe to host speech captions
  useEffect(() => {
    const unsub = audioHost.subscribeCaptions(text => {
      setCaption(text);
    });
    return unsub;
  }, []);

  // Update caption & trigger speech on dialogue change
  useEffect(() => {
    if (state.latestDialogue) {
      setCaption(state.latestDialogue);
      if (audioUnlocked) {
        audioHost.speak(state.latestDialogue, state.phase, state.currentRound);
      }
    }
  }, [state.latestDialogue, state.phase, state.currentRound, audioUnlocked]);

  // Trigger celebration confetti on final results
  useEffect(() => {
    if (state.phase === 'FINAL_RESULTS') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#d4a345', '#73133f', '#ffd700', '#ffffff'],
      });
    }
  }, [state.phase]);

  // Rotate round-table suspicion prompts
  useEffect(() => {
    if (state.phase === 'ROUND_TABLE') {
      const interval = setInterval(() => {
        setPromptIndex(prev => (prev + 1) % ROUND_TABLE_PROMPTS.length);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [state.phase]);

  const handleUnlockAudio = () => {
    audioHost.unlockAudio();
    setAudioUnlocked(true);
    if (state.latestDialogue) {
      audioHost.speak(state.latestDialogue, state.phase, state.currentRound);
    }
  };

  const handleTimerToggle = async () => {
    await api.sendAction(state.roomCode, 'TIMER_PLAY_PAUSE');
  };

  const handleTimerAdjust = async (seconds: number) => {
    await api.sendAction(state.roomCode, 'TIMER_ADJUST', { seconds });
  };

  const handleMoveSeat = async (index: number, direction: 'UP' | 'DOWN') => {
    const newOrder = [...state.seatingOrder];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    await api.sendAction(state.roomCode, 'UPDATE_SEATING_ORDER', { seatingOrder: newOrder });
  };

  // Timer formatting
  const minutes = Math.floor(state.phaseTimeRemaining / 60);
  const seconds = state.phaseTimeRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

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

          {/* Round & Communal Gold Status */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-zinc-900/80 border border-amber-900/40 px-3 py-1.5 rounded flex items-center gap-2">
              <span className="text-zinc-400 uppercase">Round</span>
              <span className="text-amber-300 font-bold text-sm">{state.currentRound} of 4</span>
            </div>

            <div className="bg-zinc-900/80 border border-amber-900/40 px-3 py-1.5 rounded flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-400 uppercase">Vault:</span>
              <span className="text-amber-300 font-bold text-sm">{state.totalGoldPot} Gold</span>
            </div>

            {/* Audio Unlock Button if not ready */}
            {!audioUnlocked ? (
              <button
                onClick={handleUnlockAudio}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-black font-serif font-bold text-xs uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(212,163,69,0.5)] flex items-center gap-1.5 animate-pulse"
              >
                <Volume2 className="w-4 h-4" /> Enable Host Audio
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => audioHost.replay()}
                  className="p-1.5 text-zinc-400 hover:text-amber-200 bg-zinc-900 rounded border border-zinc-800"
                  title="Replay Host Announcement"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => audioHost.stop()}
                  className="p-1.5 text-zinc-400 hover:text-amber-200 bg-zinc-900 rounded border border-zinc-800"
                  title="Stop Host Speech"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            )}

            {onOpenAdminStudio && (
              <button
                onClick={() => {
                  const next = !isAdminMode;
                  setIsAdminMode(next);
                  if (next) {
                    onOpenAdminStudio();
                  }
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center space-y-6">
        {/* Cinematic Claudia Television Broadcast Video Frame */}
        <ClaudiaBroadcastVideo
          caption={caption}
          phase={state.phase}
          currentRound={state.currentRound}
          isHostAudioUnlocked={audioUnlocked}
          onUnlockAudio={handleUnlockAudio}
          isAdminModeOn={isAdminMode}
          onOpenAdminStudio={onOpenAdminStudio}
        />

        {/* PHASE: LOBBY */}
        {state.phase === 'LOBBY' && (
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto bg-zinc-950/90 border border-amber-900/50 p-6 md:p-10 rounded-xl shadow-2xl">
            {/* Left: QR Code & Join Info */}
            <div className="space-y-4 text-center md:text-left">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                The Gathering of Seven
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
                Join Jasmine’s Castle
              </h2>
              <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                Scan the QR code on your mobile phone or visit this link to enter the castle. Exactly 7 seats await at the Round Table.
              </p>

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
                  Seating Order ({state.players.length} / 7)
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Order determines reveals
                </span>
              </div>

              <div className="space-y-2">
                {state.seatingOrder.map((playerId, idx) => {
                  const p = state.players.find(pl => pl.id === playerId);
                  return (
                    <div
                      key={playerId}
                      className="flex items-center justify-between p-2.5 bg-zinc-900/80 border border-zinc-800 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-500 font-bold w-5">
                          #{idx + 1}
                        </span>
                        <span className="font-serif font-semibold text-amber-100">
                          {p?.name || 'Guest'}
                        </span>
                        {p?.isRoomCreator && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            (Host / Birthday)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveSeat(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-1 hover:text-amber-300 disabled:opacity-20"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSeat(idx, 'DOWN')}
                          disabled={idx === state.seatingOrder.length - 1}
                          className="p-1 hover:text-amber-300 disabled:opacity-20"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Empty seat placeholders */}
                {Array.from({ length: Math.max(0, 7 - state.players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-2.5 border border-dashed border-zinc-800/80 rounded text-xs text-zinc-600 font-mono flex items-center justify-between"
                  >
                    <span>Seat #{state.players.length + i + 1}: Waiting for phone...</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button
                  onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROLE_BRIEFING')}
                  disabled={state.players.length < 2}
                  className="w-full py-3.5 px-6 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm tracking-widest uppercase transition-all shadow-lg active:scale-98 disabled:opacity-40"
                >
                  Begin Round 1: Assign Secret Roles
                </button>
                <p className="text-center text-[11px] text-zinc-500">
                  {state.players.length < 7
                    ? 'Tip: You can start with fewer players or use Demo Mode to test full 7.'
                    : 'All seven seats are filled. The castle is locked.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: ROLE BRIEFING */}
        {state.phase === 'ROLE_BRIEFING' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-burgundy-950 border border-amber-600/60 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(115,19,63,0.6)]">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>

            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono block">
              Round {state.currentRound} · Standalone Secret Allocation
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Check Your Mobile Screens
            </h2>
            <p className="text-sm text-zinc-300 font-sans leading-relaxed max-w-lg mx-auto">
              The lots have been drawn in total darkness. Exactly <strong>One Traitor</strong> and <strong>Six Faithful</strong> have been appointed.
            </p>
            <p className="text-xs text-amber-300/80 italic font-serif">
              Shield your phone with your hand. Memorise your briefing. The public host screen knows nothing.
            </p>

            {/* Guidance Timer & Advance */}
            <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-center gap-4">
              <span className="font-mono text-xl text-amber-400 font-bold">
                {timeFormatted}
              </span>
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_MISSION')}
                className="py-2.5 px-6 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/50 text-amber-100 font-serif font-bold text-xs uppercase tracking-wider rounded transition-all shadow"
              >
                Proceed to Mission
              </button>
            </div>
          </div>
        )}

        {/* PHASE: MISSION */}
        {state.phase === 'MISSION' && (
          <div className="space-y-4">
            {state.currentRound === 1 && <HeistMission state={state} isHostDisplay={true} />}
            {state.currentRound === 2 && <BirthdayMajorityMission state={state} isHostDisplay={true} />}
            {state.currentRound === 3 && <ForgeryGalleryMission state={state} isHostDisplay={true} />}
            {state.currentRound === 4 && <BodyDisposalMission state={state} isHostDisplay={true} />}
            {state.currentRound === 5 && <CounterfeitExpertMission state={state} isHostDisplay={true} />}
            {state.currentRound === 6 && <GetawayAuctionMission state={state} isHostDisplay={true} />}

            {/* Mission Advance Banner */}
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between p-4 bg-zinc-950/80 border border-zinc-800 rounded-lg gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Mission Clock: <strong>{timeFormatted}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTimerToggle}
                  className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded font-mono"
                >
                  {state.isTimerPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => handleTimerAdjust(60)}
                  className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded font-mono"
                >
                  +1 min
                </button>
                <button
                  onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_ROUND_TABLE')}
                  className="py-2 px-6 bg-burgundy-900 hover:bg-burgundy-800 text-amber-100 font-serif font-bold text-xs uppercase tracking-wider border border-amber-500/50 rounded shadow"
                >
                  Convene Round Table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: ROUND TABLE */}
        {state.phase === 'ROUND_TABLE' && (
          <div className="max-w-3xl mx-auto text-center space-y-8 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Inquest Begins · Round {state.currentRound}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-black text-amber-200">
              The Round Table
            </h2>

            {/* Huge Discussion Timer */}
            <div className="inline-block py-4 px-8 bg-zinc-900/80 border border-amber-500/40 rounded-xl">
              <span className="text-xs text-zinc-400 font-mono uppercase block mb-1">
                Discussion Time Remaining
              </span>
              <div className="text-5xl md:text-7xl font-mono font-bold text-amber-400 tracking-wider">
                {timeFormatted}
              </div>
            </div>

            {/* Claudia's Suspicion Prompts */}
            <div className="p-5 bg-burgundy-950/40 border-l-4 border-amber-500 text-left rounded-r">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
                Claudia’s Whispers:
              </span>
              <p className="text-base md:text-lg font-serif italic text-amber-100/90 leading-relaxed">
                “{ROUND_TABLE_PROMPTS[promptIndex]}”
              </p>
            </div>

            {/* Advance to Voting */}
            <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleTimerToggle}
                className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded font-mono"
              >
                {state.isTimerPaused ? 'Resume Clock' : 'Pause Clock'}
              </button>
              <button
                onClick={() => handleTimerAdjust(60)}
                className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded font-mono"
              >
                +1 Minute Debate
              </button>
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_TO_VOTING')}
                className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg active:scale-95"
              >
                Open Private Voting
              </button>
            </div>
          </div>
        )}

        {/* PHASE: VOTING */}
        {state.phase === 'VOTING' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border border-amber-900/60 p-8 md:p-12 rounded-xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-burgundy-950 border border-amber-600/60 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(115,19,63,0.6)]">
              <Skull className="w-8 h-8 text-amber-400" />
            </div>

            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Slates of Betrayal · Confidential Voting
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
              Voting in Progress
            </h2>
            <p className="text-sm text-zinc-300 font-sans max-w-md mx-auto">
              Players are selecting their suspect in secret on their mobile devices. No names or vote tallies are revealed until all slates are locked.
            </p>

            {/* Sealed Votes Count (NO individual votes shown) */}
            <div className="py-6 px-8 bg-zinc-900/80 border border-amber-500/40 rounded-xl inline-block">
              <span className="text-xs text-zinc-400 uppercase font-mono block mb-1">
                Votes Sealed in Wax
              </span>
              <div className="text-4xl md:text-5xl font-mono font-bold text-amber-300">
                {state.players.filter(p => p.hasLockedVote).length} / {state.players.length}
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-mono italic">
              Once the 7th vote is locked, the host will invite each player to reveal their slate in seating order.
            </p>
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
                Each player raises their mobile slate to the table in strict seating order.
              </p>
            </div>

            {/* Current Active Turn Player */}
            {state.currentRevealIndex < state.seatingOrder.length && (
              <div className="p-6 bg-gradient-to-r from-burgundy-950/80 via-zinc-900 to-burgundy-950/80 border-2 border-amber-500 rounded-lg text-center shadow-[0_0_30px_rgba(212,163,69,0.2)]">
                <span className="text-xs uppercase tracking-widest text-amber-400 font-mono block mb-1 animate-pulse">
                  Now Presenting Slate #{state.currentRevealIndex + 1}
                </span>
                <h3 className="text-3xl md:text-4xl font-serif font-black text-amber-300">
                  {state.players.find(p => p.id === state.seatingOrder[state.currentRevealIndex])?.name?.toUpperCase()}
                </h3>
                <p className="text-xs text-zinc-300 italic mt-2 font-serif">
                  Turn your phone toward the room. Declare your accusation aloud!
                </p>

                {/* Host button to finish if player's phone is slow */}
                <div className="mt-4">
                  <button
                    onClick={() => api.sendAction(state.roomCode, 'FINISH_PHONE_SLATE')}
                    className="py-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono uppercase rounded border border-zinc-700"
                  >
                    Advance Slate Turn (Host Override)
                  </button>
                </div>
              </div>
            )}

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
                        <span className="font-mono text-amber-500 font-bold">
                          #{idx + 1}
                        </span>
                        <strong className="font-serif text-sm">
                          {voter?.name || 'Guest'}
                        </strong>
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
                          <span className="text-[11px] font-mono text-zinc-600">
                            Slate Sealed
                          </span>
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
              <div className="text-5xl font-mono font-bold text-amber-400">
                {timeFormatted}
              </div>
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

        {/* PHASE: BANISHMENT OUTCOME */}
        {state.phase === 'BANISHMENT_OUTCOME' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-zinc-950/90 border-2 border-amber-500/60 p-8 md:p-12 rounded-xl shadow-2xl animate-fadeIn">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
              The Verdict of Jasmine’s Castle
            </span>

            {state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName ? (
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif font-black text-amber-200">
                  {state.roundHistory[state.roundHistory.length - 1]?.banishedPlayerName?.toUpperCase()}
                </h2>
                <p className="text-sm text-zinc-300 font-serif italic">
                  Step into the circle of fire...
                </p>

                <div
                  className={`p-6 rounded-lg border-2 text-center my-4 ${
                    state.roundHistory[state.roundHistory.length - 1]?.wasTraitorBanished
                      ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                      : 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
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
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold text-amber-200">
                  No Banishment Tonight
                </h2>
                <p className="text-sm text-zinc-300 font-sans max-w-md mx-auto">
                  A second tie has occurred. By castle law, no player is banished. The Traitor survives among you!
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => {
                  // Move to assignment verification
                  api.sendAction(state.roomCode, 'ADVANCE_NEXT_ROUND', null);
                }}
                className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg"
              >
                Inspect Traitor’s Secret Mission
              </button>
            </div>
          </div>
        )}

        {/* PHASE: ROUND SUMMARY & LEADERBOARD */}
        {state.phase === 'ROUND_SUMMARY' && (
          <div className="max-w-4xl mx-auto space-y-6 bg-zinc-950/90 border border-amber-900/60 p-6 md:p-10 rounded-xl shadow-2xl">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                Round {state.currentRound} Summary
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-amber-200">
                The Castle Standings
              </h2>
            </div>

            {/* Traitor Assignment Result Display */}
            {state.revealedTraitorName && state.revealedTraitorObjective && (
              <div className="p-4 bg-burgundy-950/60 border border-amber-900/50 rounded-lg text-xs space-y-2">
                <div className="flex justify-between items-center text-amber-400 font-mono">
                  <span>Traitor: <strong>{state.revealedTraitorName}</strong></span>
                  <span>Secret Mission Assignment</span>
                </div>
                <p className="font-serif font-bold text-sm text-amber-200">
                  {state.revealedTraitorObjective.title}
                </p>
                <p className="text-zinc-300 font-sans">
                  {state.revealedTraitorObjective.description}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                  <span className="text-zinc-400">
                    Group Confirmation: Did the Traitor succeed?
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => api.sendAction(state.roomCode, 'CONFIRM_ASSIGNMENT_RESULT', { success: true })}
                      className="py-1 px-3 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 rounded font-mono text-[11px]"
                    >
                      Yes (+1 Pt)
                    </button>
                    <button
                      onClick={() => api.sendAction(state.roomCode, 'CONFIRM_ASSIGNMENT_RESULT', { success: false })}
                      className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded font-mono text-[11px]"
                    >
                      No / Disputed (0 Pts)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-zinc-400 font-mono border-b border-zinc-800 pb-2">
                Cumulative Leaderboard:
              </h4>

              <div className="grid gap-2">
                {[...state.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, rank) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-zinc-900/70 border border-zinc-800 rounded text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-500 font-bold w-6">
                          #{rank + 1}
                        </span>
                        <span className="font-serif font-bold text-amber-100">
                          {player.name}
                        </span>
                        {player.isRoomCreator && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            (Birthday Star)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-amber-300 text-base">
                          {player.score} pts
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Next Round Button */}
            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => api.sendAction(state.roomCode, 'ADVANCE_NEXT_ROUND')}
                className="py-3 px-8 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-500/60 text-amber-100 font-serif font-bold text-sm uppercase tracking-widest rounded shadow-lg flex items-center gap-2"
              >
                <span>{state.currentRound < 6 ? `Begin Round ${state.currentRound + 1}` : 'View Final Awards'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE: FINAL RESULTS */}
        {state.phase === 'FINAL_RESULTS' && (
          <div className="max-w-4xl mx-auto space-y-8 bg-zinc-950/95 border-2 border-amber-500/70 p-8 md:p-12 rounded-xl shadow-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-burgundy-950 border-2 border-amber-500 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(212,163,69,0.5)] animate-bounce">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">
                Libby’s Birthday: Trust Nobody · Finale
              </span>
              <h2 className="text-4xl md:text-6xl font-serif font-black text-amber-300 drop-shadow">
                THE GRAND CHAMPION
              </h2>
              {/* Top Winner */}
              <div className="text-3xl md:text-5xl font-serif font-bold text-amber-100 mt-2">
                {[...state.players].sort((a, b) => b.score - a.score)[0]?.name?.toUpperCase()}
              </div>
            </div>

            {/* Factual Awards Grid */}
            <div className="grid sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="p-4 bg-burgundy-950/40 border border-amber-900/50 rounded-lg">
                <span className="text-amber-400 text-xs font-mono uppercase block mb-1 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Grand Detective
                </span>
                <p className="text-xs text-zinc-400 font-sans">
                  Most accurate Faithful votes cast across 6 rounds.
                </p>
              </div>

              <div className="p-4 bg-burgundy-950/40 border border-amber-900/50 rounded-lg">
                <span className="text-amber-400 text-xs font-mono uppercase block mb-1 flex items-center gap-1.5">
                  <Skull className="w-4 h-4" /> Master of Deception
                </span>
                <p className="text-xs text-zinc-400 font-sans">
                  Most successful Traitor missions completed.
                </p>
              </div>

              <div className="p-4 bg-burgundy-950/40 border border-amber-900/50 rounded-lg">
                <span className="text-amber-400 text-xs font-mono uppercase block mb-1 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Castle Prize Pot
                </span>
                <p className="text-base font-bold font-mono text-amber-200">
                  {state.totalGoldPot} Gold Collected!
                </p>
              </div>
            </div>

            {/* Final toast */}
            <div className="pt-6 border-t border-zinc-800 text-sm font-serif italic text-amber-200/90">
              “Happy Birthday Libby! The castle has witnessed unforgettable betrayal, laughter, and triumph.”
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
