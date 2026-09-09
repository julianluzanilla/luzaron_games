-- Luzaron Games — esquema de Cloudflare D1
--
-- Se aplica con:
--   npx wrangler d1 execute luzaron-games --remote --file=db/schema.sql
--
-- Todo es idempotente (IF NOT EXISTS), así que se puede volver a correr sin
-- borrar nada. Para cambios de estructura futuros, agregar un archivo nuevo en
-- db/ en vez de editar éste.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Usuarios (PRODUCT_SPEC §5)
-- ---------------------------------------------------------------------------
-- No hay auto-registro: las cuentas las crea el admin. La contraseña es simple
-- a propósito (4+, letras y números) pero se guarda con PBKDF2 de 210 000
-- vueltas, nunca en claro.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL
);

-- COLLATE NOCASE: "Jules" y "jules" son el mismo usuario, para que nadie se
-- quede fuera por una mayúscula.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email COLLATE NOCASE);

-- ---------------------------------------------------------------------------
-- Sesiones
-- ---------------------------------------------------------------------------
-- `id` es el SHA-256 del token que viaja en la cookie, no el token: si alguien
-- leyera esta tabla no podría hacerse pasar por nadie.
--
-- No hay columna de caducidad a propósito: la sesión dura hasta que el usuario
-- cierra sesión o el admin desactiva la cuenta.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- Récords (PRODUCT_SPEC §9)
-- ---------------------------------------------------------------------------
-- `id` es el clientId que generó el aparato. Al ser la clave primaria, subir
-- dos veces la misma partida no la duplica; eso es lo que deja reintentar la
-- cola a ciegas cuando vuelve el internet.
--
-- `pack_id` es la categoría que ve el jugador (queens-8x8, sudoku-classic-normal,
-- mahjong-turtle) y `level_id` el puzzle concreto dentro de ella. El mejor
-- tiempo de una categoría se calcula con MIN(); los rankings por puzzle usan
-- level_id.
CREATE TABLE IF NOT EXISTS records (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id          TEXT NOT NULL,
  pack_id          TEXT NOT NULL,
  level_id         TEXT NOT NULL,
  raw_time_ms      INTEGER NOT NULL,
  final_time_ms    INTEGER NOT NULL,
  hints_used       INTEGER NOT NULL DEFAULT 0,
  hint_penalty_ms  INTEGER NOT NULL DEFAULT 0,
  is_clean_record  INTEGER NOT NULL DEFAULT 1 CHECK (is_clean_record IN (0, 1)),
  completed_at     TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

-- Mejor tiempo por categoría de un usuario.
CREATE INDEX IF NOT EXISTS records_user_pack ON records (user_id, game_id, pack_id);

-- Ranking de un puzzle: solo partidas limpias, ordenadas por tiempo.
CREATE INDEX IF NOT EXISTS records_leaderboard
  ON records (game_id, pack_id, level_id, is_clean_record, final_time_ms);
