/**
 * Piezas de presentación compartidas del rediseño Modernist
 * (design_handoff_luzaron): íconos Lucide, botones, control segmentado,
 * cabecera de tiempo y la hoja de victoria.
 *
 * Todo devuelve HTML como string, igual que el resto de la app. Aquí no hay
 * estado ni lógica de juego: solo marcado.
 */

/** Íconos Lucide: stroke 2.25, remate cuadrado, 20px. */
const ICON_PATHS = {
  'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  lightbulb:
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  shuffle:
    '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.45-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.3 1.7l.43.7"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  delete:
    '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/>',
  trophy:
    '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'log-out':
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  maximize:
    '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
  minimize:
    '<path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
} as const

export type IconName = keyof typeof ICON_PATHS

export function icon(name: IconName, size = 20): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`
}

/* ---------------------------------------------------------------------- */
/* Botones                                                                 */
/* ---------------------------------------------------------------------- */

export interface ButtonSpec {
  action: string
  label: string
  icon?: IconName
  /** `primary` = fondo acento; por defecto va transparente con borde. */
  variant?: 'primary' | 'default'
  disabled?: boolean
  /** Atributos extra, ya escapados (p. ej. `aria-pressed="true"`). */
  attrs?: string
  className?: string
  /** Flecha al final de la etiqueta (acción principal de una hoja). */
  trailingArrow?: boolean
}

export function button(spec: ButtonSpec): string {
  const classes = ['control-button']
  if (spec.variant === 'primary') classes.push('control-button-primary')
  if (spec.className) classes.push(spec.className)

  return `
    <button type="button" class="${classes.join(' ')}" data-action="${spec.action}"
            ${spec.disabled ? 'disabled' : ''} ${spec.attrs ?? ''}>
      ${spec.icon ? icon(spec.icon) : ''}<span class="control-button-label">${spec.label}</span>${
        spec.trailingArrow ? `<span class="control-button-trail">${icon('arrow-right')}</span>` : ''
      }
    </button>
  `
}

/** Fila de botones en rejilla de N columnas iguales. */
export function buttonRow(buttons: string[], className = ''): string {
  return `<div class="button-row ${className}" style="--cols:${buttons.length}">${buttons.join('')}</div>`
}

/* ---------------------------------------------------------------------- */
/* Control segmentado                                                      */
/* ---------------------------------------------------------------------- */

export interface SegmentOption {
  label: string
  active: boolean
  /** Atributos data-* de la opción, ya escapados. */
  attrs: string
  title?: string
}

export function segmented(
  ariaLabel: string,
  action: string,
  options: SegmentOption[],
  className = ''
): string {
  const items = options
    .map(
      (option) => `
        <button type="button" class="size-chip ${option.active ? 'active' : ''}"
                data-action="${action}" ${option.attrs}
                aria-pressed="${option.active}"
                ${option.title ? `title="${option.title}"` : ''}>${option.label}</button>
      `
    )
    .join('')

  return `<nav class="size-selector ${className}" aria-label="${ariaLabel}">${items}</nav>`
}

/* ---------------------------------------------------------------------- */
/* Tiempo y metadatos                                                      */
/* ---------------------------------------------------------------------- */

/** m:ss, como en el handoff ("1:12"). */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Renglón de arriba del juego: reloj grande a la izquierda y metadatos a la derecha. */
export function gameStatus(timeHtml: string, metaLines: string[]): string {
  return `
    <div class="game-status">
      ${timeHtml}
      <div class="puzzle-meta">${metaLines.filter(Boolean).join('')}</div>
    </div>
  `
}

export function timer(ms: number): string {
  return `<span class="timer" data-timer aria-label="Tiempo transcurrido">${formatClock(ms)}</span>`
}

/* ---------------------------------------------------------------------- */
/* Hoja de victoria                                                        */
/* ---------------------------------------------------------------------- */

export interface CelebrationStat {
  label: string
  value: string
  trophy?: boolean
  /** Texto largo (una palabra, un modo): va más chico que un número. */
  text?: boolean
}

export interface CelebrationSpec {
  eyebrow: string
  title: string
  stats: CelebrationStat[]
  /** Bloque libre entre las cifras y la nota (Wordle lo usa para la definición). */
  extra?: string
  note?: string
  /** Acción principal a todo el ancho, con flecha al final. */
  primary?: ButtonSpec
  /** Acciones secundarias en rejilla debajo. */
  secondary: ButtonSpec[]
  className?: string
  titleId?: string
}

export function celebration(spec: CelebrationSpec): string {
  const stats = spec.stats
    .map(
      (stat) => `
        <div class="modal-stat">
          <dt>${stat.label}</dt>
          <dd class="${stat.text ? 'modal-stat-text' : ''}">${stat.value}${
            stat.trophy
              ? `<span class="modal-trophy" title="Nuevo récord">${icon('trophy')}</span>`
              : ''
          }</dd>
        </div>
      `
    )
    .join('')

  return `
    <div class="modal-overlay" role="dialog" aria-modal="true" ${spec.titleId ? `aria-labelledby="${spec.titleId}"` : ''}>
      <div class="modal-card modal-card-celebration ${spec.className ?? ''}">
        <div class="modal-heading">
          <p class="eyebrow">${spec.eyebrow}</p>
          <h2 ${spec.titleId ? `id="${spec.titleId}"` : ''}>${spec.title}</h2>
        </div>
        <dl class="modal-stats" style="--cols:${spec.stats.length}">${stats}</dl>
        ${spec.extra ?? ''}
        ${spec.note ? `<p class="modal-note">${spec.note}</p>` : ''}
        <div class="modal-actions">
          ${spec.primary ? button({ ...spec.primary, variant: 'primary', trailingArrow: true, className: 'control-button-hero' }) : ''}
          ${spec.secondary.length ? buttonRow(spec.secondary.map(button)) : ''}
        </div>
      </div>
    </div>
  `
}

/** Diálogo de confirmación simple (reiniciar, repartir…). */
export function confirmDialog(options: {
  eyebrow?: string
  title: string
  body: string
  actions: ButtonSpec[]
}): string {
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-heading">
          ${options.eyebrow ? `<p class="eyebrow">${options.eyebrow}</p>` : ''}
          <h2>${options.title}</h2>
        </div>
        <p class="modal-body">${options.body}</p>
        <div class="modal-actions">${buttonRow(options.actions.map(button))}</div>
      </div>
    </div>
  `
}

export function pauseOverlay(): string {
  return `
    <div class="pause-overlay" aria-live="polite">
      <div class="pause-card">
        <p class="eyebrow">Pausa automática</p>
        <h2>Juego pausado</h2>
        <p>El tablero se oscureció porque la app perdió el foco. Al volver, se reanuda solo.</p>
      </div>
    </div>
  `
}
