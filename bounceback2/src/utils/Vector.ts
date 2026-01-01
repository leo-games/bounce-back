import type { Vector } from '@/types';

export const Vec = {
  create: (x = 0, y = 0): Vector => ({ x, y }),

  clone: (v: Vector): Vector => ({ x: v.x, y: v.y }),

  add: (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),

  sub: (a: Vector, b: Vector): Vector => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),

  scale: (v: Vector, s: number): Vector => ({
    x: v.x * s,
    y: v.y * s,
  }),

  dot: (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y,

  cross: (a: Vector, b: Vector): number => a.x * b.y - a.y * b.x,

  lengthSq: (v: Vector): number => v.x * v.x + v.y * v.y,

  length: (v: Vector): number => Math.sqrt(Vec.lengthSq(v)),

  normalize: (v: Vector): Vector => {
    const len = Vec.length(v);
    if (len === 0) return Vec.create();
    return Vec.scale(v, 1 / len);
  },

  distance: (a: Vector, b: Vector): number => Vec.length(Vec.sub(b, a)),

  distanceSq: (a: Vector, b: Vector): number => Vec.lengthSq(Vec.sub(b, a)),

  rotate: (v: Vector, angle: number): Vector => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },

  // Perpendicular vector (90 degrees counter-clockwise)
  perp: (v: Vector): Vector => ({ x: -v.y, y: v.x }),

  // Reflect vector off a surface with given normal
  reflect: (v: Vector, normal: Vector): Vector => {
    const d = Vec.dot(v, normal) * 2;
    return Vec.sub(v, Vec.scale(normal, d));
  },

  // Linear interpolation
  lerp: (a: Vector, b: Vector, t: number): Vector => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),

  // Angle of vector in radians
  angle: (v: Vector): number => Math.atan2(v.y, v.x),

  // Create vector from angle and length
  fromAngle: (angle: number, length = 1): Vector => ({
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
  }),

  // Check if two vectors are approximately equal
  equals: (a: Vector, b: Vector, epsilon = 0.0001): boolean =>
    Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon,

  // Zero vector
  zero: (): Vector => ({ x: 0, y: 0 }),
};
