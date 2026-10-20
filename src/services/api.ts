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
  private currentEventSource: EventSource | null = null;
  private stateListeners: Set<(state: ClientGameState) => void> = new Set();
  private lastState: ClientGameState | null = null;

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
      const err = await res.json();
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
      const err = await res.json();
      throw new Error(err.error || 'Failed to join castle room');
    }

    const data = await res.json();
    this.saveSession(code, data.playerToken, data.playerId);
    return data;
  }

  public async setupDemoRoom(): Promise<JoinResponse> {
    const res = await fetch('/api/rooms/demo-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to setup demo castle');
    }
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

  public subscribeToRoom(
    roomCode: string,
    playerToken?: string,
    isHost?: boolean,
    onState?: (state: ClientGameState) => void
  ): () => void {
    if (onState) {
      this.stateListeners.add(onState);
      if (this.lastState) onState(this.lastState);
    }

    if (this.currentEventSource) {
      this.currentEventSource.close();
    }

    const token = playerToken || this.getStoredSession(roomCode)?.playerToken || '';
    const url = `/api/rooms/${roomCode}/events?playerToken=${encodeURIComponent(token)}&isHost=${isHost ? 'true' : 'false'}`;

    const es = new EventSource(url);
    this.currentEventSource = es;

    es.onmessage = event => {
      try {
        const state: ClientGameState = JSON.parse(event.data);
        this.lastState = state;
        this.stateListeners.forEach(listener => listener(state));
      } catch (err) {
        console.warn('Error parsing SSE event:', err);
      }
    };

    es.onerror = () => {
      // EventSource automatically reconnects on error
      console.warn('SSE disconnected, retrying connection...');
    };

    return () => {
      if (onState) this.stateListeners.delete(onState);
      if (this.stateListeners.size === 0) {
        es.close();
        this.currentEventSource = null;
      }
    };
  }

  public async sendAction(roomCode: string, action: string, payload?: any, playerToken?: string) {
    const token = playerToken || this.getStoredSession(roomCode)?.playerToken;
    const res = await fetch(`/api/rooms/${roomCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, playerToken: token }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Action failed');
    }
    return res.json();
  }

  public getLastState(): ClientGameState | null {
    return this.lastState;
  }
}

export const api = new ApiService();
