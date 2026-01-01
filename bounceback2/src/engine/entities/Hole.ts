import type { Vector, Circle } from '@/types';
import { Vec } from '@/utils/Vector';
import { HOLE_RADIUS } from '@/utils/constants';

export class Hole {
  position: Vector;  // Center position (normalized)
  radius: number;

  constructor(position: Vector) {
    this.position = Vec.clone(position);
    this.radius = HOLE_RADIUS;
  }

  setPosition(position: Vector): void {
    this.position = Vec.clone(position);
  }

  getCircle(): Circle {
    return {
      x: this.position.x,
      y: this.position.y,
      radius: this.radius,
    };
  }

  // Check if ball is in hole (uses slightly smaller radius for better feel)
  containsBall(ballPosition: Vector, ballRadius: number): boolean {
    const dist = Vec.distance(ballPosition, this.position);
    // Ball needs to be mostly inside the hole
    return dist < this.radius - ballRadius * 0.5;
  }
}
