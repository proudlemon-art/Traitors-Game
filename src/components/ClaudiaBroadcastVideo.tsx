import React, { useState, useEffect } from 'react';
import { audioHost } from '../services/audioHost';
import { adminMediaService, SceneMediaConfig } from '../services/adminMediaService';
import {
  Volume2,
  VolumeX,
  Play,
  Maximize2,
  Minimize2,
  Tv,
  Flame,
  Radio,
  Sparkles,
  Mic,
  Edit3,
  ImageIcon,
  ChevronDown,
  ChevronUp,
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

export const ClaudiaBroadcastVideo: React.FC<Props> = ({
  caption,
  phase,
  currentRound = 1,
  isHostAudioUnlocked,
  onUnlockAudio,
  isAdminModeOn = false,
  onOpenAdminStudio,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCaptionCollapsed, setIsCaptionCollapsed] = useState(false);
  const [activeMoodIndex, setActiveMoodIndex] = useState(0);
  const [activeScene, setActiveScene] = useState<SceneMediaConfig | undefined>(
    adminMediaService.getActiveScene(phase, currentRound)
  );

  const CLAUDIA_MOODS = [
    'Jasmine’s Castle: Murder, Merlot & Manipulation',
    'Fringe: Threat Level Maximum',
    'Friendship: Let’s not get attached',
    'Swear on my life? Overvalued it.',
    'Suspicion: Look at Libby’s face',
  ];

  // Subscribe to audio playback state
  useEffect(() => {
    const unsub = audioHost.subscribeSpeaking(speaking => {
      setIsSpeaking(speaking);
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

  // Mood rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMoodIndex(prev => (prev + 1) % CLAUDIA_MOODS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Determine active visual image:
  const displayImage =
    activeScene?.customImageUrl ||
    activeScene?.defaultImageUrl ||
    '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png';
  const sceneTitle = activeScene?.title || `Jasmine’s Castle · Round ${currentRound}`;
  const displayText =
    activeScene?.customText ||
    caption ||
    activeScene?.defaultText ||
    'Welcome to Jasmine’s Castle. Trust absolutely nobody.';
  const hasCustomVoiceClip = !!activeScene?.voiceClip?.audioUrl;

  return (
    <div
      className={`transition-all duration-500 ease-in-out relative rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-[0_0_60px_rgba(212,163,69,0.35)] bg-black w-full mx-auto ${
        isExpanded ? 'my-4 max-w-7xl' : 'my-2 max-w-6xl'
      }`}
    >
      {/* 1. BROADCAST VIDEO CANVAS / SCREEN - Sized for large TV display */}
      <div
        className={`relative overflow-hidden w-full flex items-center justify-center transition-all duration-500 ${
          isExpanded
            ? 'h-[500px] sm:h-[600px] md:h-[680px] lg:h-[780px] xl:h-[840px]'
            : 'h-[360px] sm:h-[440px] md:h-[540px] lg:h-[620px] xl:h-[680px]'
        }`}
      >
        {/* Ambient Blurred Backdrop: Fills entire widescreen frame with matching tones so there are no raw black void bars */}
        <img
          src={displayImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110 pointer-events-none select-none transition-transform duration-1000"
        />

        {/* Cinematic Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-[1]" />

        {/* THE WHOLE IMAGE DISPLAYED IN FULL GLORY (object-contain ensures 100% visible, never cropped) */}
        <div className="relative z-[2] w-full h-full flex items-center justify-center p-2 sm:p-4">
          <img
            src={displayImage}
            alt={sceneTitle}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)] rounded-lg transition-transform duration-700 ease-out ${
              isSpeaking ? 'scale-[1.02] brightness-105' : 'scale-100 brightness-100'
            }`}
          />
        </div>

        {/* Top TV Broadcast Badges & Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/90 border border-red-600/60 text-white rounded-lg text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-lg backdrop-blur">
              <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isSpeaking ? 'animate-ping' : ''}`} />
              <span>{isSpeaking ? 'VOICE PLAYING' : 'CASTLE TV BROADCAST'}</span>
            </div>

            {hasCustomVoiceClip && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 rounded-lg text-[10px] sm:text-xs font-mono shadow backdrop-blur">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Voice Clip Active</span>
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
              title={isExpanded ? 'Contract View' : 'Expand to Large TV Theater View'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isExpanded ? 'Standard' : 'Large TV Theater'}</span>
            </button>
          </div>
        </div>

        {/* Center Pulsing Audio Visualizer when audio is playing */}
        {isSpeaking && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-20 pointer-events-none bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border-2 border-amber-500/70 shadow-[0_0_30px_rgba(212,163,69,0.5)]">
            <div className="w-2 h-6 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-2 h-10 bg-amber-300 animate-pulse rounded-full" />
            <div className="w-2 h-8 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-2 h-12 bg-amber-200 animate-pulse rounded-full" />
            <div className="w-2 h-7 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-2 h-4 bg-amber-500 animate-pulse rounded-full" />
            <span className="ml-2 font-mono text-xs sm:text-sm uppercase tracking-wider text-amber-300 font-bold">
              Voice Clip Playing
            </span>
          </div>
        )}

        {/* Bottom Subtitle / Speech Caption Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 transition-all duration-300 z-20 ${
            isCaptionCollapsed
              ? 'p-2 bg-gradient-to-t from-black/80 to-transparent'
              : 'p-4 sm:p-5 md:p-6 bg-gradient-to-t from-black via-black/85 to-transparent'
          }`}
        >
          {isCaptionCollapsed ? (
            <div className="flex items-center justify-between text-xs font-mono text-amber-400/80 px-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {sceneTitle}
              </span>
              <span className="text-[10px] text-zinc-400 italic">Captions collapsed · Click 'Show Text' above</span>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-black/60 backdrop-blur-md border border-amber-900/50 rounded-xl p-3 sm:p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-1.5 text-[11px] sm:text-xs font-mono uppercase tracking-widest text-amber-400">
                <span className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {sceneTitle}
                </span>

                <div className="flex items-center gap-2">
                  {!isHostAudioUnlocked ? (
                    <button
                      onClick={onUnlockAudio}
                      className="px-2.5 py-1 bg-amber-500 text-black font-bold rounded text-xs animate-pulse shadow"
                    >
                      Enable Audio
                    </button>
                  ) : hasCustomVoiceClip ? (
                    <button
                      onClick={() => audioHost.replay()}
                      className="hover:underline flex items-center gap-1 text-xs text-zinc-300 hover:text-amber-300"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400" /> Play Voice Clip
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="font-serif italic text-sm sm:text-base md:text-lg text-amber-100 font-medium drop-shadow-md leading-relaxed whitespace-pre-line max-h-32 sm:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                “{displayText}”
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
