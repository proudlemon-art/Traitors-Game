-- ======================================================================
-- LIBBY'S BIRTHDAY: TRUST NOBODY — SUPABASE DATABASE MIGRATION
-- Run this script in the Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ======================================================================

-- 1. Create Rooms Table
CREATE TABLE IF NOT EXISTS public.traitors_rooms (
    code TEXT PRIMARY KEY,
    creator_token TEXT NOT NULL,
    current_round INT NOT NULL DEFAULT 1,
    phase TEXT NOT NULL DEFAULT 'LOBBY',
    timer_deadline BIGINT,
    timer_duration_sec INT NOT NULL DEFAULT 600,
    is_timer_paused BOOLEAN NOT NULL DEFAULT false,
    timer_paused_remaining BIGINT,
    state JSONB NOT NULL,
    players JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Media Configs Table (Persistent custom scripts, audio clips, and images)
CREATE TABLE IF NOT EXISTS public.traitors_media_configs (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_traitors_rooms_updated_at ON public.traitors_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_traitors_rooms_phase ON public.traitors_rooms(phase);

-- 4. Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_traitors_rooms_updated_at ON public.traitors_rooms;
CREATE TRIGGER set_traitors_rooms_updated_at
BEFORE UPDATE ON public.traitors_rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_traitors_media_updated_at ON public.traitors_media_configs;
CREATE TRIGGER set_traitors_media_updated_at
BEFORE UPDATE ON public.traitors_media_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.traitors_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traitors_media_configs ENABLE ROW LEVEL SECURITY;

-- Allow backend service role & public read/write through sanitized API endpoints
DROP POLICY IF EXISTS "Allow service role full access to rooms" ON public.traitors_rooms;
CREATE POLICY "Allow service role full access to rooms"
ON public.traitors_rooms FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access to media" ON public.traitors_media_configs;
CREATE POLICY "Allow service role full access to media"
ON public.traitors_media_configs FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Enable Realtime Replication on rooms (optional for realtime subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE public.traitors_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.traitors_media_configs;
