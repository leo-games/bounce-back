// Base Game Constants (Unscaled) - these are design-time values
export const BASE_PLAYER_WIDTH = 40;
export const BASE_PLAYER_HEIGHT = 10;
export const BASE_PLAYER_HEAD_RADIUS = 10;
export const BASE_BALL_RADIUS = 10;
export const BASE_HOLE_RADIUS = 15;
export const BASE_AIM_LINE_LENGTH = 100; // For visual aim line, not power calculation
export const AIM_POWER_FACTOR = 10.0; // Higher = less power for same drag distance
export const AIM_VISUAL_SCALE = 5; // Multiplier for drawing aim line length
export const MIN_AIM_VY = -0.1; // Minimum vertical velocity for firing (to ensure it goes up)
export const BASE_HANDLE_SIZE = 5; // For editor resize handles
export const BASE_ROTATE_HANDLE_OFFSET = 20; // Distance of rotate handle from brick edge
export const ROTATE_HANDLE_SIZE_FACTOR = 1.2; // Rotate handle is slightly larger
export const BASE_MIN_BRICK_DIMENSION = 10; // Smallest a brick can be resized to
export const COLLISION_PUSH_FACTOR = 1.01; // How much to push ball out of brick on collision
export const BASE_PLAYER_DEFAULT_BOTTOM_OFFSET = 60; // Player's initial distance from canvas bottom
export const BASE_HOLE_DEFAULT_Y = 100; // Hole's initial distance from canvas top
export const BASE_BALL_OUTLINE_WIDTH = 2;
export const NUDGE_AMOUNT = 1; // Pixel amount for nudging items with arrow keys
export const PASTE_OFFSET = 15; // Pixel offset for pasted items
export const MAX_HISTORY = 50; // Max undo/redo steps
export const MESSAGE_DISPLAY_TIME_MS = 1500;
export const BASE_DEFAULT_MOVE_RANGE = 50; // Default movement range for new mover bricks
export const DEFAULT_MOVE_SPEED = 1.0;
export const CLICK_THRESHOLD_SQ = 9; // Squared pixel distance to differentiate click from drag

// Colors
export const BRICK_COLOR = "#6B7280"; // gray-500
export const BRICK_STROKE_COLOR = "#1F2937"; // gray-800
export const KILL_BRICK_COLOR = "#EF4444"; // red-500
export const VERTICAL_MOVER_COLOR = "#FACC15"; // yellow-400
export const HORIZONTAL_MOVER_COLOR = "#4ADE80"; // green-400
export const SELECTED_BRICK_COLOR = "#3B82F6"; // blue-500
export const SELECTED_ITEM_OUTLINE_COLOR = "#F59E0B"; // amber-500
export const HANDLE_COLOR = "#F59E0B"; // amber-500
export const MOVER_RANGE_INDICATOR_COLOR = "rgba(100, 100, 255, 0.5)";
export const MOVER_RANGE_INDICATOR_WIDTH = 2;
export const CANVAS_BACKGROUND_COLOR = "#f0f8ff"; // Alice Blue

// Default Files & Fallback Size
export const DEFAULT_LEVEL_FILES = [
    './data/levels/Level_1.json',
    './data/levels/Level_2.json',
    './data/levels/Level_3.json',
    './data/levels/Level_4.json'
];
// Fallback canvas size serves as the reference for SIZE scaling
export const FALLBACK_CANVAS_WIDTH = 800;
export const FALLBACK_CANVAS_HEIGHT = 600;

// Local Storage Key
export const LOCAL_STORAGE_LEVELS_KEY = 'bounceBackLevels_React_v1';