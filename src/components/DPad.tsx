import type { Dir } from '../lib/gameTypes';
import Icon from './Icon';

interface DPadProps {
  onDir: (dir: Dir) => void;
}

/** On-screen directional pad for touch play. Fires on pointerdown so the first
 *  press counts (no click delay). */
function DPad({ onDir }: DPadProps) {
  const btn = (dir: Dir, label: string) => (
    <button
      type="button"
      className={`dpad-${dir}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onDir(dir);
      }}
    >
      <Icon name={dir} size={22} />
    </button>
  );
  return (
    <div className="dpad" aria-label="Direction pad">
      {btn('up', 'Up')}
      {btn('left', 'Left')}
      {btn('right', 'Right')}
      {btn('down', 'Down')}
    </div>
  );
}

export default DPad;
