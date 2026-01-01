import type { LevelData } from '@/types';

export const defaultLevels: LevelData[] = [
  // Level 1: Tutorial - Direct shot possible
  // Player at bottom center, hole at top center
  // One horizontal brick as a helper (optional to use)
  {
    id: 'level-1',
    name: 'First Steps',
    player: { x: 0.5, y: 0.85 },
    hole: { x: 0.5, y: 0.1 },
    bricks: [
      // Helper brick - player can shoot directly to hole or bounce off this
      {
        id: 'b1-1',
        position: { x: 0.5, y: 0.45 },
        size: { width: 0.25, height: 0.03 },
        angle: 0,
        isKill: false,
      },
    ],
  },

  // Level 2: Simple Bounce
  // Must bounce off angled brick to reach hole
  // Player bottom-left, hole top-right, angled brick in middle
  {
    id: 'level-2',
    name: 'Corner Pocket',
    player: { x: 0.2, y: 0.85 },
    hole: { x: 0.8, y: 0.15 },
    bricks: [
      // Angled brick - ball comes from bottom-left, bounces to top-right
      // 45 degree angle: -PI/4 radians
      {
        id: 'b2-1',
        position: { x: 0.5, y: 0.5 },
        size: { width: 0.25, height: 0.03 },
        angle: -Math.PI / 4,
        isKill: false,
      },
    ],
  },

  // Level 3: Avoid the Danger
  // Kill brick blocks direct path, must bounce around it
  {
    id: 'level-3',
    name: 'Danger Zone',
    player: { x: 0.5, y: 0.85 },
    hole: { x: 0.5, y: 0.1 },
    bricks: [
      // Kill brick blocking direct path
      {
        id: 'b3-1',
        position: { x: 0.5, y: 0.5 },
        size: { width: 0.15, height: 0.03 },
        angle: 0,
        isKill: true,
      },
      // Safe brick on the left - bounce off this
      {
        id: 'b3-2',
        position: { x: 0.25, y: 0.55 },
        size: { width: 0.2, height: 0.03 },
        angle: Math.PI / 6, // 30 degrees - angled to redirect ball up and right
        isKill: false,
      },
      // Safe brick on the right to help guide to hole
      {
        id: 'b3-3',
        position: { x: 0.7, y: 0.3 },
        size: { width: 0.18, height: 0.03 },
        angle: -Math.PI / 5, // Angled to redirect ball toward hole
        isKill: false,
      },
    ],
  },

  // Level 4: Moving Target
  // Moving brick creates timing challenge
  {
    id: 'level-4',
    name: 'Moving Target',
    player: { x: 0.15, y: 0.85 },
    hole: { x: 0.85, y: 0.12 },
    bricks: [
      // First bounce - static angled brick
      {
        id: 'b4-1',
        position: { x: 0.35, y: 0.6 },
        size: { width: 0.22, height: 0.03 },
        angle: -Math.PI / 5,
        isKill: false,
      },
      // Moving brick - must time the shot
      {
        id: 'b4-2',
        position: { x: 0.65, y: 0.35 },
        size: { width: 0.2, height: 0.03 },
        angle: Math.PI / 8,
        isKill: false,
        movement: {
          type: 'smooth',
          axis: 'vertical',
          range: 0.1,
          speed: 0.4,
        },
      },
    ],
  },

  // Level 5: The Gauntlet
  // Multiple bounces required, mix of static, moving, and kill bricks
  {
    id: 'level-5',
    name: 'The Gauntlet',
    player: { x: 0.12, y: 0.85 },
    hole: { x: 0.88, y: 0.08 },
    bricks: [
      // First bounce brick
      {
        id: 'b5-1',
        position: { x: 0.3, y: 0.65 },
        size: { width: 0.18, height: 0.03 },
        angle: -Math.PI / 4.5,
        isKill: false,
      },
      // Kill brick in the middle - must go around
      {
        id: 'b5-2',
        position: { x: 0.5, y: 0.45 },
        size: { width: 0.12, height: 0.03 },
        angle: 0,
        isKill: true,
      },
      // Second bounce - moving brick
      {
        id: 'b5-3',
        position: { x: 0.55, y: 0.55 },
        size: { width: 0.16, height: 0.03 },
        angle: -Math.PI / 6,
        isKill: false,
        movement: {
          type: 'smooth',
          axis: 'horizontal',
          range: 0.08,
          speed: 0.5,
        },
      },
      // Final guide brick to hole
      {
        id: 'b5-4',
        position: { x: 0.75, y: 0.25 },
        size: { width: 0.18, height: 0.03 },
        angle: Math.PI / 5,
        isKill: false,
      },
    ],
  },
];
