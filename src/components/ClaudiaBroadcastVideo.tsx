import React, { useState, useEffect } from 'react';
import { audioHost } from '../services/audioHost';
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
} from 'lucide-react';

interface Props {
  caption: string;
  phase: string;
  isHostAudioUnlocked: boolean;
  onUnlockAudio: () => void;
}

const PROLOGUE_CLAUDIA_IMAGE = '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png';
const CLAUDIA_SMILE_IMAGE = '/src/assets/images/claudia_host_castle_1792491589363.jpg';
const CLAUDIA_POINT_IMAGE = '/src/assets/images/claudia_cloak_reveal_1792491590255.jpg';
const CASTLE_MIST_IMAGE = '/src/assets/images/traitors_castle_mist_1792491571213.jpg';
const ROUND_TABLE_IMAGE = '/src/assets/images/round_table_chamber_1792491572609.jpg';

export const ClaudiaBroadcastVideo: React.FC<Props> = ({
  caption,
  phase,
  isHostAudioUnlocked,
  onUnlockAudio,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMoodIndex, setActiveMoodIndex] = useState(0);

  const CLAUDIA_MOODS = [
    'Jasmine’s Castle: Murder, Merlot & Manipulation',
    'Fringe: Threat Level Maximum',
    'Friendship: Let’s not get attached',
    'Swear on my life? Overvalued it.',
    'Suspicion: Look at Libby’s face',
  ];

  useEffect(() => {
    const unsub = audioHost.subscribeSpeaking(speaking => {
      setIsSpeaking(speaking);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMoodIndex(prev => (prev + 1) % CLAUDIA_MOODS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Determine active visual image based on game phase
  let activeImage = PROLOGUE_CLAUDIA_IMAGE;
  let sceneTitle = 'Claudia Winkleman · Jasmine’s Castle Prologue';

  if (phase === 'INTRO' || phase === 'LOBBY') {
    activeImage = PROLOGUE_CLAUDIA_IMAGE;
    sceneTitle = 'Claudia Winkleman · Welcome to Jasmine’s Castle';
  } else if (['VOTING', 'VOTE_REVEALS', 'BANISHMENT_OUTCOME', 'TIE_DEFENCE', 'TIE_REVEALS'].includes(phase)) {
    activeImage = CLAUDIA_POINT_IMAGE;
    sceneTitle = 'Claudia Winkleman · The Accusation Crypt';
  } else if (phase === 'ROUND_TABLE') {
    activeImage = isSpeaking ? CLAUDIA_POINT_IMAGE : ROUND_TABLE_IMAGE;
    sceneTitle = 'The Round Table Chamber · Jasmine’s Castle';
  } else if (phase === 'MISSION') {
    activeImage = isSpeaking ? CLAUDIA_SMILE_IMAGE : CASTLE_MIST_IMAGE;
    sceneTitle = 'Jasmine’s Castle · Scottish Highlands';
  } else {
    activeImage = isSpeaking ? PROLOGUE_CLAUDIA_IMAGE : CLAUDIA_SMILE_IMAGE;
    sceneTitle = 'Claudia Winkleman · Jasmine’s Castle Great Hall';
  }

  return (
    <div
      className={`transition-all duration-500 ease-in-out relative rounded-xl overflow-hidden border-2 border-amber-500/70 shadow-[0_0_50px_rgba(212,163,69,0.3)] bg-black ${
        isExpanded ? 'w-full my-4 max-w-5xl mx-auto' : 'w-full my-3 max-w-4xl mx-auto'
      }`}
    >
      {/* 1. BROADCAST VIDEO CANVAS / SCREEN */}
      <div className={`relative overflow-hidden w-full ${isExpanded ? 'h-[440px] md:h-[520px]' : 'h-64 sm:h-80 md:h-96'}`}>
        {/* Cinematic Background Image with Ken Burns Television Slow Zoom */}
        <img
          src={activeImage}
          alt={sceneTitle}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-transform duration-[12000ms] ease-out ${
            isSpeaking ? 'scale-110 brightness-105' : 'scale-100 brightness-90'
          }`}
        />

        {/* Cinematic Vignette, Highland Mist, & Candle Glow Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />

        {/* Top TV Broadcast Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/90 text-white rounded text-[10px] font-mono font-bold tracking-widest uppercase shadow">
              <span className={`w-2 h-2 rounded-full bg-red-400 ${isSpeaking ? 'animate-ping' : ''}`} />
              <span>{isSpeaking ? 'CLAUDIA SPEAKING' : 'CASTLE FEED'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-black/70 border border-amber-900/40 text-amber-300 rounded text-[10px] font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{CLAUDIA_MOODS[activeMoodIndex]}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-black/70 hover:bg-black text-amber-300 border border-amber-900/50 rounded transition-all"
              title={isExpanded ? 'Contract View' : 'Expand Cinematic View'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center Pulsing Audio Visualizer when Claudia is reading aloud */}
        {isSpeaking && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 pointer-events-none bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-500/40">
            <div className="w-1.5 h-6 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-10 bg-amber-300 animate-pulse rounded-full" />
            <div className="w-1.5 h-8 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-12 bg-amber-200 animate-pulse rounded-full" />
            <div className="w-1.5 h-7 bg-amber-400 animate-bounce rounded-full" />
            <div className="w-1.5 h-4 bg-amber-500 animate-pulse rounded-full" />
          </div>
        )}

        {/* Bottom Subtitle / Speech Caption Bar */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-10">
          <div className="flex items-center justify-between mb-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {sceneTitle}
            </span>
            {!isHostAudioUnlocked ? (
              <button
                onClick={onUnlockAudio}
                className="px-2.5 py-0.5 bg-amber-500 text-black font-bold rounded animate-pulse"
              >
                Tap to Enable Audio
              </button>
            ) : (
              <button
                onClick={() => audioHost.replay()}
                className="hover:underline flex items-center gap-1 text-zinc-300 hover:text-amber-300"
              >
                <Play className="w-3 h-3 text-amber-400" /> Replay Voice
              </button>
            )}
          </div>

          <div className="font-serif italic text-sm sm:text-base md:text-lg text-amber-100 font-medium drop-shadow-md leading-relaxed whitespace-pre-line max-h-40 md:max-h-52 overflow-y-auto pr-2 custom-scrollbar">
            “{caption || 'Welcome to Jasmine’s Castle. Trust absolutely nobody.'}”
          </div>
        </div>
      </div>
    </div>
  );
};
