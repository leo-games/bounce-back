import { useState, useRef, useEffect, useCallback } from 'react';
import type { LevelData, BrickData, Vector } from '@/types';
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

type EditorTool = 'select' | 'brick' | 'player' | 'hole';
type EditorMode = 'edit' | 'test';

interface EditorScreenProps {
  initialLevel?: LevelData;
  onSave: (level: LevelData) => void;
  onBack: () => void;
}

export function EditorScreen({ initialLevel, onSave, onBack }: EditorScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [level, setLevel] = useState<LevelData>(() =>
    initialLevel ? { ...initialLevel } : createEmptyLevel()
  );
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [levelName, setLevelName] = useState(level.name);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Vector>({ x: 0, y: 0 });
  const dragItemStartRef = useRef<Vector>({ x: 0, y: 0 });

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
      renderer.drawEditorOverlay(levelInstance, selectedIds, hoveredId);
    };

    const intervalId = setInterval(render, 16);
    return () => clearInterval(intervalId);
  }, [mode, selectedIds, hoveredId]);

  const toNormalized = useCallback((screenX: number, screenY: number): Vector => {
    const renderer = gameRef.current?.getRenderer();
    if (!renderer) return { x: 0, y: 0 };
    return renderer.toNormalized({ x: screenX, y: screenY });
  }, []);

  const hitTest = useCallback(
    (pos: Vector): string | null => {
      // Check bricks (in reverse order - top first)
      for (let i = level.bricks.length - 1; i >= 0; i--) {
        const brick = level.bricks[i];
        const halfW = brick.size.width / 2;
        const halfH = brick.size.height / 2;

        // Simple AABB for now (ignoring rotation in hit test)
        if (
          pos.x >= brick.position.x - halfW &&
          pos.x <= brick.position.x + halfW &&
          pos.y >= brick.position.y - halfH &&
          pos.y <= brick.position.y + halfH
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
      const pos = toNormalized(screenX, screenY);

      if (selectedTool === 'brick') {
        // Add new brick
        const newBrick: BrickData = {
          id: generateId(),
          position: { x: pos.x, y: pos.y },
          size: { width: DEFAULT_BRICK_WIDTH, height: DEFAULT_BRICK_HEIGHT },
          angle: 0,
          isKill: false,
        };
        setLevel((prev) => ({
          ...prev,
          bricks: [...prev.bricks, newBrick],
        }));
        setSelectedIds(new Set([newBrick.id]));
        setSelectedTool('select');
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
        // Select tool
        const hitId = hitTest(pos);
        if (hitId) {
          if (e.shiftKey) {
            // Multi-select
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(hitId)) {
                next.delete(hitId);
              } else {
                next.add(hitId);
              }
              return next;
            });
          } else {
            setSelectedIds(new Set([hitId]));
          }

          // Start dragging
          isDraggingRef.current = true;
          dragStartRef.current = pos;

          // Store initial position of dragged item
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
          setSelectedIds(new Set());
        }
      }
    },
    [mode, selectedTool, hitTest, level, toNormalized]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'edit') return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pos = toNormalized(screenX, screenY);

      if (isDraggingRef.current && selectedIds.size === 1) {
        const selectedId = Array.from(selectedIds)[0];
        const delta = Vec.sub(pos, dragStartRef.current);
        const newPos = Vec.add(dragItemStartRef.current, delta);

        // Clamp to valid range
        newPos.x = Math.max(0.05, Math.min(0.95, newPos.x));
        newPos.y = Math.max(0.05, Math.min(0.95, newPos.y));

        if (selectedId === 'player') {
          setLevel((prev) => ({ ...prev, player: newPos }));
        } else if (selectedId === 'hole') {
          setLevel((prev) => ({ ...prev, hole: newPos }));
        } else {
          setLevel((prev) => ({
            ...prev,
            bricks: prev.bricks.map((b) =>
              b.id === selectedId ? { ...b, position: newPos } : b
            ),
          }));
        }
      } else {
        // Hover detection
        const hitId = hitTest(pos);
        setHoveredId(hitId);
      }
    },
    [mode, selectedIds, hitTest, toNormalized]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const deleteSelected = useCallback(() => {
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.filter((b) => !selectedIds.has(b.id)),
    }));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const duplicateSelected = useCallback(() => {
    const newBricks: BrickData[] = [];
    level.bricks.forEach((brick) => {
      if (selectedIds.has(brick.id)) {
        newBricks.push({
          ...brick,
          id: generateId(),
          position: {
            x: brick.position.x + 0.03,
            y: brick.position.y + 0.03,
          },
        });
      }
    });
    if (newBricks.length > 0) {
      setLevel((prev) => ({
        ...prev,
        bricks: [...prev.bricks, ...newBricks],
      }));
      setSelectedIds(new Set(newBricks.map((b) => b.id)));
    }
  }, [level.bricks, selectedIds]);

  const toggleKillBrick = useCallback(() => {
    setLevel((prev) => ({
      ...prev,
      bricks: prev.bricks.map((b) =>
        selectedIds.has(b.id) ? { ...b, isKill: !b.isKill } : b
      ),
    }));
  }, [selectedIds]);

  const handleSave = useCallback(() => {
    const updatedLevel = { ...level, name: levelName };
    onSave(updatedLevel);
  }, [level, levelName, onSave]);

  const startTest = useCallback(() => {
    setMode('test');
    setSelectedIds(new Set());
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
        setSelectedIds(new Set());
        setSelectedTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, deleteSelected, duplicateSelected]);

  // Get selected brick for properties panel
  const selectedBrick =
    selectedIds.size === 1
      ? level.bricks.find((b) => b.id === Array.from(selectedIds)[0])
      : null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-800 z-10">
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

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Toolbar (edit mode only) */}
        {mode === 'edit' && (
          <div className="w-14 sm:w-16 bg-slate-800 p-2 flex flex-col gap-2">
            <ToolButton
              active={selectedTool === 'select'}
              onClick={() => setSelectedTool('select')}
              title="Select (V)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </ToolButton>
            <ToolButton
              active={selectedTool === 'brick'}
              onClick={() => setSelectedTool('brick')}
              title="Add Brick (B)"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="8" width="18" height="8" rx="2" />
              </svg>
            </ToolButton>
            <ToolButton
              active={selectedTool === 'player'}
              onClick={() => setSelectedTool('player')}
              title="Move Player (P)"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </ToolButton>
            <ToolButton
              active={selectedTool === 'hole'}
              onClick={() => setSelectedTool('hole')}
              title="Move Hole (H)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="8" strokeWidth={2} />
              </svg>
            </ToolButton>

            <div className="flex-1" />

            {/* Selection actions */}
            {selectedIds.size > 0 && (
              <>
                <ToolButton onClick={duplicateSelected} title="Duplicate (Ctrl+D)">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </ToolButton>
                {selectedBrick && (
                  <ToolButton
                    active={selectedBrick.isKill}
                    onClick={toggleKillBrick}
                    title="Toggle Kill Brick (K)"
                    className={selectedBrick.isKill ? 'bg-red-500/30' : ''}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </ToolButton>
                )}
                <ToolButton onClick={deleteSelected} title="Delete (Del)">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </ToolButton>
              </>
            )}
          </div>
        )}

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
              {selectedTool === 'player' && 'Click to move player'}
              {selectedTool === 'hole' && 'Click to move hole'}
            </div>
          )}
        </div>
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
        w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center
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
