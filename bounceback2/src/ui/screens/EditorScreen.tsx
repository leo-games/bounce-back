import { useState, useRef, useEffect, useCallback } from 'react';
import type { LevelData, BrickData, Vector, MovementData } from '@/types';
import { Game, createEmptyLevel } from '@/engine';
import { Button } from '../components/Button';
import { Vec } from '@/utils/Vector';
import { generateId } from '@/utils/storage';
import {
  DEFAULT_BRICK_WIDTH,
  DEFAULT_BRICK_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  HOLE_RADIUS,
} from '@/utils/constants';

type EditorTool = 'select' | 'brick' | 'killBrick' | 'player' | 'hole';
type EditorMode = 'edit' | 'test';
type DragMode = 'none' | 'move' | 'resize' | 'rotate' | 'oscillation';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | null;

interface EditorScreenProps {
  initialLevel?: LevelData;
  onSave: (level: LevelData) => void;
  onBack: () => void;
}

// Handle hit detection threshold in pixels
const HANDLE_SIZE = 12;
const ROTATION_HANDLE_DISTANCE = 25;

export function EditorScreen({ initialLevel, onSave, onBack }: EditorScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [level, setLevel] = useState<LevelData>(() =>
    initialLevel ? { ...initialLevel } : createEmptyLevel()
  );
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [selectedBrickId, setSelectedBrickId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [levelName, setLevelName] = useState(level.name);

  // Oscillation editing mode
  const [editingOscillation, setEditingOscillation] = useState(false);

  // Dragging state
  const dragModeRef = useRef<DragMode>('none');
  const dragStartRef = useRef<Vector>({ x: 0, y: 0 });
  const dragItemStartRef = useRef<Vector>({ x: 0, y: 0 });
  const dragBrickStartRef = useRef<{ width: number; height: number; angle: number } | null>(null);
  const resizeHandleRef = useRef<ResizeHandle>(null);
  const oscillationDragAxisRef = useRef<'horizontal' | 'vertical' | null>(null);

  // Initialize game for rendering
  useEffect(() => {
    if (!canvasRef.current || mode !== 'edit') return;

    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.loadLevel(level);
    game.start();

    return () => {
      game.stop();
    };
  }, [mode]);

  // Update renderer when level changes
  useEffect(() => {
    if (gameRef.current && mode === 'edit') {
      gameRef.current.loadLevel(level);
    }
  }, [level, mode]);

  // Custom render loop for editor
  useEffect(() => {
    if (mode !== 'edit' || !canvasRef.current || !gameRef.current) return;

    const render = () => {
      const game = gameRef.current;
      if (!game) return;

      const levelInstance = game.getLevel();
      if (!levelInstance) return;

      const renderer = game.getRenderer();
      renderer.render(levelInstance, null);

      // Get selected brick for oscillation preview
      const selectedBrick = selectedBrickId
        ? level.bricks.find(b => b.id === selectedBrickId)
        : null;

      renderer.drawEditorOverlay(
        levelInstance,
        selectedBrickId ? new Set([selectedBrickId]) : new Set(),
        hoveredId,
        editingOscillation ? selectedBrick : null
      );
    };

    const intervalId = setInterval(render, 16);
    return () => clearInterval(intervalId);
  }, [mode, selectedBrickId, hoveredId, level.bricks, editingOscillation]);

  const toNormalized = useCallback((screenX: number, screenY: number): Vector => {
    const renderer = gameRef.current?.getRenderer();
    if (!renderer) return { x: 0, y: 0 };
    return renderer.toNormalized({ x: screenX, y: screenY });
  }, []);


  // Check if a point is on a resize handle
  const hitTestHandle = useCallback(
    (screenPos: Vector, brick: BrickData): ResizeHandle | 'rotate' | null => {
      const renderer = gameRef.current?.getRenderer();
      if (!renderer) return null;

      const brickScreen = renderer.toScreen(brick.position);
      const width = renderer.scaleSize(brick.size.width);
      const height = renderer.scaleSize(brick.size.height, true);

      // Transform screen position to brick's local coords
      const dx = screenPos.x - brickScreen.x;
      const dy = screenPos.y - brickScreen.y;
      const cos = Math.cos(-brick.angle);
      const sin = Math.sin(-brick.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // Check rotation handle (above brick)
      const rotHandleY = -height / 2 - ROTATION_HANDLE_DISTANCE;
      if (Math.abs(localX) < HANDLE_SIZE && Math.abs(localY - rotHandleY) < HANDLE_SIZE) {
        return 'rotate';
      }

      // Check corner handles
      const corners: { handle: ResizeHandle; x: number; y: number }[] = [
        { handle: 'tl', x: -width / 2, y: -height / 2 },
        { handle: 'tr', x: width / 2, y: -height / 2 },
        { handle: 'bl', x: -width / 2, y: height / 2 },
        { handle: 'br', x: width / 2, y: height / 2 },
      ];

      for (const corner of corners) {
        if (
          Math.abs(localX - corner.x) < HANDLE_SIZE &&
          Math.abs(localY - corner.y) < HANDLE_SIZE
        ) {
          return corner.handle;
        }
      }

      return null;
    },
    []
  );

  // Check if clicking on oscillation drag handles
  const hitTestOscillationHandle = useCallback(
    (screenPos: Vector, brick: BrickData): 'horizontal' | 'vertical' | null => {
      if (!brick.movement) return null;

      const renderer = gameRef.current?.getRenderer();
      if (!renderer) return null;

      const range = brick.movement.range;
      const axis = brick.movement.axis;

      // Check horizontal handles
      if (axis === 'horizontal' || axis === 'both') {
        const leftHandle = renderer.toScreen({
          x: brick.position.x - range,
          y: brick.position.y
        });
        const rightHandle = renderer.toScreen({
          x: brick.position.x + range,
          y: brick.position.y
        });

        if (Vec.distance(screenPos, leftHandle) < HANDLE_SIZE ||
            Vec.distance(screenPos, rightHandle) < HANDLE_SIZE) {
          return 'horizontal';
        }
      }

      // Check vertical handles
      if (axis === 'vertical' || axis === 'both') {
        const topHandle = renderer.toScreen({
          x: brick.position.x,
          y: brick.position.y - range
        });
        const bottomHandle = renderer.toScreen({
          x: brick.position.x,
          y: brick.position.y + range
        });

        if (Vec.distance(screenPos, topHandle) < HANDLE_SIZE ||
            Vec.distance(screenPos, bottomHandle) < HANDLE_SIZE) {
          return 'vertical';
        }
      }

      return null;
    },
    []
  );

  const hitTest = useCallback(
    (pos: Vector): string | null => {
      // Check bricks (in reverse order - top first)
      for (let i = level.bricks.length - 1; i >= 0; i--) {
        const brick = level.bricks[i];
        const halfW = brick.size.width / 2;
        const halfH = brick.size.height / 2;

        // Transform point to brick's local space (accounting for rotation)
        const dx = pos.x - brick.position.x;
        const dy = pos.y - brick.position.y;
        const cos = Math.cos(-brick.angle);
        const sin = Math.sin(-brick.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        if (
          Math.abs(localX) <= halfW &&
          Math.abs(localY) <= halfH
        ) {
          return brick.id;
        }
      }

      // Check player
      const playerHalfW = PLAYER_WIDTH / 2;
      const playerHalfH = PLAYER_HEIGHT / 2;
      if (
        pos.x >= level.player.x - playerHalfW &&
        pos.x <= level.player.x + playerHalfW &&
        pos.y >= level.player.y - playerHalfH &&
        pos.y <= level.player.y + playerHalfH
      ) {
        return 'player';
      }

      // Check hole
      if (Vec.distance(pos, level.hole) <= HOLE_RADIUS) {
        return 'hole';
      }

      return null;
    },
    [level]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'edit') return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const screenPos = { x: screenX, y: screenY };
      const pos = toNormalized(screenX, screenY);

      // If editing oscillation and clicking a handle
      if (editingOscillation && selectedBrickId) {
        const brick = level.bricks.find(b => b.id === selectedBrickId);
        if (brick?.movement) {
          const oscHandle = hitTestOscillationHandle(screenPos, brick);
          if (oscHandle) {
            dragModeRef.current = 'oscillation';
            oscillationDragAxisRef.current = oscHandle;
            dragStartRef.current = pos;
            return;
          }
        }
      }

      if (selectedTool === 'brick' || selectedTool === 'killBrick') {
        // Add new brick
        const newBrick: BrickData = {
          id: generateId(),
          position: { x: pos.x, y: pos.y },
          size: { width: DEFAULT_BRICK_WIDTH, height: DEFAULT_BRICK_HEIGHT },
          angle: 0,
          isKill: selectedTool === 'killBrick',
        };
        setLevel((prev) => ({
          ...prev,
          bricks: [...prev.bricks, newBrick],
        }));
        setSelectedBrickId(newBrick.id);
        setSelectedTool('select');
        setEditingOscillation(false);
      } else if (selectedTool === 'player') {
        setLevel((prev) => ({
          ...prev,
          player: { x: pos.x, y: pos.y },
        }));
        setSelectedTool('select');
      } else if (selectedTool === 'hole') {
        setLevel((prev) => ({
          ...prev,
          hole: { x: pos.x, y: pos.y },
        }));
        setSelectedTool('select');
      } else {
        // Select tool - check for handle interactions first
        if (selectedBrickId) {
          const brick = level.bricks.find(b => b.id === selectedBrickId);
          if (brick) {
            const handleHit = hitTestHandle(screenPos, brick);
            if (handleHit === 'rotate') {
              dragModeRef.current = 'rotate';
              dragStartRef.current = pos;
              dragBrickStartRef.current = {
                width: brick.size.width,
                height: brick.size.height,
                angle: brick.angle
              };
              return;
            } else if (handleHit) {
              dragModeRef.current = 'resize';
              resizeHandleRef.current = handleHit;
              dragStartRef.current = pos;
              dragBrickStartRef.current = {
                width: brick.size.width,
                height: brick.size.height,
                angle: brick.angle
              };
              dragItemStartRef.current = { ...brick.position };
              return;
            }
          }
        }

        // Regular hit test for selection
        const hitId = hitTest(pos);
        if (hitId) {
          // Check if it's a brick
          const isBrick = level.bricks.some(b => b.id === hitId);

          if (isBrick) {
            setSelectedBrickId(hitId);
            if (hitId !== selectedBrickId) {
              setEditingOscillation(false);
            }
          } else {
            setSelectedBrickId(null);
            setEditingOscillation(false);
          }

          // Start dragging
          dragModeRef.current = 'move';
          dragStartRef.current = pos;

          if (hitId === 'player') {
            dragItemStartRef.current = { ...level.player };
          } else if (hitId === 'hole') {
            dragItemStartRef.current = { ...level.hole };
          } else {
            const brick = level.bricks.find((b) => b.id === hitId);
            if (brick) {
              dragItemStartRef.current = { ...brick.position };
            }
          }
        } else {
          setSelectedBrickId(null);
          setEditingOscillation(false);
        }
      }
    },
    [mode, selectedTool, selectedBrickId, hitTest, level, toNormalized, hitTestHandle, hitTestOscillationHandle, editingOscillation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'edit') return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pos = toNormalized(screenX, screenY);

      if (dragModeRef.current === 'move' && selectedBrickId) {
        const delta = Vec.sub(pos, dragStartRef.current);
        const newPos = Vec.add(dragItemStartRef.current, delta);
        newPos.x = Math.max(0.05, Math.min(0.95, newPos.x));
        newPos.y = Math.max(0.05, Math.min(0.95, newPos.y));

        setLevel((prev) => ({
          ...prev,
          bricks: prev.bricks.map((b) =>
            b.id === selectedBrickId ? { ...b, position: newPos } : b
          ),
        }));
      } else if (dragModeRef.current === 'move') {
        // Moving player or hole
        const delta = Vec.sub(pos, dragStartRef.current);
        const newPos = Vec.add(dragItemStartRef.current, delta);
        newPos.x = Math.max(0.05, Math.min(0.95, newPos.x));
        newPos.y = Math.max(0.05, Math.min(0.95, newPos.y));

        // Determine what we're moving based on dragItemStartRef matching
        const playerDist = Vec.distance(dragItemStartRef.current, level.player);
        const holeDist = Vec.distance(dragItemStartRef.current, level.hole);

        if (playerDist < 0.01) {
          setLevel((prev) => ({ ...prev, player: newPos }));
        } else if (holeDist < 0.01) {
          setLevel((prev) => ({ ...prev, hole: newPos }));
        }
      } else if (dragModeRef.current === 'resize' && selectedBrickId && dragBrickStartRef.current) {
        const brick = level.bricks.find(b => b.id === selectedBrickId);
        if (!brick) return;

        // Calculate resize in local brick space
        const dx = pos.x - dragStartRef.current.x;
        const dy = pos.y - dragStartRef.current.y;
        const cos = Math.cos(-brick.angle);
        const sin = Math.sin(-brick.angle);
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;

        let newWidth = dragBrickStartRef.current.width;
        let newHeight = dragBrickStartRef.current.height;

        const handle = resizeHandleRef.current;

        // Adjust size and position based on which handle is being dragged
        if (handle === 'tr' || handle === 'br') {
          newWidth = Math.max(0.03, dragBrickStartRef.current.width + localDx * 2);
        }
        if (handle === 'tl' || handle === 'bl') {
          newWidth = Math.max(0.03, dragBrickStartRef.current.width - localDx * 2);
        }
        if (handle === 'bl' || handle === 'br') {
          newHeight = Math.max(0.02, dragBrickStartRef.current.height + localDy * 2);
        }
        if (handle === 'tl' || handle === 'tr') {
          newHeight = Math.max(0.02, dragBrickStartRef.current.height - localDy * 2);
        }

        setLevel((prev) => ({
          ...prev,
          bricks: prev.bricks.map((b) =>
            b.id === selectedBrickId
              ? { ...b, size: { width: newWidth, height: newHeight } }
              : b
          ),
        }));
      } else if (dragModeRef.current === 'rotate' && selectedBrickId && dragBrickStartRef.current) {
        const brick = level.bricks.find(b => b.id === selectedBrickId);
        if (!brick) return;

        // Calculate angle from brick center to current position
        const dx = pos.x - brick.position.x;
        const dy = pos.y - brick.position.y;
        let newAngle = Math.atan2(dy, dx) + Math.PI / 2;

        // Snap to 15 degree increments if shift is held
        if (e.shiftKey) {
          const snapAngle = Math.PI / 12; // 15 degrees
          newAngle = Math.round(newAngle / snapAngle) * snapAngle;
        }

        setLevel((prev) => ({
          ...prev,
          bricks: prev.bricks.map((b) =>
            b.id === selectedBrickId ? { ...b, angle: newAngle } : b
          ),
        }));
      } else if (dragModeRef.current === 'oscillation' && selectedBrickId && oscillationDragAxisRef.current) {
        const brick = level.bricks.find(b => b.id === selectedBrickId);
        if (!brick?.movement) return;

        const axis = oscillationDragAxisRef.current;
        let newRange: number;

        if (axis === 'horizontal') {
          newRange = Math.abs(pos.x - brick.position.x);
        } else {
          newRange = Math.abs(pos.y - brick.position.y);
        }

        newRange = Math.max(0.02, Math.min(0.3, newRange));

        setLevel((prev) => ({
          ...prev,
          bricks: prev.bricks.map((b) =>
            b.id === selectedBrickId && b.movement
              ? { ...b, movement: { ...b.movement, range: newRange } }
              : b
          ),
        }));
      } else {
        // Hover detection
        const hitId = hitTest(pos);
        setHoveredId(hitId);
      }
    },
    [mode, selectedBrickId, hitTest, toNormalized, level]
  );

  const handlePointerUp = useCallback(() => {
    dragModeRef.current = 'none';
    resizeHandleRef.current = null;
    dragBrickStartRef.current = null;
    oscillationDragAxisRef.current = null;
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedBrickId) return;
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.filter((b) => b.id !== selectedBrickId),
    }));
    setSelectedBrickId(null);
    setEditingOscillation(false);
  }, [selectedBrickId]);

  const duplicateSelected = useCallback(() => {
    if (!selectedBrickId) return;
    const brick = level.bricks.find(b => b.id === selectedBrickId);
    if (!brick) return;

    const newBrick: BrickData = {
      ...brick,
      id: generateId(),
      position: {
        x: Math.min(0.95, brick.position.x + 0.05),
        y: Math.min(0.95, brick.position.y + 0.05),
      },
    };
    setLevel((prev) => ({
      ...prev,
      bricks: [...prev.bricks, newBrick],
    }));
    setSelectedBrickId(newBrick.id);
  }, [selectedBrickId, level.bricks]);

  const toggleKillBrick = useCallback(() => {
    if (!selectedBrickId) return;
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.map((b) =>
        b.id === selectedBrickId ? { ...b, isKill: !b.isKill } : b
      ),
    }));
  }, [selectedBrickId]);

  const toggleOscillation = useCallback(() => {
    if (!selectedBrickId) return;
    const brick = level.bricks.find(b => b.id === selectedBrickId);
    if (!brick) return;

    if (brick.movement) {
      // Remove oscillation
      setLevel((prev) => ({
        ...prev,
        bricks: prev.bricks.map((b) =>
          b.id === selectedBrickId ? { ...b, movement: undefined } : b
        ),
      }));
      setEditingOscillation(false);
    } else {
      // Add default oscillation
      const defaultMovement: MovementData = {
        type: 'smooth',
        axis: 'horizontal',
        range: 0.1,
        speed: 0.5,
      };
      setLevel((prev) => ({
        ...prev,
        bricks: prev.bricks.map((b) =>
          b.id === selectedBrickId ? { ...b, movement: defaultMovement } : b
        ),
      }));
      setEditingOscillation(true);
    }
  }, [selectedBrickId, level.bricks]);

  const setOscillationAxis = useCallback((axis: 'horizontal' | 'vertical' | 'both') => {
    if (!selectedBrickId) return;
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.map((b) =>
        b.id === selectedBrickId && b.movement
          ? { ...b, movement: { ...b.movement, axis } }
          : b
      ),
    }));
  }, [selectedBrickId]);

  const setOscillationSpeed = useCallback((speed: number) => {
    if (!selectedBrickId) return;
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.map((b) =>
        b.id === selectedBrickId && b.movement
          ? { ...b, movement: { ...b.movement, speed } }
          : b
      ),
    }));
  }, [selectedBrickId]);

  const handleSave = useCallback(() => {
    const updatedLevel = { ...level, name: levelName };
    onSave(updatedLevel);
  }, [level, levelName, onSave]);

  const startTest = useCallback(() => {
    setMode('test');
    setSelectedBrickId(null);
    setEditingOscillation(false);
  }, []);

  const stopTest = useCallback(() => {
    setMode('edit');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'edit') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'Escape') {
        setSelectedBrickId(null);
        setSelectedTool('select');
        setEditingOscillation(false);
      } else if (e.key === 'b') {
        setSelectedTool('brick');
      } else if (e.key === 'k') {
        setSelectedTool('killBrick');
      } else if (e.key === 'v') {
        setSelectedTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, deleteSelected, duplicateSelected]);

  // Get selected brick for properties
  const selectedBrick = selectedBrickId
    ? level.bricks.find((b) => b.id === selectedBrickId)
    : null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Top Toolbar */}
      <div className="flex flex-col bg-slate-800 z-10">
        {/* Header row */}
        <div className="flex items-center justify-between p-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <input
              type="text"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              className="bg-slate-700 text-white px-3 py-1 rounded-lg text-sm w-32 sm:w-48"
              placeholder="Level name"
            />
          </div>

          <div className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <Button variant="secondary" size="sm" onClick={startTest}>
                  ▶ Test
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={stopTest}>
                ✕ Stop Test
              </Button>
            )}
          </div>
        </div>

        {/* Tools row */}
        {mode === 'edit' && (
          <div className="flex items-center gap-1 p-2 flex-wrap">
            {/* Tool group */}
            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
              <ToolButton
                active={selectedTool === 'select'}
                onClick={() => setSelectedTool('select')}
                title="Select (V)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2z" />
                </svg>
              </ToolButton>
              <ToolButton
                active={selectedTool === 'brick'}
                onClick={() => setSelectedTool('brick')}
                title="Add Brick (B)"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="9" width="16" height="6" rx="1" />
                </svg>
              </ToolButton>
              <ToolButton
                active={selectedTool === 'killBrick'}
                onClick={() => setSelectedTool('killBrick')}
                title="Add Kill Brick (K)"
                className={selectedTool === 'killBrick' ? 'bg-red-500' : ''}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="9" width="16" height="6" rx="1" fill="#ef4444" />
                  <path d="M8 12h8" stroke="white" strokeWidth="2" />
                </svg>
              </ToolButton>
              <ToolButton
                active={selectedTool === 'player'}
                onClick={() => setSelectedTool('player')}
                title="Move Player (P)"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="9" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </ToolButton>
              <ToolButton
                active={selectedTool === 'hole'}
                onClick={() => setSelectedTool('hole')}
                title="Move Hole (H)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="6" strokeWidth={2} />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </ToolButton>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-slate-600 mx-1" />

            {/* Selection actions */}
            {selectedBrick && (
              <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                <ToolButton
                  onClick={duplicateSelected}
                  title="Duplicate (Ctrl+D)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </ToolButton>
                <ToolButton
                  active={selectedBrick.isKill}
                  onClick={toggleKillBrick}
                  title="Toggle Kill"
                  className={selectedBrick.isKill ? 'bg-red-500/50' : ''}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </ToolButton>
                <ToolButton
                  active={!!selectedBrick.movement}
                  onClick={toggleOscillation}
                  title="Toggle Oscillation"
                  className={selectedBrick.movement ? 'bg-purple-500/50' : ''}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
                  </svg>
                </ToolButton>
                <ToolButton
                  onClick={deleteSelected}
                  title="Delete (Del)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </ToolButton>
              </div>
            )}

            {/* Oscillation settings */}
            {selectedBrick?.movement && (
              <>
                <div className="w-px h-8 bg-slate-600 mx-1" />
                <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1 px-2">
                  <span className="text-slate-400 text-xs">Axis:</span>
                  <select
                    value={selectedBrick.movement.axis}
                    onChange={(e) => setOscillationAxis(e.target.value as 'horizontal' | 'vertical' | 'both')}
                    className="bg-slate-600 text-white text-xs rounded px-2 py-1"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                    <option value="both">Both</option>
                  </select>
                  <span className="text-slate-400 text-xs ml-2">Speed:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={selectedBrick.movement.speed}
                    onChange={(e) => setOscillationSpeed(parseFloat(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-white text-xs w-6">{selectedBrick.movement.speed.toFixed(1)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOscillation(!editingOscillation)}
                    className={`text-xs px-2 py-1 ${editingOscillation ? 'bg-purple-500/50' : ''}`}
                  >
                    {editingOscillation ? 'Done' : 'Edit Range'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {mode === 'edit' ? (
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none',
              cursor: selectedTool === 'select' ? 'default' : 'crosshair',
            }}
          />
        ) : (
          <TestCanvas level={level} />
        )}

        {/* Tool hint */}
        {mode === 'edit' && selectedTool !== 'select' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
            {selectedTool === 'brick' && 'Click to place a brick'}
            {selectedTool === 'killBrick' && 'Click to place a kill brick'}
            {selectedTool === 'player' && 'Click to move player'}
            {selectedTool === 'hole' && 'Click to move hole'}
          </div>
        )}

        {/* Oscillation editing hint */}
        {mode === 'edit' && editingOscillation && selectedBrick?.movement && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-500/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
            Drag the handles to adjust oscillation range
          </div>
        )}

        {/* Selection info */}
        {mode === 'edit' && selectedBrick && !editingOscillation && selectedTool === 'select' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
            Drag corners to resize • Drag top handle to rotate • Hold Shift for 15° snap
          </div>
        )}
      </div>
    </div>
  );
}

// Test canvas component
function TestCanvas({ level }: { level: LevelData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.setCallbacks({
      onAttemptChange: setAttempts,
    });
    game.loadLevel(level);
    game.start();

    return () => {
      game.stop();
    };
  }, [level]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
        Attempts: {attempts}
      </div>
    </>
  );
}

// Tool button component
function ToolButton({
  active,
  onClick,
  title,
  children,
  className = '',
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-150
        ${active
          ? 'bg-indigo-500 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
