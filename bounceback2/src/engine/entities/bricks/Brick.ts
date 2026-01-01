import type { Vector, Rect, BrickData, MovementData } from '@/types';
import { Vec } from '@/utils/Vector';
import { ballRectCollision, type CollisionResult } from '@/utils/geometry';

export class Brick {
  id: string;
  basePosition: Vector;  // Original position (normalized)
  position: Vector;      // Current position (may differ if moving)
  size: { width: number; height: number };
  angle: number;
  isKill: boolean;
  movement: MovementData | null;
  private time: number;

  constructor(data: BrickData) {
    this.id = data.id;
    this.basePosition = Vec.clone(data.position);
    this.position = Vec.clone(data.position);
    this.size = { ...data.size };
    this.angle = data.angle;
    this.isKill = data.isKill;
    this.movement = data.movement ?? null;
    this.time = (data.movement?.phase ?? 0) * Math.PI * 2;
  }

  update(deltaTime: number): void {
    if (!this.movement) return;

    this.time += deltaTime * this.movement.speed * Math.PI * 2;

    const offset = this.calculateOffset();
    this.position = Vec.add(this.basePosition, offset);
  }

  private calculateOffset(): Vector {
    if (!this.movement) return Vec.zero();

    const { type, axis, range } = this.movement;

    let t: number;
    if (type === 'smooth') {
      t = Math.sin(this.time);
    } else {
      // Jump - discrete steps
      t = Math.sign(Math.sin(this.time));
    }

    const offsetAmount = t * range;

    switch (axis) {
      case 'horizontal':
        return { x: offsetAmount, y: 0 };
      case 'vertical':
        return { x: 0, y: offsetAmount };
      case 'both':
        // Lissajous-like pattern
        return {
          x: Math.sin(this.time) * range,
          y: Math.cos(this.time * 1.5) * range * 0.6,
        };
    }
  }

  getRect(): Rect {
    return {
      x: this.position.x - this.size.width / 2,
      y: this.position.y - this.size.height / 2,
      width: this.size.width,
      height: this.size.height,
    };
  }

  checkCollision(
    ballPosition: Vector,
    ballRadius: number,
    ballVelocity: Vector
  ): CollisionResult {
    const rect = this.getRect();
    return ballRectCollision(ballPosition, ballRadius, ballVelocity, rect, this.angle);
  }

  toData(): BrickData {
    return {
      id: this.id,
      position: Vec.clone(this.basePosition),
      size: { ...this.size },
      angle: this.angle,
      isKill: this.isKill,
      movement: this.movement ? { ...this.movement } : undefined,
    };
  }

  // For editor - set base position
  setBasePosition(pos: Vector): void {
    this.basePosition = Vec.clone(pos);
    this.position = Vec.clone(pos);
    this.time = 0;
  }
}
