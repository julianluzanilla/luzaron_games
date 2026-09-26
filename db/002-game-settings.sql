-- Luzaron Games — interruptor global de juegos (panel de administración).
--
-- Se aplica con:
--   npm run db:games
--
-- Idempotente. Un juego sin fila se considera activo; solo se guarda lo que el
-- admin cambió. Desactivar un juego lo oculta, no borra sus récords.
CREATE TABLE IF NOT EXISTS game_settings (
  game_id    TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL
);
