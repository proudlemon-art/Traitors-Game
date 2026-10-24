import { HOST_SCRIPTS } from '../data/dialogue';

export interface VoiceClipData {
  audioUrl: string; // Base64 data URL or external URL
  fileName: string;
  durationSec?: number;
  recordedAt?: string;
  isRecorded?: boolean;
}

export interface SceneMediaConfig {
  id: string;
  title: string;
  subtitle: string;
  round?: number; // 1 to 6, or undefined for global
  phase: string;
  defaultText: string;
  customText?: string;
  defaultImageUrl: string;
  customImageUrl?: string;
  voiceClip?: VoiceClipData;
}

// Preset visual images from the castle gallery
export const PRESET_CASTLE_IMAGES = [
  {
    id: 'crime_scene_mystery',
    name: 'The Candlelit Mystery (Mission 1)',
    description: 'Slumbering lord in armchair with 8 crime scene objects on table',
    url: '/assets/aistudio/The_Candlelit_Castle_Mystery_891f6711.png',
  },
  {
    id: 'prologue_arrival',
    name: 'Jasmine’s Castle Arrival',
    description: 'Claudia at the wrought iron gates of Jasmine’s Castle',
    url: '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png',
  },
  {
    id: 'round_table_slates',
    name: 'Seven Sealed Slates at the Round Table',
    description: 'Claudia placing 7 wax-sealed envelopes at the candlelit Round Table',
    url: '/assets/aistudio/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
  },
  {
    id: 'banishment_reveal',
    name: 'Candlelit Banishment Reveal',
    description: 'Claudia standing in the candlelit castle hall for the Banishment Reveal',
    url: '/assets/aistudio/Candlelit_Banishment_Reveal_50dd669e.png',
  },
  {
    id: 'birthday_majority_mission',
    name: 'The Birthday Majority (Mission 2)',
    description: 'Claudia in the candlelit castle hall for Mission 2: The Birthday Majority',
    url: '/assets/aistudio/Birthday_Majority_in_the_Castle_925a5814.png',
  },
  {
    id: 'round_table_chamber',
    name: 'The Round Table Chamber',
    description: 'Circular candlelit council table with 7 leather seats',
    url: '/src/assets/images/round_table_chamber_1792491572609.jpg',
  },
  {
    id: 'cloak_reveal',
    name: 'The Accusation Crypt',
    description: 'Dramatic black velvet cloak reveal in stone vaulted crypt',
    url: '/src/assets/images/claudia_cloak_reveal_1792491590255.jpg',
  },
  {
    id: 'castle_mist',
    name: 'Scottish Highlands & Castle Mist',
    description: 'Misty Scottish Highlands manor under moody skies',
    url: '/src/assets/images/traitors_castle_mist_1792491571213.jpg',
  },
  {
    id: 'great_hall',
    name: 'The Great Castle Hall',
    description: 'Warm fireplace and portraits in the castle Great Hall',
    url: '/src/assets/images/claudia_host_castle_1792491589363.jpg',
  },
];

const STORAGE_KEY = 'traitors_castle_admin_media_v5';

function buildInitialScenes(): SceneMediaConfig[] {
  const scenes: SceneMediaConfig[] = [];

  // ROUNDS 1 TO 6 COMPLETE CATALOG
  for (let r = 1; r <= 6; r++) {
    const s = HOST_SCRIPTS[r] || HOST_SCRIPTS[1];

    // 1. Prologue / Intro (Same image as Round 1 repeated across all rounds)
    scenes.push({
      id: `ROUND_${r}_INTRO`,
      title: `Round ${r}: Prologue`,
      subtitle: r === 1 ? 'Opening speech welcoming the 7 guests to Jasmine’s Castle' : `Round ${r} morning prologue & cloaks dealt in the dark`,
      round: r,
      phase: 'INTRO',
      defaultText: s.intro,
      defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
      ...(r === 1
        ? {
            voiceClip: {
              audioUrl: '/uploads/audio_ROUND_1_INTRO_1792587571220_ffeb8.webm',
              fileName: 'Round_1_Prologue_Claudia.webm',
            },
          }
        : r === 2
        ? {
            voiceClip: {
              audioUrl:
                '/assets/aistudio/ElevenLabs_2026-10-24T13_34_30_Claudia_ivc_sp100_s50_sb75_v4_2e1ac63c.mp3',
              fileName: 'Round_2_Prologue_Claudia.mp3',
              durationSec: 15,
            },
          }
        : {}),
    });

    // 2. Role Briefing (Same image as Round 1 repeated across all rounds)
    scenes.push({
      id: `ROUND_${r}_ROLE_BRIEFING`,
      title: `Round ${r}: Role Briefing`,
      subtitle: `Instructions for players to check phones for secret roles in Round ${r}`,
      round: r,
      phase: 'ROLE_BRIEFING',
      defaultText: s.roleBriefing,
      defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
    });

    // 3. Mission
    const missionNames: Record<number, string> = {
      1: 'Mission 1: Exhibit A: The Crime Scene',
      2: 'Mission 2: The Birthday Majority',
      3: 'Mission 3: The Forgery Gallery',
      4: 'Mission 4: Body Disposal Committee',
      5: 'Mission 5: The Counterfeit Expert',
      6: 'Mission 6: The Getaway Auction',
    };
    scenes.push({
      id: `ROUND_${r}_MISSION`,
      title: `Round ${r}: ${missionNames[r] || `Mission ${r}`}`,
      subtitle: r === 1 ? 'Examine the 8 crime scene objects and select Exhibit A' : `Instructions and rules for Round ${r} mission play`,
      round: r,
      phase: 'MISSION',
      defaultText: r === 1
        ? 'Look closely at the crime scene before you. Eight curious objects rest upon the table beside our slumbering Lord. One will be chosen as Exhibit A. One Traitor has secretly planted their mark.'
        : s.missionStart,
      defaultImageUrl:
        r === 1
          ? '/assets/aistudio/The_Candlelit_Castle_Mystery_891f6711.png'
          : r === 2
          ? '/assets/aistudio/Birthday_Majority_in_the_Castle_925a5814.png'
          : PRESET_CASTLE_IMAGES[7].url,
      ...(r === 2
        ? {
            voiceClip: {
              audioUrl:
                '/assets/aistudio/ElevenLabs_2026-10-24T14_12_33_Claudia_ivc_sp100_s50_sb75_v4_c621a2e3.mp3',
              fileName: 'Round_2_Mission_Birthday_Majority_Claudia.mp3',
              durationSec: 25,
            },
          }
        : {}),
    });

    // 4. Round Table Debate (Same image across all rounds 1-6; Round 2 uses Poppy audio)
    scenes.push({
      id: `ROUND_${r}_ROUND_TABLE`,
      title: `Round ${r}: The Round Table`,
      subtitle: `Convening the council to interrogate suspects for Round ${r}`,
      round: r,
      phase: 'ROUND_TABLE',
      defaultText: s.roundTable,
      defaultImageUrl: '/assets/aistudio/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
      voiceClip:
        r === 2
          ? {
              audioUrl:
                '/assets/aistudio/ElevenLabs_2026-10-24T14_27_59_Claudia_ivc_sp100_s50_sb75_v4_13301d74.mp3',
              fileName: 'Round_2_Round_Table_Claudia.mp3',
              durationSec: 14,
            }
          : {
              audioUrl:
                '/assets/aistudio/ElevenLabs_2026-10-20T17_01_04_Claudia_ivc_sp100_s50_sb75_v4_f3a7a8ee.mp3',
              fileName: `Round_${r}_Round_Table_Claudia.mp3`,
              durationSec: 24,
            },
    });

    // 5. Voting Slates Open (Duplicated across all rounds 1-6)
    scenes.push({
      id: `ROUND_${r}_VOTING`,
      title: `Round ${r}: Voting Slates Open`,
      subtitle: `Opening secret phone voting for Round ${r}`,
      round: r,
      phase: 'VOTING',
      defaultText: s.votingOpen,
      defaultImageUrl: '/assets/aistudio/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
    });

    // 6. All Votes Locked (Duplicated across all rounds 1-6)
    scenes.push({
      id: `ROUND_${r}_ALL_LOCKED`,
      title: `Round ${r}: All Votes Locked`,
      subtitle: `All 7 accusations sealed in wax, commencing reveals`,
      round: r,
      phase: 'VOTE_REVEALS',
      defaultText: s.allVotesLocked,
      defaultImageUrl: '/assets/aistudio/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
    });

    // 7. Banishment Reveal Ceremony (Duplicated across all rounds 1-6)
    scenes.push({
      id: `ROUND_${r}_BANISHMENT_OUTCOME`,
      title: `Round ${r}: Banishment Reveal`,
      subtitle: `Candlelit banishment reveal ceremony for Round ${r}`,
      round: r,
      phase: 'BANISHMENT_OUTCOME',
      defaultText: s.banishment('Someone', false),
      defaultImageUrl: '/assets/aistudio/Candlelit_Banishment_Reveal_50dd669e.png',
      voiceClip: {
        audioUrl:
          '/assets/aistudio/ElevenLabs_2026-10-24T13_04_48_Claudia_ivc_sp100_s50_sb75_v4_e982cd57.mp3',
        fileName: `Round_${r}_Banishment_Reveal_Claudia.mp3`,
        durationSec: 28,
      },
    });
  }

  // Finale & General Ceremony Scenes
  scenes.push({
    id: 'ROUND_6_FINAL_RESULTS',
    title: 'Grand Awards & Champion Ceremony',
    subtitle: 'Crowning the Grand Champion of Libby’s Birthday',
    round: 6,
    phase: 'FINAL_RESULTS',
    defaultText: HOST_SCRIPTS[6].finalResults('The Grand Champion'),
    defaultImageUrl: PRESET_CASTLE_IMAGES[5].url,
  });

  scenes.push({
    id: 'SCENE_BANISHMENT_OUTCOME',
    title: 'Banishment Reveal Ceremony',
    subtitle: 'When a player is banished and their true role is revealed',
    phase: 'BANISHMENT_OUTCOME',
    defaultText: HOST_SCRIPTS[1].banishment('Someone', false),
    defaultImageUrl: '/assets/aistudio/Candlelit_Banishment_Reveal_50dd669e.png',
    voiceClip: {
      audioUrl:
        '/assets/aistudio/ElevenLabs_2026-10-24T13_04_48_Claudia_ivc_sp100_s50_sb75_v4_e982cd57.mp3',
      fileName: 'Banishment_Reveal_Claudia.mp3',
      durationSec: 28,
    },
  });

  scenes.push({
    id: 'SCENE_TIE_DEFENCE',
    title: 'Deadlock & Tie Defence',
    subtitle: 'Pleading for your lives in sixty seconds before a revote',
    phase: 'TIE_DEFENCE',
    defaultText: "A deadlock! An exact tie. You each have sixty seconds to plead for your lives before a revote.",
    defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
  });

  return scenes;
}

class AdminMediaService {
  private scenes: Map<string, SceneMediaConfig> = new Map();
  private listeners: Set<() => void> = new Set();
  private isServerLoaded: boolean = false;
  private isSaving: boolean = false;
  private lastSavedAt: Date | null = null;
  private saveError: string | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    const defaults = buildInitialScenes();
    defaults.forEach(s => this.scenes.set(s.id, s));

    // 1. Load from localStorage cache immediately
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SceneMediaConfig[] = JSON.parse(stored);
          this.applySavedScenes(parsed);
        }
      } catch (err) {
        console.warn('Failed to load admin media from localStorage', err);
      }
    }

    // 2. Fetch authoritative permanent storage from server API
    await this.refreshFromServer();
  }

  public async refreshFromServer(): Promise<SceneMediaConfig[]> {
    if (typeof window === 'undefined') return this.getAllScenes();
    try {
      const res = await fetch('/api/admin/media');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.media) && data.media.length > 0) {
          this.applySavedScenes(data.media);
          this.isServerLoaded = true;
          this.persistToLocalStorage();
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Could not refresh server admin media:', err);
    }
    return this.getAllScenes();
  }

  private applySavedScenes(savedList: SceneMediaConfig[]) {
    if (!Array.isArray(savedList)) return;
    savedList.forEach(saved => {
      if (!saved || !saved.id) return;
      const existing = this.scenes.get(saved.id);
      if (existing) {
        this.scenes.set(saved.id, {
          ...existing,
          customText: saved.customText ?? existing.customText,
          customImageUrl: saved.customImageUrl ?? existing.customImageUrl,
          voiceClip: saved.voiceClip ?? existing.voiceClip,
        });
      } else {
        this.scenes.set(saved.id, saved);
      }
    });
  }

  private persistToLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = Array.from(this.scenes.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // If quota is tight due to large data URLs, strip them in localStorage fallback
      try {
        const sanitized = Array.from(this.scenes.values()).map(s => ({
          ...s,
          customImageUrl: s.customImageUrl?.startsWith('data:') ? undefined : s.customImageUrl,
          voiceClip: s.voiceClip?.audioUrl?.startsWith('data:') ? undefined : s.voiceClip,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (innerErr) {
        console.warn('LocalStorage save failed:', innerErr);
      }
    }
  }

  public async save(): Promise<boolean> {
    const data = Array.from(this.scenes.values());
    this.isSaving = true;
    this.saveError = null;
    this.notify();

    // 1. Save to localStorage cache
    this.persistToLocalStorage();

    // 2. Save permanently to server disk via REST API
    let success = false;
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            success = true;
            this.lastSavedAt = new Date();
            // If server converted raw base64 data to static /uploads/ URLs, update local store
            if (Array.isArray(resData.media)) {
              this.applySavedScenes(resData.media);
              this.persistToLocalStorage();
            }
          } else {
            this.saveError = resData.error || 'Server rejected save';
          }
        } else {
          this.saveError = `Server returned status ${res.status}`;
        }
      } catch (err: any) {
        console.warn('Could not permanently persist media to server disk', err);
        this.saveError = err?.message || 'Network error saving media';
      }
    }

    this.isSaving = false;
    this.notify();
    return success;
  }

  public async uploadMedia(dataUrl: string, type: 'audio' | 'image', fileName: string, sceneId: string): Promise<string> {
    if (typeof window === 'undefined') return dataUrl;
    try {
      const res = await fetch('/api/admin/upload-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, type, fileName, sceneId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('Direct upload endpoint failed, falling back to inline dataUrl:', err);
    }
    return dataUrl;
  }

  public isCurrentlySaving(): boolean {
    return this.isSaving;
  }

  public getLastSavedAt(): Date | null {
    return this.lastSavedAt;
  }

  public getSaveError(): string | null {
    return this.saveError;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getAllScenes(): SceneMediaConfig[] {
    return Array.from(this.scenes.values());
  }

  public getSceneById(id: string): SceneMediaConfig | undefined {
    return this.scenes.get(id);
  }

  public getActiveScene(phase: string, round: number = 1): SceneMediaConfig | undefined {
    const normalizedPhaseMap: Record<string, string> = {
      FINALE_DISCUSSION: 'ROUND_TABLE',
      FINALE_AUCTION_RECAP: 'ROUND_TABLE',
      FINALE_VOTING: 'VOTING',
      TIE_VOTING: 'VOTING',
      FINALE_VOTE_REVEALS: 'VOTE_REVEALS',
      TIE_REVEALS: 'VOTE_REVEALS',
      FINALE_TIE_REVEALS: 'VOTE_REVEALS',
      FINALE_ELIMINATION: 'BANISHMENT_OUTCOME',
      FINALE_TIE_DEFENCE: 'TIE_DEFENCE',
    };
    const effectivePhase = normalizedPhaseMap[phase] || phase;

    // 1. Try round-specific exact match
    const roundSpecificId = `ROUND_${round}_${effectivePhase}`;
    if (this.scenes.has(roundSpecificId)) {
      return this.scenes.get(roundSpecificId);
    }

    // 2. Try phase fallback with round match
    for (const scene of this.scenes.values()) {
      if (scene.phase === effectivePhase && scene.round === round) {
        return scene;
      }
    }

    // 3. Try global phase match
    for (const scene of this.scenes.values()) {
      if (scene.phase === effectivePhase && !scene.round) {
        return scene;
      }
    }

    // 4. Default to round intro
    return this.scenes.get(`ROUND_${round}_INTRO`) || this.scenes.get('ROUND_1_INTRO');
  }

  public updateSceneText(id: string, customText: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    scene.customText = customText.trim();
    this.save();
  }

  public resetSceneText(id: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    delete scene.customText;
    this.save();
  }

  public updateSceneImage(id: string, imageUrl: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    scene.customImageUrl = imageUrl.trim();
    this.save();
  }

  public resetSceneImage(id: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    delete scene.customImageUrl;
    this.save();
  }

  public setSceneVoiceClip(id: string, clip: VoiceClipData) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    scene.voiceClip = clip;
    this.save();
  }

  public removeSceneVoiceClip(id: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    delete scene.voiceClip;
    this.save();
  }

  public resetScene(id: string) {
    const scene = this.scenes.get(id);
    if (!scene) return;
    delete scene.customText;
    delete scene.customImageUrl;
    delete scene.voiceClip;
    this.save();
  }

  public resetAllToDefaults() {
    this.scenes.clear();
    const defaults = buildInitialScenes();
    defaults.forEach(s => this.scenes.set(s.id, s));
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      fetch('/api/admin/media/reset', { method: 'POST' }).catch(() => {});
    }
    this.notify();
  }

  public exportConfigJson(): string {
    const data = Array.from(this.scenes.values());
    return JSON.stringify(data, null, 2);
  }

  public importConfigJson(jsonStr: string): boolean {
    try {
      const parsed: SceneMediaConfig[] = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return false;
      this.applySavedScenes(parsed);
      this.save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  // Aliases for component convenience:
  public setVoiceClip(id: string, clip: VoiceClipData) {
    this.setSceneVoiceClip(id, clip);
  }

  public removeVoiceClip(id: string) {
    this.removeSceneVoiceClip(id);
  }

  public setImage(id: string, imageUrl: string) {
    this.updateSceneImage(id, imageUrl);
  }

  public resetImageToDefault(id: string) {
    this.resetSceneImage(id);
  }

  public setText(id: string, customText: string) {
    this.updateSceneText(id, customText);
  }

  public resetTextToDefault(id: string) {
    this.resetSceneText(id);
  }

  public exportJsonConfig(): string {
    return this.exportConfigJson();
  }

  public importJsonConfig(jsonStr: string): boolean {
    return this.importConfigJson(jsonStr);
  }
}

export const adminMediaService = new AdminMediaService();
