# Bounce Back: Architecture + Redesign Notes

## Active Runtime
- The active shipped app is the **root Vite app** (`/Users/ryan/Documents/GitHub/bounce-back/package.json`), not `bounceback2`.
- Primary runtime flow is in `/Users/ryan/Documents/GitHub/bounce-back/App.tsx`.
- Canvas drawing and all input handling are in `/Users/ryan/Documents/GitHub/bounce-back/components/canvas/GameCanvas.tsx`.

## Core Gameplay Model
- Ball physics run in an `requestAnimationFrame` loop in `/Users/ryan/Documents/GitHub/bounce-back/App.tsx`.
- Bricks are SAT-collision rectangles, including rotated bricks (`/Users/ryan/Documents/GitHub/bounce-back/utils/geometry.ts`).
- Moving bricks are sinusoidal based on `moveSpeed` and `moveRange`.
- Win condition: circle overlap with hole threshold; fail conditions include walls, kill bricks, player-body hit, or falling out.

## Editor Model
- Editor and play mode share one `GameState`, switched by `mode`.
- Selection/drag/resize/rotate/marquee/context-menu input all run through `GameCanvas`.
- Undo/redo snapshots include brick + player + hole + scaling metadata.
- Save/export/import and level list operations live in `/Users/ryan/Documents/GitHub/bounce-back/components/menu/GameMenu.tsx`.

## Level Data Pipeline
- Default levels are JSON in `/Users/ryan/Documents/GitHub/bounce-back/data/levels`.
- Levels are validated/sanitized in `validateAndDefaultLevel` (`App.tsx`) before load.
- Levels are normalized to fallback canvas coordinates on save to keep cross-screen consistency.
- Storage key is `bounceBackLevels_React_v5_level_fixes` in localStorage.

## UX/Visual System (Current Update)
- New design tokens and atmosphere layer are in `/Users/ryan/Documents/GitHub/bounce-back/index.css`.
- Start screen, menu, overlays, toasts, and canvas palette were modernized for clearer hierarchy and better game feel.

## Solvability Enforcement (Current Update)
- New solver utility: `/Users/ryan/Documents/GitHub/bounce-back/utils/levelSolvability.ts`.
- Uses shot-space + phase sampling simulation to find at least one winning trajectory.
- Save/export now block unsolved curated levels (in `App.tsx` + `GameMenu.tsx`).
- Movement type strings are normalized (`horizontal` / `vertical`) to avoid silent behavior mismatch.

## Parallel Prototype: `bounceback2`
- `bounceback2` is a separate rewrite with layered architecture (`engine`, `ui`, `types`), normalized coordinates, and Tailwind/PostCSS setup.
- It is not currently wired as the root runtime, but it is useful as a future migration target if we want cleaner long-term separation of concerns.
