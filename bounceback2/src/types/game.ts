import type { Vector } from './common';
import type { LevelData } from './level';

export type GameMode = 'menu' | 'levelSelect' | 'playing' | 'editor';

export type PlayState =
  | 'idle'       // Before first launch
  | 'aiming'     // Player is dragging to aim
  | 'launched'   // Ball is in motion
  | 'success'    // Ball reached hole
  | 'failed';    // Ball hit wall/kill brick

export interface LaunchState {
  isDragging: boolean;
  startPos: Vector;      // Where drag started (player position)
  currentPos: Vector;    // Current drag/touch position
  magnitude: number;     // 0-1, clamped
  direction: Vector;     // Normalized launch direction
}

export interface BallState {
  position: Vector;      // Current position (pixels)
  velocity: Vector;      // Current velocity (pixels per second)
  orbitAngle: number;    // For revolving animation (radians)
  trail: Vector[];       // Trail positions for comet effect
}

export interface GameState {
  mode: GameMode;
  playState: PlayState;
  currentLevel: LevelData | null;
  attempts: number;
  launch: LaunchState;
  ball: BallState;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  scale: number;         // For converting normalized to pixels
  offsetX: number;       // Letterbox offset
  offsetY: number;       // Letterbox offset
}
