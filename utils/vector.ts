
import { Point } from '../types';

export const Vec = {
  create: (x = 0, y = 0): Point => ({ x, y }),
  add: (v1: Point, v2: Point): Point => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1: Point, v2: Point): Point => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  scale: (v: Point, s: number): Point => ({ x: v.x * s, y: v.y * s }),
  dot: (v1: Point, v2: Point): number => v1.x * v2.x + v1.y * v2.y,
  lenSq: (v: Point): number => v.x * v.x + v.y * v.y,
  len: (v: Point): number => Math.sqrt(Vec.lenSq(v)),
  normalize: (v: Point): Point => {
    const l = Vec.len(v);
    return l === 0 ? Vec.create() : Vec.scale(v, 1 / l);
  },
  perp: (v: Point): Point => ({ x: -v.y, y: v.x }), // Perpendicular vector (90-degree rotation)
  reflect: (v: Point, normal: Point): Point => {
    const d = Vec.dot(v, normal);
    return Vec.sub(v, Vec.scale(normal, 2 * d));
  },
  rotate: (v: Point, angle: number): Point => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return {
      x: v.x * cosA - v.y * sinA,
      y: v.x * sinA + v.y * cosA,
    };
  },
};
    