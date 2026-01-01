import type { Vector } from '@/types';
import { Level } from './Level';
import { Vec } from '@/utils/Vector';
import { BALL_RADIUS } from '@/utils/constants';

export type CollisionType = 'none' | 'wall' | 'brick' | 'killBrick' | 'hole';

export interface PhysicsResult {
  type: CollisionType;
  brickId?: string;
  newPosition?: Vector;
  newVelocity?: Vector;
}

export class Physics {
  // Check all collisions for a ball moving through the level
  checkCollisions(level: Level, deltaTime: number): PhysicsResult {
    const ball = level.ball;
    if (!ball.isLaunched) {
      return { type: 'none' };
    }

    const velocity = Vec.scale(ball.velocity, deltaTime);
    const nextPosition = Vec.add(ball.position, velocity);

    // Check wall collisions first (any edge = out)
    if (this.checkWallCollision(nextPosition)) {
      return { type: 'wall' };
    }

    // Check hole collision (win condition)
    if (level.hole.containsBall(nextPosition, BALL_RADIUS)) {
      return { type: 'hole' };
    }

    // Check brick collisions
    let closestHit: PhysicsResult = { type: 'none' };
    let closestDistance = Infinity;

    for (const brick of level.bricks) {
      const collision = brick.checkCollision(ball.position, BALL_RADIUS, velocity);

      if (collision.hit && collision.distance! < closestDistance) {
        closestDistance = collision.distance!;

        if (brick.isKill) {
          closestHit = { type: 'killBrick', brickId: brick.id };
        } else {
          // Calculate reflection
          const hitPoint = collision.point!;
          const reflected = Vec.reflect(ball.velocity, collision.normal!);

          // Move ball to just after the collision point
          const pushOut = Vec.scale(collision.normal!, BALL_RADIUS * 1.01);
          const newPosition = Vec.add(hitPoint, pushOut);

          closestHit = {
            type: 'brick',
            brickId: brick.id,
            newPosition,
            newVelocity: reflected,
          };
        }
      }
    }

    // If no collision, update position normally
    if (closestHit.type === 'none') {
      ball.position = nextPosition;
    }

    return closestHit;
  }

  private checkWallCollision(position: Vector): boolean {
    // Normalized coordinates: 0-1 for x and y
    // Ball is out if any part goes outside
    return (
      position.x - BALL_RADIUS < 0 ||
      position.x + BALL_RADIUS > 1 ||
      position.y - BALL_RADIUS < 0 ||
      position.y + BALL_RADIUS > 1 / (16 / 10) * (16 / 10) // Adjust for aspect ratio
    );
  }
}
