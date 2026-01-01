export type MovementType = 'smooth' | 'jump';
export type MovementAxis = 'horizontal' | 'vertical' | 'both';

export interface MovementData {
  type: MovementType;
  axis: MovementAxis;
  range: number;    // normalized distance (0-1)
  speed: number;    // oscillations per second
  phase?: number;   // starting phase offset (0-1)
}

export interface BrickData {
  id: string;
  position: { x: number; y: number };  // normalized 0-1
  size: { width: number; height: number };  // normalized
  angle: number;  // radians
  isKill: boolean;
  movement?: MovementData;
}

export interface LevelData {
  id: string;
  name: string;
  player: { x: number; y: number };  // normalized 0-1
  hole: { x: number; y: number };    // normalized 0-1
  bricks: BrickData[];
}

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  bestAttempts: number | null;
}
