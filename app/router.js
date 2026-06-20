import { renderHome } from "./shell.js";
import { renderQueens } from "../games/queens/queens.ui.js";

export function navigate(route, params = {}) {
  if (route === "queens") {
    renderQueens(params);
    return;
  }

  renderHome();
}
