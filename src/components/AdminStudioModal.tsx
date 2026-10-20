import React, { useState, useEffect, useRef } from 'react';
import {
  adminMediaService,
  SceneMediaConfig,
  PRESET_CASTLE_IMAGES,
  VoiceClipData,
} from '../services/adminMediaService';
import { audioHost } from '../services/audioHost';
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  FileText,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Download,
  Check,
  Search,
  Tv,
  Film,
  Layers,
  HelpCircle,
  Link,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSceneId?: string;
}

export const AdminStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialSceneId,
}) => {
  const [scenes, setScenes] = useState<SceneMediaConfig[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialSceneId || 'ROUND_1_INTRO');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Audio Playback Preview State
  const [isPlayingCurrentClip, setIsPlayingCurrentClip] = useState<boolean>(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to changes in adminMediaService
  useEffect(() => {
    const update = () => {
      const all = adminMediaService.getAllScenes();
      setScenes(all);
    };
    update();
    const unsub = adminMediaService.subscribe(update);
    return unsub;
  }, []);

  useEffect(() => {
    if (initialSceneId) {
      setSelectedSceneId(initialSceneId);
    }
  }, [initialSceneId]);

  // Clean up audio & recording when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopAudioPreview();
      stopRecordingCleanup();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedScene = scenes.find(s => s.id === selectedSceneId) || scenes[0];

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ----------------------------------------------------
  // Audio Preview Controls
  // ----------------------------------------------------
  const handleTogglePlayClip = () => {
    if (isPlayingCurrentClip) {
      stopAudioPreview();
    } else if (selectedScene?.voiceClip?.audioUrl) {
      stopAudioPreview();
      const audio = new Audio(selectedScene.voiceClip.audioUrl);
      audioPreviewRef.current = audio;
      setIsPlayingCurrentClip(true);
      audio.onended = () => setIsPlayingCurrentClip(false);
      audio.onerror = () => {
        setIsPlayingCurrentClip(false);
        showNotification('Audio playback failed.');
      };
      audio.play().catch(e => {
        setIsPlayingCurrentClip(false);
        console.warn('Playback error', e);
      });
    }
  };

  const stopAudioPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current = null;
    }
    setIsPlayingCurrentClip(false);
  };

  // ----------------------------------------------------
  // Microphone Recording
  // ----------------------------------------------------
  const startRecording = async () => {
    try {
      stopAudioPreview();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          const clip: VoiceClipData = {
            audioUrl: base64Url,
            fileName: `Mic_Recording_${selectedScene.id}.webm`,
            durationSec: recordingSeconds,
            recordedAt: new Date().toLocaleTimeString(),
            isRecorded: true,
          };
          adminMediaService.setSceneVoiceClip(selectedScene.id, clip);
          showNotification('Microphone voice clip saved!');
        };
        reader.readAsDataURL(audioBlob);

        // Stop all mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      showNotification('Microphone permission denied or unavailable.');
    }
  };

  const stopRecordingAndSave = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecordingCleanup();
    showNotification('Recording cancelled.');
  };

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  // ----------------------------------------------------
  // Audio File Upload
  // ----------------------------------------------------
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64Url = ev.target?.result as string;
      const clip: VoiceClipData = {
        audioUrl: base64Url,
        fileName: file.name,
        recordedAt: new Date().toLocaleTimeString(),
        isRecorded: false,
      };
      adminMediaService.setSceneVoiceClip(selectedScene.id, clip);
      showNotification(`Uploaded voice clip: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveVoiceClip = () => {
    stopAudioPreview();
    adminMediaService.removeSceneVoiceClip(selectedScene.id);
    showNotification('Voice clip removed.');
  };

  // ----------------------------------------------------
  // Text Script Editing
  // ----------------------------------------------------
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adminMediaService.updateSceneText(selectedScene.id, e.target.value);
  };

  const handleResetText = () => {
    adminMediaService.resetSceneText(selectedScene.id);
    showNotification('Script text reset to default.');
  };

  // ----------------------------------------------------
  // Image Customization
  // ----------------------------------------------------
  const handleSelectPresetImage = (url: string) => {
    adminMediaService.updateSceneImage(selectedScene.id, url);
    showNotification('Scene visual updated from castle gallery.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64Url = ev.target?.result as string;
      adminMediaService.updateSceneImage(selectedScene.id, base64Url);
      showNotification(`Uploaded custom image: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetImage = () => {
    adminMediaService.resetSceneImage(selectedScene.id);
    showNotification('Scene image reset to default.');
  };

  // ----------------------------------------------------
  // Scene Reset
  // ----------------------------------------------------
  const handleResetCurrentScene = () => {
    stopAudioPreview();
    adminMediaService.resetScene(selectedScene.id);
    showNotification(`Reset ${selectedScene.title} to default settings.`);
  };

  // ----------------------------------------------------
  // Export & Import
  // ----------------------------------------------------
  const handleExportJson = () => {
    const json = adminMediaService.exportConfigJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traitors_castle_media_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Setup exported to JSON file.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const success = adminMediaService.importConfigJson(content);
      if (success) {
        showNotification('Setup successfully imported!');
      } else {
        showNotification('Failed to import JSON setup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter scenes
  const filteredScenes = scenes.filter(s => {
    const matchesFilter =
      filterCategory === 'ALL' ||
      (filterCategory === 'GENERAL' && !s.round) ||
      (filterCategory.startsWith('R') && s.round === parseInt(filterCategory.replace('R', ''), 10));

    const matchesSearch =
      searchQuery.trim() === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customText || s.defaultText).toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const activeDisplayText = selectedScene.customText ?? selectedScene.defaultText;
  const activeDisplayImage = selectedScene.customImageUrl || selectedScene.defaultImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-zinc-950 border-2 border-amber-500/60 rounded-xl w-full max-w-7xl h-[92vh] flex flex-col text-amber-100 shadow-[0_0_50px_rgba(212,163,69,0.25)] overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-zinc-900/90 border-b border-amber-900/50 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-burgundy-950 border border-amber-500/50 flex items-center justify-center shadow">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-lg sm:text-xl text-amber-200 tracking-wider">
                  CASTLE MEDIA & HOST STUDIO
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Admin View
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans hidden sm:block">
                Manage custom voice clips, broadcast script text, and scene visual imagery
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2">
            {statusMessage && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs rounded-full font-mono animate-fadeIn">
                <Check className="w-3.5 h-3.5 text-amber-400" /> {statusMessage}
              </span>
            )}

            <button
              onClick={handleExportJson}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-200 border border-zinc-700 rounded text-xs font-mono transition-all"
              title="Backup your custom voices and scripts as JSON"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" /> Export Setup
            </button>

            <label className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-200 border border-zinc-700 rounded text-xs font-mono cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-amber-400" /> Import Setup
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                if (window.confirm('Reset all scenes, voice clips, and custom images to default?')) {
                  adminMediaService.resetAllToDefaults();
                  showNotification('All scenes reset to factory defaults.');
                }
              }}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded border border-zinc-800"
              title="Reset All Scenes to Default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-amber-200 hover:bg-zinc-900 rounded border border-zinc-800"
              title="Close Admin Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body: Two Panels */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANEL: Scene List Navigator */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-amber-900/40 bg-zinc-950/70 flex flex-col shrink-0">
            {/* Search and Filters */}
            <div className="p-3 border-b border-zinc-800 space-y-2 bg-zinc-900/30">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search scenes or scripts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-black border border-zinc-800 rounded text-xs text-amber-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono custom-scrollbar">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'R1', label: 'Rnd 1' },
                  { id: 'R2', label: 'Rnd 2' },
                  { id: 'R3', label: 'Rnd 3' },
                  { id: 'R4', label: 'Rnd 4' },
                  { id: 'R5', label: 'Rnd 5' },
                  { id: 'R6', label: 'Rnd 6' },
                  { id: 'GENERAL', label: 'Banish' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`px-2.5 py-1 rounded whitespace-nowrap transition-all ${
                      filterCategory === cat.id
                        ? 'bg-amber-500 text-black font-bold shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenes List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 p-2 space-y-1 custom-scrollbar">
              {filteredScenes.map(scene => {
                const isSelected = scene.id === selectedScene.id;
                const hasVoice = !!scene.voiceClip;
                const hasCustomImage = !!scene.customImageUrl;
                const hasCustomText = !!scene.customText;

                return (
                  <button
                    key={scene.id}
                    onClick={() => {
                      stopAudioPreview();
                      setSelectedSceneId(scene.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-burgundy-950/80 border-2 border-amber-500/80 shadow-[0_0_15px_rgba(212,163,69,0.2)]'
                        : 'bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {scene.round ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-amber-400 font-bold">
                            R{scene.round}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                            General
                          </span>
                        )}
                        <h4 className="font-serif font-bold text-xs text-amber-200 truncate">
                          {scene.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-zinc-400 truncate mb-2">
                        {scene.subtitle}
                      </p>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        {hasVoice ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                            <Mic className="w-2.5 h-2.5" /> Voice Clip
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500">
                            <MicOff className="w-2.5 h-2.5" /> No Voice
                          </span>
                        )}

                        {hasCustomImage && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50">
                            <ImageIcon className="w-2.5 h-2.5" /> Image
                          </span>
                        )}

                        {hasCustomText && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/50">
                            <FileText className="w-2.5 h-2.5" /> Script
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 mt-2 transition-transform ${isSelected ? 'text-amber-400 rotate-90 md:rotate-0' : 'text-zinc-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Scene Editor & Stage Simulator */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-black/40">
            {/* Scene Header & Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Phase: {selectedScene.phase}
                  </span>
                  {selectedScene.round && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-burgundy-900/60 text-amber-200 border border-amber-800/40">
                      Round {selectedScene.round} of 6
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-black text-xl text-amber-200 mt-1">
                  {selectedScene.title}
                </h3>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  {selectedScene.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCurrentScene}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-200 border border-zinc-800 text-xs font-mono rounded flex items-center gap-1.5 transition-all"
                  title="Reset text, image, and voice clip for this scene"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Scene
                </button>
              </div>
            </div>

            {/* SECTION 1: VOICE CLIP REPLACEMENT */}
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="font-serif font-bold text-sm text-amber-200">
                      1. Custom Voice Clip (Replaces Host Voice)
                    </h4>
                    <p className="text-xs text-zinc-400">
                      The default synthetic voice has been removed. Record your own voice or upload an audio file to play during this announcement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Clip Status Card */}
              {selectedScene.voiceClip ? (
                <div className="bg-emerald-950/40 border border-emerald-600/40 p-4 rounded-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlayClip}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                        isPlayingCurrentClip
                          ? 'bg-amber-400 text-black shadow-lg scale-105'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title={isPlayingCurrentClip ? 'Pause' : 'Play Voice Clip'}
                    >
                      {isPlayingCurrentClip ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-emerald-200">
                          {selectedScene.voiceClip.fileName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-900/60 text-emerald-300">
                          Active Voice
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {selectedScene.voiceClip.isRecorded ? 'Direct Mic Recording' : 'Uploaded Audio Clip'}
                        {selectedScene.voiceClip.durationSec ? ` · ~${selectedScene.voiceClip.durationSec}s` : ''}
                        {selectedScene.voiceClip.recordedAt ? ` · Saved at ${selectedScene.voiceClip.recordedAt}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlayClip}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-200 border border-amber-900/50 rounded text-xs font-mono flex items-center gap-1.5"
                    >
                      {isPlayingCurrentClip ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      {isPlayingCurrentClip ? 'Stop Preview' : 'Test Audio'}
                    </button>
                    <button
                      onClick={handleRemoveVoiceClip}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded border border-zinc-800"
                      title="Remove this voice clip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-800 p-3.5 rounded-lg flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <div className="flex items-center gap-2">
                    <MicOff className="w-4 h-4 text-zinc-500" />
                    <span>No voice clip added. When this scene is reached, captions display silently.</span>
                  </div>
                </div>
              )}

              {/* Add Voice Clip Options: Mic Record OR File Upload */}
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                {/* Option A: Microphone Recording */}
                <div className="border border-zinc-800 hover:border-amber-900/60 p-3.5 rounded-lg bg-zinc-900/30 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-serif font-bold text-xs text-amber-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-amber-400" /> Record with Microphone
                    </h5>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Speak your dramatic announcement directly into your computer or phone microphone.
                    </p>
                  </div>

                  {isRecording ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-3 py-2 bg-red-950/80 border border-red-800 rounded text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                          <span className="text-red-200 font-bold">Recording: {recordingSeconds}s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-3 bg-red-400 animate-bounce" />
                          <div className="w-1 h-5 bg-red-400 animate-pulse" />
                          <div className="w-1 h-4 bg-red-400 animate-bounce" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={stopRecordingAndSave}
                          className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" /> Stop & Save Clip
                        </button>
                        <button
                          onClick={cancelRecording}
                          className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-full py-2 px-4 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-200 rounded text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow"
                    >
                      <Mic className="w-3.5 h-3.5 text-red-400" /> Start Recording Mic
                    </button>
                  )}
                </div>

                {/* Option B: Audio File Upload */}
                <div className="border border-zinc-800 hover:border-amber-900/60 p-3.5 rounded-lg bg-zinc-900/30 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-serif font-bold text-xs text-amber-300 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-amber-400" /> Upload Audio File
                    </h5>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Upload any prerecorded MP3, WAV, M4A, or AAC file from your computer.
                    </p>
                  </div>

                  <label className="w-full py-2 px-4 bg-burgundy-950 hover:bg-burgundy-900 border border-amber-600/40 text-amber-200 rounded text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    Select Audio File
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 2: EDIT TEXT PRESENTED WITH SCENE */}
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="font-serif font-bold text-sm text-amber-200">
                      2. Broadcast Script Text
                    </h4>
                    <p className="text-xs text-zinc-400">
                      The exact dialogue presented on the TV host screen and subtitles for this announcement.
                    </p>
                  </div>
                </div>

                {selectedScene.customText && (
                  <button
                    onClick={handleResetText}
                    className="text-xs text-amber-400 hover:text-amber-200 underline font-mono flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Revert to Default
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  value={activeDisplayText}
                  onChange={handleTextChange}
                  className="w-full bg-black/80 border border-amber-900/60 p-3.5 rounded-lg text-sm text-amber-100 font-serif leading-relaxed focus:outline-none focus:border-amber-400 custom-scrollbar"
                  placeholder="Enter the host announcement text here..."
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-1">
                  <span>
                    {selectedScene.customText ? '★ Custom Script Active' : 'Default Script'}
                  </span>
                  <span>{activeDisplayText.length} characters · {activeDisplayText.split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: CHANGE DISPLAYED IMAGE */}
            <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="font-serif font-bold text-sm text-amber-200">
                      3. Stage Visual Image
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Change the background image displayed on the TV stage broadcast during this scene.
                    </p>
                  </div>
                </div>

                {selectedScene.customImageUrl && (
                  <button
                    onClick={handleResetImage}
                    className="text-xs text-amber-400 hover:text-amber-200 underline font-mono flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Image
                  </button>
                )}
              </div>

              {/* Current Image Banner Preview */}
              <div className="relative w-full h-48 sm:h-56 rounded-lg overflow-hidden border border-amber-500/50 shadow">
                <img
                  src={activeDisplayImage}
                  alt={selectedScene.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/80 border border-amber-500/40 rounded text-[10px] font-mono uppercase text-amber-300">
                  {selectedScene.customImageUrl ? '★ Custom Image Active' : 'Default Scene Image'}
                </div>

                <div className="absolute bottom-2.5 left-3 right-3 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                    TV Host Preview
                  </span>
                  <p className="font-serif italic text-xs text-amber-100 truncate">
                    “{activeDisplayText.slice(0, 100)}...”
                  </p>
                </div>
              </div>

              {/* Image Selection Options: Presets vs Upload vs URL */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-amber-400 block">
                  Select from Castle Gallery Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {PRESET_CASTLE_IMAGES.map(img => {
                    const isCurrent = activeDisplayImage === img.url;
                    return (
                      <button
                        key={img.id}
                        onClick={() => handleSelectPresetImage(img.url)}
                        className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all ${
                          isCurrent
                            ? 'border-amber-400 shadow-[0_0_15px_rgba(212,163,69,0.5)] scale-[1.02]'
                            : 'border-zinc-800 hover:border-amber-900/80 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="h-20 w-full overflow-hidden bg-black">
                          <img
                            src={img.url}
                            alt={img.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-1.5 bg-zinc-950 text-[10px] font-serif text-amber-200 truncate">
                          {img.name}
                        </div>
                        {isCurrent && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Upload Custom Image File or Enter URL */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <label className="py-2 px-4 bg-burgundy-950 hover:bg-burgundy-900 border border-amber-600/40 text-amber-200 text-xs font-serif font-bold uppercase tracking-wider rounded cursor-pointer flex items-center gap-1.5 transition-all shadow">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    Upload Image File
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 min-w-[240px] flex items-center gap-1.5 bg-black border border-zinc-800 px-3 py-1.5 rounded text-xs">
                    <Link className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="url"
                      placeholder="Or paste external image URL..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val.trim()) {
                            adminMediaService.updateSceneImage(selectedScene.id, val.trim());
                            showNotification('Image URL saved.');
                          }
                        }
                      }}
                      className="w-full bg-transparent text-amber-200 placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: STAGE SIMULATION PREVIEW */}
            <div className="bg-gradient-to-r from-burgundy-950/60 to-zinc-950 border border-amber-600/40 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-amber-200">
                    Live Broadcast Simulation
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Test how this scene’s custom voice clip, text, and imagery perform on the big screen.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  audioHost.speak(activeDisplayText, selectedScene.phase, selectedScene.round);
                  showNotification('Testing broadcast audio on TV stage!');
                }}
                className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition-all"
              >
                <Radio className="w-4 h-4" /> Test Broadcast Now
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="bg-zinc-900/90 border-t border-amber-900/40 px-6 py-3 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono">
            All edits saved automatically to castle storage
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-serif font-bold uppercase tracking-wider text-xs rounded transition-all shadow"
          >
            Save & Exit Studio
          </button>
        </div>
      </div>
    </div>
  );
};
