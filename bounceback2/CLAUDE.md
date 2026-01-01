# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bounce Back 2 is a casual puzzle game where players launch a ball to bounce off bricks and land in a hole. Features include:
- No gravity - ball travels in straight lines
- Various brick types (static, kill, moving with different patterns)
- Walls, ceiling, and floor are all "out" boundaries
- Full level editor with save/load to localStorage
- 5 curated levels with progressive difficulty
- Mobile and desktop responsive design

## Development Commands

```bash
cd bounceback2

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Engine (`src/engine/`)
The game engine is pure TypeScript with no React dependency, making it testable and potentially reusable.

- **Game.ts**: Main game controller with game loop, input handling, and state management
- **Physics.ts**: Collision detection between ball and bricks/walls/hole
- **Renderer.ts**: All canvas drawing including entities, launch indicator, and editor overlays
- **Level.ts**: Level data structure and entity management

### Entities (`src/engine/entities/`)
- **Ball.ts**: Ball state, orbit animation around player, trail effect
- **Player.ts**: Stationary player character position
- **Hole.ts**: Goal detection with containment check
- **Brick.ts**: Base brick with support for kill flag and movement patterns

### Coordinate System
All level data uses **normalized 0-1 coordinates**. This enables perfect scaling across screen sizes:
```typescript
// Level data stored as normalized values
player: { x: 0.5, y: 0.85 }  // Center-bottom

// At runtime: pixelX = normalizedX * canvasWidth
```

The game uses a **16:10 aspect ratio** with letterboxing on different screen sizes.

### Movement Patterns
Bricks can have movement with flexible patterns:
```typescript
movement: {
  type: 'smooth' | 'jump',      // Sinusoidal vs discrete stepping
  axis: 'horizontal' | 'vertical' | 'both',
  range: 0.1,                   // Normalized movement distance
  speed: 0.5,                   // Oscillations per second
  phase: 0,                     // Starting phase offset (0-1)
}
```

### UI Layer (`src/ui/`)
React components for screens and UI elements:
- **screens/**: MainMenu, LevelSelect, GameScreen, EditorScreen
- **components/**: Canvas wrapper, Button, etc.

### State Flow
```
MENU → LEVEL_SELECT → PLAYING
                         ├── idle (ball orbiting, waiting for input)
                         ├── aiming (dragging to set direction/power)
                         ├── launched (ball moving)
                         ├── success → next level or back to select
                         └── failed → back to idle (attempts++)

MENU → EDITOR
         ├── edit (place/modify objects)
         └── test (temporary play mode)
```

### Launch Mechanic
- Drag toward target to aim (intuitive pointing)
- Direction = from player toward drag position
- Magnitude = drag distance from player (clamped to max)
- Ball speed = magnitude * MAX_BALL_SPEED

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/constants.ts` | All game constants (sizes, speeds, colors) |
| `src/data/levels.ts` | 5 curated default levels |
| `src/utils/geometry.ts` | Collision detection utilities |
| `src/utils/storage.ts` | localStorage wrapper for levels/progress |

## Adding New Brick Types

1. Add movement type to `MovementData` in `src/types/level.ts`
2. Implement movement logic in `Brick.calculateOffset()`
3. Add visual differentiation in `Renderer.drawBrick()`

Example: Ghost brick (toggles solid/transparent)
```typescript
// In Brick.ts
if (this.movement?.type === 'ghost') {
  this.isTransparent = Math.sin(this.time * Math.PI * 2) > 0;
}
```

## Future Expansion Points

- **Ghost bricks**: Add `isGhost` flag with visibility timer
- **Server sync**: Level data is JSON, easy to POST/GET
- **User accounts**: Wrap storage.ts with API calls
- **Skins/shop**: Renderer can swap sprite/color references
