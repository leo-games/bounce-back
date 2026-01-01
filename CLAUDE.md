# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bounce Back is a casual puzzle game built with React, TypeScript, and Vite. Players bounce a ball off bricks into a hole, with progressively harder levels featuring moving bricks and kill bricks. The app includes a built-in level editor for creating and sharing custom puzzles.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Architecture

### Core Game Loop
The game runs on a requestAnimationFrame loop (App.tsx:416-534) with physics-based ball movement and collision detection. The loop handles:
- Brick movement animations (sinusoidal motion for moving bricks)
- Ball physics (velocity, collision, boundary checks)
- Level progression and win conditions

### State Management
The app uses two primary React state objects:

**GameState** (types.ts:58-79): Runtime game state including player, ball, hole, bricks, and scaling factors. Key scaling properties:
- `lastSizeScale{X,Y,Min}`: Current canvas scaling relative to FALLBACK_CANVAS_SIZE (800x600)
- `scaledPlayerBottomOffset`, `scaledMinBrickDimension`, etc.: Runtime-scaled constants

**EditorState** (types.ts:86-104): Level editor state including selection, clipboard, undo/redo history, drag state, and context menus.

### Coordinate System & Scaling
The game uses a dual-scaling system to support responsive canvas sizes:

1. **Position Scaling**: Level data is saved at arbitrary canvas dimensions and scaled based on the ratio between saved dimensions and current canvas size
2. **Size Scaling**: Game objects (player, ball, bricks) are sized relative to FALLBACK_CANVAS_SIZE (800x600) and scaled based on current canvas size

See `loadLevelData` (App.tsx:217-329) for the complete scaling logic. When saving levels, positions and dimensions are normalized back to FALLBACK_CANVAS_SIZE coordinates.

### Level Data Storage
Levels are stored in browser localStorage (key: `bounceBackLevels_React_v5_level_fixes`). On first load, the app fetches default levels from `./data/levels/Level_*.json`. Level data includes:
- `savedCanvasWidth/Height`: Original canvas dimensions when level was created
- `bricks[]`: Brick positions, sizes, angles, movement properties, and `baseWidth/baseHeight` (unscaled dimensions)
- `player/hole`: Position coordinates

### Collision Detection
Uses Separating Axis Theorem (SAT) for circle-rectangle collision (utils/geometry.ts:59-112):
1. Projects ball and brick vertices onto potential separating axes
2. Finds minimum overlap and collision normal
3. Returns collision result with normal and overlap for physics response

### Editor Features
- Selection: Single-click, marquee select, multi-select with Shift
- Manipulation: Drag items, resize bricks via corner handles, rotate via top handle
- Clipboard: Copy/paste bricks with 15px offset
- Undo/Redo: History tracked per-level (max 50 entries), nudging coalesces into single entry
- Context Menu: Right-click/long-press for item-specific actions
- Properties Panel: Edit brick dimensions, movement, kill brick status

### Component Structure
- `App.tsx`: Main component, game state, level management, game loop
- `components/canvas/GameCanvas.tsx`: Canvas rendering, input handling, editor interactions
- `components/menu/GameMenu.tsx`: Level list, mode switching, editor controls
- `components/menu/BrickPropertiesEditor.tsx`: Brick property editing panel
- `components/ui/`: Context menu, message box, marquee selection box

### Vector Math
All vector operations use the Vec utility (utils/vector.ts) for consistency:
- Physics: reflection, normalization, dot product
- Geometry: rotation, perpendicular vectors
- Collision: projections onto axes

### Constants
All game constants are centralized in constants.ts with BASE_ prefix for unscaled values. Colors follow Tailwind CSS palette (e.g., gray-500, red-500).

## Key Implementation Details

### Brick Movement
Moving bricks oscillate using `Math.sin(time * moveSpeed)` with `moveRange` amplitude. Movement is either horizontal or vertical (BrickMovementType enum). The `initialX/Y` properties store the center position of movement.

### History System
The undo/redo system (App.tsx:348-413) saves snapshots of bricks, player, hole, and all scaling factors. History is saved after most editor actions except during nudging (arrow key movements), which coalesces multiple nudges into one history entry when complete.

### Responsive Design
Mobile (<768px) and desktop layouts differ:
- Mobile: GameMenu slides over canvas with backdrop, hidden by default
- Desktop: GameMenu always visible in sidebar layout

### Canvas Resizing
On window resize, the canvas resizes and all game objects are rescaled (App.tsx:601-629). Levels reload to apply new scaling factors while maintaining relative positions.

## Common Patterns

- Always use `deepClone()` (utils/common.ts) when copying game objects to avoid mutation bugs
- Physics delta time is normalized: `deltaTime * 60` assumes 60fps baseline
- Editor actions should call `saveHistoryState()` after modifications (except during active dragging/nudging)
- All mouse/touch coordinates must account for canvas bounding rect offset
- When modifying brick dimensions, update both runtime `width/height` and `baseWidth/baseHeight`

## Notes

- The README mentions GEMINI_API_KEY but it's not used in the current codebase
- Level files are JSON with structure matching LevelData interface (types.ts:49-56)
- The game has no backend; all data persists in browser localStorage
