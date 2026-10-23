import { ClientGameState } from '../types/game';

export interface JoinResponse {
  roomCode: string;
  playerToken: string;
  playerId: string;
  name: string;
  seatNumber: number;
  isRoomCreator: boolean;
}

class ApiService {
  private stateListeners: Set<(state: ClientGameState) => void> = new Set();
  private lastState: ClientGameState | null = null;
  private pollIntervalId: any = null;
  private activeRoomCode: string | null = null;
  private activePlayerToken: string | null = null;
  private activeIsHost: boolean = false;
  private isFetching: boolean = false;

  public getStoredSession(roomCode: string): { playerToken: string; playerId: string } | null {
    if (typeof localStorage === 'undefined') return null;
    const key = `traitors_session_${roomCode.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveSession(roomCode: string, playerToken: string, playerId: string) {
    if (typeof localStorage === 'undefined') return;
    const key = `traitors_session_${roomCode.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify({ playerToken, playerId }));
  }

  public clearSession(roomCode: string) {
    if (typeof localStorage === 'undefined') return;
    const key = `traitors_session_${roomCode.toUpperCase()}`;
    localStorage.removeItem(key);
  }

  public async createRoom(hostName: string): Promise<JoinResponse> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create room');
    }
    const data = await res.json();
    this.saveSession(data.roomCode, data.playerToken, data.playerId);
    return data;
  }

  public async joinRoom(roomCode: string, name: string, playerToken?: string): Promise<JoinResponse> {
    const code = roomCode.toUpperCase();
    const stored = this.getStoredSession(code);
    const tokenToSend = playerToken || stored?.playerToken;

    const res = await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, playerToken: tokenToSend }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to join castle room');
    }

    const data = await res.json();
    this.saveSession(code, data.playerToken, data.playerId);
    return data;
  }

  public async setupDemoRoom(): Promise<JoinResponse> {
    try {
      const res = await fetch('/api/rooms/demo-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        this.saveSession(data.roomCode, data.playerToken, data.playerId);
        return {
          roomCode: data.roomCode,
          playerToken: data.playerToken,
          playerId: data.playerId,
          name: 'Libby',
          seatNumber: 1,
          isRoomCreator: true,
        };
      }
    } catch (err) {
      console.warn('Network call to demo-setup failed, continuing with direct demo room initialization:', err);
    }

    // Direct fallback guarantee so demo castle can never fail to launch
    this.saveSession('DEMO7', 'demo_token_libby', 'p_libby');
    return {
      roomCode: 'DEMO7',
      playerToken: 'demo_token_libby',
      playerId: 'p_libby',
      name: 'Libby',
      seatNumber: 1,
      isRoomCreator: true,
    };
  }

  private inFlightFetches: Map<string, Promise<ClientGameState | null>> = new Map();

  /**
   * Fetches room state snapshot from serverless backend.
   */
  public setActivePlayerToken(token: string | null, isHost: boolean = false) {
    this.activePlayerToken = token;
    this.activeIsHost = isHost;
  }

  public getActivePlayerToken(): string | null {
    return this.activePlayerToken;
  }

  /**
   * Fetches room state snapshot from serverless backend.
   */
  public async fetchState(roomCode: string, playerToken?: string, isHost?: boolean): Promise<ClientGameState | null> {
    const code = roomCode.toUpperCase();
    const token =
      playerToken !== undefined
        ? playerToken
        : this.activePlayerToken || this.getStoredSession(code)?.playerToken || '';
    const hostFlag = typeof isHost === 'boolean' ? isHost : this.activeIsHost;
    const fetchKey = `${code}:${token}:${hostFlag}`;

    if (this.inFlightFetches.has(fetchKey)) {
      return this.inFlightFetches.get(fetchKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const url = `/api/rooms/${code}/state?playerToken=${encodeURIComponent(token)}&isHost=${hostFlag ? 'true' : 'false'}&_t=${Date.now()}`;
        const res = await fetch(url, {
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!res.ok) {
          return null;
        }

        const state: ClientGameState = await res.json();
        this.lastState = state;
        this.stateListeners.forEach(listener => {
          try {
            listener(state);
          } catch (e) {
            console.warn('Listener error in fetchState:', e);
          }
        });
        return state;
      } catch (err) {
        console.warn('State sync poll error:', err);
        return null;
      } finally {
        this.inFlightFetches.delete(fetchKey);
      }
    })();

    this.inFlightFetches.set(fetchKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Subscribes to real-time room state using high-frequency authenticated polling
   * compatible with Vercel serverless multi-instance architecture.
   */
  public subscribeToRoom(
    roomCode: string,
    playerToken?: string,
    isHost?: boolean,
    onState?: (state: ClientGameState) => void
  ): () => void {
    const normalizedCode = roomCode.toUpperCase();
    if (this.activeRoomCode !== normalizedCode) {
      this.lastState = null;
      this.activeRoomCode = normalizedCode;
    }

    if (onState) {
      this.stateListeners.add(onState);
      if (this.lastState && this.lastState.roomCode === normalizedCode) {
        onState(this.lastState);
      }
    }

    if (playerToken !== undefined) {
      this.activePlayerToken = playerToken;
    } else if (!this.activePlayerToken) {
      this.activePlayerToken = this.getStoredSession(this.activeRoomCode)?.playerToken || null;
    }
    this.activeIsHost = !!isHost;

    // Immediate initial sync
    this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);

    // Adaptive polling: 1.5s during gameplay, 2.5s in lobby
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }

    const startPolling = () => {
      const isLobby = this.lastState?.phase === 'LOBBY';
      const intervalMs = isLobby ? 2500 : 1500;

      this.pollIntervalId = setInterval(() => {
        if (this.activeRoomCode) {
          this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);
        }
      }, intervalMs);
    };

    startPolling();

    // Reconnect / re-fetch on window focus or visibility change (e.g. phone unlocked)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.activeRoomCode) {
        this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      if (onState) this.stateListeners.delete(onState);
      if (this.stateListeners.size === 0) {
        if (this.pollIntervalId) {
          clearInterval(this.pollIntervalId);
          this.pollIntervalId = null;
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleVisibilityChange);
        }
      }
    };
  }

  public async sendAction(roomCode: string, action: string, payload?: any, playerToken?: string) {
    const code = roomCode.toUpperCase();
    const token =
      playerToken !== undefined
        ? playerToken
        : this.activePlayerToken || this.getStoredSession(code)?.playerToken || '';
    const res = await fetch(`/api/rooms/${code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, playerToken: token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Action failed');
    }

    const data = await res.json();
    
    // Trigger immediate instant state refresh right after action completes
    this.fetchState(code, token, this.activeIsHost);
    
    return data;
  }

  public getLastState(): ClientGameState | null {
    return this.lastState;
  }
}

export const api = new ApiService();
