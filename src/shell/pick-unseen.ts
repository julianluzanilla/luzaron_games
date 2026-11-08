/**
 * Random pick that doesn't repeat until every item has been played once.
 * The played ids live in localStorage under `storageKey`.
 */
export function pickUnseen<T>(storageKey: string, items: T[], idOf: (item: T) => string): number {
  let seen: Set<string>

  try {
    seen = new Set(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as string[])
  } catch {
    seen = new Set()
  }

  let unseen = items.map((_, index) => index).filter((index) => !seen.has(idOf(items[index])))

  if (unseen.length === 0) {
    // Played through the whole pool — start a fresh lap.
    seen = new Set()
    unseen = items.map((_, index) => index)
  }

  const chosen = unseen[Math.floor(Math.random() * unseen.length)]
  seen.add(idOf(items[chosen]))

  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...seen]))
  } catch {
    // Ignore storage failures (e.g. private browsing) — repeats are a minor inconvenience.
  }

  return chosen
}

export function shuffled<T>(items: T[]): T[] {
  const copy = items.slice()

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}
