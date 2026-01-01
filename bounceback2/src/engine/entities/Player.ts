import type { Vector } from '@/types';
import { Vec } from '@/utils/Vector';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '@/utils/constants';

export class Player {
  position: Vector;  // Center position (normalized)
  width: number;
  height: number;

  constructor(position: Vector) {
    this.position = Vec.clone(position);
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
  }

  // Get the position where the ball should orbit
  getBallOrbitCenter(): Vector {
    return {
      x: this.position.x,
      y: this.position.y - this.height / 2 - 0.02, // Above the player's head
    };
  }

  setPosition(position: Vector): void {
    this.position = Vec.clone(position);
  }
}
