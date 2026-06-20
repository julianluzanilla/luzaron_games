import { getLevelsByGame, savePack } from "../../app/storage.js";

const SEED_PACK_URL = "./seed-data/queens/queens-pack-001.json";

export async function ensureQueensSeedData() {
  const existing = await getLevelsByGame("queens");
  if (existing.length > 0) return existing;

  const response = await fetch(SEED_PACK_URL);
  if (!response.ok) {
    throw new Error("No se pudo cargar el paquete inicial de Queens.");
  }

  const pack = await response.json();
  await savePack(pack);

  return getLevelsByGame("queens");
}

export async function getQueensLevels() {
  await ensureQueensSeedData();
  const levels = await getLevelsByGame("queens");

  return levels.sort((a, b) => {
    const aNum = Number(String(a.id).replace(/\D/g, ""));
    const bNum = Number(String(b.id).replace(/\D/g, ""));
    return aNum - bNum;
  });
}
