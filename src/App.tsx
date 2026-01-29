import { useMemo, useRef, useState } from 'react';
import { generateGrid } from './generateGrid';
import type { GridModel } from './generateGrid';

type Dir = 'across' | 'down';
type Pos = { r: number; c: number };

function isLetterKey(e: React.KeyboardEvent) {
  return e.key.length === 1 && /^[a-z]$/i.test(e.key);
}

function inBounds(grid: GridModel, r: number, c: number) {
  const firstRow = grid[0];
  const width = firstRow ? firstRow.length : 0;
  return r >= 0 && c >= 0 && r < grid.length && c < width;
}

function isWhite(grid: GridModel, r: number, c: number) {
  if (!inBounds(grid, r, c)) return false;
  const cell = grid[r]?.[c];
  return !!cell && !cell.isBlack;
}

function step(pos: Pos, dir: Dir, delta: 1 | -1): Pos {
  if (dir === 'across') return { r: pos.r, c: pos.c + delta };
  return { r: pos.r + delta, c: pos.c };
}

function getWordStart(grid: GridModel, pos: Pos, dir: Dir): Pos {
  let cur = pos;
  while (true) {
    const prev = step(cur, dir, -1);
    if (!isWhite(grid, prev.r, prev.c)) return cur;
    cur = prev;
  }
}

function getWordCells(grid: GridModel, pos: Pos, dir: Dir): Pos[] {
  if (!isWhite(grid, pos.r, pos.c)) return [];
  const start = getWordStart(grid, pos, dir);
  const cells: Pos[] = [];
  let cur = start;
  while (isWhite(grid, cur.r, cur.c)) {
    cells.push(cur);
    cur = step(cur, dir, 1);
  }
  return cells;
}

export function App() {
  const width = 12;
  const height = 12;
  const blackRatio = 0.18;

  const [grid, setGrid] = useState<GridModel>(() => generateGrid(width, height, blackRatio));
  const [active, setActive] = useState<{ pos: Pos; dir: Dir } | null>(null);
  const inputsRef = useRef<Array<Array<HTMLInputElement | null>>>([]);
  const programmaticFocusRef = useRef(false);

  const regenerate = () => setGrid(generateGrid(width, height, blackRatio));

  const selectedWord = useMemo(() => {
    if (!active) return { cells: [] as Pos[], start: null as Pos | null };
    const cells = getWordCells(grid, active.pos, active.dir);
    const start = cells[0] ?? null;
    return { cells, start };
  }, [active, grid]);

  const selectedSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of selectedWord.cells) s.add(`${p.r},${p.c}`);
    return s;
  }, [selectedWord.cells]);

  const focusCell = (p: Pos) => {
    const el = inputsRef.current[p.r]?.[p.c];
    programmaticFocusRef.current = true;
    el?.focus();
    el?.select();
  };

  const setCellValue = (p: Pos, v: string) => {
    setGrid((prev) => {
      const cell = prev[p.r]?.[p.c];
      if (!cell || cell.isBlack) return prev;
      if (cell.value === v) return prev;
      const next = prev.map((rr) => rr.map((cc) => ({ ...cc })));
      const nextCell = next[p.r]?.[p.c];
      if (!nextCell) return prev;
      nextCell.value = v;
      return next;
    });
  };

  const moveWithinWord = (from: Pos, dir: Dir, delta: 1 | -1) => {
    const next = step(from, dir, delta);
    if (!isWhite(grid, next.r, next.c)) return null;
    return next;
  };

  const activate = (p: Pos, reason: 'user' | 'program') => {
    if (!isWhite(grid, p.r, p.c)) return;
    setActive((prev) => {
      // Default direction: horizontal (across)
      if (!prev) return { pos: p, dir: 'across' };
      const same = prev.pos.r === p.r && prev.pos.c === p.c;
      // When switching to a different word/cell via user action, reset to horizontal.
      // Programmatic moves (typing auto-advance) keep the current direction.
      if (!same) return { pos: p, dir: reason === 'user' ? 'across' : prev.dir };

      // Only user-initiated re-taps toggle direction.
      if (reason !== 'user') return prev;
      return { pos: p, dir: prev.dir === 'across' ? 'down' : 'across' };
    });
    // Focus after state update tick; focusing immediately still works in practice,
    // but this keeps mobile Safari happy.
    setTimeout(() => focusCell(p), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, p: Pos) => {
    if (!active) return;

    if (isLetterKey(e)) {
      e.preventDefault();
      const v = e.key.toUpperCase();
      setCellValue(p, v);
      const next = moveWithinWord(p, active.dir, 1);
      if (next) activate(next, 'program');
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (grid[p.r]?.[p.c]?.value) {
        setCellValue(p, '');
        return;
      }
      const prev = moveWithinWord(p, active.dir, -1);
      if (prev) {
        activate(prev, 'program');
        setCellValue(prev, '');
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activate({ r: p.r, c: Math.max(0, p.c - 1) }, 'program');
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activate({ r: p.r, c: Math.min(width - 1, p.c + 1) }, 'program');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activate({ r: Math.max(0, p.r - 1), c: p.c }, 'program');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activate({ r: Math.min(height - 1, p.r + 1), c: p.c }, 'program');
      return;
    }
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

            const p = { r, c };
            const k = `${r},${c}`;
            const isSelected = selectedSet.has(k);
            const isActive = active?.pos.r === r && active.pos.c === c;

            return (
              <input
                // biome-ignore lint/suspicious/noArrayIndexKey: Cell identity is its coordinates (fixed grid).
                key={`${r}-${c}`}
                className={[
                  'cell',
                  'cellWhite',
                  isSelected ? 'cellSelected' : null,
                  isActive ? 'cellActive' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                value={cell.value}
                onFocus={() => {
                  // Programmatic focus should not toggle direction.
                  const wasProgrammatic = programmaticFocusRef.current;
                  programmaticFocusRef.current = false;
                  activate(p, 'program');
                }}
                onPointerDown={() => activate(p, 'user')}
                onKeyDown={(e) => onKeyDown(e, p)}
                onChange={(e) => {
                  // Mobile keyboards can send whole strings; take the last A-Z character.
                  const raw = e.target.value.toUpperCase();
                  const match = raw.match(/[A-Z]/g);
                  const v = match ? (match[match.length - 1] ?? '') : '';
                  setCellValue(p, v);
                  if (v && active) {
                    const next = moveWithinWord(p, active.dir, 1);
                    if (next) activate(next, 'program');
                  }
                }}
                maxLength={1}
                inputMode="text"
                aria-label={`Row ${r + 1} column ${c + 1}`}
                ref={(el) => {
                  if (!inputsRef.current[r]) inputsRef.current[r] = [];
                  const rowRef = inputsRef.current[r];
                  if (!rowRef) return;
                  rowRef[c] = el;
                }}
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

