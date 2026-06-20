const DB_NAME = "luzaron-games-db";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("levelPacks")) {
        db.createObjectStore("levelPacks", { keyPath: "packId" });
      }

      if (!db.objectStoreNames.contains("levels")) {
        const store = db.createObjectStore("levels", { keyPath: "id" });
        store.createIndex("game", "game", { unique: false });
        store.createIndex("packId", "packId", { unique: false });
      }

      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });

  return dbPromise;
}

function tx(storeName, mode = "readonly") {
  return openDb().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put(storeName, value) {
  const store = await tx(storeName, "readwrite");
  return promisifyRequest(store.put(value));
}

export async function get(storeName, key) {
  const store = await tx(storeName);
  return promisifyRequest(store.get(key));
}

export async function getAll(storeName) {
  const store = await tx(storeName);
  return promisifyRequest(store.getAll());
}

export async function deleteRecord(storeName, key) {
  const store = await tx(storeName, "readwrite");
  return promisifyRequest(store.delete(key));
}

export async function getLevelsByGame(game) {
  const store = await tx("levels");
  const index = store.index("game");
  return promisifyRequest(index.getAll(game));
}

export async function savePack(pack) {
  const normalizedLevels = pack.levels.map(level => ({
    ...level,
    game: pack.game,
    packId: pack.packId
  }));

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["levelPacks", "levels"], "readwrite");
    const packs = transaction.objectStore("levelPacks");
    const levels = transaction.objectStore("levels");

    packs.put({
      game: pack.game,
      packId: pack.packId,
      version: pack.version,
      levelCount: normalizedLevels.length,
      installedAt: new Date().toISOString()
    });

    normalizedLevels.forEach(level => levels.put(level));

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getProgress(profileId, game, levelId) {
  return get("progress", `${profileId}:${game}:${levelId}`);
}

export async function saveProgress(profileId, game, levelId, data) {
  return put("progress", {
    key: `${profileId}:${game}:${levelId}`,
    profileId,
    game,
    levelId,
    updatedAt: new Date().toISOString(),
    ...data
  });
}
