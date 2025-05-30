
import { Point, Brick, Ball, Rect, Projection, CollisionResult } from '../types';
import { Vec } from './vector';

export function getRectVertices(brick: Brick): Point[] {
  const cx = brick.x + brick.width / 2;
  const cy = brick.y + brick.height / 2;
  const hw = brick.width / 2;
  const hh = brick.height / 2;
  const angle = brick.angle || 0;
  
  const corners: Point[] = [
    { x: -hw, y: -hh }, // Top-left
    { x:  hw, y: -hh }, // Top-right
    { x:  hw, y:  hh }, // Bottom-right
    { x: -hw, y:  hh }, // Bottom-left
  ];

  return corners.map(corner => ({
    x: cx + (corner.x * Math.cos(angle) - corner.y * Math.sin(angle)),
    y: cy + (corner.x * Math.sin(angle) + corner.y * Math.cos(angle)),
  }));
}

export function getRectAxes(vertices: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const edge = Vec.sub(p2, p1);
    const normal = Vec.normalize(Vec.perp(edge));
    // Ensure axis is unique (avoiding near-duplicates due to floating point)
    if (!axes.some(ax => Math.abs(Vec.dot(ax, normal)) > 0.999)) {
      axes.push(normal);
    }
  }
  return axes;
}

export function projectShapeOntoAxis(vertices: Point[], axis: Point): Projection {
  let min = Vec.dot(vertices[0], axis);
  let max = min;
  for (let i = 1; i < vertices.length; i++) {
    const p = Vec.dot(vertices[i], axis);
    if (p < min) min = p;
    else if (p > max) max = p;
  }
  return { min, max };
}

export function projectCircleOntoAxis(ball: Ball, axis: Point): Projection {
  const centerProj = Vec.dot(Vec.create(ball.x, ball.y), axis);
  return {
    min: centerProj - ball.radius,
    max: centerProj + ball.radius,
  };
}

export function checkCircleRectCollision(ball: Ball, brick: Brick): CollisionResult {
  const rectVertices = getRectVertices(brick);
  const circleCenter = Vec.create(ball.x, ball.y);
  const rectCenter = Vec.create(brick.x + brick.width / 2, brick.y + brick.height / 2);

  const axes = getRectAxes(rectVertices);

  // Add axis from circle center to closest rect vertex (for corner collisions)
  let closestVertex = rectVertices[0];
  let minDistSq = Vec.lenSq(Vec.sub(circleCenter, closestVertex));
  for (let i = 1; i < rectVertices.length; i++) {
    const distSq = Vec.lenSq(Vec.sub(circleCenter, rectVertices[i]));
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestVertex = rectVertices[i];
    }
  }
  const axisToClosestVertex = Vec.normalize(Vec.sub(circleCenter, closestVertex));
  if (Vec.lenSq(axisToClosestVertex) > 0.0001 && !axes.some(ax => Math.abs(Vec.dot(ax, axisToClosestVertex)) > 0.999)) {
      axes.push(axisToClosestVertex);
  }


  let minOverlap = Infinity;
  let mtvAxis: Point | null = null; // Minimum Translation Vector Axis

  for (const axis of axes) {
    const rectProj = projectShapeOntoAxis(rectVertices, axis);
    const circleProj = projectCircleOntoAxis(ball, axis);

    const overlap = Math.min(rectProj.max, circleProj.max) - Math.max(rectProj.min, circleProj.min);
    if (overlap <= 0) {
      return { collision: false }; // Separating axis found
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }

  if (!mtvAxis) return { collision: false }; // Should not happen if overlap > 0 for all axes

  // Ensure MTV pushes circle away from rectangle
  const centerDirection = Vec.sub(circleCenter, rectCenter);
  if (Vec.dot(mtvAxis, centerDirection) < 0) {
    mtvAxis = Vec.scale(mtvAxis, -1);
  }
  
  return {
    collision: true,
    normal: mtvAxis,
    overlap: minOverlap,
  };
}

export function isPointInRotatedRect(px: number, py: number, brick: Brick): boolean {
  const hw = brick.width / 2;
  const hh = brick.height / 2;
  const cx = brick.x + hw; // Center X
  const cy = brick.y + hh; // Center Y
  const angle = -(brick.angle || 0); // Counter-rotate point

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const dx = px - cx;
  const dy = py - cy;

  // Rotate point relative to brick's center back to axis-aligned
  const localX = dx * cosA - dy * sinA;
  const localY = dx * sinA + dy * cosA;

  return Math.abs(localX) <= hw && Math.abs(localY) <= hh;
}

export function getBrickHandles(brick: Brick, scaledRotateHandleOffset: number): {
  tl: Point; tr: Point; bl: Point; br: Point; rotate: Point; center: Point;
} {
  const hw = brick.width / 2;
  const hh = brick.height / 2;
  const cx = brick.x + hw;
  const cy = brick.y + hh;
  const angle = brick.angle || 0;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const rotatePoint = (relX: number, relY: number): Point => ({
    x: cx + (relX * cosA - relY * sinA),
    y: cy + (relX * sinA + relY * cosA),
  });

  return {
    tl: rotatePoint(-hw, -hh),
    tr: rotatePoint(hw, -hh),
    bl: rotatePoint(-hw, hh),
    br: rotatePoint(hw, hh),
    rotate: rotatePoint(0, -hh - scaledRotateHandleOffset), // Above top-middle edge
    center: { x: cx, y: cy },
  };
}


export function getRectBoundingBox(brick: Brick): Rect {
  const vertices = getRectVertices(brick);
  let minX = vertices[0].x;
  let maxX = vertices[0].x;
  let minY = vertices[0].y;
  let maxY = vertices[0].y;

  for (let i = 1; i < vertices.length; i++) {
    minX = Math.min(minX, vertices[i].x);
    maxX = Math.max(maxX, vertices[i].x);
    minY = Math.min(minY, vertices[i].y);
    maxY = Math.max(maxY, vertices[i].y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function doRectsOverlap(rect1: Rect, rect2: Rect): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}
    