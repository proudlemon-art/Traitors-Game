import { ClientGameState } from '../types/game';
import { localGameEngine, createInitialGameState } from './localGameEngine';

export interface JoinResponse {
  roomCode: string;
  playerToken: string;
  playerId: string;
  name: string;
  seatNumber: number;
  isRoomCreator: boolean;
  state?: ClientGameState;
}

async function fetchJsonWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
      if (this.activeRoomCode === roomCode.toUpperCase()) {
        const localState = localGameEngine.getState(
          roomCode,
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
    const cleanName = (hostName || 'Libby').trim() || 'Libby';

    // 1. Try backend API first
    const serverData = await fetchJsonWithTimeout('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName: cleanName }),
    });

    if (serverData && serverData.roomCode && serverData.playerToken) {
      this.saveSession(serverData.roomCode, serverData.playerToken, serverData.playerId);

      // Seed local engine with matching room so any local fallback stays in sync
      const initialState = createInitialGameState(serverData.roomCode, false);
      initialState.seatingOrder = [serverData.playerId];
      localGameEngine.saveRoom(
        {
          code: serverData.roomCode,
          creatorToken: serverData.playerToken,
          state: initialState,
          players: {
            [serverData.playerToken]: {
              id: serverData.playerId,
              name: cleanName,
              isRoomCreator: true,
              seatNumber: 1,
              connected: true,
              score: 0,
            },
          },
        },
        false
      );

      const initialClientState =
        serverData.state || localGameEngine.getState(serverData.roomCode, serverData.playerToken, true);
      if (initialClientState) {
        this.emitState(initialClientState);
      }

      return {
        roomCode: serverData.roomCode,
        playerToken: serverData.playerToken,
        playerId: serverData.playerId,
        name: cleanName,
        seatNumber: 1,
        isRoomCreator: true,
        state: initialClientState || undefined,
      };
    }

    // 2. Seamless local engine fallback so creating a room never fails
    const localCreated = localGameEngine.createRoom(cleanName);
    this.localFallbackRooms.add(localCreated.roomCode);
    this.saveSession(localCreated.roomCode, localCreated.playerToken, localCreated.playerId);
    if (localCreated.state) {
      this.emitState(localCreated.state);
    }
    return localCreated;
  }

  public async joinRoom(roomCode: string, name: string, playerToken?: string): Promise<JoinResponse> {
    const code = roomCode.toUpperCase();
    const stored = this.getStoredSession(code);
    const tokenToSend = playerToken || stored?.playerToken;

    if (!this.localFallbackRooms.has(code)) {
      const serverData = await fetchJsonWithTimeout(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, playerToken: tokenToSend }),
      });

      if (serverData && serverData.roomCode && serverData.playerToken) {
        this.saveSession(code, serverData.playerToken, serverData.playerId);
        if (serverData.state) {
          this.emitState(serverData.state);
        }
        return serverData;
      }
    }

    // Local engine fallback
    const localJoined = localGameEngine.joinRoom(code, name, tokenToSend);
    this.localFallbackRooms.add(code);
    this.saveSession(code, localJoined.playerToken, localJoined.playerId);
    if (localJoined.state) {
      this.emitState(localJoined.state);
    }
    return localJoined;
  }

  public async setupDemoRoom(): Promise<JoinResponse> {
    // Always initialize local DEMO7 room immediately in LOBBY phase
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

    this.saveSession('DEMO7', 'demo_token_libby', 'p_libby');
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

    // If this room is running in local fallback mode, resolve directly from localGameEngine
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
        });

        if (serverState && serverState.roomCode) {
          this.emitState(serverState);
          return serverState;
        }

        // Fallback to local engine if backend state endpoint is unreachable
        const localState = localGameEngine.getState(code, token, hostFlag);
        if (localState) {
          this.localFallbackRooms.add(code);
          this.emitState(localState);
          return localState;
        }

        return null;
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

    // 1. Always apply to localGameEngine immediately for instant UI responsiveness
    const optimisticState = localGameEngine.processAction(code, action, payload, token, this.activeIsHost);
    if (optimisticState) {
      this.emitState(optimisticState);
    }

    // 2. If room is not purely local fallback, also dispatch to backend server
    if (!this.localFallbackRooms.has(code)) {
      const serverData = await fetchJsonWithTimeout(`/api/rooms/${code}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, playerToken: token, isHost: this.activeIsHost }),
      });

      if (serverData && serverData.success) {
        if (serverData.state && serverData.state.roomCode) {
          this.emitState(serverData.state);
          return serverData;
        }
        // Refresh authoritative state from server
        this.inFlightFetches.clear();
        const refreshed = await this.fetchState(code, token, this.activeIsHost);
        return { ...serverData, state: refreshed };
      } else {
        // Backend action failed or unreachable -> switch room to local fallback so polling doesn't overwrite local state
        this.localFallbackRooms.add(code);
      }
    }

    return {
      success: true,
      phase: optimisticState?.phase,
      state: optimisticState,
    };
  }

  public getLastState(): ClientGameState | null {
    return this.lastState;
  }
}

export const api = new ApiService();
