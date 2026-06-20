import { navigate } from "./router.js";
import { ensureProfiles, getActiveProfileId, setActiveProfileId } from "./profiles.js";
import { syncLevels } from "./sync.js";
import { ensureQueensSeedData, getQueensLevels } from "../games/queens/queens.level-loader.js";

const view = document.getElementById("view");
const connectionStatus = document.getElementById("connectionStatus");
const storageStatus = document.getElementById("storageStatus");

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

document.getElementById("installHintButton").addEventListener("click", () => {
  alert("En iPad: abre esta página en Safari, toca Compartir y selecciona “Agregar a pantalla de inicio”.");
});

async function init() {
  updateConnectionStatus();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.warn("No se pudo registrar el Service Worker", error);
    }
  }

  await ensureProfiles();
  await ensureQueensSeedData();

  const levels = await getQueensLevels();
  storageStatus.textContent = `${levels.length} niveles de Queens disponibles offline`;

  renderHome();
}

export async function renderHome() {
  const profiles = await ensureProfiles();
  const activeProfileId = await getActiveProfileId();
  const levels = await getQueensLevels();

  view.innerHTML = `
    <section class="grid home-grid">
      <article class="card">
        <h2>Perfil</h2>
        <p>Selecciona quién va a jugar. Cada perfil guarda su propio avance.</p>
        <div class="control-row">
          <select id="profileSelect" aria-label="Perfil">
            ${profiles.map(profile => `
              <option value="${profile.id}" ${profile.id === activeProfileId ? "selected" : ""}>${profile.name}</option>
            `).join("")}
          </select>
        </div>
      </article>

      <article class="card">
        <h2>Queens</h2>
        <p>Coloca una reina por fila, columna y región. Las reinas no pueden tocarse.</p>
        <div class="control-row">
          <button id="playQueensButton" class="primary-button" type="button">Jugar Queens</button>
        </div>
        <p class="meta">${levels.length} niveles disponibles sin conexión.</p>
      </article>

      <article class="card">
        <h2>Actualización offline</h2>
        <p>Cuando haya internet, puedes descargar nuevos paquetes de niveles para usarlos después sin conexión.</p>
        <div class="control-row">
          <button id="syncButton" class="secondary-button" type="button">Actualizar niveles</button>
        </div>
        <p id="syncMessage" class="message">Listo.</p>
      </article>
    </section>
  `;

  document.getElementById("profileSelect").addEventListener("change", async event => {
    await setActiveProfileId(event.target.value);
  });

  document.getElementById("playQueensButton").addEventListener("click", () => {
    navigate("queens");
  });

  document.getElementById("syncButton").addEventListener("click", async () => {
    const message = document.getElementById("syncMessage");
    message.textContent = "Buscando nuevos niveles...";
    const result = await syncLevels();
    message.textContent = result.message;
    const updatedLevels = await getQueensLevels();
    storageStatus.textContent = `${updatedLevels.length} niveles de Queens disponibles offline`;
  });
}

function updateConnectionStatus() {
  if (navigator.onLine) {
    connectionStatus.textContent = "Online · puede actualizar niveles";
  } else {
    connectionStatus.textContent = "Modo sin conexión";
  }
}

init();
