import React, { useState, useEffect } from 'react';
import { audioHost } from '../services/audioHost';
import { adminMediaService } from '../services/adminMediaService';
import { Volume2, VolumeX, X, Mic, Info, Film, Check, Trash2, Play } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminStudio?: () => void;
}

export const AudioSettingsModal: React.FC<Props> = ({ isOpen, onClose, onOpenAdminStudio }) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [customClipsCount, setCustomClipsCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setIsMuted(audioHost.getIsMuted());
      const clips = adminMediaService.getAllScenes().filter(s => !!s.voiceClip);
      setCustomClipsCount(clips.length);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioHost.setMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-900/60 rounded-xl max-w-lg w-full text-amber-100 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-amber-200">
              Host & Audio Controls
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-amber-200 p-1 rounded hover:bg-zinc-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice on Voice Removal & Custom Clips */}
        <div className="bg-burgundy-950/40 border border-amber-900/40 p-4 rounded-lg text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 font-serif font-bold text-amber-300">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Default Synthetic Voice Removed</span>
          </div>
          <p>
            The previous pre-set voice has been completely removed. By default, the castle host displays dramatic live subtitles in silence. You can record or upload your own custom voice clips for any announcement in the Admin Studio!
          </p>
        </div>

        {/* Master Sound Switch */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg flex items-center justify-between">
          <div>
            <h4 className="font-serif font-bold text-sm text-amber-200">
              Host Stage Master Sound
            </h4>
            <p className="text-xs text-zinc-400 font-sans">
              Mute or unmute all custom voice clips on the TV display
            </p>
          </div>

          <button
            onClick={handleToggleMute}
            className={`px-4 py-2 text-xs font-mono uppercase rounded-lg border flex items-center gap-2 transition-all font-bold ${
              isMuted
                ? 'bg-rose-950 border-rose-800 text-rose-300'
                : 'bg-zinc-800 border-zinc-700 text-amber-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMuted ? 'Stage Muted' : 'Stage Unmuted'}
          </button>
        </div>

        {/* Custom Audio Clips Summary & Admin Studio Link */}
        <div className="bg-zinc-900/60 border border-amber-900/50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                Castle Media & Host Studio
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {customClipsCount > 0
                  ? `You have ${customClipsCount} active custom voice clip${customClipsCount > 1 ? 's' : ''} mapped.`
                  : 'No custom voice clips currently mapped.'}
              </p>
            </div>
            {customClipsCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                {customClipsCount} Active
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-300">
            Open the Admin Studio to record your voice with your microphone, upload audio files, edit the announcement text, or change stage images for any round or game phase.
          </p>

          {onOpenAdminStudio && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminStudio();
              }}
              className="w-full py-2.5 px-4 bg-burgundy-950 hover:bg-burgundy-900 border border-amber-600/50 text-amber-200 rounded-lg text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow"
            >
              <Film className="w-4 h-4 text-amber-400" />
              Open Castle Admin Studio
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-zinc-800 hover:bg-zinc-700 text-amber-200 font-serif uppercase tracking-wider text-xs font-bold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
