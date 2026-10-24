import { AudioEventMapping } from '../types/game';
import { adminMediaService, normalizeCastleMediaUrl, VoiceClipData } from './adminMediaService';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  activeClip: VoiceClipData | null;
}

function getFallbackAudioUrls(primaryUrl: string): string[] {
  if (!primaryUrl || primaryUrl.startsWith('data:')) return [];
  const fileName = primaryUrl.split('/').pop();
  if (!fileName) return [];
  const candidates = [
    `/castle-media/${fileName}`,
    `/api/castle-media/${fileName}`,
    `/assets/aistudio/${fileName}`,
  ];
  return candidates.filter(u => u !== primaryUrl);
}

class AudioHostService {
  private currentAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isSpeakingActive: boolean = false;
  private isPausedState: boolean = false;
  private currentTimeSec: number = 0;
  private durationSec: number = 0;
  private lastSpokenText: string = '';
  private lastAutoSceneKey: string = '';
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
        // Ensure persistent audio element exists and is warmed up on user gesture
        if (!this.currentAudioElement && typeof Audio !== 'undefined') {
          this.currentAudioElement = new Audio();
          this.currentAudioElement.preload = 'auto';
        }
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
    if (!this.currentAudioElement && typeof Audio !== 'undefined') {
      this.currentAudioElement = new Audio();
      this.currentAudioElement.preload = 'auto';
    }
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
    if (this.currentAudioElement && this.isPausedState && this.currentAudioElement.src) {
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
    } else if (this.isPausedState && this.currentAudioElement && this.currentAudioElement.src) {
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

    const normalizedUrl = normalizeCastleMediaUrl(clip.audioUrl) || clip.audioUrl;
    const normalizedClip: VoiceClipData = {
      ...clip,
      audioUrl: normalizedUrl,
    };

    this.currentActiveClip = normalizedClip;
    if (this.isMuted) {
      return Promise.resolve();
    }

    this.stop();
    this.currentActiveClip = normalizedClip;
    this.durationSec = normalizedClip.durationSec || 0;
    this.notifySpeaking(true);

    const fallbackUrls = getFallbackAudioUrls(normalizedUrl);
    let fallbackIndex = 0;

    return new Promise(resolve => {
      try {
        const audio = this.currentAudioElement || new Audio();
        this.currentAudioElement = audio;
        audio.preload = 'auto';
        audio.playbackRate = 1.0;

        const attemptPlayUrl = (urlToTry: string) => {
          audio.src = urlToTry;
          audio.load();

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                this.pendingAutoPlayClip = null;
                this.isPausedState = false;
                this.notifySpeaking(true);
              })
              .catch(err => {
                // If NotSupportedError or load failure and we have fallbacks, try next URL
                if (
                  fallbackIndex < fallbackUrls.length &&
                  (err?.name === 'NotSupportedError' || err?.message?.includes('supported'))
                ) {
                  const nextUrl = fallbackUrls[fallbackIndex++];
                  attemptPlayUrl(nextUrl);
                  return;
                }
                console.warn('Autoplay deferred until user interaction:', err);
                this.pendingAutoPlayClip = normalizedClip;
                this.isPausedState = true;
                this.notifySpeaking(false);
                resolve();
              });
          }
        };

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
          if (fallbackIndex < fallbackUrls.length) {
            const nextUrl = fallbackUrls[fallbackIndex++];
            console.warn(`Audio URL failed (${audio.src}), trying fallback: ${nextUrl}`);
            attemptPlayUrl(nextUrl);
            return;
          }
          console.warn('Audio clip playback failed:', normalizedClip.audioUrl, e);
          this.isPausedState = false;
          this.notifySpeaking(false);
          resolve();
        };

        attemptPlayUrl(normalizedUrl);
      } catch (err) {
        console.warn('Audio playback error:', err);
        this.isPausedState = false;
        this.notifySpeaking(false);
        resolve();
      }
    });
  }

  /**
   * Main speech method called by HostScreen / App when scene/phase updates.
   * Looks up the scene's voice clip from adminMediaService.
   */
  public speak(
    text: string,
    eventId?: string,
    round?: number,
    options?: { force?: boolean }
  ): Promise<void> {
    const scene = eventId ? adminMediaService.getActiveScene(eventId, round) : undefined;
    const displayText = scene?.customText || text || scene?.defaultText || '';

    this.notifyCaptions(displayText);

    const sceneKey = `${round ?? 1}:${scene?.id || eventId || 'DEFAULT'}`;
    if (!options?.force && this.lastAutoSceneKey === sceneKey) {
      // Already triggered for this exact round + scene; do not cut off or restart mid-sentence
      return Promise.resolve();
    }
    this.lastAutoSceneKey = sceneKey;

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

  public resetAutoSceneTracking() {
    this.lastAutoSceneKey = '';
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
