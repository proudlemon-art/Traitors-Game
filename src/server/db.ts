import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { GameState, Player } from '../types/game.ts';

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

    // Local fallback path
    this.localFallbackPath = path.resolve('data');
    try {
      if (!fs.existsSync(this.localFallbackPath)) {
        fs.mkdirSync(this.localFallbackPath, { recursive: true });
      }
      this.loadLocalData();
    } catch {
      // In read-only serverless environments without Supabase, use /tmp
      this.localFallbackPath = '/tmp';
      this.loadLocalData();
    }
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
        path.resolve('data', 'admin_media_config.json'),
        path.resolve('admin-media-config.json'),
        this.getMediaFilePath(),
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

    // 1. Try Supabase
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
          return {
            code: data.code,
            creatorToken: data.creator_token,
            state: data.state as GameState,
            players: (data.players || {}) as Record<string, Player>,
          };
        }
      } catch (err) {
        console.warn('Supabase query error:', err);
      }
    }

    // 2. Fallback to Local Storage / Memory
    if (this.localMemoryStore.has(normalizedCode)) {
      return this.localMemoryStore.get(normalizedCode)!;
    }

    const filePath = this.getRoomFilePath(normalizedCode);
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

    return null;
  }

  public async saveRoom(record: RoomRecord): Promise<void> {
    const normalizedCode = record.code.toUpperCase();
    this.localMemoryStore.set(normalizedCode, record);

    // 1. Save to Supabase if configured
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

    // 2. Save to local fallback file
    try {
      const filePath = this.getRoomFilePath(normalizedCode);
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {
      // Ignore filesystem write errors in ephemeral environments
    }
  }

  // ----------------------------------------------------
  // Media Config Operations
  // ----------------------------------------------------
  public async getMediaConfig(): Promise<any[] | null> {
    // 1. Check in-memory store first
    if (this.localMediaConfig && Array.isArray(this.localMediaConfig) && this.localMediaConfig.length > 0) {
      return this.localMediaConfig;
    }

    // 2. Check local persistent disk files
    const candidates = [
      path.resolve('data', 'admin_media_config.json'),
      path.resolve('admin-media-config.json'),
      this.getMediaFilePath(),
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

    // 3. Check Supabase
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
          // Cache to local file so offline/restarts are instant
          try {
            fs.writeFileSync(path.resolve('data', 'admin_media_config.json'), JSON.stringify(data.scenes, null, 2), 'utf-8');
          } catch {}
          return data.scenes;
        }
      } catch (err) {
        console.warn('Supabase media query error:', err);
      }
    }

    return null;
  }

  public async saveMediaConfig(media: any[]): Promise<void> {
    if (!Array.isArray(media)) return;
    this.localMediaConfig = media;

    // 1. Always write immediately to local persistent disk files
    try {
      const dataDir = path.resolve('data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dataFilePath = path.resolve('data', 'admin_media_config.json');
      const rootFilePath = path.resolve('admin-media-config.json');
      const jsonContent = JSON.stringify(media, null, 2);
      fs.writeFileSync(dataFilePath, jsonContent, 'utf-8');
      fs.writeFileSync(rootFilePath, jsonContent, 'utf-8');
    } catch (diskErr) {
      console.error('Failed to write media config to disk:', diskErr);
    }

    // 2. Also save to Supabase asynchronously (non-blocking)
    if (this.supabase) {
      try {
        this.supabase
          .from('traitors_media_configs')
          .upsert({
            id: 'global_config',
            scenes: media,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase saveMediaConfig async error:', error.message);
            }
          })
          .catch(err => {
            console.warn('Supabase saveMediaConfig exception:', err);
          });
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
