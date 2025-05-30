
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface GameObject extends Point, Size {}

export interface Player extends Point {
  width: number;
  height: number;
  headRadius: number;
}

export interface Ball extends Point {
  radius: number;
  vx: number;
  vy: number;
  fired: boolean;
  onPlayer: boolean;
}

export interface Hole extends Point {
  radius: number;
}

export enum BrickMovementType {
  Vertical = 'vertical',
  Horizontal = 'horizontal',
}

export interface Brick extends Point, Size {
  angle: number;
  isKillBrick: boolean;
  movementType: BrickMovementType | null;
  moveRange: number;
  moveSpeed: number;
  initialX?: number;
  initialY?: number;
  baseWidth?: number; // Unscaled width for saving/editing reference
  baseHeight?: number; // Unscaled height for saving/editing reference
}

export interface LevelData {
  name: string;
  savedCanvasWidth: number;
  savedCanvasHeight: number;
  bricks: Brick[];
  player: { x: number; y: number }; // Store unscaled relative positions for player
  hole: { x: number; y: number };   // Store unscaled relative positions for hole
}

export interface GameState {
  player: Player;
  ball: Ball;
  hole: Hole;
  bricks: Brick[];
  currentLevelIndex: number;
  mode: 'play' | 'editor';
  
  // Scaled runtime constants based on current canvas size and base constants
  scaledPlayerBottomOffset: number;
  scaledMinBrickDimension: number;
  scaledHandleSize: number;
  scaledRotateHandleOffset: number;
  scaledAimLineLength: number;
  scaledBallOutlineWidth: number;

  // Last size scaling factors used to load the current state, relative to FALLBACK_CANVAS_SIZE
  // These are important for correctly unscaling dimensions when saving.
  lastSizeScaleX: number;
  lastSizeScaleY: number;
  lastSizeScaleMin: number; // min(lastSizeScaleX, lastSizeScaleY)
}

export interface SelectedItem {
  type: 'brick' | 'player' | 'hole';
  index: number | null; // Brick index, null for player/hole
}

export interface EditorState {
  selectedItems: SelectedItem[];
  draggingHandle: DraggingHandle | null;
  dragStart: Point; // For item dragging or handle dragging
  originalItemStates: any[]; // Stores states of items before dragging/resizing
  mouse: { x: number; y: number; down: boolean; dragStartX: number; dragStartY: number; }; // Raw mouse state
  aim: { dx: number; dy: number; active: boolean };
  isMarqueeSelecting: boolean;
  marqueeStart: Point;
  marqueeEnd: Point;
  isDraggingSelection: boolean; // True if dragging selected items (not handles)
  clipboard: Partial<Brick>[]; // Stores unscaled brick data for copy/paste
  history: GameHistoryEntry[];
  historyIndex: number;
  isNudging: boolean; // To coalesce nudge operations into one history entry
  contextMenu: ContextMenuState | null;
  isUpdatingPropertiesFromInput: boolean; // Flag to prevent feedback loops in property editor
  cursorStyle: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget | null;
}

export interface ContextMenuTarget {
  type: 'empty' | 'brick' | 'player' | 'hole';
  index?: number; // Brick index
  x: number; // Mouse x where context menu was opened
  y: number; // Mouse y where context menu was opened
}

export interface DraggingHandle {
    type: 'tl' | 'tr' | 'bl' | 'br' | 'rotate';
    itemRef: SelectedItem; // Should always be a brick
    startBrickState: Brick; // Full state of the brick when dragging started
}

export interface GameHistoryEntry {
  bricks: Brick[];
  player: Player; // Need full player state if it can be moved/changed by editor actions
  hole: Hole;   // Need full hole state
  // Include any other part of GameState that can be undone/redone
  scaledPlayerBottomOffset: number;
  scaledMinBrickDimension: number;
  scaledHandleSize: number;
  scaledRotateHandleOffset: number;
  scaledAimLineLength: number;
  scaledBallOutlineWidth: number;
  lastSizeScaleX: number;
  lastSizeScaleY: number;
  lastSizeScaleMin: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Projection {
  min: number;
  max: number;
}

export interface CollisionResult {
  collision: boolean;
  normal?: Point;
  overlap?: number;
}
    