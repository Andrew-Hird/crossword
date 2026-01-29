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

export function generateGrid(width = 12, height = 12, blackRatio = 0.18): GridModel {
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
    const r = Math.floor(Math.random() * h);
    const c = Math.floor(Math.random() * w);
    const cell = grid[r]?.[c];
    if (!cell || cell.isBlack) continue;
    cell.isBlack = true;
    cell.value = '';
    placed++;
  }

  // Ensure not all black.
  if (placed >= area) {
    const mid = grid[Math.floor(h / 2)]?.[Math.floor(w / 2)];
    if (mid) mid.isBlack = false;
  }

  return grid;
}

