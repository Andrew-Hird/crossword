export type GridCell = {
  isBlack: boolean;
  value: string; // 0..1 chars
};

export type GridModel = GridCell[][];

function makeEmptyGrid(width: number, height: number): GridModel {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ isBlack: false, value: '' })),
  );
}

export type Rng = () => number; // returns [0, 1)

function isWhiteCell(grid: GridModel, r: number, c: number) {
  const cell = grid[r]?.[c];
  return !!cell && !cell.isBlack;
}

function countWhiteNeighbors8(grid: GridModel, r: number, c: number) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (isWhiteCell(grid, r + dr, c + dc)) n++;
    }
  }
  return n;
}

function countWhiteNeighbors4(grid: GridModel, r: number, c: number) {
  let n = 0;
  if (isWhiteCell(grid, r - 1, c)) n++;
  if (isWhiteCell(grid, r + 1, c)) n++;
  if (isWhiteCell(grid, r, c - 1)) n++;
  if (isWhiteCell(grid, r, c + 1)) n++;
  return n;
}

export function generateGrid(
  width = 12,
  height = 12,
  blackRatio = 0.18,
  rng: Rng = Math.random,
): GridModel {
  const w = Math.max(3, Math.min(50, Math.floor(width)));
  const h = Math.max(3, Math.min(50, Math.floor(height)));
  const ratio = Math.max(0, Math.min(0.6, blackRatio));
  const area = w * h;
  const targetBlacks = Math.round(area * ratio);

  const grid = makeEmptyGrid(w, h);

  // Place random blacks.
  let placed = 0;
  let guard = 0;
  while (placed < targetBlacks && guard < area * 10) {
    guard++;
    const r = Math.floor(rng() * h);
    const c = Math.floor(rng() * w);
    const cell = grid[r]?.[c];
    if (!cell || cell.isBlack) continue;
    cell.isBlack = true;
    cell.value = '';
    placed++;
  }

  // Constraint: for each white cell, at most 5 surrounding whites (8-neighborhood).
  // If a cell violates this, we flip one of its neighboring whites to black until satisfied.
  const maxWhiteNeighbors = 5;
  let fixGuard = 0;
  const maxFixSteps = area * 40;
  while (fixGuard < maxFixSteps) {
    fixGuard++;
    let fixedOne = false;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!isWhiteCell(grid, r, c)) continue;
        const wn = countWhiteNeighbors8(grid, r, c);
        if (wn <= maxWhiteNeighbors) continue;

        // Collect candidate neighbor whites to flip.
        const candidates: Array<{ r: number; c: number }> = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (isWhiteCell(grid, rr, cc)) candidates.push({ r: rr, c: cc });
          }
        }

        if (candidates.length === 0) continue;

        // Deterministically pick a candidate using rng.
        const pick = candidates[Math.floor(rng() * candidates.length)];
        const cell = grid[pick.r]?.[pick.c];
        if (cell) {
          cell.isBlack = true;
          cell.value = '';
          fixedOne = true;
          break;
        }
      }
      if (fixedOne) break;
    }

    if (!fixedOne) break;
  }

  // Remove isolated single white cells (no orthogonal white neighbors).
  // This avoids 1-letter "islands" created by other constraints.
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r]?.[c];
      if (!cell || cell.isBlack) continue;
      if (countWhiteNeighbors4(grid, r, c) > 0) continue;
      cell.isBlack = true;
      cell.value = '';
    }
  }

  // Ensure not all black (scan final grid state).
  const hasAnyWhite = grid.some((row) => row.some((cell) => !cell.isBlack));
  if (!hasAnyWhite) {
    const mid = grid[Math.floor(h / 2)]?.[Math.floor(w / 2)];
    if (mid) {
      mid.isBlack = false;
      mid.value = '';
    }
  }

  return grid;
}

