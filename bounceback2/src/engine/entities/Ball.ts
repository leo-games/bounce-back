import type { Vector } from '@/types';
import { Vec } from '@/utils/Vector';
import {
  BALL_RADIUS,
  BALL_ORBIT_RADIUS,
  BALL_ORBIT_SPEED,
  BALL_TRAIL_LENGTH,
} from '@/utils/constants';

export interface BallConfig {
  orbitCenter: Vector;
}

export class Ball {
  position: Vector;
  velocity: Vector;
  radius: number;
  orbitAngle: number;
  orbitCenter: Vector;
  trail: Vector[];
  isLaunched: boolean;
  // 3D orbit effect properties
  orbitDepth: number;  // -1 (behind) to 1 (in front)
  orbitScale: number;  // Scale factor for 3D effect
  private trailTimer: number;

  constructor(config: BallConfig) {
    this.orbitCenter = Vec.clone(config.orbitCenter);
    this.orbitAngle = 0;
    this.radius = BALL_RADIUS;
    this.velocity = Vec.zero();
    this.trail = [];
    this.isLaunched = false;
    this.trailTimer = 0;
    this.orbitDepth = 0;
    this.orbitScale = 1;

    // Initialize position on orbit
    this.position = this.getOrbitPosition();
    this.updateOrbit3D();
  }

  getOrbitPosition(): Vector {
    // Horizontal position uses cos, creating side-to-side motion
    // The orbit is tilted to create 3D illusion
    const x = Math.cos(this.orbitAngle) * BALL_ORBIT_RADIUS;
    // Vertical motion is reduced to create perspective (elliptical orbit)
    const y = Math.sin(this.orbitAngle) * BALL_ORBIT_RADIUS * 0.3;
    return Vec.add(this.orbitCenter, { x, y });
  }

  private updateOrbit3D(): void {
    // Depth based on orbit position: sin determines front/back
    // When orbitAngle is PI/2 (top of ellipse), ball is in front
    // When orbitAngle is 3*PI/2 (bottom), ball is behind
    this.orbitDepth = Math.sin(this.orbitAngle);
    // Scale: larger when in front (depth > 0), smaller when behind
    this.orbitScale = 1 + this.orbitDepth * 0.4;
  }

  update(deltaTime: number): void {
    if (this.isLaunched) {
      // Move ball along velocity
      this.position = Vec.add(this.position, Vec.scale(this.velocity, deltaTime));

      // Update trail
      this.trailTimer += deltaTime;
      if (this.trailTimer >= 0.016) {
        // ~60fps
        this.trailTimer = 0;
        this.trail.unshift(Vec.clone(this.position));
        if (this.trail.length > BALL_TRAIL_LENGTH) {
          this.trail.pop();
        }
      }
    } else {
      // Orbit around player
      this.orbitAngle += BALL_ORBIT_SPEED * deltaTime;
      if (this.orbitAngle > Math.PI * 2) {
        this.orbitAngle -= Math.PI * 2;
      }
      this.position = this.getOrbitPosition();
      this.updateOrbit3D();
      this.trail = [];
    }
  }

  launch(direction: Vector, speed: number): void {
    this.velocity = Vec.scale(direction, speed);
    this.isLaunched = true;
    this.trail = [];
  }

  reset(orbitCenter: Vector): void {
    this.orbitCenter = Vec.clone(orbitCenter);
    this.velocity = Vec.zero();
    this.isLaunched = false;
    this.trail = [];
    this.position = this.getOrbitPosition();
  }

  reflect(normal: Vector): void {
    this.velocity = Vec.reflect(this.velocity, normal);
  }

  setOrbitCenter(center: Vector): void {
    this.orbitCenter = Vec.clone(center);
    if (!this.isLaunched) {
      this.position = this.getOrbitPosition();
    }
  }
}
