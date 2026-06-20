import { cellKey, getConflicts, isSolved } from "./queens.rules.js";

export function createEmptyState(level) {
  return {
    levelId: level.id,
    queens: [],
    marks: [],
    completed: false,
    moves: 0
  };
}

export function normalizeState(state) {
  return {
    levelId: state.levelId,
    queens: Array.isArray(state.queens) ? state.queens : [],
    marks: Array.isArray(state.marks) ? state.marks : [],
    completed: Boolean(state.completed),
    moves: Number(state.moves || 0)
  };
}

export function toggleQueen(level, state, row, col) {
  const key = cellKey(row, col);
  const queens = state.queens.filter(q => cellKey(q.row, q.col) !== key);
  const exists = queens.length !== state.queens.length;

  const marks = state.marks.filter(mark => mark !== key);

  if (!exists) {
    queens.push({ row, col });
  }

  const next = {
    ...state,
    queens,
    marks,
    moves: state.moves + 1
  };

  next.completed = isSolved(level, queens);
  return next;
}

export function toggleMark(state, row, col) {
  const key = cellKey(row, col);
  const hasQueen = state.queens.some(q => cellKey(q.row, q.col) === key);

  if (hasQueen) return state;

  const exists = state.marks.includes(key);
  const marks = exists
    ? state.marks.filter(mark => mark !== key)
    : [...state.marks, key];

  return {
    ...state,
    marks,
    moves: state.moves + 1
  };
}

export function clearState(level) {
  return createEmptyState(level);
}

export function revealHint(level, state) {
  const existing = new Set(state.queens.map(q => cellKey(q.row, q.col)));

  for (const solutionCell of level.solution) {
    const key = cellKey(solutionCell.row, solutionCell.col);
    if (!existing.has(key)) {
      return {
        ...state,
        queens: [...state.queens, solutionCell],
        marks: state.marks.filter(mark => mark !== key),
        moves: state.moves + 1
      };
    }
  }

  return state;
}

export function getStateInfo(level, state) {
  const conflicts = getConflicts(level, state.queens);
  return {
    conflicts,
    solved: isSolved(level, state.queens),
    queensPlaced: state.queens.length
  };
}
