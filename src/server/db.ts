import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { GameState, Player } from '../types/game';

export interface RoomRecord {
  code: string;
  creatorToken: string;
  state: GameState;
  players: Record<string, Player>; // token -> Player
}

class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private localFallbackPath: string;
  private localMemoryStore: Map<string, RoomRecord> = new Map();
  private localMediaConfig: any = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized for persistent Vercel storage.');
      } catch (err) {
        console.warn('Failed to initialize Supabase client, using local file storage:', err);
      }
    } else {
      console.log('ℹ️ No SUPABASE_URL configured — using persistent local file storage.');
    }

    // Try determining writable local directory: prefer data/ if writable, fallback to /tmp
    this.localFallbackPath = path.resolve('data');
    let isDataDirWritable = false;
    try {
      if (!fs.existsSync(this.localFallbackPath)) {
        fs.mkdirSync(this.localFallbackPath, { recursive: true });
      }
      fs.accessSync(this.localFallbackPath, fs.constants.W_OK);
      isDataDirWritable = true;
    } catch {
      isDataDirWritable = false;
    }

    if (!isDataDirWritable) {
      this.localFallbackPath = '/tmp';
      try {
        if (!fs.existsSync(this.localFallbackPath)) {
          fs.mkdirSync(this.localFallbackPath, { recursive: true });
        }
      } catch {}
    }

    this.loadLocalData();
  }

  private getRoomFilePath(code: string): string {
    return path.join(this.localFallbackPath, `room_${code.toUpperCase()}.json`);
  }

  private getMediaFilePath(): string {
    return path.join(this.localFallbackPath, 'admin_media_config.json');
  }

  private loadLocalData() {
    try {
      const candidates = [
        path.join(this.localFallbackPath, 'admin_media_config.json'),
        path.resolve('data', 'admin_media_config.json'),
        path.resolve('admin-media-config.json'),
        '/tmp/admin_media_config.json',
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            const raw = fs.readFileSync(candidate, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.localMediaConfig = parsed;
              console.log(`Loaded ${parsed.length} media scenes from persistent file: ${candidate}`);
              break;
            }
          } catch {
            // continue
          }
        }
      }
    } catch (e) {
      console.warn('Could not load local media config:', e);
    }
  }

  // ----------------------------------------------------
  // Room Operations
  // ----------------------------------------------------
  public async getRoom(code: string): Promise<RoomRecord | null> {
    const normalizedCode = code.toUpperCase();

    // 1. Try Supabase first (authoritative across all serverless lambda instances)
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('traitors_rooms')
          .select('*')
          .eq('code', normalizedCode)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn(`Supabase getRoom error (${normalizedCode}):`, error.message);
          }
        } else if (data) {
          const room: RoomRecord = {
            code: data.code,
            creatorToken: data.creator_token,
            state: data.state as GameState,
            players: (data.players || {}) as Record<string, Player>,
          };
          this.localMemoryStore.set(normalizedCode, room);
          return room;
        }
      } catch (err) {
        console.warn('Supabase query error:', err);
      }
    }

    // 2. Fallback to Local Storage / Memory
    if (this.localMemoryStore.has(normalizedCode)) {
      return this.localMemoryStore.get(normalizedCode)!;
    }

    const candidateFiles = [
      path.join(this.localFallbackPath, `room_${normalizedCode}.json`),
      `/tmp/room_${normalizedCode}.json`,
      path.resolve('data', `room_${normalizedCode}.json`),
    ];

    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          this.localMemoryStore.set(normalizedCode, parsed);
          return parsed;
        } catch (err) {
          console.warn(`Could not read room file ${filePath}:`, err);
        }
      }
    }

    return null;
  }

  public async saveRoom(record: RoomRecord): Promise<void> {
    const normalizedCode = record.code.toUpperCase();
    this.localMemoryStore.set(normalizedCode, record);

    // 1. Save to Supabase (AWAITED to ensure completion in serverless environments)
    if (this.supabase) {
      try {
        const payload = {
          code: normalizedCode,
          creator_token: record.creatorToken,
          current_round: record.state.currentRound || 1,
          phase: record.state.phase || 'LOBBY',
          timer_deadline: record.state.timerDeadline || null,
          timer_duration_sec: record.state.timerDurationSec || 600,
          is_timer_paused: record.state.isTimerPaused || false,
          timer_paused_remaining: record.state.timerPausedRemaining || null,
          state: record.state,
          players: record.players,
          updated_at: new Date().toISOString(),
        };

        const { error } = await this.supabase
          .from('traitors_rooms')
          .upsert(payload, { onConflict: 'code' });

        if (error) {
          console.error(`Supabase saveRoom error for ${normalizedCode}:`, error.message);
        }
      } catch (err) {
        console.error('Supabase saveRoom exception:', err);
      }
    }

    // 2. Save to local fallback file (try primary path, fallback to /tmp)
    try {
      const primaryPath = this.getRoomFilePath(normalizedCode);
      fs.writeFileSync(primaryPath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {
      try {
        const tmpPath = `/tmp/room_${normalizedCode}.json`;
        fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2), 'utf-8');
      } catch {
        // Ignore filesystem write errors in ephemeral environments
      }
    }
  }

  // ----------------------------------------------------
  // Media Config Operations
  // ----------------------------------------------------
  public async getMediaConfig(): Promise<any[] | null> {
    // 1. Check in-memory store if previously loaded
    if (this.localMediaConfig && Array.isArray(this.localMediaConfig) && this.localMediaConfig.length > 0) {
      return this.localMediaConfig;
    }

    // 2. Check Supabase first (authoritative across all serverless lambda instances)
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('traitors_media_configs')
          .select('scenes')
          .eq('id', 'global_config')
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn('Supabase getMediaConfig error:', error.message);
          }
        } else if (data && Array.isArray(data.scenes) && data.scenes.length > 0) {
          this.localMediaConfig = data.scenes;
          try {
            fs.writeFileSync(path.join(this.localFallbackPath, 'admin_media_config.json'), JSON.stringify(data.scenes, null, 2), 'utf-8');
          } catch {}
          return data.scenes;
        }
      } catch (err) {
        console.warn('Supabase media query error:', err);
      }
    }

    // 3. Check local persistent disk files
    const candidates = [
      path.join(this.localFallbackPath, 'admin_media_config.json'),
      '/tmp/admin_media_config.json',
      path.resolve('data', 'admin_media_config.json'),
      path.resolve('admin-media-config.json'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          const raw = fs.readFileSync(candidate, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.localMediaConfig = parsed;
            return parsed;
          }
        } catch (e) {
          console.warn(`Error reading media config from ${candidate}:`, e);
        }
      }
    }

    return null;
  }

  public async saveMediaConfig(media: any[]): Promise<void> {
    if (!Array.isArray(media)) return;
    this.localMediaConfig = media;

    // 1. Write immediately to local disk fallback
    const jsonContent = JSON.stringify(media, null, 2);
    try {
      const dataDir = path.resolve('data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(path.resolve('data', 'admin_media_config.json'), jsonContent, 'utf-8');
      fs.writeFileSync(path.resolve('admin-media-config.json'), jsonContent, 'utf-8');
    } catch {
      try {
        fs.writeFileSync('/tmp/admin_media_config.json', jsonContent, 'utf-8');
      } catch {}
    }

    // 2. Persist to Supabase and AWAIT it so Vercel doesn't kill execution mid-flight
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('traitors_media_configs')
          .upsert({
            id: 'global_config',
            scenes: media,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) {
          console.warn('Supabase saveMediaConfig error:', error.message);
        } else {
          console.log('✅ Supabase saveMediaConfig successfully saved media scenes.');
        }
      } catch (err) {
        console.warn('Supabase saveMediaConfig exception:', err);
      }
    }
  }

  public async resetMediaConfig(): Promise<void> {
    this.localMediaConfig = null;

    if (this.supabase) {
      try {
        await this.supabase
          .from('traitors_media_configs')
          .delete()
          .eq('id', 'global_config');
      } catch (err) {
        console.warn('Supabase resetMediaConfig exception:', err);
      }
    }

    const filesToRemove = [
      path.resolve('data', 'admin_media_config.json'),
      path.resolve('admin-media-config.json'),
      '/tmp/admin_media_config.json',
      this.getMediaFilePath(),
    ];
    for (const f of filesToRemove) {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      } catch {
        // ignore
      }
    }
  }
}

export const db = new DatabaseService();
