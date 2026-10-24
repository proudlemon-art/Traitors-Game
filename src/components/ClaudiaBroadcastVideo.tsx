import React, { useState, useEffect } from 'react';
import { audioHost, AudioPlaybackState } from '../services/audioHost';
import { adminMediaService, SceneMediaConfig } from '../services/adminMediaService';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Flame,
  Mic,
  Edit3,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Tv,
} from 'lucide-react';

interface Props {
  caption: string;
  phase: string;
  currentRound?: number;
  isHostAudioUnlocked: boolean;
  onUnlockAudio: () => void;
  isAdminModeOn?: boolean;
  onOpenAdminStudio?: (sceneId?: string) => void;
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export const ClaudiaBroadcastVideo: React.FC<Props> = ({
  caption,
  phase,
  currentRound = 1,
  isAdminModeOn = false,
  onOpenAdminStudio,
}) => {
  const [playback, setPlayback] = useState<AudioPlaybackState>(audioHost.getPlaybackState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCaptionCollapsed, setIsCaptionCollapsed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeScene, setActiveScene] = useState<SceneMediaConfig | undefined>(
    adminMediaService.getActiveScene(phase, currentRound)
  );

  // Subscribe to audio playback state (playing, paused, time, duration)
  useEffect(() => {
    const unsub = audioHost.subscribePlaybackState(state => {
      setPlayback(state);
    });
    return unsub;
  }, []);

  // Subscribe to admin media changes
  useEffect(() => {
    const updateScene = () => {
      const scene = adminMediaService.getActiveScene(phase, currentRound);
      setActiveScene(scene);
    };
    updateScene();
    const unsub = adminMediaService.subscribe(updateScene);
    return unsub;
  }, [phase, currentRound]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const isSpeaking = playback.isPlaying;
  const isPaused = playback.isPaused;
  const effectiveVoiceClip = activeScene?.voiceClip || playback.activeClip || undefined;
  const hasCustomVoiceClip = !!effectiveVoiceClip?.audioUrl;

  // Determine active visual image
  const isFinalePhase =
    phase.startsWith('FINALE_') ||
    phase === 'FINAL_RESULTS' ||
    (currentRound === 6 && phase !== 'MISSION');

  const displayImage =
    activeScene?.customImageUrl ||
    (isFinalePhase
      ? '/castle-media/Seven_at_the_final_reveal_84c3c2c2.png'
      : activeScene?.defaultImageUrl) ||
    (phase === 'MISSION' && currentRound === 1
      ? '/castle-media/The_Candlelit_Castle_Mystery_891f6711.png'
      : phase === 'MISSION' && currentRound === 2
      ? '/castle-media/Birthday_Majority_in_the_Castle_925a5814.png'
      : (phase === 'MISSION' || phase === 'ROUND_3_PENS_DOWN') && currentRound === 3
      ? '/castle-media/The_Forgery_Gallery_efeeaa3f.png'
      : phase === 'MISSION' && currentRound === 4
      ? '/castle-media/Pirate_s_Tandem_Escape_Plan_b8d68311.png'
      : phase === 'MISSION' && currentRound === 5
      ? '/castle-media/Woman_Presenting_a_Brass_Teacup_Invention_8d0dc60f.png'
      : phase === 'MISSION' && currentRound === 6
      ? '/castle-media/Final_mission_The_getaway_auction.png'
      : '/castle-media/Screenshot_2026-10-20_at_11.50.13_adceafb3.png');

  const sceneTitle =
    activeScene?.title ||
    (phase === 'MISSION' && currentRound === 1
      ? 'Mission 1 · Exhibit A: The Candlelit Castle Crime Scene'
      : `Jasmine’s Castle · Round ${currentRound}`);

  const displayText =
    activeScene?.customText ||
    caption ||
    activeScene?.defaultText ||
    'Welcome to Jasmine’s Castle. Trust absolutely nobody.';

  const handleTogglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioHost.togglePlayPause(effectiveVoiceClip);
  };

  const handleRestartAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioHost.restart(effectiveVoiceClip);
  };

  return (
    <>
      <div
        className={`transition-all duration-500 ease-in-out relative rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-[0_0_60px_rgba(212,163,69,0.35)] bg-black w-full mx-auto ${
          isExpanded ? 'my-4 max-w-7xl xl:max-w-[1700px]' : 'my-2 max-w-6xl xl:max-w-[1550px]'
        }`}
      >
        {/* 1. BROADCAST VIDEO CANVAS / SCREEN - Sized for widescreen TV display with ZERO cropping */}
        <div
          className={`relative overflow-hidden w-full flex items-center justify-center transition-all duration-500 bg-zinc-950 ${
            isExpanded
              ? 'aspect-[16/9] max-h-[82vh] min-h-[460px] md:min-h-[620px] lg:min-h-[760px] xl:min-h-[840px]'
              : 'aspect-[16/9] max-h-[70vh] min-h-[360px] md:min-h-[500px] lg:min-h-[620px] xl:min-h-[700px]'
          }`}
        >
          {/* Ambient Blurred Backdrop */}
          <img
            src={displayImage}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-35 scale-110 pointer-events-none select-none transition-transform duration-1000"
          />

          {/* Subtle Cinematic Vignette Around Edges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50 pointer-events-none z-[1]" />

          {/* THE WHOLE IMAGE DISPLAYED IN FULL GLORY */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative z-[2] w-full h-full flex items-center justify-center p-2 sm:p-4 cursor-pointer group"
            title="Click to inspect full-screen on TV"
          >
            <img
              src={displayImage}
              alt={sceneTitle}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)] rounded-lg transition-transform duration-500 ease-out select-none ${
                isSpeaking ? 'scale-[1.01] brightness-105' : 'scale-100 group-hover:scale-[1.008]'
              }`}
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
              <div className="px-4 py-2 bg-black/80 border border-amber-500/70 rounded-full text-amber-300 font-mono text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md">
                <Search className="w-4 h-4 text-amber-400" />
                <span>Click to Inspect Entire Photo (TV Zoom)</span>
              </div>
            </div>
          </div>

          {/* Top TV Broadcast Badges & Controls */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/90 border border-red-600/60 text-white rounded-lg text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-lg backdrop-blur">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSpeaking
                      ? 'bg-red-500 animate-ping'
                      : isPaused
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                />
                <span>
                  {isSpeaking
                    ? 'VOICE PLAYING'
                    : isPaused
                    ? 'VOICE PAUSED'
                    : 'CASTLE TV BROADCAST'}
                </span>
              </div>

              {/* Direct On-Screen Audio Transport Controls (Play/Pause & Restart) */}
              {hasCustomVoiceClip && (
                <div className="flex items-center gap-1.5 bg-black/85 border border-amber-500/70 rounded-lg px-2 py-1 shadow-lg backdrop-blur">
                  <button
                    onClick={handleTogglePlayPause}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      isSpeaking
                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                    title={isSpeaking ? 'Pause Audio' : isPaused ? 'Resume Audio' : 'Play Audio'}
                  >
                    {isSpeaking ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{isPaused ? 'Resume' : 'Play'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRestartAudio}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-200 border border-amber-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition active:scale-95"
                    title="Restart Audio from Beginning"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restart</span>
                  </button>

                  {(playback.duration > 0 || playback.currentTime > 0) && (
                    <span className="text-[11px] font-mono text-amber-300/90 px-1.5">
                      {formatSeconds(playback.currentTime)}
                      {playback.duration > 0 ? ` / ${formatSeconds(playback.duration)}` : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Admin badge */}
              {isAdminModeOn && activeScene?.customImageUrl && (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-amber-950/90 border border-amber-600/60 text-amber-300 rounded-lg text-[10px] sm:text-xs font-mono shadow backdrop-blur">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Custom Image</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen TV Inspect Clues Button */}
              <button
                onClick={() => setIsLightboxOpen(true)}
                className="px-2.5 py-1.5 bg-black/80 hover:bg-black text-amber-300 border border-amber-500/60 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg backdrop-blur active:scale-95"
                title="Open entire photo in full TV screen mode"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Inspect Clues</span>
              </button>

              {/* Quick Admin Edit Button ONLY shown when Admin Mode is ON */}
              {isAdminModeOn && onOpenAdminStudio && (
                <button
                  onClick={() => onOpenAdminStudio(activeScene?.id)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black border border-amber-600 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                  title="Edit this scene's voice clip, text, or image"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Media</span>
                </button>
              )}

              {/* Caption Minimize/Maximize Toggle */}
              <button
                onClick={() => setIsCaptionCollapsed(!isCaptionCollapsed)}
                className="px-2.5 py-1.5 bg-black/80 hover:bg-black text-amber-300 border border-amber-900/60 rounded-lg text-xs font-mono flex items-center gap-1 transition-all shadow backdrop-blur"
                title={isCaptionCollapsed ? 'Show Captions' : 'Hide Captions for Unobstructed Image'}
              >
                {isCaptionCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCaptionCollapsed ? 'Show Text' : 'Hide Text'}</span>
              </button>

              {/* Large TV Expanded Theater Mode Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 sm:px-3 sm:py-1.5 bg-black/80 hover:bg-black text-amber-300 border border-amber-900/60 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shadow backdrop-blur"
                title={isExpanded ? 'Standard View' : 'Expand to Large TV Theater View'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden md:inline">{isExpanded ? 'Standard' : 'TV Theater'}</span>
              </button>
            </div>
          </div>

          {/* Center Pulsing Audio Visualizer when audio is playing */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-auto bg-black/85 backdrop-blur-md px-5 py-2.5 rounded-full border-2 border-amber-500/80 shadow-[0_0_30px_rgba(212,163,69,0.5)]">
              <div className="w-1.5 h-4 bg-amber-400 animate-bounce rounded-full" />
              <div className="w-1.5 h-7 bg-amber-300 animate-pulse rounded-full" />
              <div className="w-1.5 h-5 bg-amber-400 animate-bounce rounded-full" />
              <div className="w-1.5 h-8 bg-amber-200 animate-pulse rounded-full" />
              <div className="w-1.5 h-4 bg-amber-400 animate-bounce rounded-full" />
              <span className="ml-1.5 font-mono text-xs uppercase tracking-wider text-amber-300 font-bold">
                Claudia Speaking
              </span>
              <button
                onClick={handleTogglePlayPause}
                className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-full flex items-center gap-1 transition"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
              <button
                onClick={handleRestartAudio}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-200 border border-amber-500/50 font-mono text-xs font-bold rounded-full flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" /> Restart
              </button>
            </div>
          )}
        </div>

        {/* 2. SUBTITLE / SPEECH CAPTION BAR - Positioned UNDERNEATH the video frame */}
        {!isCaptionCollapsed && (
          <div className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-t border-amber-900/60 p-3 sm:p-4 md:px-6 transition-all duration-300">
            <div className="max-w-5xl mx-auto flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono uppercase tracking-widest text-amber-400 border-b border-zinc-800/80 pb-1.5">
                <span className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {sceneTitle}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {hasCustomVoiceClip && (
                    <>
                      <button
                        onClick={handleTogglePlayPause}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 rounded flex items-center gap-1 text-xs text-amber-200 font-bold transition"
                      >
                        {isSpeaking ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause Voice
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-amber-400" />{' '}
                            {isPaused ? 'Resume Voice' : 'Play Voice'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleRestartAudio}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded flex items-center gap-1 text-xs text-zinc-200 hover:text-amber-300 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Restart Voice
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-zinc-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                  >
                    <Search className="w-3 h-3" /> Full TV View
                  </button>
                </div>
              </div>

              <div className="font-serif italic text-sm sm:text-base md:text-lg text-amber-100 font-medium drop-shadow leading-relaxed whitespace-pre-line max-h-28 overflow-y-auto pr-2 custom-scrollbar">
                “{displayText}”
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. FULLSCREEN TV CLUE INSPECTOR LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 md:p-8 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between max-w-7xl w-full mx-auto pb-4 border-b border-amber-900/60"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-burgundy-900/90 border border-amber-500/60 flex items-center justify-center">
                <Tv className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-serif font-black text-amber-200 text-lg md:text-xl tracking-wider">
                  {sceneTitle}
                </h3>
                <span className="text-[11px] font-mono text-amber-400/80 uppercase tracking-widest block">
                  Widescreen TV View · Unobstructed Full Photographic Inspection
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Close Fullscreen (ESC)</span>
            </button>
          </div>

          {/* Central Stage: Pure Uncropped Photo */}
          <div
            className="flex-1 w-full max-w-7xl mx-auto flex items-center justify-center p-2 md:p-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={displayImage}
              alt={sceneTitle}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-[0_0_80px_rgba(212,163,69,0.3)] border border-amber-500/40"
            />
          </div>

          {/* Bottom Bar: Clue Description */}
          <div
            className="max-w-4xl w-full mx-auto text-center pt-3 border-t border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs md:text-sm text-zinc-300 font-serif italic">
              {displayText}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
