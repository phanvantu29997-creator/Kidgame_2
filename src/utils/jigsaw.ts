export const BOARD_SIZE = 400;

export interface PuzzlePieceDef {
  id: string;
  col: number;
  row: number;
  path: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
}

/**
 * Builds an SVG path segment from (x1, y1) to (x2, y2) with a smooth rounded
 * interlocking puzzle tab (dir = 1 or -1) or a flat line (dir = 0).
 * Symmetric around t = 0.5 so reversed edges produce the identical curve.
 */
function buildEdgeSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dir: -1 | 0 | 1,
  tabSize: number,
): string {
  if (dir === 0) {
    return `L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;

  // Right-hand normal in SVG (y-down) coordinate system
  const nx = -uy;
  const ny = ux;
  const s = dir * tabSize;

  const p = (t: number, n: number) => {
    const px = x1 + ux * len * t + nx * s * n;
    const py = y1 + uy * len * t + ny * s * n;
    return `${px.toFixed(2)} ${py.toFixed(2)}`;
  };

  return [
    `L ${p(0.35, 0)}`,
    `C ${p(0.41, 0)}, ${p(0.41, 0.2)}, ${p(0.37, 0.42)}`,
    `C ${p(0.32, 0.72)}, ${p(0.39, 1.0)}, ${p(0.5, 1.0)}`,
    `C ${p(0.61, 1.0)}, ${p(0.68, 0.72)}, ${p(0.63, 0.42)}`,
    `C ${p(0.59, 0.2)}, ${p(0.59, 0)}, ${p(0.65, 0)}`,
    `L ${p(1, 0)}`,
  ].join(' ');
}

/**
 * Generates interlocking jigsaw pieces for a cols x rows grid over a 400x400 board.
 */
export function generateJigsawPieces(cols: number, rows: number): PuzzlePieceDef[] {
  const cw = BOARD_SIZE / cols;
  const ch = BOARD_SIZE / rows;
  const tabSize = Math.min(cw, ch) * 0.22;
  const pad = 4;

  // Vertical interior seams: vTabs[r][c] is the seam between col c and c+1 at row r
  // +1 means tab protrudes LEFT into col c, -1 means tab protrudes RIGHT into col c+1
  // (using right-hand normal of top-to-bottom edge, which points LEFT)
  const vTabs: (-1 | 1)[][] = [];
  for (let r = 0; r < rows; r++) {
    vTabs[r] = [];
    for (let c = 0; c < cols - 1; c++) {
      // Alternate deterministically for clean visual variety
      vTabs[r][c] = (r + c) % 2 === 0 ? -1 : 1;
    }
  }

  // Horizontal interior seams: hTabs[r][c] is the seam between row r and r+1 at col c
  // +1 means tab protrudes DOWN into row r+1, -1 means tab protrudes UP into row r
  const hTabs: (-1 | 1)[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    hTabs[r] = [];
    for (let c = 0; c < cols; c++) {
      hTabs[r][c] = (r + c) % 2 === 0 ? 1 : -1;
    }
  }

  const pieces: PuzzlePieceDef[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * cw;
      const x1 = (c + 1) * cw;
      const y0 = r * ch;
      const y1 = (r + 1) * ch;

      // Edge directions relative to clockwise traversal:
      // Top: (x0,y0) -> (x1,y0), right-hand normal points DOWN (+y).
      //   Boundary if r===0 (0). Else seam hTabs[r-1][c]: +1 bulges DOWN (inward), -1 bulges UP (outward).
      //   So when tracing (x0,y0)->(x1,y0), dir = hTabs[r-1][c].
      const topDir: -1 | 0 | 1 = r === 0 ? 0 : hTabs[r - 1][c];

      // Right: (x1,y0) -> (x1,y1), right-hand normal points LEFT (-x).
      //   If c===cols-1 -> 0. Else seam vTabs[r][c]: +1 bulges LEFT (inward), -1 bulges RIGHT (outward).
      const rightDir: -1 | 0 | 1 = c === cols - 1 ? 0 : vTabs[r][c];

      // Bottom: (x1,y1) -> (x0,y1), right-hand normal points UP (-y).
      //   If r===rows-1 -> 0.
      //   When top edge of piece below traced left->right, hTabs[r][c] = +1 bulged DOWN (outward from this piece!).
      //   Here our normal points UP, so to bulge DOWN we need -hTabs[r][c].
      const bottomDir: -1 | 0 | 1 = r === rows - 1 ? 0 : ((-hTabs[r][c]) as -1 | 1);

      // Left: (x0,y1) -> (x0,y0), right-hand normal points RIGHT (+x).
      //   If c===0 -> 0.
      //   Seam vTabs[r][c-1]: +1 bulged LEFT (outward from this piece!).
      //   Here our normal points RIGHT, so to bulge LEFT we need -vTabs[r][c-1].
      const leftDir: -1 | 0 | 1 = c === 0 ? 0 : ((-vTabs[r][c - 1]) as -1 | 1);

      const path = [
        `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
        buildEdgeSegment(x0, y0, x1, y0, topDir, tabSize),
        buildEdgeSegment(x1, y0, x1, y1, rightDir, tabSize),
        buildEdgeSegment(x1, y1, x0, y1, bottomDir, tabSize),
        buildEdgeSegment(x0, y1, x0, y0, leftDir, tabSize),
        'Z',
      ].join(' ');

      const topOut = topDir === -1 ? tabSize : 0;
      const rightOut = rightDir === -1 ? tabSize : 0;
      const bottomOut = bottomDir === -1 ? tabSize : 0;
      const leftOut = leftDir === -1 ? tabSize : 0;

      const minX = x0 - leftOut - pad;
      const minY = y0 - topOut - pad;
      const maxX = x1 + rightOut + pad;
      const maxY = y1 + bottomOut + pad;

      pieces.push({
        id: `piece-${r}-${c}`,
        col: c,
        row: r,
        path,
        bbox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        center: {
          x: (x0 + x1) / 2,
          y: (y0 + y1) / 2,
        },
      });
    }
  }

  return pieces;
}
