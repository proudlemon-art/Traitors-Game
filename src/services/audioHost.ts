import { AudioEventMapping } from '../types/game';

export const DEFAULT_PRESET_CLIPS: AudioEventMapping[] = [
  {
    eventId: 'INTRO',
    name: 'Game Welcome & Prologue (Claudia Winkleman Voice)',
    audioUrl: '/assets/aistudio/ElevenLabs_2026-10-20T10_46_01_Claudia_ivc_sp100_s50_sb75_v4_8575bc69.mp3',
    fileName: 'Claudia_JasmineCastle_Opener.mp3',
  },
];

class AudioHostService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private rate: number = 0.92; // Slightly slower for dramatic theatrical delivery
  private pitch: number = 0.88; // Lower, husky Claudia Winkleman pitch
  private isMuted: boolean = false;
  private isSpeakingActive: boolean = false;
  private lastSpokenText: string = '';
  private customClips: Map<string, AudioEventMapping> = new Map();
  private captionListeners: Set<(caption: string) => void> = new Set();
  private speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      this.loadStoredClips();
    }
  }

  public unlockAudio(): boolean {
    this.isUnlocked = true;
    if (this.synth) {
      // Resume if paused
      if (this.synth.paused) {
        this.synth.resume();
      }
      // Speak an imperceptible zero-length utterance to unlock browser audio policy
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      this.synth.speak(dummy);
    }
    return true;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.availableVoices = voices;

    // Prefer British English voices (en-GB, UK, British, Claudia/Victoria/George/Daniel)
    const britishVoices = voices.filter(
      v => v.lang.startsWith('en-GB') || v.lang.includes('GB') || v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('british')
    );

    if (britishVoices.length > 0) {
      // Try to find a female British voice first (e.g. Google UK English Female, Victoria, Kate, Martha, Serena)
      const femaleBritish = britishVoices.find(
        v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('kate') || v.name.toLowerCase().includes('victoria') || v.name.toLowerCase().includes('serena')
      );
      this.selectedVoice = femaleBritish || britishVoices[0];
    } else {
      // Fallback to any English voice
      const anyEnglish = voices.find(v => v.lang.startsWith('en'));
      this.selectedVoice = anyEnglish || voices[0] || null;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
    return this.availableVoices;
  }

  public setVoice(voiceUri: string) {
    const found = this.availableVoices.find(v => v.voiceURI === voiceUri);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  public setRate(newRate: number) {
    this.rate = Math.max(0.6, Math.min(1.5, newRate));
  }

  public getRate(): number {
    return this.rate;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public subscribeCaptions(listener: (caption: string) => void) {
    this.captionListeners.add(listener);
    if (this.lastSpokenText) {
      listener(this.lastSpokenText);
    }
    return () => {
      this.captionListeners.delete(listener);
    };
  }

  private notifyCaptions(text: string) {
    this.lastSpokenText = text;
    this.captionListeners.forEach(listener => listener(text));
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }

  public setPitch(newPitch: number) {
    this.pitch = Math.max(0.7, Math.min(1.3, newPitch));
  }

  public getPitch(): number {
    return this.pitch;
  }

  public subscribeSpeaking(listener: (isSpeaking: boolean) => void) {
    this.speakingListeners.add(listener);
    listener(this.isSpeakingActive);
    return () => {
      this.speakingListeners.delete(listener);
    };
  }

  private notifySpeaking(isSpeaking: boolean) {
    this.isSpeakingActive = isSpeaking;
    this.speakingListeners.forEach(listener => listener(isSpeaking));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  public stop() {
    this.notifySpeaking(false);
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
  }

  public replay() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }

  public previewVoice() {
    this.unlockAudio();
    this.speak(
      "Welcome to Jasmine’s Castle.\n\nSeven of you have arrived. All alive. Lovely. Let’s not get attached.\n\nWe’re celebrating Libby’s birthday, and nothing says friendship quite like Murder, Merlot and Manipulation.\n\nAmong you is a Traitor. They’ll smile at you. Agree with you. Possibly offer to get you another drink while actively planning your demise.\n\nAnd you’ll defend them. That’s my favourite bit.\n\nThere will be accusations. There will be betrayal. Someone will say, ‘I swear on my life.’\n\nDo listen carefully when that happens. They’ve usually overvalued it.\n\nNow. Phones out. Secrets to yourselves.\n\nLet’s make this uncomfortable.",
      'INTRO'
    );
  }

  /**
   * Main speech method. If eventId is provided and an uploaded audio clip exists,
   * plays the uploaded clip. Otherwise, uses speech synthesis with British voice.
   */
  public speak(text: string, eventId?: string): Promise<void> {
    this.notifyCaptions(text);

    if (this.isMuted) {
      return Promise.resolve();
    }

    this.stop();
    this.notifySpeaking(true);

    // Resolve eventId (e.g. LOBBY falls back to INTRO if no LOBBY clip)
    const effectiveEventId = eventId || (text.includes('Welcome to Jasmine’s Castle') ? 'INTRO' : undefined);
    const lookupId = (effectiveEventId === 'LOBBY' && !this.customClips.has('LOBBY')) ? 'INTRO' : effectiveEventId;

    // Check if custom uploaded clip is mapped for this event
    if (lookupId && this.customClips.has(lookupId)) {
      const clip = this.customClips.get(lookupId);
      if (clip?.audioUrl) {
        return new Promise(resolve => {
          const audio = new Audio(clip.audioUrl);
          this.currentAudioElement = audio;
          audio.playbackRate = 1.0; // Play authentic audio recording at original speed
          audio.onended = () => {
            this.currentAudioElement = null;
            this.notifySpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            // Fall back to TTS if audio playback fails
            this.speakWithTTS(text).then(resolve);
          };
          audio.play().catch(() => {
            this.speakWithTTS(text).then(resolve);
          });
        });
      }
    }

    return this.speakWithTTS(text);
  }

  private speakWithTTS(text: string): Promise<void> {
    const synth = this.synth;
    if (!synth) {
      this.notifySpeaking(false);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        }
        utterance.rate = this.rate;
        utterance.pitch = this.pitch; // Husky Claudia Winkleman pitch
        utterance.onstart = () => this.notifySpeaking(true);
        utterance.onend = () => {
          this.notifySpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          this.notifySpeaking(false);
          resolve();
        };
        this.currentUtterance = utterance;
        synth.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        this.notifySpeaking(false);
        resolve();
      }
    });
  }

  // Custom audio clips management
  public mapClip(eventId: string, name: string, audioUrl: string, fileName?: string) {
    this.customClips.set(eventId, { eventId, name, audioUrl, fileName });
    this.saveStoredClips();
  }

  public removeClip(eventId: string) {
    this.customClips.delete(eventId);
    this.saveStoredClips();
  }

  public getClips(): AudioEventMapping[] {
    return Array.from(this.customClips.values());
  }

  private saveStoredClips() {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized = JSON.stringify(Array.from(this.customClips.entries()));
      localStorage.setItem('traitors_custom_clips', serialized);
    } catch (e) {
      console.warn('Could not save clips to localStorage', e);
    }
  }

  private loadStoredClips() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem('traitors_custom_clips');
      if (stored) {
        const entries = JSON.parse(stored);
        this.customClips = new Map(entries);
      }
    } catch (e) {
      console.warn('Could not parse stored clips', e);
    }
  }
}

export const audioHost = new AudioHostService();
