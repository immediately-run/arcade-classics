// Lucide-style inline icons (currentColor, 24px grid). No emoji anywhere.

type IconName =
  | 'back'
  | 'pause'
  | 'play'
  | 'restart'
  | 'trophy'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'rotate'
  | 'drop'
  | 'hold'
  | 'undo'
  | 'users';

const PATHS: Record<IconName, string> = {
  back: 'M19 12H5M12 19l-7-7 7-7',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4l13 8-13 8z',
  restart: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  trophy: 'M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0zM6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  left: 'M19 12H5M12 19l-7-7 7-7',
  right: 'M5 12h14M12 5l7 7-7 7',
  rotate: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  drop: 'M12 3v13M6 10l6 6 6-6M4 21h16',
  hold: 'M4 4h16v16H4zM9 9h6v6H9z',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-6.7',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
};

interface IconProps {
  name: IconName;
  size?: number;
}

function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export default Icon;
