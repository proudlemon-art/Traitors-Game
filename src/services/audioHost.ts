import { AudioEventMapping } from '../types/game';
import { adminMediaService, VoiceClipData } from './adminMediaService';

class AudioHostService {
  private currentAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isSpeakingActive: boolean = false;
  private lastSpokenText: string = '';
  private currentActiveClip: VoiceClipData | null = null;
  private captionListeners: Set<(caption: string) => void> = new Set();
  private speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
  private isUnlocked: boolean = false;

  constructor() {
    // Initialized without any pre-recorded voice clips or automatic TTS
  }

  public unlockAudio(): boolean {
    this.isUnlocked = true;
    return true;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
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

  public notifyCaptions(text: string) {
    this.lastSpokenText = text;
    this.captionListeners.forEach(listener => listener(text));
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
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

  public getCurrentClip(): VoiceClipData | null {
    return this.currentActiveClip;
  }

  public stop() {
    this.notifySpeaking(false);
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    this.currentActiveClip = null;
  }

  public replay() {
    if (this.currentActiveClip?.audioUrl) {
      this.playCustomClip(this.currentActiveClip);
    }
  }

  /**
   * Plays a custom audio clip (from file upload or microphone recording)
   */
  public playCustomClip(clip: VoiceClipData): Promise<void> {
    if (this.isMuted || !clip.audioUrl) {
      return Promise.resolve();
    }

    this.stop();
    this.currentActiveClip = clip;
    this.notifySpeaking(true);

    return new Promise(resolve => {
      try {
        const audio = new Audio(clip.audioUrl);
        this.currentAudioElement = audio;
        audio.playbackRate = 1.0;

        audio.onended = () => {
          this.currentAudioElement = null;
          this.notifySpeaking(false);
          resolve();
        };

        audio.onerror = (e) => {
          console.warn('Audio clip playback failed:', e);
          this.currentAudioElement = null;
          this.notifySpeaking(false);
          resolve();
        };

        audio.play().catch(err => {
          console.warn('Could not play audio clip (browser autoplay policy):', err);
          this.notifySpeaking(false);
          resolve();
        });
      } catch (err) {
        console.warn('Audio playback error:', err);
        this.notifySpeaking(false);
        resolve();
      }
    });
  }

  /**
   * Main speech method called by HostScreen when dialogue updates.
   * Looks up the user's custom voice clip for this scene from adminMediaService.
   * If a custom voice clip exists, it plays it.
   * If no voice clip was added, NO voice plays (voice removed), updating captions only.
   */
  public speak(text: string, eventId?: string, round?: number): Promise<void> {
    // 1. Resolve matching scene from adminMediaService
    const scene = eventId ? adminMediaService.getActiveScene(eventId, round) : undefined;
    const displayText = scene?.customText || text;

    this.notifyCaptions(displayText);

    if (this.isMuted) {
      return Promise.resolve();
    }

    this.stop();

    // 2. If the user added a voice clip for this scene, play it!
    if (scene?.voiceClip?.audioUrl) {
      return this.playCustomClip(scene.voiceClip);
    }

    // 3. No voice clip added: keep voice removed (silent broadcast with captions)
    return Promise.resolve();
  }

  /**
   * Compatibility methods for legacy callers
   */
  public getClips(): AudioEventMapping[] {
    return adminMediaService.getAllScenes()
      .filter(s => !!s.voiceClip)
      .map(s => ({
        eventId: s.id,
        name: s.title,
        audioUrl: s.voiceClip?.audioUrl,
        fileName: s.voiceClip?.fileName,
      }));
  }
}

export const audioHost = new AudioHostService();
