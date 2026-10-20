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
  const displayImage = activeScene?.customImageUrl || activeScene?.defaultImageUrl || '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png';
  const sceneTitle = activeScene?.title || `Jasmine’s Castle · Round ${currentRound}`;
  const displayText = activeScene?.customText || caption || activeScene?.defaultText || 'Welcome to Jasmine’s Castle. Trust absolutely nobody.';
  const hasCustomVoiceClip = !!activeScene?.voiceClip?.audioUrl;

  return (
    <div
      className={`transition-all duration-500 ease-in-out relative rounded-xl overflow-hidden border-2 border-amber-500/70 shadow-[0_0_50px_rgba(212,163,69,0.3)] bg-black ${
        isExpanded ? 'w-full my-4 max-w-5xl mx-auto' : 'w-full my-3 max-w-4xl mx-auto'
      }`}
    >
      {/* 1. BROADCAST VIDEO CANVAS / SCREEN */}
      <div className={`relative overflow-hidden w-full ${isExpanded ? 'h-[440px] md:h-[520px]' : 'h-64 sm:h-80 md:h-96'}`}>
        {/* Cinematic Background Image with Slow Zoom & Lighting Effects */}
        <img
          src={displayImage}
          alt={sceneTitle}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-transform duration-[12000ms] ease-out ${
            isSpeaking ? 'scale-110 brightness-105' : 'scale-100 brightness-90'
          }`}
        />

        {/* Cinematic Vignette, Highland Mist, & Candle Glow Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />

        {/* Top TV Broadcast Badges & Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/90 text-white rounded text-[10px] font-mono font-bold tracking-widest uppercase shadow">
              <span className={`w-2 h-2 rounded-full bg-red-400 ${isSpeaking ? 'animate-ping' : ''}`} />
              <span>{isSpeaking ? 'VOICE PLAYING' : 'CASTLE STAGE'}</span>
            </div>

            {hasCustomVoiceClip && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 rounded text-[10px] font-mono">
                <Mic className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Voice Clip Active</span>
              </div>
            )}

            {/* Admin-only badges */}
            {isAdminModeOn && activeScene?.customImageUrl && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-amber-950/80 border border-amber-600/50 text-amber-300 rounded text-[10px] font-mono">
                <ImageIcon className="w-3 h-3" />
                <span>Custom Image</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Admin Edit Button ONLY shown when Admin Mode is ON */}
            {isAdminModeOn && onOpenAdminStudio && (
              <button
                onClick={() => onOpenAdminStudio(activeScene?.id)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black border border-amber-600 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all shadow"
                title="Edit this scene's voice clip, text, or image"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Scene Media</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-black/70 hover:bg-black text-amber-300 border border-amber-900/50 rounded transition-all"
              title={isExpanded ? 'Contract View' : 'Expand Cinematic View'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center Pulsing Audio Visualizer when audio is playing */}
        {isSpeaking && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 pointer-events-none bg-black/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-amber-500/50 shadow-2xl">
            <div className="w-1.5 h-6 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-10 bg-amber-300 animate-pulse rounded-full" />
            <div className="w-1.5 h-8 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-12 bg-amber-200 animate-pulse rounded-full" />
            <div className="w-1.5 h-7 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-4 bg-amber-500 animate-pulse rounded-full" />
            <span className="ml-2 font-mono text-xs uppercase tracking-wider text-amber-300 font-bold">
              Voice Clip Playing
            </span>
          </div>
        )}

        {/* Bottom Subtitle / Speech Caption Bar */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-10">
          <div className="flex items-center justify-between mb-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {sceneTitle}
            </span>

            <div className="flex items-center gap-2">
              {!isHostAudioUnlocked ? (
                <button
                  onClick={onUnlockAudio}
                  className="px-2.5 py-0.5 bg-amber-500 text-black font-bold rounded animate-pulse"
                >
                  Enable Audio
                </button>
              ) : hasCustomVoiceClip ? (
                <button
                  onClick={() => audioHost.replay()}
                  className="hover:underline flex items-center gap-1 text-zinc-300 hover:text-amber-300"
                >
                  <Play className="w-3 h-3 text-amber-400" /> Play Voice Clip
                </button>
              ) : null}
            </div>
          </div>

          <div className="font-serif italic text-sm sm:text-base md:text-lg text-amber-100 font-medium drop-shadow-md leading-relaxed whitespace-pre-line max-h-40 md:max-h-52 overflow-y-auto pr-2 custom-scrollbar">
            “{displayText}”
          </div>
        </div>
      </div>
    </div>
  );
};
