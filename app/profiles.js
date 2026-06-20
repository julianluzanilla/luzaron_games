import { getAll, put, get } from "./storage.js";

export const DEFAULT_PROFILES = [
  { id: "child-1", name: "Niño 1" },
  { id: "child-2", name: "Niño 2" },
  { id: "guest", name: "Invitado" }
];

export async function ensureProfiles() {
  const existing = await getAll("profiles");
  if (existing.length > 0) return existing;

  for (const profile of DEFAULT_PROFILES) {
    await put("profiles", {
      ...profile,
      createdAt: new Date().toISOString(),
      stats: {}
    });
  }

  return getAll("profiles");
}

export async function getActiveProfileId() {
  const setting = await get("settings", "activeProfileId");
  return setting?.value || "child-1";
}

export async function setActiveProfileId(profileId) {
  await put("settings", { key: "activeProfileId", value: profileId });
}

export async function getActiveProfile() {
  const profiles = await ensureProfiles();
  const activeId = await getActiveProfileId();
  return profiles.find(profile => profile.id === activeId) || profiles[0];
}
