import { useState } from 'react';
import { generateGrid } from './generateGrid';
import type { GridModel } from './generateGrid';

export function App() {
  const width = 12;
  const height = 12;
  const blackRatio = 0.18;

  const [grid, setGrid] = useState<GridModel>(() => generateGrid(width, height, blackRatio));

  const regenerate = () => setGrid(generateGrid(width, height, blackRatio));

  const onChangeCell = (r: number, c: number, nextValue: string) => {
    setGrid((prev) => {
      const row = prev[r];
      const cell = row?.[c];
      if (!cell || cell.isBlack) return prev;

      const v = nextValue.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
      if (v === cell.value) return prev;

      const next = prev.map((rr) => rr.map((cc) => ({ ...cc })));
      const nextRow = next[r];
      const nextCell = nextRow?.[c];
      if (!nextCell) return prev;
      nextCell.value = v;
      return next;
    });
  };

  return (
    <div className="app">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${width}, var(--cell))`,
          gridTemplateRows: `repeat(${height}, var(--cell))`,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            if (cell.isBlack) {
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: Cell identity is its coordinates (fixed grid).
                  key={`${r}-${c}`}
                  className="cell cellBlack"
                />
              );
            }
            return (
              <input
                // biome-ignore lint/suspicious/noArrayIndexKey: Cell identity is its coordinates (fixed grid).
                key={`${r}-${c}`}
                className="cell cellWhite"
                value={cell.value}
                onChange={(e) => onChangeCell(r, c, e.target.value)}
                maxLength={1}
                inputMode="text"
                aria-label={`Row ${r + 1} column ${c + 1}`}
              />
            );
          }),
        )}
      </div>

      <button className="btn" onClick={regenerate} type="button">
        Regenerate
      </button>
    </div>
  );
}

