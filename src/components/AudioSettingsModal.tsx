import React, { useState, useEffect } from 'react';
import { audioHost } from '../services/audioHost';
import { Volume2, VolumeX, Play, Upload, Trash2, X, Mic, Info } from 'lucide-react';
import { AudioEventMapping } from '../types/game';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_LIST = [
  { id: 'INTRO', name: 'Game Welcome & Prologue' },
  { id: 'ROLE_BRIEFING', name: 'Role Briefing Announcement' },
  { id: 'MISSION_START', name: 'Mission Instructions Opening' },
  { id: 'ROUND_TABLE', name: 'Round Table Discussion Start' },
  { id: 'VOTING_OPEN', name: 'Voting Slates Open' },
  { id: 'VOTES_LOCKED', name: 'All 7 Votes Locked' },
  { id: 'BANISHMENT_TRAITOR', name: 'Banishment Reveal (Traitor Caught)' },
  { id: 'BANISHMENT_FAITHFUL', name: 'Banishment Reveal (Faithful Innocent)' },
  { id: 'FINAL_RESULTS', name: 'Grand Champion Finale' },
];

export const AudioSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(0.92);
  const [speechPitch, setSpeechPitch] = useState<number>(0.88);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [clips, setClips] = useState<AudioEventMapping[]>([]);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState<string>(EVENT_LIST[0].id);

  useEffect(() => {
    if (isOpen) {
      const vList = audioHost.getAvailableVoices();
      setVoices(vList);
      const sel = audioHost.getSelectedVoice();
      if (sel) setSelectedVoiceUri(sel.voiceURI);
      setSpeechRate(audioHost.getRate());
      setSpeechPitch(audioHost.getPitch());
      setIsMuted(audioHost.getIsMuted());
      setClips(audioHost.getClips());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceUri(uri);
    audioHost.setVoice(uri);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSpeechRate(val);
    audioHost.setRate(val);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSpeechPitch(val);
    audioHost.setPitch(val);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioHost.setMuted(next);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64Url = ev.target?.result as string;
      const eventMeta = EVENT_LIST.find(ev => ev.id === selectedEventForUpload);
      audioHost.mapClip(selectedEventForUpload, eventMeta?.name || selectedEventForUpload, base64Url, file.name);
      setClips(audioHost.getClips());
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveClip = (eventId: string) => {
    audioHost.removeClip(eventId);
    setClips(audioHost.getClips());
  };

  const handlePlayClip = (audioUrl?: string) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.warn('Preview error', e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-amber-900/60 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto text-amber-100 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-amber-200">
              Digital Host & Voiceover Controls
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-amber-200 p-1 rounded hover:bg-zinc-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Audio Disclaimer */}
          <div className="bg-burgundy-950/40 border border-amber-900/40 p-3 rounded text-xs text-zinc-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              The digital host delivers scripted British dialogue in theatrical homage to the atmosphere of The Traitors. No live AI agent or paid voice subscriptions are used.
            </p>
          </div>

          {/* British Speech Synthesis Configuration */}
          <div className="space-y-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded">
            <div className="flex items-center justify-between">
              <span className="font-serif font-semibold text-amber-300">
                Browser Speech Voice
              </span>
              <button
                onClick={handleToggleMute}
                className={`px-3 py-1 text-xs font-mono uppercase rounded border flex items-center gap-1.5 transition-all ${
                  isMuted
                    ? 'bg-rose-950 border-rose-800 text-rose-300'
                    : 'bg-zinc-800 border-zinc-700 text-amber-300'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isMuted ? 'Host Muted' : 'Host Unmuted'}
              </button>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-mono">
                Selected Voice (British English Recommended):
              </label>
              <select
                value={selectedVoiceUri}
                onChange={handleVoiceChange}
                className="w-full bg-black border border-amber-900/50 p-2.5 text-xs text-amber-200 rounded font-sans focus:outline-none focus:border-amber-400"
              >
                {voices.map(v => {
                  const isBritish = v.lang.startsWith('en-GB') || v.lang.includes('GB') || v.name.includes('UK');
                  return (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {isBritish ? '🇬🇧 ' : ''}
                      {v.name} ({v.lang})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Speech Rate Slider */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>Theatrical Cadence (Speed): {speechRate.toFixed(2)}x</span>
                <span className="text-zinc-500">0.75x = Suspenseful · 1.0x = Normal</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={speechRate}
                onChange={handleRateChange}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Claudia Vocal Pitch Slider */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>Claudia Vocal Tone (Pitch): {speechPitch.toFixed(2)}</span>
                <span className="text-zinc-500">0.88 = Husky Claudia · 1.00 = Neutral</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.15"
                step="0.02"
                value={speechPitch}
                onChange={handlePitchChange}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Preview Button */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={() => audioHost.previewVoice()}
                className="py-2 px-4 bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40 rounded text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" /> Preview Castle Voice
              </button>
              <button
                onClick={() => audioHost.stop()}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline font-mono"
              >
                Stop Speaking
              </button>
            </div>
          </div>

          {/* Custom Prerecorded Audio Clips Mapper */}
          <div className="space-y-3 bg-zinc-900/50 p-4 border border-zinc-800 rounded">
            <div>
              <h4 className="font-serif font-semibold text-amber-300 text-sm">
                Custom Prerecorded Audio Clips (Optional)
              </h4>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Upload your own MP3 or audio recordings for specific announcements. When mapped, the app plays your file instead of browser speech.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <select
                value={selectedEventForUpload}
                onChange={e => setSelectedEventForUpload(e.target.value)}
                className="flex-1 min-w-[200px] bg-black border border-amber-900/50 p-2 text-xs text-amber-200 rounded"
              >
                {EVENT_LIST.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>

              <label className="py-2 px-4 bg-burgundy-900 hover:bg-burgundy-800 border border-amber-600/40 text-amber-200 text-xs font-serif font-bold uppercase tracking-wider rounded cursor-pointer flex items-center gap-1.5 transition-all">
                <Upload className="w-3.5 h-3.5" />
                Upload Clip
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Mapped Clips List */}
            {clips.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-mono uppercase text-zinc-500 block">
                  Active Audio Mappings ({clips.length}):
                </span>
                {clips.map(c => (
                  <div
                    key={c.eventId}
                    className="flex items-center justify-between p-2 bg-black/60 border border-zinc-800 rounded text-xs"
                  >
                    <div className="truncate mr-2">
                      <strong className="text-amber-300 font-serif">{c.name}</strong>
                      <span className="text-zinc-500 ml-1.5 font-mono text-[10px]">
                        ({c.fileName || 'custom audio'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePlayClip(c.audioUrl)}
                        className="p-1 text-amber-400 hover:text-amber-200"
                        title="Play"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveClip(c.eventId)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-amber-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-zinc-800 hover:bg-zinc-700 text-amber-200 font-serif uppercase tracking-wider text-xs font-bold rounded"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
