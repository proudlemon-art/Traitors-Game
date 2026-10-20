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
    id: 'prologue_arrival',
    name: 'Jasmine’s Castle Arrival',
    description: 'Claudia at the wrought iron gates of Jasmine’s Castle',
    url: '/assets/aistudio/Screenshot_2026-10-20_at_11.50.13_adceafb3.png',
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

const STORAGE_KEY = 'traitors_castle_admin_media_v2';

function buildInitialScenes(): SceneMediaConfig[] {
  const scenes: SceneMediaConfig[] = [];

  // ROUNDS 1 TO 6 COMPLETE CATALOG
  for (let r = 1; r <= 6; r++) {
    const s = HOST_SCRIPTS[r] || HOST_SCRIPTS[1];
    const roundImg = r === 1 ? PRESET_CASTLE_IMAGES[0].url : (r % 2 === 0 ? PRESET_CASTLE_IMAGES[4].url : PRESET_CASTLE_IMAGES[3].url);

    // 1. Prologue / Intro
    scenes.push({
      id: `ROUND_${r}_INTRO`,
      title: `Round ${r}: Prologue`,
      subtitle: r === 1 ? 'Opening speech welcoming the 7 guests to Jasmine’s Castle' : `Round ${r} morning prologue & cloaks dealt in the dark`,
      round: r,
      phase: 'INTRO',
      defaultText: s.intro,
      defaultImageUrl: r === 1 || r === 6 ? PRESET_CASTLE_IMAGES[0].url : PRESET_CASTLE_IMAGES[4].url,
    });

    // 2. Role Briefing
    scenes.push({
      id: `ROUND_${r}_ROLE_BRIEFING`,
      title: `Round ${r}: Role Briefing`,
      subtitle: `Instructions for players to check phones for secret roles in Round ${r}`,
      round: r,
      phase: 'ROLE_BRIEFING',
      defaultText: s.roleBriefing,
      defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
    });

    // 3. Mission
    const missionNames: Record<number, string> = {
      1: 'Mission 1: The Castle Heist',
      2: 'Mission 2: The Birthday Majority',
      3: 'Mission 3: The Forgery Gallery',
      4: 'Mission 4: Body Disposal Committee',
      5: 'Mission 5: The Counterfeit Expert',
      6: 'Mission 6: The Getaway Auction',
    };
    scenes.push({
      id: `ROUND_${r}_MISSION`,
      title: `Round ${r}: ${missionNames[r] || `Mission ${r}`}`,
      subtitle: `Instructions and rules for Round ${r} mission play`,
      round: r,
      phase: 'MISSION',
      defaultText: s.missionStart,
      defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
    });

    // 4. Round Table Debate
    scenes.push({
      id: `ROUND_${r}_ROUND_TABLE`,
      title: `Round ${r}: The Round Table`,
      subtitle: `Convening the council to interrogate suspects for Round ${r}`,
      round: r,
      phase: 'ROUND_TABLE',
      defaultText: s.roundTable,
      defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
    });

    // 5. Voting Slates Open
    scenes.push({
      id: `ROUND_${r}_VOTING`,
      title: `Round ${r}: Voting Slates Open`,
      subtitle: `Opening secret phone voting for Round ${r}`,
      round: r,
      phase: 'VOTING',
      defaultText: s.votingOpen,
      defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
    });

    // 6. All Votes Locked
    scenes.push({
      id: `ROUND_${r}_ALL_LOCKED`,
      title: `Round ${r}: All Votes Locked`,
      subtitle: `All 7 accusations sealed in wax, commencing reveals`,
      round: r,
      phase: 'VOTE_REVEALS',
      defaultText: s.allVotesLocked,
      defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
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
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });

  scenes.push({
    id: 'SCENE_BANISHMENT_OUTCOME',
    title: 'Banishment Reveal Ceremony',
    subtitle: 'When a player is banished and their true role is revealed',
    phase: 'BANISHMENT_OUTCOME',
    defaultText: "The castle has spoken! Step into the circle of fire. Look into my eyes... Was this soul a Traitor or Faithful?",
    defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
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
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/media');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.media)) {
            this.applySavedScenes(data.media);
            this.isServerLoaded = true;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.scenes.values())));
            }
            this.notify();
          }
        }
      } catch (err) {
        console.warn('Could not fetch server admin media', err);
      }
    }
  }

  private applySavedScenes(savedList: SceneMediaConfig[]) {
    savedList.forEach(saved => {
      const existing = this.scenes.get(saved.id);
      if (existing) {
        this.scenes.set(saved.id, {
          ...existing,
          customText: saved.customText,
          customImageUrl: saved.customImageUrl,
          voiceClip: saved.voiceClip,
        });
      } else {
        this.scenes.set(saved.id, saved);
      }
    });
  }

  private save() {
    const data = Array.from(this.scenes.values());

    // 1. Save to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to save admin media to localStorage', err);
      }
    }

    // 2. Save permanently to server disk via REST API
    if (typeof window !== 'undefined') {
      fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(err => {
        console.warn('Could not permanently persist media to server disk', err);
      });
    }

    this.notify();
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
    // 1. Try round-specific exact match
    const roundSpecificId = `ROUND_${round}_${phase}`;
    if (this.scenes.has(roundSpecificId)) {
      return this.scenes.get(roundSpecificId);
    }

    // 2. Try phase fallback with round match
    for (const scene of this.scenes.values()) {
      if (scene.phase === phase && scene.round === round) {
        return scene;
      }
    }

    // 3. Try global phase match
    for (const scene of this.scenes.values()) {
      if (scene.phase === phase && !scene.round) {
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
}

export const adminMediaService = new AdminMediaService();
