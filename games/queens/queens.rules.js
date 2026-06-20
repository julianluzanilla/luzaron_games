export function getConflicts(level, queens) {
  const conflicts = new Set();
  const rows = new Map();
  const cols = new Map();
  const regions = new Map();

  for (const queen of queens) {
    const key = cellKey(queen.row, queen.col);
    addToMap(rows, queen.row, key);
    addToMap(cols, queen.col, key);
    addToMap(regions, level.regions[queen.row][queen.col], key);
  }

  collectDuplicateConflicts(rows, conflicts);
  collectDuplicateConflicts(cols, conflicts);
  collectDuplicateConflicts(regions, conflicts);

  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i];
      const b = queens[j];

      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        conflicts.add(cellKey(a.row, a.col));
        conflicts.add(cellKey(b.row, b.col));
      }
    }
  }

  return conflicts;
}

export function isSolved(level, queens) {
  if (queens.length !== level.size) return false;
  return getConflicts(level, queens).size === 0;
}

export function cellKey(row, col) {
  return `${row},${col}`;
}

function addToMap(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function collectDuplicateConflicts(map, conflicts) {
  for (const values of map.values()) {
    if (values.length > 1) {
      values.forEach(value => conflicts.add(value));
    }
  }
}
