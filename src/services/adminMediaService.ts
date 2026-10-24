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
    url: '/castle-media/The_Candlelit_Castle_Mystery_891f6711.png',
  },
  {
    id: 'prologue_arrival',
    name: 'Jasmine’s Castle Arrival',
    description: 'Claudia at the wrought iron gates of Jasmine’s Castle',
    url: '/castle-media/Screenshot_2026-10-20_at_11.50.13_adceafb3.png',
  },
  {
    id: 'round_table_slates',
    name: 'Seven Sealed Slates at the Round Table',
    description: 'Claudia placing 7 wax-sealed envelopes at the candlelit Round Table',
    url: '/castle-media/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
  },
  {
    id: 'banishment_reveal',
    name: 'Candlelit Banishment Reveal',
    description: 'Claudia standing in the candlelit castle hall for the Banishment Reveal',
    url: '/castle-media/Candlelit_Banishment_Reveal_50dd669e.png',
  },
  {
    id: 'birthday_majority_mission',
    name: 'The Birthday Majority (Mission 2)',
    description: 'Claudia in the candlelit castle hall for Mission 2: The Birthday Majority',
    url: '/castle-media/Birthday_Majority_in_the_Castle_925a5814.png',
  },
  {
    id: 'forgery_gallery_mission',
    name: 'The Forgery Gallery (Mission 3)',
    description: 'Mission Three: The Forgery Gallery — Masterpiece or misdirection?',
    url: '/castle-media/The_Forgery_Gallery_efeeaa3f.png',
  },
  {
    id: 'body_disposal_mission',
    name: 'The Body Disposal Committee (Mission 4)',
    description: 'Mission Four: The Body Disposal Committee — Tandem bicycle & household objects',
    url: '/castle-media/Pirate_s_Tandem_Escape_Plan_b8d68311.png',
  },
  {
    id: 'counterfeit_expert_mission',
    name: 'The Counterfeit Expert (Mission 5)',
    description: 'Mission Five: The Counterfeit Expert — Brass teacup invention pitch',
    url: '/castle-media/Woman_Presenting_a_Brass_Teacup_Invention_8d0dc60f.png',
  },
  {
    id: 'getaway_auction_mission',
    name: 'The Getaway Auction (Mission 6)',
    description: 'Mission Six: The Getaway Auction — Mystery escape lots & gold coins',
    url: '/castle-media/Final_mission_The_getaway_auction.png',
  },
  {
    id: 'finale_final_reveal',
    name: 'The Final Reveal: The Finale',
    description: 'The Finale — One last look around the table with 7 guests and golden goblet',
    url: '/castle-media/Seven_at_the_final_reveal_84c3c2c2.png',
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

const STORAGE_KEY = 'traitors_castle_admin_media_v19';

export function normalizeCastleMediaUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/assets/aistudio/')) {
    return url.replace('/assets/aistudio/', '/castle-media/');
  }
  return url;
}

function buildInitialScenes(): SceneMediaConfig[] {
  const scenes: SceneMediaConfig[] = [];

  const introAudioByRound: Record<number, { audioUrl: string; fileName: string; durationSec: number }> = {
    1: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-20T10_46_01_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_1_Prologue_Claudia.mp3',
      durationSec: 32,
    },
    2: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T13_34_30_Claudia_ivc_sp100_s50_sb75_v4_2e1ac63c.mp3',
      fileName: 'Round_2_Prologue_Claudia.mp3',
      durationSec: 15,
    },
    3: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_42_51_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_3_Prologue_Claudia.mp3',
      durationSec: 19,
    },
    4: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_16_17_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_4_Prologue_Claudia.mp3',
      durationSec: 18,
    },
    5: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_32_00_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_5_Prologue_Claudia.mp3',
      durationSec: 16,
    },
    6: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_42_30_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_6_Prologue_Claudia.mp3',
      durationSec: 21,
    },
  };

  const roleBriefingAudioByRound: Record<number, { audioUrl: string; fileName: string; durationSec: number }> = {
    1: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-20T13_49_46_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_1_Role_Briefing_Claudia.mp3',
      durationSec: 19,
    },
    2: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_05_52_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_2_Role_Briefing_Claudia.mp3',
      durationSec: 9,
    },
    3: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_48_06_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_3_Role_Briefing_Claudia.mp3',
      durationSec: 14,
    },
    4: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_17_26_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_4_Role_Briefing_Claudia.mp3',
      durationSec: 15,
    },
    5: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_32_44_Claudia_ivc_sp100_s50_sb75_v4__1__ab52da49.mp3',
      fileName: 'Round_5_Role_Briefing_Claudia.mp3',
      durationSec: 16,
    },
    6: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_43_40_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_6_Role_Briefing_Claudia.mp3',
      durationSec: 15,
    },
  };

  const missionAudioByRound: Record<number, { audioUrl: string; fileName: string; durationSec: number }> = {
    1: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-20T17_03_10_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_1_Mission_Exhibit_A_Claudia.mp3',
      durationSec: 28,
    },
    2: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_12_33_Claudia_ivc_sp100_s50_sb75_v4_c621a2e3.mp3',
      fileName: 'Round_2_Mission_Birthday_Majority_Claudia.mp3',
      durationSec: 25,
    },
    3: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_49_51_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_3_Mission_Forgery_Gallery_Claudia.mp3',
      durationSec: 19,
    },
    4: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_20_21_Claudia_ivc_sp100_s50_sb75_v4_c4d3b012.mp3',
      fileName: 'Round_4_Mission_Body_Disposal_Claudia.mp3',
      durationSec: 34,
    },
    5: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_33_58_Claudia_ivc_sp100_s50_sb75_v4__1__6f7fd83c.mp3',
      fileName: 'Round_5_Mission_Counterfeit_Expert_Claudia.mp3',
      durationSec: 24,
    },
    6: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_44_45_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_6_Mission_Getaway_Auction_Claudia.mp3',
      durationSec: 22,
    },
  };

  const roundTableAudioByRound: Record<number, { audioUrl: string; fileName: string; durationSec: number }> = {
    1: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-20T17_01_04_Claudia_ivc_sp100_s50_sb75_v4_f3a7a8ee.mp3',
      fileName: 'Round_1_Round_Table_Claudia.mp3',
      durationSec: 24,
    },
    2: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_27_59_Claudia_ivc_sp100_s50_sb75_v4_13301d74.mp3',
      fileName: 'Round_2_Round_Table_Claudia.mp3',
      durationSec: 14,
    },
    3: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_14_49_Claudia_ivc_sp100_s50_sb75_v4_8da55de8.mp3',
      fileName: 'Round_3_Round_Table_Claudia.mp3',
      durationSec: 28,
    },
    4: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_30_37_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_4_Round_Table_Claudia.mp3',
      durationSec: 24,
    },
    5: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_41_20_Claudia_ivc_sp100_s50_sb75_v4.mp3',
      fileName: 'Round_5_Round_Table_Claudia.mp3',
      durationSec: 24,
    },
    6: {
      audioUrl: '/castle-media/ElevenLabs_2026-10-24T15_48_08_Claudia_ivc_sp100_s50_sb75_v4_6dfe2fbc.mp3',
      fileName: 'Round_6_Round_Table_Claudia.mp3',
      durationSec: 28,
    },
  };

  const FINALE_IMAGE_URL = '/castle-media/Seven_at_the_final_reveal_84c3c2c2.png';

  // ROUNDS 1 TO 6 COMPLETE CATALOG
  for (let r = 1; r <= 6; r++) {
    const s = HOST_SCRIPTS[r] || HOST_SCRIPTS[1];

    // 1. Prologue / Intro
    scenes.push({
      id: `ROUND_${r}_INTRO`,
      title: `Round ${r}: Prologue`,
      subtitle: r === 1 ? 'Opening speech welcoming the 7 guests to Jasmine’s Castle' : `Round ${r} morning prologue & cloaks dealt in the dark`,
      round: r,
      phase: 'INTRO',
      defaultText: s.intro,
      defaultImageUrl: r === 6 ? FINALE_IMAGE_URL : PRESET_CASTLE_IMAGES[1].url,
      voiceClip: introAudioByRound[r],
    });

    // 2. Role Briefing
    scenes.push({
      id: `ROUND_${r}_ROLE_BRIEFING`,
      title: `Round ${r}: Role Briefing`,
      subtitle: `Instructions for players to check phones for secret roles in Round ${r}`,
      round: r,
      phase: 'ROLE_BRIEFING',
      defaultText: s.roleBriefing,
      defaultImageUrl: r === 6 ? FINALE_IMAGE_URL : PRESET_CASTLE_IMAGES[1].url,
      voiceClip: roleBriefingAudioByRound[r],
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
      defaultText: s.missionStart,
      defaultImageUrl:
        r === 1
          ? '/castle-media/The_Candlelit_Castle_Mystery_891f6711.png'
          : r === 2
          ? '/castle-media/Birthday_Majority_in_the_Castle_925a5814.png'
          : r === 3
          ? '/castle-media/The_Forgery_Gallery_efeeaa3f.png'
          : r === 4
          ? '/castle-media/Pirate_s_Tandem_Escape_Plan_b8d68311.png'
          : r === 5
          ? '/castle-media/Woman_Presenting_a_Brass_Teacup_Invention_8d0dc60f.png'
          : '/castle-media/Final_mission_The_getaway_auction.png',
      voiceClip: missionAudioByRound[r],
    });

    // 3b. Round 3 Forgery Gallery — Pens Down (Played automatically when the 2-minute timer finishes)
    if (r === 3) {
      scenes.push({
        id: 'ROUND_3_PENS_DOWN',
        title: 'Round 3: Forgery Gallery — Pens Down (Time Up!)',
        subtitle: 'Auto-plays when the 2-minute sketching timer reaches 0:00',
        round: 3,
        phase: 'PENS_DOWN',
        defaultText:
          "Pens down! Your masterpieces are complete — I'm using that word very generously. Hold up your drawings in three, two, one! Have a good look around. The Faithful were all working from the same secret brief. The Traitor had something different. Who's drawn something suspicious, and who is simply terrible at drawing?",
        defaultImageUrl: '/castle-media/The_Forgery_Gallery_efeeaa3f.png',
        voiceClip: {
          audioUrl: '/castle-media/ElevenLabs_2026-10-24T14_51_56_Claudia_ivc_sp100_s50_sb75_v4.mp3',
          fileName: 'Round_3_Pens_Down_Claudia.mp3',
          durationSec: 22,
        },
      });
    }

    // 4. Round Table Debate
    scenes.push({
      id: `ROUND_${r}_ROUND_TABLE`,
      title: `Round ${r}: The Round Table`,
      subtitle: `Convening the council to interrogate suspects for Round ${r}`,
      round: r,
      phase: 'ROUND_TABLE',
      defaultText: s.roundTable,
      defaultImageUrl:
        r === 6
          ? FINALE_IMAGE_URL
          : '/castle-media/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
      voiceClip: roundTableAudioByRound[r],
    });

    // 5. Voting Slates Open
    scenes.push({
      id: `ROUND_${r}_VOTING`,
      title: `Round ${r}: Voting Slates Open`,
      subtitle: `Opening secret phone voting for Round ${r}`,
      round: r,
      phase: 'VOTING',
      defaultText: s.votingOpen,
      defaultImageUrl:
        r === 6
          ? FINALE_IMAGE_URL
          : '/castle-media/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
      voiceClip: {
        audioUrl: '/castle-media/ElevenLabs_2026-10-20T17_13_30_Claudia_ivc_sp100_s50_sb75_v4.mp3',
        fileName: `Round_${r}_Voting_Open_Claudia.mp3`,
        durationSec: 17,
      },
    });

    // 6. All Votes Locked
    scenes.push({
      id: `ROUND_${r}_ALL_LOCKED`,
      title: `Round ${r}: All Votes Locked`,
      subtitle: `All 7 accusations sealed in wax, commencing reveals`,
      round: r,
      phase: 'VOTE_REVEALS',
      defaultText: s.allVotesLocked,
      defaultImageUrl:
        r === 6
          ? FINALE_IMAGE_URL
          : '/castle-media/Seven_Sealed_Slates_at_the_Round_Table_a2338a35.png',
      voiceClip: {
        audioUrl: '/castle-media/ElevenLabs_2026-10-20T17_14_29_Claudia_ivc_sp100_s50_sb75_v4.mp3',
        fileName: `Round_${r}_All_Votes_Locked_Claudia.mp3`,
        durationSec: 12,
      },
    });

    // 7. Banishment Reveal Ceremony
    scenes.push({
      id: `ROUND_${r}_BANISHMENT_OUTCOME`,
      title: `Round ${r}: Banishment Reveal`,
      subtitle: `Candlelit banishment reveal ceremony for Round ${r}`,
      round: r,
      phase: 'BANISHMENT_OUTCOME',
      defaultText: s.banishment('Someone', false),
      defaultImageUrl:
        r === 6
          ? FINALE_IMAGE_URL
          : '/castle-media/Candlelit_Banishment_Reveal_50dd669e.png',
      voiceClip: {
        audioUrl:
          '/castle-media/ElevenLabs_2026-10-24T13_04_48_Claudia_ivc_sp100_s50_sb75_v4_e982cd57.mp3',
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
    defaultImageUrl: FINALE_IMAGE_URL,
    voiceClip: {
      audioUrl:
        '/castle-media/ElevenLabs_2026-10-24T17_15_37_Claudia_ivc_sp100_s50_sb75_v4_f94b6dc6.mp3',
      fileName: 'Round_6_Final_Results_Claudia.mp3',
      durationSec: 21,
    },
  });

  scenes.push({
    id: 'SCENE_BANISHMENT_OUTCOME',
    title: 'Banishment Reveal Ceremony',
    subtitle: 'When a player is banished and their true role is revealed',
    phase: 'BANISHMENT_OUTCOME',
    defaultText: HOST_SCRIPTS[1].banishment('Someone', false),
    defaultImageUrl: '/castle-media/Candlelit_Banishment_Reveal_50dd669e.png',
    voiceClip: {
      audioUrl:
        '/castle-media/ElevenLabs_2026-10-24T13_04_48_Claudia_ivc_sp100_s50_sb75_v4_e982cd57.mp3',
      fileName: 'Banishment_Reveal_Claudia.mp3',
      durationSec: 28,
    },
  });

  scenes.push({
    id: 'SCENE_TIE_DEFENCE',
    title: 'Deadlock & Tie Defence',
    subtitle: 'Pleading for your lives in sixty seconds before a revote',
    phase: 'TIE_DEFENCE',
    defaultText:
      "Stop everything! A deadlock at the Round Table — an exact tie! Look at the screen to see who is in the firing line. You each have sixty seconds to plead for your lives and convince this table of your innocence before we go to a sudden-death revote. Your time starts now!",
    defaultImageUrl: PRESET_CASTLE_IMAGES[1].url,
    voiceClip: {
      audioUrl:
        '/castle-media/ElevenLabs_2026-10-24T17_24_00_Claudia_ivc_sp100_s50_sb75_v4_35c184ad.mp3',
      fileName: 'Tie_Defence_Claudia.mp3',
      durationSec: 19,
    },
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
    const invalidUrls = new Set([
      '/audio/round1_prologue.mp3',
      '/uploads/audio_ROUND_1_INTRO_1792587571220_ffeb8.webm',
      '/uploads/img_ROUND_1_INTRO_1792587579438_m8ogc.png',
    ]);
    savedList.forEach(saved => {
      if (!saved || !saved.id) return;
      const existing = this.scenes.get(saved.id);
      const normalizedSavedAudioUrl = normalizeCastleMediaUrl(saved.voiceClip?.audioUrl);
      const validVoiceClip =
        normalizedSavedAudioUrl && !invalidUrls.has(normalizedSavedAudioUrl)
          ? { ...saved.voiceClip!, audioUrl: normalizedSavedAudioUrl }
          : undefined;
      const normalizedSavedImageUrl = normalizeCastleMediaUrl(saved.customImageUrl);
      const validCustomImage =
        normalizedSavedImageUrl &&
        !invalidUrls.has(normalizedSavedImageUrl) &&
        !(
          (existing?.defaultImageUrl?.startsWith('/castle-media/') ||
            existing?.defaultImageUrl?.startsWith('/assets/aistudio/')) &&
          normalizedSavedImageUrl.startsWith('/src/assets/images/')
        )
          ? normalizedSavedImageUrl
          : undefined;
      const validCustomText =
        saved.customText && saved.customText !== 'Welcome to the castle'
          ? saved.customText
          : undefined;

      if (existing) {
        const hasBuiltInClip =
          existing.voiceClip?.audioUrl?.startsWith('/castle-media/') ||
          existing.voiceClip?.audioUrl?.startsWith('/assets/aistudio/');
        this.scenes.set(saved.id, {
          ...existing,
          customText: validCustomText ?? existing.customText,
          customImageUrl: validCustomImage ?? existing.customImageUrl,
          voiceClip: hasBuiltInClip
            ? validVoiceClip?.audioUrl?.startsWith('data:')
              ? validVoiceClip
              : existing.voiceClip
            : validVoiceClip ?? existing.voiceClip,
        });
      } else {
        this.scenes.set(saved.id, {
          ...saved,
          defaultImageUrl: normalizeCastleMediaUrl(saved.defaultImageUrl) || saved.defaultImageUrl,
          customText: validCustomText,
          customImageUrl: validCustomImage,
          voiceClip: validVoiceClip,
        });
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
    // 0. If an exact scene ID was passed (e.g. 'ROUND_3_PENS_DOWN'), return it directly
    if (this.scenes.has(phase)) {
      return this.scenes.get(phase);
    }

    const normalizedPhaseMap: Record<string, string> = {
      FINALE_DISCUSSION: 'ROUND_TABLE',
      FINALE_AUCTION_RECAP: 'ROUND_TABLE',
      FINALE_VOTING: 'VOTING',
      TIE_VOTING: 'VOTING',
      FINALE_TIE_VOTING: 'VOTING',
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
