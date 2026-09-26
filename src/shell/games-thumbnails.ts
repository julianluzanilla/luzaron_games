/**
 * Miniaturas rediseñadas (Modernist). Reemplazan QUEENS_THUMB … ZIP_THUMB en src/shell/games.ts.
 * Cada juego llena su miniatura con uno de los cinco colores del logo; los trazos van en papel #f3f2f2
 * y tinta #201e1d, así que se ven igual en tema claro y oscuro.
 */

export const QUEENS_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#9a55e0"/>
  <rect x="10" y="10" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="50" y="10" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="30" y="30" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="70" y="30" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="10" y="50" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="50" y="50" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="30" y="70" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="70" y="70" width="20" height="20" fill="#f3f2f2" fill-opacity=".16"/>
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="#f3f2f2" stroke-width="3"/>
  <path d="M30 10v80M50 10v80M70 10v80M10 30h80M10 50h80M10 70h80" stroke="#f3f2f2" stroke-width="1.5" stroke-opacity=".7"/>
  <path d="M40 13L47 20L40 27L33 20Z" fill="#201e1d"/>
  <path d="M80 33L87 40L80 47L73 40Z" fill="#201e1d"/>
  <path d="M20 53L27 60L20 67L13 60Z" fill="#201e1d"/>
  <path d="M55 75l10 10M65 75l-10 10" stroke="#f3f2f2" stroke-width="2.5" stroke-opacity=".8"/>
</svg>`

export const SUDOKU_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#2f78e4"/>
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="#f3f2f2" stroke-width="3"/>
  <path d="M36.7 10v80M63.3 10v80M10 36.7h80M10 63.3h80" stroke="#f3f2f2" stroke-width="3"/>
  <path d="M19 10v80M28 10v80M46 10v80M55 10v80M72 10v80M81 10v80M10 19h80M10 28h80M10 46h80M10 55h80M10 72h80M10 81h80" stroke="#f3f2f2" stroke-width="1" stroke-opacity=".45"/>
  <g font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="20" fill="#f3f2f2" text-anchor="middle">
  <text x="23.3" y="30.5">5</text>
  <text x="76.7" y="57">3</text>
  <text x="23.3" y="83.5">8</text>
  </g>
  <text x="50" y="57" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="20" fill="#201e1d" text-anchor="middle">7</text>
</svg>`

export const WORDLE_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#1f9e52"/>
  <rect x="10" y="24" width="17" height="22" fill="#f3f2f2" />
  <text x="18.5" y="40.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#201e1d">L</text>
  <rect x="31" y="24" width="17" height="22" fill="#f3f2f2" />
  <text x="39.5" y="40.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#201e1d">U</text>
  <rect x="52" y="24" width="17" height="22" fill="#f29d12" />
  <text x="60.5" y="40.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#201e1d">N</text>
  <rect x="73" y="24" width="17" height="22" fill="#f3f2f2" />
  <text x="81.5" y="40.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#201e1d">A</text>
  <rect x="10" y="52" width="17" height="22" fill="#201e1d" />
  <text x="18.5" y="68.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#f3f2f2">R</text>
  <rect x="31" y="52" width="17" height="22" fill="#201e1d" />
  <text x="39.5" y="68.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#f3f2f2">O</text>
  <rect x="52" y="52" width="17" height="22" fill="#f29d12" />
  <text x="60.5" y="68.5" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#201e1d">M</text>
  <rect x="73" y="52" width="17" height="22" fill="none" stroke="#f3f2f2" stroke-width="2.5"/>
</svg>`

export const MAHJONG_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#f29d12"/>
  <g stroke="#201e1d" stroke-width="2.5">
  <rect x="12" y="34" width="30" height="42" fill="#f3f2f2"/>
  <rect x="58" y="34" width="30" height="42" fill="#f3f2f2"/>
  <rect x="35" y="20" width="30" height="42" fill="#f3f2f2"/>
  </g>
  <g fill="none" stroke="#2f78e4" stroke-width="3">
  <circle cx="21" cy="66" r="4.5"/>
  </g>
  <rect x="70" y="60" width="6" height="10" fill="#1f9e52"/>
  <text x="50" y="49" font-family="Noto Serif, Georgia, serif" font-size="20" font-weight="700" text-anchor="middle" fill="#ec3013">中</text>
</svg>`

export const ZIP_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#ec3013"/>
  <path d="M10 10h80v80H10z M30 10v80M50 10v80M70 10v80M10 30h80M10 50h80M10 70h80" fill="none" stroke="#f3f2f2" stroke-width="1" stroke-opacity=".4"/>
  <polyline points="20 20 40 20 60 20 80 20 80 40 60 40 40 40 20 40 20 60 40 60 60 60 80 60 80 80 60 80 40 80" fill="none" stroke="#f3f2f2" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M30 30h40" stroke="#201e1d" stroke-width="5"/>
  <g fill="#201e1d">
  <rect x="13" y="13" width="14" height="14"/>
  <rect x="13" y="53" width="14" height="14"/>
  <rect x="33" y="73" width="14" height="14"/>
  </g>
  <g font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="10" fill="#f3f2f2" text-anchor="middle">
  <text x="20" y="23.6">1</text>
  <text x="20" y="63.6">2</text>
  <text x="40" y="83.6">3</text>
  </g>
</svg>`

/** Memoria: 4 cartas boca abajo y el par de 中 destapado. */
export const MEMORIA_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect width="100" height="100" fill="#e24aa0"/>
  <rect x="11" y="18" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <rect x="13" y="20" width="18" height="25" fill="#ec3013"/>
  <rect x="14.5" y="21.5" width="15" height="22" fill="none" stroke="#f3f2f2" stroke-width=".6"/>
  <rect x="16" y="26.5" width="12" height="12" fill="#f3f2f2"/>
  <g transform="translate(17 27.5)">
  <rect width="4.6" height="4.6" fill="#9a55e0"/>
  <rect y="5.4" width="4.6" height="4.6" fill="#2f78e4"/>
  <rect x="5.4" y="5.4" width="4.6" height="4.6" fill="#1f9e52"/>
  <rect x="5.4" width="4.6" height="4.6" fill="#ec3013"/>
  </g>
  <rect x="39" y="18" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <text x="50" y="38.5" text-anchor="middle" font-family="Noto Serif, Georgia, serif" font-weight="700" font-size="16" fill="#c22239">中</text>
  <rect x="67" y="18" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <rect x="69" y="20" width="18" height="25" fill="#ec3013"/>
  <rect x="70.5" y="21.5" width="15" height="22" fill="none" stroke="#f3f2f2" stroke-width=".6"/>
  <rect x="72" y="26.5" width="12" height="12" fill="#f3f2f2"/>
  <g transform="translate(73 27.5)">
  <rect width="4.6" height="4.6" fill="#9a55e0"/>
  <rect y="5.4" width="4.6" height="4.6" fill="#2f78e4"/>
  <rect x="5.4" y="5.4" width="4.6" height="4.6" fill="#1f9e52"/>
  <rect x="5.4" width="4.6" height="4.6" fill="#ec3013"/>
  </g>
  <rect x="11" y="53" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <text x="22" y="73.5" text-anchor="middle" font-family="Noto Serif, Georgia, serif" font-weight="700" font-size="16" fill="#c22239">中</text>
  <rect x="39" y="53" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <rect x="41" y="55" width="18" height="25" fill="#ec3013"/>
  <rect x="42.5" y="56.5" width="15" height="22" fill="none" stroke="#f3f2f2" stroke-width=".6"/>
  <rect x="44" y="61.5" width="12" height="12" fill="#f3f2f2"/>
  <g transform="translate(45 62.5)">
  <rect width="4.6" height="4.6" fill="#9a55e0"/>
  <rect y="5.4" width="4.6" height="4.6" fill="#2f78e4"/>
  <rect x="5.4" y="5.4" width="4.6" height="4.6" fill="#1f9e52"/>
  <rect x="5.4" width="4.6" height="4.6" fill="#ec3013"/>
  </g>
  <rect x="67" y="53" width="22" height="29" fill="#f3f2f2" stroke="#201e1d" stroke-width="1.5"/>
  <rect x="69" y="55" width="18" height="25" fill="#ec3013"/>
  <rect x="70.5" y="56.5" width="15" height="22" fill="none" stroke="#f3f2f2" stroke-width=".6"/>
  <rect x="72" y="61.5" width="12" height="12" fill="#f3f2f2"/>
  <g transform="translate(73 62.5)">
  <rect width="4.6" height="4.6" fill="#9a55e0"/>
  <rect y="5.4" width="4.6" height="4.6" fill="#2f78e4"/>
  <rect x="5.4" y="5.4" width="4.6" height="4.6" fill="#1f9e52"/>
  <rect x="5.4" width="4.6" height="4.6" fill="#ec3013"/>
  </g>
</svg>`
