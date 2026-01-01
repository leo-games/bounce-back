import type { Vector, Rect, Circle } from '@/types';
import { Vec } from './Vector';

export interface CollisionResult {
  hit: boolean;
  point?: Vector;
  normal?: Vector;
  distance?: number;
}

// Line segment intersection with circle
export function lineCircleIntersection(
  lineStart: Vector,
  lineEnd: Vector,
  circle: Circle
): CollisionResult {
  const d = Vec.sub(lineEnd, lineStart);
  const f = Vec.sub(lineStart, { x: circle.x, y: circle.y });

  const a = Vec.dot(d, d);
  const b = 2 * Vec.dot(f, d);
  const c = Vec.dot(f, f) - circle.radius * circle.radius;

  let discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return { hit: false };
  }

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // Check if either intersection is on the line segment
  const t = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : -1;

  if (t < 0 || t > 1) {
    return { hit: false };
  }

  const point = Vec.add(lineStart, Vec.scale(d, t));
  const normal = Vec.normalize(Vec.sub(point, { x: circle.x, y: circle.y }));

  return {
    hit: true,
    point,
    normal,
    distance: t * Vec.length(d),
  };
}

// Circle to circle collision
export function circleCircleCollision(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const radiiSum = a.radius + b.radius;
  return distSq <= radiiSum * radiiSum;
}

// Point in circle
export function pointInCircle(point: Vector, circle: Circle): boolean {
  return Vec.distanceSq(point, { x: circle.x, y: circle.y }) <= circle.radius * circle.radius;
}

// Point in rectangle (axis-aligned)
export function pointInRect(point: Vector, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Get rotated rectangle corners
export function getRectCorners(
  rect: Rect,
  angle: number,
  centerX?: number,
  centerY?: number
): Vector[] {
  const cx = centerX ?? rect.x + rect.width / 2;
  const cy = centerY ?? rect.y + rect.height / 2;
  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return corners.map((corner) => {
    const rotated = Vec.rotate(corner, angle);
    return {
      x: cx + rotated.x,
      y: cy + rotated.y,
    };
  });
}

// Get rectangle edges as line segments
export function getRectEdges(corners: Vector[]): [Vector, Vector][] {
  const edges: [Vector, Vector][] = [];
  for (let i = 0; i < corners.length; i++) {
    edges.push([corners[i], corners[(i + 1) % corners.length]]);
  }
  return edges;
}

// Line segment to line segment intersection
export function lineLineIntersection(
  a1: Vector,
  a2: Vector,
  b1: Vector,
  b2: Vector
): CollisionResult {
  const d1 = Vec.sub(a2, a1);
  const d2 = Vec.sub(b2, b1);
  const d3 = Vec.sub(a1, b1);

  const cross = Vec.cross(d1, d2);

  if (Math.abs(cross) < 0.0001) {
    return { hit: false }; // Parallel lines
  }

  const t = Vec.cross(d3, d2) / cross;
  const u = Vec.cross(d3, d1) / cross;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      hit: true,
      point: Vec.add(a1, Vec.scale(d1, t)),
      distance: t,
    };
  }

  return { hit: false };
}

// Ball (moving circle) to rotated rectangle collision
export function ballRectCollision(
  ballPos: Vector,
  ballRadius: number,
  ballVelocity: Vector,
  rect: Rect,
  angle: number
): CollisionResult {
  const corners = getRectCorners(rect, angle);
  const edges = getRectEdges(corners);

  let closestHit: CollisionResult = { hit: false };
  let minDistance = Infinity;

  // Project ball movement as a line and check each edge
  const ballEnd = Vec.add(ballPos, ballVelocity);

  for (const [edgeStart, edgeEnd] of edges) {
    // Check if ball's path intersects this edge
    // We need to account for ball radius by "expanding" the edge

    const edgeDir = Vec.normalize(Vec.sub(edgeEnd, edgeStart));
    const edgeNormal = Vec.perp(edgeDir);

    // Offset edge by ball radius
    const offsetStart = Vec.add(edgeStart, Vec.scale(edgeNormal, ballRadius));
    const offsetEnd = Vec.add(edgeEnd, Vec.scale(edgeNormal, ballRadius));

    const intersection = lineLineIntersection(ballPos, ballEnd, offsetStart, offsetEnd);

    if (intersection.hit && intersection.distance! < minDistance) {
      minDistance = intersection.distance!;
      closestHit = {
        hit: true,
        point: intersection.point,
        normal: edgeNormal,
        distance: intersection.distance,
      };
    }

    // Also check the opposite side
    const offsetStart2 = Vec.sub(edgeStart, Vec.scale(edgeNormal, ballRadius));
    const offsetEnd2 = Vec.sub(edgeEnd, Vec.scale(edgeNormal, ballRadius));

    const intersection2 = lineLineIntersection(ballPos, ballEnd, offsetStart2, offsetEnd2);

    if (intersection2.hit && intersection2.distance! < minDistance) {
      minDistance = intersection2.distance!;
      closestHit = {
        hit: true,
        point: intersection2.point,
        normal: Vec.scale(edgeNormal, -1),
        distance: intersection2.distance,
      };
    }
  }

  // Check corners (as circles)
  for (const corner of corners) {
    const cornerCircle = { x: corner.x, y: corner.y, radius: ballRadius };
    const intersection = lineCircleIntersection(ballPos, ballEnd, cornerCircle);

    if (intersection.hit && intersection.distance! < minDistance) {
      minDistance = intersection.distance!;
      closestHit = intersection;
    }
  }

  return closestHit;
}

// Simple point in rotated rect check
export function pointInRotatedRect(point: Vector, rect: Rect, angle: number): boolean {
  // Transform point to rect's local space
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const translated = Vec.sub(point, { x: cx, y: cy });
  const rotated = Vec.rotate(translated, -angle);
  const local = Vec.add(rotated, { x: cx, y: cy });

  return pointInRect(local, rect);
}
