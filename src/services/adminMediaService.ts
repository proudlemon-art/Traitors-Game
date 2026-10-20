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

  // Round 1
  scenes.push({
    id: 'ROUND_1_INTRO',
    title: 'Round 1: Welcome & Prologue',
    subtitle: 'Opening speech welcoming the 7 guests to Jasmine’s Castle',
    round: 1,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[1].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[0].url,
  });
  scenes.push({
    id: 'ROUND_1_ROLE_BRIEFING',
    title: 'Round 1: Role Briefing',
    subtitle: 'Instructions to check phones for Traitor / Faithful identities',
    round: 1,
    phase: 'ROLE_BRIEFING',
    defaultText: HOST_SCRIPTS[1].roleBriefing,
    defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
  });
  scenes.push({
    id: 'ROUND_1_MISSION',
    title: 'Round 1: Mission 1 (The Castle Heist)',
    subtitle: 'Instructions for the 3-stage scavenger heist across the house',
    round: 1,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[1].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });
  scenes.push({
    id: 'ROUND_1_ROUND_TABLE',
    title: 'Round 1: The Round Table',
    subtitle: 'Calling players to the table to begin the first debate',
    round: 1,
    phase: 'ROUND_TABLE',
    defaultText: HOST_SCRIPTS[1].roundTable,
    defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
  });
  scenes.push({
    id: 'ROUND_1_VOTING',
    title: 'Round 1: Voting Slates Open',
    subtitle: 'Opening secret voting on player phone slates',
    round: 1,
    phase: 'VOTING',
    defaultText: HOST_SCRIPTS[1].votingOpen,
    defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
  });
  scenes.push({
    id: 'ROUND_1_ALL_LOCKED',
    title: 'Round 1: All Votes Locked',
    subtitle: 'All 7 slates sealed in wax, preparing for reveals',
    round: 1,
    phase: 'VOTE_REVEALS',
    defaultText: HOST_SCRIPTS[1].allVotesLocked,
    defaultImageUrl: PRESET_CASTLE_IMAGES[2].url,
  });

  // Round 2
  scenes.push({
    id: 'ROUND_2_INTRO',
    title: 'Round 2: Prologue',
    subtitle: 'Fresh cloaks dealt in the dark for round two',
    round: 2,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[2].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });
  scenes.push({
    id: 'ROUND_2_MISSION',
    title: 'Round 2: Mission 2 (The Birthday Majority)',
    subtitle: 'Instructions for voting on the 5 majority questions',
    round: 2,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[2].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });
  scenes.push({
    id: 'ROUND_2_ROUND_TABLE',
    title: 'Round 2: The Round Table',
    subtitle: 'Debating who steered the birthday majority consensus',
    round: 2,
    phase: 'ROUND_TABLE',
    defaultText: HOST_SCRIPTS[2].roundTable,
    defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
  });

  // Round 3
  scenes.push({
    id: 'ROUND_3_INTRO',
    title: 'Round 3: Prologue',
    subtitle: 'Paranoia setting in, tea is cold, glances are frosty',
    round: 3,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[3].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });
  scenes.push({
    id: 'ROUND_3_MISSION',
    title: 'Round 3: Mission 3 (The Forgery Gallery)',
    subtitle: 'Paper and sketch pens ready for secret drawing brief',
    round: 3,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[3].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });

  // Round 4
  scenes.push({
    id: 'ROUND_4_INTRO',
    title: 'Round 4: Prologue',
    subtitle: 'Friendships fraying at the seams in round four',
    round: 4,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[4].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });
  scenes.push({
    id: 'ROUND_4_MISSION',
    title: 'Round 4: Mission 4 (Body Disposal Committee)',
    subtitle: 'Absurd storytelling crisis with 5 household objects',
    round: 4,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[4].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });

  // Round 5
  scenes.push({
    id: 'ROUND_5_INTRO',
    title: 'Round 5: Prologue',
    subtitle: 'Penultimate chapter, paranoia at boiling point',
    round: 5,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[5].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });
  scenes.push({
    id: 'ROUND_5_MISSION',
    title: 'Round 5: Mission 5 (Counterfeit Expert)',
    subtitle: 'Pitching ridiculous inventions with secret smuggler words',
    round: 5,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[5].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });

  // Round 6
  scenes.push({
    id: 'ROUND_6_INTRO',
    title: 'Round 6: The Grand Finale Prologue',
    subtitle: 'Final round of Libby’s Birthday: Trust Nobody',
    round: 6,
    phase: 'INTRO',
    defaultText: HOST_SCRIPTS[6].intro,
    defaultImageUrl: PRESET_CASTLE_IMAGES[0].url,
  });
  scenes.push({
    id: 'ROUND_6_MISSION',
    title: 'Round 6: Mission 6 (The Getaway Auction)',
    subtitle: 'Bidding 12 auction coins on 6 getaway lots',
    round: 6,
    phase: 'MISSION',
    defaultText: HOST_SCRIPTS[6].missionStart,
    defaultImageUrl: PRESET_CASTLE_IMAGES[3].url,
  });
  scenes.push({
    id: 'ROUND_6_ROUND_TABLE',
    title: 'Round 6: The Final Round Table',
    subtitle: 'Everything comes down to this final confrontation',
    round: 6,
    phase: 'ROUND_TABLE',
    defaultText: HOST_SCRIPTS[6].roundTable,
    defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
  });
  scenes.push({
    id: 'ROUND_6_FINAL_RESULTS',
    title: 'Grand Awards & Champion Ceremony',
    subtitle: 'Crowning the Grand Champion of Libby’s Birthday',
    round: 6,
    phase: 'FINAL_RESULTS',
    defaultText: HOST_SCRIPTS[6].finalResults('The Grand Champion'),
    defaultImageUrl: PRESET_CASTLE_IMAGES[4].url,
  });

  // General Banishment and Tie Scenes
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

  constructor() {
    this.init();
  }

  private init() {
    const defaults = buildInitialScenes();
    defaults.forEach(s => this.scenes.set(s.id, s));

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SceneMediaConfig[] = JSON.parse(stored);
          parsed.forEach(saved => {
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
      } catch (err) {
        console.warn('Failed to load admin media from localStorage', err);
      }
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.scenes.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to save admin media to localStorage', err);
      }
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

  /**
   * Resolves the matching SceneMediaConfig for the current phase and round.
   */
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

    // 4. Default to first scene
    return this.scenes.get('ROUND_1_INTRO');
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
      parsed.forEach(scene => {
        if (scene.id) {
          const existing = this.scenes.get(scene.id);
          if (existing) {
            this.scenes.set(scene.id, {
              ...existing,
              customText: scene.customText,
              customImageUrl: scene.customImageUrl,
              voiceClip: scene.voiceClip,
            });
          } else {
            this.scenes.set(scene.id, scene);
          }
        }
      });
      this.save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
}

export const adminMediaService = new AdminMediaService();
