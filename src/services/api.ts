import { ClientGameState, SanitizedPlayer } from '../types/game';
import { localGameEngine } from './localGameEngine';

export interface JoinResponse {
  roomCode: string;
  playerToken: string;
  playerId: string;
  name: string;
  seatNumber: number;
  isRoomCreator: boolean;
  state?: ClientGameState;
}

export interface ActiveRoomSession {
  roomCode: string;
  playerToken: string;
  playerId: string;
  playerName?: string;
  viewMode: 'HOST' | 'PLAYER';
  isHostDevice: boolean;
  updatedAt: number;
}

const ACTIVE_SESSION_KEY = 'traitors_active_room_session';

async function fetchJsonWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000, retries = 1): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        if (res.status === 404) return null;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 350));
          continue;
        }
        return null;
      }
      return await res.json();
    } catch {
      clearTimeout(timer);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 350));
        continue;
      }
      return null;
    }
  }
  return null;
}

class ApiService {
  private stateListeners: Set<(state: ClientGameState) => void> = new Set();
  private lastState: ClientGameState | null = null;
  private pollIntervalId: any = null;
  private activeRoomCode: string | null = null;
  private activePlayerToken: string | null = null;
  private activeIsHost: boolean = false;
  private localFallbackRooms: Set<string> = new Set();
  private inFlightFetches: Map<string, Promise<ClientGameState | null>> = new Map();

  constructor() {
    localGameEngine.setExternalUpdateListener(roomCode => {
      const normalized = roomCode.toUpperCase();
      // Only apply BroadcastChannel local engine updates for DEMO7 or purely offline rooms
      if (
        this.activeRoomCode === normalized &&
        (normalized === 'DEMO7' || this.localFallbackRooms.has(normalized))
      ) {
        const localState = localGameEngine.getState(
          normalized,
          this.activePlayerToken || undefined,
          this.activeIsHost
        );
        if (localState) {
          this.emitState(localState);
        }
      }
    });
  }

  private emitState(state: ClientGameState) {
    this.lastState = state;
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        console.warn('Listener error in emitState:', e);
      }
    });
  }

  public getStoredSession(roomCode: string): { playerToken: string; playerId: string; playerName?: string } | null {
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

  public saveSession(roomCode: string, playerToken: string, playerId: string, playerName?: string) {
    if (typeof localStorage === 'undefined') return;
    const key = `traitors_session_${roomCode.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify({ playerToken, playerId, playerName }));
  }

  public clearSession(roomCode: string) {
    if (typeof localStorage === 'undefined') return;
    const key = `traitors_session_${roomCode.toUpperCase()}`;
    localStorage.removeItem(key);
  }

  public saveActiveRoomSession(session: Omit<ActiveRoomSession, 'updatedAt'>) {
    if (typeof localStorage === 'undefined') return;
    const record: ActiveRoomSession = {
      ...session,
      roomCode: session.roomCode.toUpperCase(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(record));
  }

  public getActiveRoomSession(): ActiveRoomSession | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ActiveRoomSession;
      if (!parsed?.roomCode) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  public clearActiveRoomSession() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }

  public async peekRoomPlayers(roomCode: string): Promise<SanitizedPlayer[]> {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) return [];
    const data = await fetchJsonWithTimeout(`/api/rooms/${code}/state?isHost=false&_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    }, 5000, 0);
    if (data && Array.isArray(data.players)) {
      return [...data.players].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
    }
    return [];
  }

  public async createRoom(hostName: string): Promise<JoinResponse> {
    const cleanName = (hostName || 'Libby').trim() || 'Libby';

    // 1. Create room on backend server
    const serverData = await fetchJsonWithTimeout('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName: cleanName }),
    });

    if (serverData && serverData.roomCode && serverData.playerToken) {
      const code = serverData.roomCode.toUpperCase();
      this.localFallbackRooms.delete(code);
      this.saveSession(code, serverData.playerToken, serverData.playerId, cleanName);

      if (serverData.state) {
        this.emitState(serverData.state);
      }

      return {
        roomCode: code,
        playerToken: serverData.playerToken,
        playerId: serverData.playerId,
        name: cleanName,
        seatNumber: 1,
        isRoomCreator: true,
        state: serverData.state || undefined,
      };
    }

    // 2. Offline fallback only if backend is completely unreachable
    const localCreated = localGameEngine.createRoom(cleanName);
    this.localFallbackRooms.add(localCreated.roomCode);
    this.saveSession(localCreated.roomCode, localCreated.playerToken, localCreated.playerId, cleanName);
    if (localCreated.state) {
      this.emitState(localCreated.state);
    }
    return localCreated;
  }

  public async joinRoom(roomCode: string, name: string, playerToken?: string): Promise<JoinResponse> {
    const code = roomCode.trim().toUpperCase();
    const cleanName = name.trim();
    const stored = this.getStoredSession(code);
    // Only send stored token if user didn't explicitly type a different player's name
    const shouldUseStoredToken =
      !cleanName || !stored?.playerName || stored.playerName.toLowerCase() === cleanName.toLowerCase();
    const tokenToSend = playerToken !== undefined ? playerToken : shouldUseStoredToken ? stored?.playerToken : undefined;

    const serverData = await fetchJsonWithTimeout(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, playerToken: tokenToSend }),
    });

    if (serverData && serverData.roomCode && serverData.playerToken) {
      this.localFallbackRooms.delete(code);
      this.saveSession(code, serverData.playerToken, serverData.playerId, serverData.name || cleanName);
      if (serverData.state) {
        this.emitState(serverData.state);
      }
      return serverData;
    }

    throw new Error(`Could not find or connect to Castle Room "${code}". Please check the 5-letter code on the TV.`);
  }

  public async setupDemoRoom(): Promise<JoinResponse> {
    localGameEngine.setupDemoRoomRecord();
    const localDemoState = localGameEngine.getState('DEMO7', 'demo_token_libby', true);

    const serverData = await fetchJsonWithTimeout('/api/rooms/demo-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!serverData || !serverData.roomCode) {
      this.localFallbackRooms.add('DEMO7');
    } else {
      this.localFallbackRooms.delete('DEMO7');
    }

    this.saveSession('DEMO7', 'demo_token_libby', 'p_libby', 'Libby');
    if (serverData?.state) {
      this.emitState(serverData.state);
    } else if (localDemoState) {
      this.emitState(localDemoState);
    }

    return {
      roomCode: 'DEMO7',
      playerToken: 'demo_token_libby',
      playerId: 'p_libby',
      name: 'Libby',
      seatNumber: 1,
      isRoomCreator: true,
      state: serverData?.state || localDemoState || undefined,
    };
  }

  public setActivePlayerToken(token: string | null, isHost: boolean = false) {
    this.activePlayerToken = token;
    this.activeIsHost = isHost;
  }

  public getActivePlayerToken(): string | null {
    return this.activePlayerToken;
  }

  public async fetchState(roomCode: string, playerToken?: string, isHost?: boolean): Promise<ClientGameState | null> {
    const code = roomCode.toUpperCase();
    const token =
      playerToken !== undefined
        ? playerToken
        : this.activePlayerToken || this.getStoredSession(code)?.playerToken || '';
    const hostFlag = typeof isHost === 'boolean' ? isHost : this.activeIsHost;
    const fetchKey = `${code}:${token}:${hostFlag}`;

    // Only use localGameEngine if this is explicitly an offline fallback room
    if (this.localFallbackRooms.has(code)) {
      const localState = localGameEngine.getState(code, token, hostFlag);
      if (localState) {
        this.emitState(localState);
      }
      return localState;
    }

    if (this.inFlightFetches.has(fetchKey)) {
      return this.inFlightFetches.get(fetchKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const url = `/api/rooms/${code}/state?playerToken=${encodeURIComponent(token)}&isHost=${hostFlag ? 'true' : 'false'}&_t=${Date.now()}`;
        const serverState = await fetchJsonWithTimeout(url, {
          headers: { 'Cache-Control': 'no-cache' },
        }, 8000, 1);

        if (serverState && serverState.roomCode) {
          this.emitState(serverState);
          return serverState;
        }

        // For DEMO7 only, allow local fallback if backend is unreachable
        if (code === 'DEMO7') {
          const localState = localGameEngine.getState(code, token, hostFlag);
          if (localState) {
            this.localFallbackRooms.add(code);
            this.emitState(localState);
            return localState;
          }
        }

        // For real rooms, never switch to an isolated local room on a transient network hiccup;
        // preserve lastState and wait for the next poll
        return this.lastState;
      } finally {
        this.inFlightFetches.delete(fetchKey);
      }
    })();

    this.inFlightFetches.set(fetchKey, fetchPromise);
    return fetchPromise;
  }

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

    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }

    this.pollIntervalId = setInterval(() => {
      if (this.activeRoomCode) {
        this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);
      }
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.activeRoomCode) {
        this.inFlightFetches.clear();
        this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);
      }
    };

    const handleOnline = () => {
      if (this.activeRoomCode) {
        this.inFlightFetches.clear();
        this.fetchState(this.activeRoomCode, this.activePlayerToken || undefined, this.activeIsHost);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
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
          window.removeEventListener('online', handleOnline);
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

    const isLocalOnly = code === 'DEMO7' && this.localFallbackRooms.has(code);

    // 1. Only apply optimistic localGameEngine state if DEMO7 or explicitly local fallback!
    // Never overwrite a real multi-device room with localGameEngine's single-player localStorage state!
    let optimisticState: ClientGameState | null = null;
    if (code === 'DEMO7' || this.localFallbackRooms.has(code)) {
      optimisticState = localGameEngine.processAction(code, action, payload, token, this.activeIsHost);
      if (optimisticState && isLocalOnly) {
        this.emitState(optimisticState);
      }
    }

    // 2. Dispatch to backend server for all real rooms (and DEMO7 when online)
    if (!this.localFallbackRooms.has(code)) {
      const serverData = await fetchJsonWithTimeout(`/api/rooms/${code}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, playerToken: token, isHost: this.activeIsHost }),
      }, 10000, 1);

      if (serverData && serverData.success) {
        if (serverData.state && serverData.state.roomCode) {
          this.emitState(serverData.state);
          return serverData;
        }
        // Refresh authoritative state from server
        this.inFlightFetches.clear();
        const refreshed = await this.fetchState(code, token, this.activeIsHost);
        return { ...serverData, state: refreshed };
      } else if (code === 'DEMO7') {
        this.localFallbackRooms.add(code);
        if (optimisticState) {
          this.emitState(optimisticState);
        }
      } else {
        // Real room action hiccup: force an immediate state refresh from server rather than disconnecting
        this.inFlightFetches.clear();
        const refreshed = await this.fetchState(code, token, this.activeIsHost);
        return {
          success: !!refreshed,
          phase: refreshed?.phase,
          state: refreshed,
        };
      }
    }

    return {
      success: true,
      phase: optimisticState?.phase || this.lastState?.phase,
      state: optimisticState || this.lastState,
    };
  }

  public getLastState(): ClientGameState | null {
    return this.lastState;
  }
}

export const api = new ApiService();
