import { getAll, savePack, put } from "./storage.js";

const REMOTE_MANIFEST_URL = "./levels/manifest.json";

export async function syncLevels() {
  if (!navigator.onLine) {
    return {
      ok: false,
      offline: true,
      message: "Modo sin conexión. Se usarán los niveles guardados."
    };
  }

  try {
    const response = await fetch(REMOTE_MANIFEST_URL, { cache: "no-store" });

    if (!response.ok) {
      return {
        ok: false,
        message: "No hay manifest remoto publicado todavía."
      };
    }

    const manifest = await response.json();
    const localPacks = await getAll("levelPacks");
    const localMap = new Map(localPacks.map(pack => [pack.packId, pack]));

    let installed = 0;

    for (const remotePack of manifest.packs || []) {
      const localPack = localMap.get(remotePack.packId);
      const needsInstall = !localPack || Number(remotePack.version) > Number(localPack.version);

      if (!needsInstall) continue;

      const packResponse = await fetch(remotePack.url, { cache: "no-store" });
      if (!packResponse.ok) continue;

      const pack = await packResponse.json();

      if (pack.game !== remotePack.game || pack.packId !== remotePack.packId) {
        console.warn("Pack ignorado por no coincidir con el manifest", remotePack);
        continue;
      }

      await savePack(pack);
      installed += 1;
    }

    await put("settings", {
      key: "lastSync",
      value: new Date().toISOString()
    });

    return {
      ok: true,
      installed,
      message: installed > 0
        ? "Nuevos niveles disponibles sin conexión."
        : "Tus niveles ya están actualizados."
    };
  } catch (error) {
    return {
      ok: false,
      message: "No se pudieron actualizar niveles. La app seguirá funcionando offline.",
      error
    };
  }
}
