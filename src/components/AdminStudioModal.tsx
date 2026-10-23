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
  Loader2,
  BookOpen,
  Calendar,
  Trophy,
  Target,
  Shield,
  Skull,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Award,
  Users,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSceneId?: string;
  roomCode?: string;
  onJumpToRound?: (round: number, phase?: string) => void;
}

export interface RoundPlanItem {
  round: number;
  title: string;
  subtitle: string;
  theme: string;
  missionName: string;
  missionDescription: string;
  mechanics: string[];
  faithfulObjective: string;
  traitorObjective: {
    title: string;
    description: string;
    conversationalGoal: string;
    successCondition: string;
  };
  scoring: string;
  imageUrl: string;
  sampleScript: string;
}

export const ROUNDS_PLAN_DATA: RoundPlanItem[] = [
  {
    round: 1,
    title: 'Round 1: The Castle Heist',
    subtitle: 'Forensic collection & secret planted evidence',
    theme: 'Physical Investigation & Planted Evidence',
    missionName: 'Exhibit A: The Crime Scene',
    missionDescription:
      'Each guest fetches one ordinary household item and brings it to the table. One object will be chosen as Exhibit A. Eight crucial clues rest upon the candlelit desk.',
    mechanics: [
      'Each of the 7 players registers 1 ordinary household object on their phone slate.',
      '8 crime scene clues are featured on the table (Brass Key, Glove, Poison Flask, Pocket Watch, Damask Handkerchief, Sealed Letter, Silver Spoon, Forensics Bag).',
      'Forensic Presentations: 30 seconds for each player to argue why their item is suspicious.',
      'Secret Mobile Voting: All players cast private votes for which item becomes Exhibit A.',
      'Round Table Accusation: Full table debate on who was steering the evidence.',
    ],
    faithfulObjective: 'Deduce which object is an innocent piece of evidence and avoid voting for the Traitor’s planted item.',
    traitorObjective: {
      title: 'The Planted Exhibit',
      description: 'Persuade the group to choose your secret planted household object as Exhibit A.',
      conversationalGoal: 'Steer the investigation so everyone believes selecting your planted object was their own brilliant idea.',
      successCondition: 'The Traitor’s secret planted object is chosen as the final Exhibit A.',
    },
    scoring: 'If Exhibit A is the Traitor’s planted item: Traitor steals +10 Gold. Otherwise: +10 Gold to the Faithful Prize Pot.',
    imageUrl: '/assets/aistudio/The_Candlelit_Castle_Mystery_891f6711.png',
    sampleScript:
      '“Welcome to Jasmine’s Castle. One of you will be murdered, several banished, and the rest deeply untrustworthy. Look at each other... because by tonight, one of you is a Traitor.”',
  },
  {
    round: 2,
    title: 'Round 2: The Birthday Majority',
    subtitle: 'Social consensus predictions & comical roasts',
    theme: 'Consensus Manipulation & Social Comedy',
    missionName: 'The Birthday Majority',
    missionDescription:
      'Five spicy, comical questions about the party guests. Phase 1: Nominate who fits the prompt. Phase 2: Predict the room’s consensus!',
    mechanics: [
      '5 personalized multiple-choice questions about the guests (e.g. “Who would hear last orders and buy enough drinks to turn going home into tomorrow’s problem?”).',
      'Step 1 (Anonymous Consensus): Every player anonymously selects who best fits the prompt.',
      'Step 2 (Prediction Stakes): Players predict who the majority selected.',
      'Consensus Reveal: The TV host screen tallies the votes and crowns the majority answer.',
      'Debate Phase: Who tried to sway opinions on the questions before votes locked?',
    ],
    faithfulObjective: 'Accurately read the room and predict the majority consensus to earn individual gold coins.',
    traitorObjective: {
      title: 'The Deliberate Detour',
      description: 'Convince your assigned target Faithful to submit an incorrect prediction on a specified question.',
      conversationalGoal: 'Lobby or sway opinion casually during the discussion before predictions are locked.',
      successCondition: 'Target Faithful locks an incorrect majority prediction on the assigned question.',
    },
    scoring: '+2 Gold per correct prediction for Faithful. Traitor earns +10 Gold if their target was successfully misled.',
    imageUrl: '/src/assets/images/round_table_chamber_1792491572609.jpg',
    sampleScript:
      '“You think you know your friends? You don’t. You know their curated social media and polite dinner party faces. Now we find out what they really think of you.”',
  },
  {
    round: 3,
    title: 'Round 3: The Forgery Gallery',
    subtitle: 'Silent sketch divergence & art interrogation',
    theme: 'Visual Forgery & Observational Forensics',
    missionName: 'The Forgery Gallery',
    missionDescription:
      'Two minutes of silent sketching on paper. Faithful and Traitor receive subtly different brief pairs. Spot the forgery!',
    mechanics: [
      'Two minutes of dead silence. Players draw their private prompt on scrap paper or mobile.',
      'Faithful Prompt: e.g. A smug butler serving high tea in the castle courtyard with a dachshund and a grandfather clock.',
      'Traitor Prompt: e.g. A frantic waiter balancing a wedding cake on a windy Scottish golf course with a terrier and a sundial.',
      'Simultaneous Reveal: All drawings presented together for group interrogation.',
      'Round Table Accusations: Cross-examining discrepancies in the details.',
    ],
    faithfulObjective: 'Present an authentic drawing and identify the subtle imposter prompt among the sketches.',
    traitorObjective: {
      title: 'Framing the Artist',
      description: 'You received a slightly different drawing prompt. Get another player to accuse an innocent Faithful of having the wrong drawing.',
      conversationalGoal: 'During sketch presentations, playfully question strange details in an innocent Faithful player’s drawing.',
      successCondition: 'Another guest publicly suspects or accuses an innocent Faithful of having the wrong drawing.',
    },
    scoring: '+10 Gold to Faithful pot if Traitor sketch is identified. Traitor steals +10 Gold if an innocent Faithful is accused.',
    imageUrl: '/src/assets/images/claudia_cloak_reveal_1792491590255.jpg',
    sampleScript:
      '“Two minutes of dead silence. Put pencil to paper. One among you has a forged brief. When I say show, reveal your slates to the table!”',
  },
  {
    round: 4,
    title: 'Round 4: Body Disposal Committee',
    subtitle: 'Escape luggage rationing & cooperative storytelling',
    theme: 'Survival Committee & Contraband Smuggling',
    missionName: 'Body Disposal Committee',
    missionDescription:
      'A body has been found in the wine cellar! The group must flee on a tandem bicycle and debate which 5 items out of 7 make the getaway basket.',
    mechanics: [
      '7 unusual household items fetched and nominated by players.',
      'Committee Debate: The 7 players must reach agreement on exactly 5 items to pack.',
      '60-Second Story Challenge: One nominated storyteller must weave all 5 items into a coherent 60-second escape narrative.',
      'Timer Discipline: If story exceeds 60 seconds or misses an item, mission fails.',
    ],
    faithfulObjective: 'Pack practical items and deliver the 60-second escape story with all 5 items incorporated.',
    traitorObjective: {
      title: 'The Contraband Smuggle',
      description: 'You are secretly assigned 1 specific object. You must get another player to fetch or nominate that object into the committee’s final five.',
      conversationalGoal: 'Convince someone else that your assigned object is vital for the tandem bicycle getaway.',
      successCondition: 'Another player fetches or votes your assigned item into the final five.',
    },
    scoring: '+10 Gold if the 60-second escape story succeeds. Traitor steals +10 Gold if their contraband item is packed.',
    imageUrl: '/src/assets/images/claudia_host_castle_1792491589363.jpg',
    sampleScript:
      '“A body has been found in the wine cellar. You must flee on a two-seater bicycle across the moors. You can only pack five items. Choose wisely.”',
  },
  {
    round: 5,
    title: 'Round 5: The Counterfeit Expert',
    subtitle: 'High-speed invention pitching & linguistic deduction',
    theme: 'Rapid Deception & Linguistic Sleight of Hand',
    missionName: 'The Counterfeit Expert',
    missionDescription:
      'A bizarre high-tech invention is announced. Each player has 30 seconds to pitch it. Faithful have 3 required words; Traitor only has 2 and must deduce the 3rd!',
    mechanics: [
      'An absurd product announced (e.g. The Subterranean Escapement Loom).',
      'Faithful receive 3 secret keywords they must naturally weave into their 30-second pitch.',
      'The Traitor receives only 2 keywords and a question mark for the 3rd.',
      'Traitor must listen to early pitches, deduce the missing word, and use it in their pitch or guess it!',
      'Fast-paced 30-second speaking order around the table.',
    ],
    faithfulObjective: 'Deliver smooth pitches using all 3 words without telegraphing the secret keywords to the Traitor.',
    traitorObjective: {
      title: 'The Counterfeit Smuggler',
      description: 'You only received 2 required words (missing the 3rd). Listen carefully to the pitches, deduce the missing word, and use it in your pitch or guess it.',
      conversationalGoal: 'Deliver a convincing 30-second pitch while smoothly sneaking in the deduced 3rd word.',
      successCondition: 'Traitor uses or correctly identifies the missing 3rd word.',
    },
    scoring: '+10 Gold to Faithful if Traitor fails to use or identify the word. Traitor steals +10 Gold if 3rd word is deduced.',
    imageUrl: '/src/assets/images/traitors_castle_mist_1792491571213.jpg',
    sampleScript:
      '“High finance. Unregulated tech. Thirty seconds on the clock. Pitch for your lives.”',
  },
  {
    round: 6,
    title: 'Round 6: The Getaway Auction & The Grand Finale',
    subtitle: 'High-stakes bidding, the Final Four dilemma & the Jasmine Forfeit',
    theme: 'Auction Depletion, Banishment Gauntlet & Crown Decider',
    missionName: 'The Getaway Auction & Grand Finale',
    missionDescription:
      'Each player starts with 12 gold coins to bid on 6 mystery escape lots. Then the survivors enter the Final Four End-or-Banish showdown, culminating in the Jasmine Forfeit Apology!',
    mechanics: [
      'Part 1 (The Auction): 6 mystery lots auctioned sequentially (Tandem Bicycle, Highland Map, Lord’s Passport, Decoy Cloak, False Alibi, Castle Master Key).',
      'Secret Traitor Auction Goal: Drive up bidding and ensure target Faithful wins 0 lots or exhausts all coins on low-value items.',
      'Part 2 (Final Banishments): Survivors hold decisive round table votes until 4 remain.',
      'Part 3 (End the Game or Banish Again): All remaining players vote privately. If all vote END, game stops. If even ONE votes BANISH, another banishment is held!',
      'Part 4 (The Ultimate Victory): If ANY Traitor survives, the Traitor STEALS the entire gold pot! If only Faithful remain, the highest scoring Faithful takes the Crown!',
      'Part 5 (The Jasmine Forfeit): Jasmine takes the floor and recites the dramatic public apology to Libby in front of everyone!',
    ],
    faithfulObjective: 'Manage coin economy in the auction, eliminate the remaining Traitor, and vote to END only when confident no Traitors remain.',
    traitorObjective: {
      title: 'The Grand Depletion & Final Survival',
      description: 'Manipulate bidding so target Faithful wins 0 lots, survive the final round table votes, and convince Faithful to END the game with you still standing.',
      conversationalGoal: 'Play the trusted friend, vote with the majority, and survive to the bitter end to steal the entire pot.',
      successCondition: 'Survive the final banishments as a Traitor to claim the entire prize pot.',
    },
    scoring: 'Winner takes all! A surviving Traitor takes the ENTIRE gold pot. If all Traitors banished, the top-scoring Faithful wins.',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png',
    sampleScript:
      '“The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you are finished.”',
  },
];

export const AdminStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialSceneId,
  roomCode,
  onJumpToRound,
}) => {
  const [activeTab, setActiveTab] = useState<'GAME_PLAN' | 'MEDIA_STUDIO'>(
    initialSceneId ? 'MEDIA_STUDIO' : 'GAME_PLAN'
  );
  const [planFilter, setPlanFilter] = useState<number | 'ALL'>('ALL');
  const [scenes, setScenes] = useState<SceneMediaConfig[]>(() => adminMediaService.getAllScenes());
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

  const stopAudioPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current = null;
    }
    setIsPlayingCurrentClip(false);
  };

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

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

  // Fetch authoritative state from server whenever studio is opened
  useEffect(() => {
    if (isOpen) {
      adminMediaService.refreshFromServer().then(fresh => {
        setScenes(fresh);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialSceneId) {
      setSelectedSceneId(initialSceneId);
      setActiveTab('MEDIA_STUDIO');
    }
  }, [initialSceneId]);

  // Clean up audio & recording when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopAudioPreview();
      stopRecordingCleanup();
    }
    return () => {
      stopAudioPreview();
      stopRecordingCleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const allAvailableScenes = scenes.length > 0 ? scenes : adminMediaService.getAllScenes();
  const selectedScene = allAvailableScenes.find(s => s.id === selectedSceneId) || allAvailableScenes[0];

  if (!selectedScene) return null;

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
      audio.onended = () => {
        setIsPlayingCurrentClip(false);
        audioPreviewRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingCurrentClip(false);
        audioPreviewRef.current = null;
        showNotification('Could not play audio clip');
      };
      audio.play().catch(e => {
        console.warn('Audio play error:', e);
        setIsPlayingCurrentClip(false);
      });
    }
  };

  // ----------------------------------------------------
  // Microphone Recording
  // ----------------------------------------------------
  const handleStartRecording = async () => {
    stopAudioPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newClip: VoiceClipData = {
            audioUrl: base64data,
            fileName: `recorded_voice_${selectedScene.id}.webm`,
            durationSec: recordingSeconds,
            recordedAt: new Date().toISOString(),
            isRecorded: true,
          };
          adminMediaService.setVoiceClip(selectedScene.id, newClip);
          showNotification(`Recorded voice clip attached to ${selectedScene.title}`);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone access denied or not available: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // ----------------------------------------------------
  // Audio File Upload
  // ----------------------------------------------------
  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Audio file must be under 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64Url = event.target?.result as string;
      const newClip: VoiceClipData = {
        audioUrl: base64Url,
        fileName: file.name,
        recordedAt: new Date().toISOString(),
        isRecorded: false,
      };
      adminMediaService.setVoiceClip(selectedScene.id, newClip);
      showNotification(`Uploaded voice clip for ${selectedScene.title}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteVoiceClip = () => {
    stopAudioPreview();
    adminMediaService.removeVoiceClip(selectedScene.id);
    showNotification('Voice clip removed');
  };

  // ----------------------------------------------------
  // Image Upload & Selection
  // ----------------------------------------------------
  const handleSelectPresetImage = (url: string) => {
    adminMediaService.setImage(selectedScene.id, url);
    showNotification('Visual image updated');
  };

  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Image file must be under 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64Url = event.target?.result as string;
      adminMediaService.setImage(selectedScene.id, base64Url);
      showNotification('Custom image uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetImage = () => {
    adminMediaService.resetImageToDefault(selectedScene.id);
    showNotification('Image reset to castle default');
  };

  // ----------------------------------------------------
  // Script / Caption Text Editing
  // ----------------------------------------------------
  const handleUpdateText = (text: string) => {
    adminMediaService.setText(selectedScene.id, text);
  };

  const handleResetText = () => {
    adminMediaService.resetTextToDefault(selectedScene.id);
    showNotification('Script text reset to original default');
  };

  // ----------------------------------------------------
  // JSON Import & Export
  // ----------------------------------------------------
  const handleExportJson = () => {
    const jsonStr = adminMediaService.exportJsonConfig();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traitors_castle_media_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Media configuration exported');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const jsonStr = event.target?.result as string;
        const success = adminMediaService.importJsonConfig(jsonStr);
        if (success) {
          showNotification('Media configuration imported successfully');
        } else {
          alert('Invalid configuration file');
        }
      } catch (err: any) {
        alert('Could not parse configuration file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter scenes for Media Studio
  const filteredScenes = allAvailableScenes.filter(s => {
    const matchesCategory =
      filterCategory === 'ALL' ||
      (filterCategory === 'GENERAL' && !s.round) ||
      (filterCategory.startsWith('R') && s.round === parseInt(filterCategory.replace('R', ''), 10));

    const matchesSearch =
      searchQuery.trim() === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customText && s.customText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.defaultText.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const activeDisplayImage = selectedScene.customImageUrl || selectedScene.defaultImageUrl;
  const activeDisplayText = selectedScene.customText ?? selectedScene.defaultText;

  // Filter rounds for Game Plan
  const displayedRounds =
    planFilter === 'ALL' ? ROUNDS_PLAN_DATA : ROUNDS_PLAN_DATA.filter(r => r.round === planFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-zinc-950 border-2 border-amber-500/60 rounded-xl w-full max-w-7xl h-[94vh] flex flex-col text-amber-100 shadow-[0_0_50px_rgba(212,163,69,0.25)] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-zinc-900/90 border-b border-amber-900/50 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-burgundy-950 border border-amber-500/50 flex items-center justify-center shadow">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-lg sm:text-xl text-amber-200 tracking-wider">
                  CASTLE ADMIN & MASTER GAME PLAN
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Admin View
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans hidden sm:block">
                View all planned rounds & missions, or customize media clips, broadcast scripts, and images
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

        {/* PRIMARY TAB SWITCHER: ALL ROUNDS PLAN vs MEDIA STUDIO */}
        <div className="bg-zinc-950 border-b border-amber-900/50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-burgundy-950/60 via-zinc-950 to-burgundy-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('GAME_PLAN')}
              className={`px-4 py-2 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-2 ${
                activeTab === 'GAME_PLAN'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-lg ring-2 ring-amber-300'
                  : 'bg-zinc-900 text-zinc-300 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>All Rounds Master Plan & Timeline</span>
            </button>

            <button
              onClick={() => setActiveTab('MEDIA_STUDIO')}
              className={`px-4 py-2 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-2 ${
                activeTab === 'MEDIA_STUDIO'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-lg ring-2 ring-amber-300'
                  : 'bg-zinc-900 text-zinc-300 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Media Studio & Voice Clips</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-amber-400/80 hidden md:inline">
            {activeTab === 'GAME_PLAN'
              ? 'Complete overview of all 6 rounds, missions, traitor objectives & rules'
              : 'Customize images, voice clips and broadcast scripts scene-by-scene'}
          </span>
        </div>

        {/* TAB 1: ALL ROUNDS MASTER GAME PLAN & TIMELINE */}
        {activeTab === 'GAME_PLAN' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-black/50">
            {/* Quick Game Architecture Card */}
            <div className="bg-gradient-to-r from-burgundy-950 via-zinc-900 to-burgundy-950 border border-amber-500/50 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  Game Architecture · 7 Players · 6 Standalone Rounds
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-amber-100">
                  Libby’s Birthday: Trust Nobody Master Plan
                </h3>
                <p className="text-xs text-zinc-300 max-w-2xl font-sans leading-relaxed">
                  Every round deals a new secret Traitor in the dark. Accumulated individual points carry forward. In Round 6, survivors bid in the Getaway Auction, endure the Final Four Banishments, and decide whether to End or Banish Again.
                </p>
              </div>

              {/* Quick round jump filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-zinc-400 uppercase mr-1">Filter:</span>
                <button
                  onClick={() => setPlanFilter('ALL')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                    planFilter === 'ALL'
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  All (1–6)
                </button>
                {[1, 2, 3, 4, 5, 6].map(r => (
                  <button
                    key={r}
                    onClick={() => setPlanFilter(r)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                      planFilter === r
                        ? 'bg-amber-500 text-black shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    R{r}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds List Grid */}
            <div className="space-y-6">
              {displayedRounds.map(r => (
                <div
                  key={r.round}
                  className="bg-zinc-950/90 border-2 border-amber-900/60 hover:border-amber-500/80 rounded-2xl overflow-hidden shadow-2xl transition-all"
                >
                  {/* Round Banner */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-burgundy-950/70 to-zinc-900 border-b border-amber-900/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-amber-500 text-black font-serif font-black text-lg flex items-center justify-center shadow-lg">
                        {r.round}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-black text-lg sm:text-xl text-amber-200">
                            {r.title}
                          </h4>
                          <span className="px-2 py-0.5 bg-burgundy-900/80 border border-amber-600/40 text-amber-300 text-[10px] font-mono rounded uppercase">
                            {r.theme}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-sans mt-0.5">
                          {r.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons for this round */}
                    <div className="flex items-center gap-2">
                      {onJumpToRound && (
                        <button
                          onClick={() => {
                            onJumpToRound(r.round, 'INTRO');
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5 transition active:scale-95"
                          title={`Instantly jump demo room to Round ${r.round}`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-black" />
                          <span>Test Round {r.round} in Demo</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActiveTab('MEDIA_STUDIO');
                          setSelectedSceneId(`ROUND_${r.round}_INTRO`);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-900/60 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
                        title="Customize voice clip and image for this round in Media Studio"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Customize Media</span>
                      </button>
                    </div>
                  </div>

                  {/* Round Body Details */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Image & Host Script */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="rounded-xl overflow-hidden border border-amber-900/60 bg-black aspect-video relative group">
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                          <span className="text-[11px] font-mono text-amber-300 font-bold">
                            Visual Stage: {r.missionName}
                          </span>
                        </div>
                      </div>

                      {/* Sample Host Prologue */}
                      <div className="bg-black/60 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block font-bold">
                          Host Opening Speech (Claudia / Voice Clip)
                        </span>
                        <p className="text-xs text-amber-100/90 font-serif italic leading-relaxed">
                          {r.sampleScript}
                        </p>
                      </div>

                      {/* Scoring rule */}
                      <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-200">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <span><strong>Stakes:</strong> {r.scoring}</span>
                      </div>
                    </div>

                    {/* Right: Mission Mechanics & Secret Traitor Objective */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Mission Premise & Mechanics */}
                      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-2 font-serif font-bold text-amber-100 text-sm">
                            <Layers className="w-4 h-4 text-amber-400" />
                            <span>Mission: {r.missionName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 uppercase">
                            Faithful & Traitor Challenge
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                          {r.missionDescription}
                        </p>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                            Key Interactive Steps:
                          </span>
                          {r.mechanics.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                              <span className="text-amber-500 font-mono text-[11px] mt-0.5">#{idx + 1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Secret Traitor Objective Card */}
                      <div className="bg-gradient-to-r from-red-950/60 via-zinc-950 to-red-950/60 border-2 border-red-700/60 rounded-xl p-4 space-y-2.5 shadow-lg">
                        <div className="flex items-center justify-between border-b border-red-900/50 pb-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-serif font-bold text-red-300 uppercase tracking-wider">
                            <Skull className="w-4 h-4 text-red-400" />
                            Secret Traitor Mission: “{r.traitorObjective.title}”
                          </span>
                          <span className="text-[10px] font-mono text-red-400">Classified</span>
                        </div>

                        <p className="text-xs text-red-100/90 font-serif leading-relaxed">
                          {r.traitorObjective.description}
                        </p>

                        <div className="bg-black/60 rounded p-2 text-xs space-y-1 font-mono text-[11px]">
                          <div>
                            <span className="text-zinc-400 uppercase">Conversational Goal: </span>
                            <span className="text-amber-300">{r.traitorObjective.conversationalGoal}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 uppercase">Success Condition: </span>
                            <span className="text-emerald-400">{r.traitorObjective.successCondition}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TAB 2: ORIGINAL MEDIA STUDIO & VOICE CLIPS EDITOR */
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
                              <ImageIcon className="w-2.5 h-2.5" /> Custom Img
                            </span>
                          )}

                          {hasCustomText && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/50">
                              <FileText className="w-2.5 h-2.5" /> Custom Script
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-zinc-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT PANEL: Scene Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-black/40">
              {/* Scene Title Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase rounded border border-amber-500/40">
                      Scene ID: {selectedScene.id}
                    </span>
                    {selectedScene.round && (
                      <span className="text-xs font-mono text-zinc-400">
                        Round {selectedScene.round} · Phase: {selectedScene.phase}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-black text-xl sm:text-2xl text-amber-200">
                    {selectedScene.title}
                  </h3>
                  <p className="text-xs text-zinc-400">{selectedScene.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  {onJumpToRound && selectedScene.round && (
                    <button
                      onClick={() => {
                        onJumpToRound(selectedScene.round!, selectedScene.phase);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 rounded text-xs font-mono flex items-center gap-1.5"
                      title="Jump demo room straight to this scene"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Jump Demo Here</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. VISUAL IMAGE ASSET */}
              <div className="bg-zinc-950 border border-amber-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 font-serif font-bold text-amber-200 text-sm">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Visual Stage Backdrop</span>
                  </div>
                  {selectedScene.customImageUrl && (
                    <button
                      onClick={handleResetImage}
                      className="text-xs text-zinc-400 hover:text-amber-300 flex items-center gap-1 underline font-mono"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Default
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 relative rounded-lg overflow-hidden border border-amber-900/60 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={activeDisplayImage}
                      alt={selectedScene.title}
                      className="w-full h-full object-contain"
                    />
                    {selectedScene.customImageUrl && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold uppercase shadow">
                        Custom Image
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-200 border border-zinc-700 rounded text-xs font-mono flex items-center gap-1.5 transition shadow">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Custom Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCustomImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Or select from castle gallery presets:
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PRESET_CASTLE_IMAGES.map(img => {
                          const isPresetActive = activeDisplayImage === img.url;
                          return (
                            <button
                              key={img.id}
                              onClick={() => handleSelectPresetImage(img.url)}
                              className={`relative rounded overflow-hidden aspect-video border transition-all ${
                                isPresetActive
                                  ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                                  : 'border-zinc-800 hover:border-zinc-600 opacity-70 hover:opacity-100'
                              }`}
                              title={img.name}
                            >
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. AUDIO & VOICE CLIP RECORDER */}
              <div className="bg-zinc-950 border border-amber-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 font-serif font-bold text-amber-200 text-sm">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Host Audio & Voice Clip</span>
                  </div>
                  {selectedScene.voiceClip && (
                    <button
                      onClick={handleDeleteVoiceClip}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 underline font-mono"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Clip
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 items-center">
                  {/* Status & Player */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Current Status:</span>
                      {selectedScene.voiceClip ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Voice Clip Attached
                        </span>
                      ) : (
                        <span className="text-zinc-500">Text-to-Speech Synth</span>
                      )}
                    </div>

                    {selectedScene.voiceClip && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={handleTogglePlayClip}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs rounded flex items-center gap-1.5 transition shadow"
                        >
                          {isPlayingCurrentClip ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> Pause Clip
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Preview Audio
                            </>
                          )}
                        </button>
                        <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[150px]">
                          {selectedScene.voiceClip.fileName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Record or Upload Controls */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isRecording ? (
                        <button
                          onClick={handleStartRecording}
                          className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 rounded text-xs font-mono flex items-center gap-1.5 transition shadow"
                        >
                          <Mic className="w-3.5 h-3.5 text-rose-400" />
                          <span>Record Voice Clip</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse shadow-lg"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Stop Recording ({recordingSeconds}s)</span>
                        </button>
                      )}

                      <label className="cursor-pointer px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-200 border border-zinc-700 rounded text-xs font-mono flex items-center gap-1.5 transition shadow">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Audio (MP3/WAV/WebM)</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleUploadAudioFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BROADCAST SCRIPT TEXT EDITOR */}
              <div className="bg-zinc-950 border border-amber-900/40 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 font-serif font-bold text-amber-200 text-sm">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Broadcast Dialogue Script</span>
                  </div>
                  {selectedScene.customText && (
                    <button
                      onClick={handleResetText}
                      className="text-xs text-zinc-400 hover:text-amber-300 flex items-center gap-1 underline font-mono"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Original Script
                    </button>
                  )}
                </div>

                <textarea
                  value={activeDisplayText}
                  onChange={e => handleUpdateText(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-amber-900/60 rounded-lg p-3 text-sm text-amber-100 font-serif leading-relaxed focus:outline-none focus:border-amber-400 resize-y"
                  placeholder="Enter custom speech script text for this scene..."
                />

                <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>Changes are saved automatically to persistent disk storage</span>
                  <button
                    onClick={() => {
                      audioHost.speak(activeDisplayText, selectedScene.phase, selectedScene.round);
                      showNotification('Testing broadcast audio on TV stage!');
                    }}
                    className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-black font-serif font-bold text-xs rounded shadow flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" /> Test Audio Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div className="bg-zinc-900/95 border-t border-amber-900/40 px-6 py-3 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-mono">
            {adminMediaService.isCurrentlySaving() ? (
              <span className="flex items-center gap-2 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                Saving to castle disk vault...
              </span>
            ) : adminMediaService.getSaveError() ? (
              <span className="flex items-center gap-1.5 text-rose-400">
                <X className="w-3.5 h-3.5" />
                {adminMediaService.getSaveError()}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                All media edits and game plans permanently saved
              </span>
            )}
          </div>
          <button
            onClick={async () => {
              if (adminMediaService.isCurrentlySaving()) {
                showNotification('Finalizing castle vault saves...');
              }
              await adminMediaService.save();
              onClose();
            }}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-serif font-bold uppercase tracking-wider text-xs rounded transition-all shadow flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Exit Admin Studio
          </button>
        </div>
      </div>
    </div>
  );
};
