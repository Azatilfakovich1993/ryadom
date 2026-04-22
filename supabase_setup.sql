-- ============================================================
-- Шаг 1: Включить PostGIS (выполнить один раз)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Шаг 2: Таблица events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (char_length(title) <= 100),
  category    text NOT NULL CHECK (category IN ('sport', 'food', 'chat', 'help')),
  lat         double precision NOT NULL,
  lon         double precision NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  creator_id  text NOT NULL DEFAULT 'anonymous'
);

-- Географический индекс для быстрой выборки по радиусу
CREATE INDEX IF NOT EXISTS events_location_idx
  ON public.events
  USING GIST (ST_SetSRID(ST_MakePoint(lon, lat), 4326));

-- RLS: разрешить анонимное чтение
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT WITH CHECK (true);

-- ============================================================
-- Шаг 3: RPC функция для выборки по радиусу
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_events(
  user_lat      double precision,
  user_lon      double precision,
  radius_meters float
)
RETURNS SETOF events AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM events
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
    radius_meters
  )
  AND expires_at > now()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Шаг 4: Автоудаление просроченных событий (опционально)
-- ============================================================
-- Включить pg_cron через Dashboard → Database → Extensions
-- затем:
-- SELECT cron.schedule('delete-expired-events', '*/5 * * * *',
--   $$DELETE FROM events WHERE expires_at < now()$$);
