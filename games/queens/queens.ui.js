import { navigate } from "../../app/router.js";
import { getActiveProfile } from "../../app/profiles.js";
import { getProgress, saveProgress } from "../../app/storage.js";
import { getQueensLevels } from "./queens.level-loader.js";
import { createEmptyState, normalizeState, toggleQueen, toggleMark, clearState, revealHint, getStateInfo } from "./queens.engine.js";
import { cellKey } from "./queens.rules.js";

let current = {
  levels: [],
  levelIndex: 0,
  level: null,
  profile: null,
  state: null,
  showErrors: true
};

export async function renderQueens(params = {}) {
  const view = document.getElementById("view");
  view.innerHTML = `<section class="game-panel"><p>Cargando Queens...</p></section>`;

  current.profile = await getActiveProfile();
  current.levels = await getQueensLevels();
  current.levelIndex = Number(params.levelIndex || 0);
  current.levelIndex = Math.max(0, Math.min(current.levelIndex, current.levels.length - 1));

  await loadCurrentLevel();
  drawQueens();
}

async function loadCurrentLevel() {
  current.level = current.levels[current.levelIndex];
  const progress = await getProgress(current.profile.id, "queens", current.level.id);

  current.state = progress?.state
    ? normalizeState(progress.state)
    : createEmptyState(current.level);
}

async function persist() {
  await saveProgress(current.profile.id, "queens", current.level.id, {
    state: current.state,
    completed: current.state.completed,
    moves: current.state.moves
  });
}

function drawQueens() {
  const view = document.getElementById("view");
  const level = current.level;
  const state = current.state;
  const info = getStateInfo(level, state);

  view.innerHTML = `
    <section class="game-panel">
      <div class="game-header">
        <div>
          <h2>Queens</h2>
          <p class="meta">Perfil: ${current.profile.name} · Nivel ${current.levelIndex + 1} de ${current.levels.length} · ${level.difficulty}</p>
        </div>
        <button id="backButton" class="ghost-button" type="button">Volver</button>
      </div>

      <div class="game-layout">
        <div class="board-wrap">
          <div id="queensBoard" class="queens-board" style="grid-template-columns: repeat(${level.size}, 1fr);"></div>
        </div>

        <aside class="card">
          <h3>Progreso</h3>
          <p>${info.queensPlaced}/${level.size} reinas colocadas</p>
          <p>Movimientos: ${state.moves}</p>
          <p id="message" class="message ${info.solved ? "success" : info.conflicts.size ? "danger" : ""}">
            ${info.solved ? "¡Nivel completado!" : info.conflicts.size ? "Hay conflictos en el tablero." : "Toca una casilla para colocar una reina. Mantén presionado para marcar."}
          </p>

          <div class="control-row">
            <button id="prevButton" class="secondary-button" type="button">Anterior</button>
            <button id="nextButton" class="secondary-button" type="button">Siguiente</button>
            <button id="resetButton" class="danger-button" type="button">Reiniciar</button>
            <button id="hintButton" class="ghost-button" type="button">Pista</button>
            <button id="errorsButton" class="ghost-button" type="button">${current.showErrors ? "Ocultar errores" : "Mostrar errores"}</button>
          </div>
        </aside>
      </div>
    </section>
  `;

  const board = document.getElementById("queensBoard");
  const queenKeys = new Set(state.queens.map(q => cellKey(q.row, q.col)));
  const markKeys = new Set(state.marks);
  const conflictKeys = current.showErrors ? info.conflicts : new Set();

  for (let row = 0; row < level.size; row++) {
    for (let col = 0; col < level.size; col++) {
      const key = cellKey(row, col);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = [
        "cell",
        `region-${level.regions[row][col] % 9}`,
        queenKeys.has(key) ? "queen" : "",
        markKeys.has(key) ? "marked" : "",
        conflictKeys.has(key) ? "error" : ""
      ].filter(Boolean).join(" ");

      let longPressTimer = null;
      let longPressed = false;

      cell.addEventListener("pointerdown", () => {
        longPressed = false;
        longPressTimer = window.setTimeout(async () => {
          longPressed = true;
          current.state = toggleMark(current.state, row, col);
          await persist();
          drawQueens();
        }, 420);
      });

      cell.addEventListener("pointerup", async () => {
        window.clearTimeout(longPressTimer);
        if (longPressed) return;

        current.state = toggleQueen(level, current.state, row, col);
        await persist();
        drawQueens();
      });

      cell.addEventListener("pointerleave", () => {
        window.clearTimeout(longPressTimer);
      });

      board.appendChild(cell);
    }
  }

  document.getElementById("backButton").addEventListener("click", () => navigate("home"));

  document.getElementById("prevButton").addEventListener("click", async () => {
    if (current.levelIndex <= 0) return;
    current.levelIndex -= 1;
    await loadCurrentLevel();
    drawQueens();
  });

  document.getElementById("nextButton").addEventListener("click", async () => {
    if (current.levelIndex >= current.levels.length - 1) return;
    current.levelIndex += 1;
    await loadCurrentLevel();
    drawQueens();
  });

  document.getElementById("resetButton").addEventListener("click", async () => {
    current.state = clearState(current.level);
    await persist();
    drawQueens();
  });

  document.getElementById("hintButton").addEventListener("click", async () => {
    current.state = revealHint(current.level, current.state);
    await persist();
    drawQueens();
  });

  document.getElementById("errorsButton").addEventListener("click", () => {
    current.showErrors = !current.showErrors;
    drawQueens();
  });
}
