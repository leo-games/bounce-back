// Game aspect ratio (16:10 works well on desktop and tablets)
export const ASPECT_RATIO = 16 / 10;

// Ball physics
export const MAX_BALL_SPEED = 1.2;        // Normalized units per second
export const MIN_LAUNCH_MAGNITUDE = 0.1;  // Minimum drag to launch
export const MAX_LAUNCH_MAGNITUDE = 1.0;  // Maximum launch power
export const LAUNCH_DRAG_SCALE = 0.003;   // Pixels to magnitude conversion

// Ball visuals
export const BALL_RADIUS = 0.015;         // Normalized radius
export const BALL_ORBIT_RADIUS = 0.04;    // Orbit distance from player
export const BALL_ORBIT_SPEED = Math.PI;  // Radians per second
export const BALL_TRAIL_LENGTH = 12;      // Number of trail positions
export const BALL_TRAIL_SPACING = 0.016;  // Seconds between trail points

// Liam Mechanic - Direct Aim
export const MAX_DRAG_RADIUS = 0.15;      // Maximum distance ball can be dragged from player
export const LAUNCH_POINTER_LENGTH = 0.04; // Length of the short arrow pointer from ball
export const ORBIT_PATH_DASH = [6, 4];    // Dash pattern for orbit path [line, gap]
export const GRAB_HIT_RADIUS = 0.03;      // Hit detection radius for grabbing ball/player

// Player visuals
export const PLAYER_WIDTH = 0.05;         // Normalized
export const PLAYER_HEIGHT = 0.06;        // Normalized

// Hole
export const HOLE_RADIUS = 0.025;         // Normalized

// Bricks
export const DEFAULT_BRICK_WIDTH = 0.12;
export const DEFAULT_BRICK_HEIGHT = 0.025;
export const MIN_BRICK_SIZE = 0.03;
export const MAX_BRICK_SIZE = 0.4;

// Colors
export const COLORS = {
  background: {
    top: '#E8F4FD',
    bottom: '#B8D4E8',
  },
  player: {
    body: '#2DD4BF',      // Teal
    bodyDark: '#14B8A6',
    face: '#FFFFFF',
  },
  ball: {
    fill: '#FFFFFF',
    glow: '#FCD34D',      // Warm yellow
    trail: '#FB923C',     // Orange
  },
  brick: {
    normal: '#6366F1',    // Indigo
    normalLight: '#818CF8',
    kill: '#EF4444',      // Red
    killLight: '#F87171',
    killStripe: '#B91C1C',
    moving: '#22C55E',    // Green
    movingLight: '#4ADE80',
    stroke: '#1E1B4B',
  },
  hole: {
    outer: '#1E1B4B',
    inner: '#0F0A1A',
    glow: '#6366F1',
  },
  ui: {
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    text: '#1E1B4B',
    textLight: '#64748B',
    background: '#FFFFFF',
    border: '#E2E8F0',
  },
  launch: {
    line: '#F59E0B',
    lineFaint: 'rgba(245, 158, 11, 0.3)',
    power: '#EF4444',
  },
};

// Editor
export const EDITOR_GRID_SIZE = 0.05;     // Normalized grid spacing
export const HANDLE_SIZE = 12;             // Pixels
export const SELECTION_PADDING = 4;        // Pixels

// Animation
export const LEVEL_COMPLETE_DELAY = 1000;  // ms before showing complete screen

// Storage keys
export const STORAGE_KEYS = {
  customLevels: 'bounceback2_custom_levels',
  progress: 'bounceback2_progress',
  settings: 'bounceback2_settings',
};
