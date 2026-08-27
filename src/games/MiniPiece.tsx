import type { CSSProperties } from 'react';
import { SHAPES, type Kind } from './tetrisLogic';

interface MiniPieceProps {
  kind: Kind | null;
  dim?: boolean;
}

/** A tetromino thumbnail for the hold/next panels, as a tiny CSS grid. */
function MiniPiece({ kind, dim }: MiniPieceProps) {
  if (!kind) return <span className="mini empty" aria-hidden="true" />;
  const cells = SHAPES[kind][0];
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;
  const style = { gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)` } as CSSProperties;
  const set = new Set(cells.map(([x, y]) => `${x - minX},${y - minY}`));
  const boxes: React.ReactNode[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      boxes.push(<i key={`${x},${y}`} className={set.has(`${x},${y}`) ? `k-${kind}` : 'blank'} />);
  return (
    <span className={dim ? 'mini dim' : 'mini'} style={style} aria-label={`${kind} piece`}>
      {boxes}
    </span>
  );
}

export default MiniPiece;
