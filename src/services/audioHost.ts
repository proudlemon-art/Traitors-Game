import { AudioEventMapping } from '../types/game';
import { adminMediaService, VoiceClipData } from './adminMediaService';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  activeClip: VoiceClipData | null;
}

class AudioHostService {
  private currentAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isSpeakingActive: boolean = false;
  private isPausedState: boolean = false;
  private currentTimeSec: number = 0;
  private durationSec: number = 0;
  private lastSpokenText: string = '';
  private currentActiveClip: VoiceClipData | null = null;
  private pendingAutoPlayClip: VoiceClipData | null = null;
  private captionListeners: Set<(caption: string) => void> = new Set();
  private speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
  private playbackListeners: Set<(state: AudioPlaybackState) => void> = new Set();
  private isUnlocked: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.isUnlocked = true;
        if (this.pendingAutoPlayClip) {
          const clip = this.pendingAutoPlayClip;
          this.pendingAutoPlayClip = null;
          this.playCustomClip(clip);
        }
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  public unlockAudio(): boolean {
    this.isUnlocked = true;
    this.isMuted = false;
    if (this.pendingAutoPlayClip) {
      const clip = this.pendingAutoPlayClip;
      this.pendingAutoPlayClip = null;
      this.playCustomClip(clip);
    }
    return true;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.pause();
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

  public subscribePlaybackState(listener: (state: AudioPlaybackState) => void) {
    this.playbackListeners.add(listener);
    listener(this.getPlaybackState());
    return () => {
      this.playbackListeners.delete(listener);
    };
  }

  public getPlaybackState(): AudioPlaybackState {
    return {
      isPlaying: this.isSpeakingActive,
      isPaused: this.isPausedState,
      currentTime: this.currentTimeSec,
      duration: this.durationSec,
      activeClip: this.currentActiveClip,
    };
  }

  private notifySpeaking(isSpeaking: boolean) {
    this.isSpeakingActive = isSpeaking;
    this.speakingListeners.forEach(listener => listener(isSpeaking));
    this.notifyPlaybackState();
  }

  private notifyPlaybackState() {
    const state = this.getPlaybackState();
    this.playbackListeners.forEach(listener => listener(state));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  public getIsPaused(): boolean {
    return this.isPausedState;
  }

  public getCurrentClip(): VoiceClipData | null {
    return this.currentActiveClip;
  }

  public pause() {
    if (this.currentAudioElement && !this.currentAudioElement.paused) {
      this.currentAudioElement.pause();
      this.isPausedState = true;
      this.notifySpeaking(false);
    }
  }

  public resume(fallbackClip?: VoiceClipData) {
    this.isMuted = false;
    this.isUnlocked = true;
    if (this.currentAudioElement && this.isPausedState) {
      this.isPausedState = false;
      this.notifySpeaking(true);
      this.currentAudioElement.play().catch(err => {
        console.warn('Could not resume audio clip:', err);
        this.isPausedState = true;
        this.notifySpeaking(false);
      });
      return;
    }

    const clipToPlay = this.currentActiveClip || fallbackClip;
    if (clipToPlay?.audioUrl) {
      this.playCustomClip(clipToPlay);
    }
  }

  public togglePlayPause(fallbackClip?: VoiceClipData) {
    if (this.isSpeakingActive && this.currentAudioElement && !this.currentAudioElement.paused) {
      this.pause();
    } else if (this.isPausedState && this.currentAudioElement) {
      this.resume(fallbackClip);
    } else {
      const clipToPlay = fallbackClip || this.currentActiveClip;
      if (clipToPlay?.audioUrl) {
        this.isMuted = false;
        this.isUnlocked = true;
        this.playCustomClip(clipToPlay);
      }
    }
  }

  public restart(fallbackClip?: VoiceClipData) {
    this.isMuted = false;
    this.isUnlocked = true;
    const clipToPlay = fallbackClip || this.currentActiveClip;
    if (this.currentAudioElement && (!fallbackClip || fallbackClip.audioUrl === this.currentActiveClip?.audioUrl)) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentTimeSec = 0;
        this.isPausedState = false;
        this.notifySpeaking(true);
        this.currentAudioElement.play().catch(err => {
          console.warn('Could not restart audio clip:', err);
          this.notifySpeaking(false);
        });
        return;
      } catch {
        // Fallback to recreating audio element below
      }
    }

    if (clipToPlay?.audioUrl) {
      this.playCustomClip(clipToPlay);
    }
  }

  public stop() {
    this.isPausedState = false;
    this.currentTimeSec = 0;
    this.durationSec = 0;
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.onended = null;
        this.currentAudioElement.onerror = null;
        this.currentAudioElement.ontimeupdate = null;
        this.currentAudioElement.onloadedmetadata = null;
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    this.notifySpeaking(false);
  }

  public replay(fallbackClip?: VoiceClipData) {
    this.restart(fallbackClip);
  }

  /**
   * Plays a custom audio clip (from file upload or microphone recording)
   */
  public playCustomClip(clip: VoiceClipData): Promise<void> {
    if (!clip?.audioUrl) {
      return Promise.resolve();
    }

    this.currentActiveClip = clip;
    if (this.isMuted) {
      return Promise.resolve();
    }

    this.stop();
    this.currentActiveClip = clip;
    this.durationSec = clip.durationSec || 0;
    this.notifySpeaking(true);

    return new Promise(resolve => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = clip.audioUrl;
        this.currentAudioElement = audio;
        audio.playbackRate = 1.0;

        audio.onloadedmetadata = () => {
          if (audio.duration && isFinite(audio.duration)) {
            this.durationSec = Math.round(audio.duration);
            this.notifyPlaybackState();
          }
        };

        audio.ontimeupdate = () => {
          this.currentTimeSec = audio.currentTime || 0;
          if (audio.duration && isFinite(audio.duration)) {
            this.durationSec = Math.round(audio.duration);
          }
          this.notifyPlaybackState();
        };

        audio.onended = () => {
          this.isPausedState = false;
          this.currentTimeSec = 0;
          this.notifySpeaking(false);
          resolve();
        };

        audio.onerror = e => {
          console.warn('Audio clip playback failed:', clip.audioUrl, e);
          this.currentAudioElement = null;
          this.isPausedState = false;
          this.notifySpeaking(false);
          resolve();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.pendingAutoPlayClip = null;
              this.isPausedState = false;
              this.notifySpeaking(true);
            })
            .catch(err => {
              console.warn('Autoplay deferred until user interaction:', err);
              // Keep the audio element ready at 0:00 and queue for next click
              this.pendingAutoPlayClip = clip;
              this.isPausedState = true;
              this.notifySpeaking(false);
              resolve();
            });
        }
      } catch (err) {
        console.warn('Audio playback error:', err);
        this.isPausedState = false;
        this.notifySpeaking(false);
        resolve();
      }
    });
  }

  /**
   * Main speech method called by HostScreen when scene/phase updates.
   * Looks up the user's custom voice clip for this scene from adminMediaService.
   */
  public speak(text: string, eventId?: string, round?: number): Promise<void> {
    const scene = eventId ? adminMediaService.getActiveScene(eventId, round) : undefined;
    const displayText = scene?.customText || text;

    this.notifyCaptions(displayText);

    if (this.isMuted) {
      return Promise.resolve();
    }

    this.stop();

    if (scene?.voiceClip?.audioUrl) {
      this.currentActiveClip = scene.voiceClip;
      return this.playCustomClip(scene.voiceClip);
    }

    this.currentActiveClip = null;
    this.notifyPlaybackState();
    return Promise.resolve();
  }

  /**
   * Compatibility methods for legacy callers
   */
  public getClips(): AudioEventMapping[] {
    return adminMediaService
      .getAllScenes()
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
