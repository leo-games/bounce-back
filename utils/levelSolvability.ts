import { Brick, BrickMovementType, LevelData } from '../types';
import {
  AIM_POWER_FACTOR,
  BASE_BALL_RADIUS,
  BASE_DEFAULT_MOVE_RANGE,
  BASE_HOLE_RADIUS,
  BASE_MIN_BRICK_DIMENSION,
  BASE_PLAYER_DEFAULT_BOTTOM_OFFSET,
  BASE_PLAYER_HEIGHT,
  BASE_PLAYER_WIDTH,
  COLLISION_PUSH_FACTOR,
  DEFAULT_MOVE_SPEED,
  FALLBACK_CANVAS_HEIGHT,
  FALLBACK_CANVAS_WIDTH,
  MIN_AIM_VY,
} from '../constants';
import { checkCircleRectCollision, doRectsOverlap } from './geometry';
import { Vec } from './vector';

interface SolvableShot {
  vx: number;
  vy: number;
  phaseOffsetSeconds: number;
}

interface SolvabilityResult {
  solvable: boolean;
  shot?: SolvableShot;
}

interface SimulationBrick extends Brick {
  movementType: BrickMovementType | null;
}

interface PreparedLevel {
  width: number;
  height: number;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hole: {
    x: number;
    y: number;
    radius: number;
  };
  ballStart: {
    x: number;
    y: number;
    radius: number;
  };
  bricks: SimulationBrick[];
}

interface SolvabilityOptions {
  maxFrames?: number;
  vxStep?: number;
  phaseSamples?: number;
  phaseDurationSeconds?: number;
}

export function normalizeMovementType(value: unknown): BrickMovementType | null {
  if (value === BrickMovementType.Horizontal || value === BrickMovementType.Vertical) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === BrickMovementType.Horizontal) {
    return BrickMovementType.Horizontal;
  }
  if (normalized === BrickMovementType.Vertical) {
    return BrickMovementType.Vertical;
  }

  return null;
}

function clampLaunchVy(vy: number): number {
  return vy > MIN_AIM_VY ? MIN_AIM_VY : vy;
}

function buildPreparedLevel(level: LevelData): PreparedLevel {
  const width = Math.max(1, level.savedCanvasWidth || FALLBACK_CANVAS_WIDTH);
  const height = Math.max(1, level.savedCanvasHeight || FALLBACK_CANVAS_HEIGHT);
  const playerYFallback = height - BASE_PLAYER_DEFAULT_BOTTOM_OFFSET;

  const player = {
    x: level.player?.x ?? width / 2 - BASE_PLAYER_WIDTH / 2,
    y: level.player?.y ?? playerYFallback,
    width: BASE_PLAYER_WIDTH,
    height: BASE_PLAYER_HEIGHT,
  };

  const hole = {
    x: level.hole?.x ?? width / 2,
    y: level.hole?.y ?? BASE_PLAYER_DEFAULT_BOTTOM_OFFSET,
    radius: BASE_HOLE_RADIUS,
  };

  const ballStart = {
    x: player.x + player.width / 2,
    y: player.y - BASE_BALL_RADIUS - 2,
    radius: BASE_BALL_RADIUS,
  };

  const bricks: SimulationBrick[] = (level.bricks || []).map((brick) => {
    const movementType = normalizeMovementType(brick.movementType);
    const widthValue = Math.max(BASE_MIN_BRICK_DIMENSION, brick.width ?? 100);
    const heightValue = Math.max(BASE_MIN_BRICK_DIMENSION, brick.height ?? 20);

    return {
      ...brick,
      x: brick.x ?? width / 2 - 50,
      y: brick.y ?? height / 2,
      width: widthValue,
      height: heightValue,
      angle: brick.angle ?? 0,
      isKillBrick: !!brick.isKillBrick,
      movementType,
      moveRange: brick.moveRange ?? BASE_DEFAULT_MOVE_RANGE,
      moveSpeed: brick.moveSpeed ?? DEFAULT_MOVE_SPEED,
      initialX: brick.initialX ?? brick.x ?? width / 2 - 50,
      initialY: brick.initialY ?? brick.y ?? height / 2,
    };
  });

  return { width, height, player, hole, ballStart, bricks };
}

function getBrickAtTime(brick: SimulationBrick, timeSeconds: number): SimulationBrick {
  if (brick.movementType === null || brick.initialX === undefined || brick.initialY === undefined) {
    return brick;
  }

  const offset = brick.moveRange * Math.sin(timeSeconds * (brick.moveSpeed ?? DEFAULT_MOVE_SPEED));
  if (brick.movementType === BrickMovementType.Vertical) {
    return { ...brick, x: brick.initialX, y: brick.initialY + offset };
  }
  return { ...brick, x: brick.initialX + offset, y: brick.initialY };
}

function simulateShot(prepared: PreparedLevel, vx: number, vy: number, phaseOffsetSeconds: number, maxFrames: number): boolean {
  const ball = {
    x: prepared.ballStart.x,
    y: prepared.ballStart.y,
    radius: prepared.ballStart.radius,
    vx,
    vy,
  };

  for (let frame = 0; frame < maxFrames; frame++) {
    const timeSeconds = phaseOffsetSeconds + frame / 60;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (
      ball.x - ball.radius < 0 ||
      ball.x + ball.radius > prepared.width ||
      ball.y - ball.radius < 0
    ) {
      return false;
    }

    if (ball.y > prepared.height + ball.radius * 2) {
      return false;
    }

    for (const baseBrick of prepared.bricks) {
      const brick = getBrickAtTime(baseBrick, timeSeconds);
      const collision = checkCircleRectCollision(ball, brick);

      if (!collision.collision) {
        continue;
      }

      if (brick.isKillBrick) {
        return false;
      }

      if (collision.normal && collision.overlap) {
        const pushVector = Vec.scale(collision.normal, collision.overlap * COLLISION_PUSH_FACTOR);
        ball.x += pushVector.x;
        ball.y += pushVector.y;
        const reflectedVel = Vec.reflect({ x: ball.vx, y: ball.vy }, collision.normal);
        ball.vx = reflectedVel.x;
        ball.vy = reflectedVel.y;
      }
    }

    const playerRect = {
      x: prepared.player.x,
      y: prepared.player.y,
      width: prepared.player.width,
      height: prepared.player.height,
    };
    const ballRect = {
      x: ball.x - ball.radius,
      y: ball.y - ball.radius,
      width: ball.radius * 2,
      height: ball.radius * 2,
    };
    if (doRectsOverlap(ballRect, playerRect)) {
      return false;
    }

    const distToHoleSq = Vec.lenSq(
      Vec.sub({ x: ball.x, y: ball.y }, { x: prepared.hole.x, y: prepared.hole.y })
    );
    const radiiSumSq = (ball.radius + prepared.hole.radius) * (ball.radius + prepared.hole.radius);
    if (distToHoleSq < radiiSumSq * 0.8) {
      return true;
    }
  }

  return false;
}

export function findSolvableShot(level: LevelData, options?: SolvabilityOptions): SolvabilityResult {
  const maxFrames = options?.maxFrames ?? 1200;
  const vxStep = options?.vxStep ?? 0.4;
  const phaseSamples = options?.phaseSamples ?? 12;
  const phaseDurationSeconds = options?.phaseDurationSeconds ?? 8;
  const prepared = buildPreparedLevel(level);

  for (let vx = -AIM_POWER_FACTOR; vx <= AIM_POWER_FACTOR; vx += vxStep) {
    const clampedVx = Number(vx.toFixed(4));
    const vyMagnitudeSq = Math.max(0, AIM_POWER_FACTOR * AIM_POWER_FACTOR - clampedVx * clampedVx);
    const baseVy = -Math.sqrt(vyMagnitudeSq);
    const clampedVy = clampLaunchVy(baseVy);

    if (Math.abs(clampedVx) <= 0.01 && Math.abs(clampedVy) <= 0.01) {
      continue;
    }

    for (let i = 0; i < phaseSamples; i++) {
      const phaseOffsetSeconds = (phaseDurationSeconds * i) / phaseSamples;
      const isSolvable = simulateShot(prepared, clampedVx, clampedVy, phaseOffsetSeconds, maxFrames);
      if (isSolvable) {
        return {
          solvable: true,
          shot: {
            vx: clampedVx,
            vy: clampedVy,
            phaseOffsetSeconds,
          },
        };
      }
    }
  }

  return { solvable: false };
}
