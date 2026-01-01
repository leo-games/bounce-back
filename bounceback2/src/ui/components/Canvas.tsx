import { useRef, useEffect, useCallback } from 'react';
import { Game } from '@/engine';
import type { LevelData, PlayState } from '@/types';

interface CanvasProps {
  levelData: LevelData | null;
  onStateChange?: (state: PlayState) => void;
  onAttemptChange?: (attempts: number) => void;
  onLevelComplete?: () => void;
  gameRef?: React.MutableRefObject<Game | null>;
}

export function Canvas({
  levelData,
  onStateChange,
  onAttemptChange,
  onLevelComplete,
  gameRef,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalGameRef = useRef<Game | null>(null);

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;

    const game = new Game(canvasRef.current);
    internalGameRef.current = game;

    if (gameRef) {
      gameRef.current = game;
    }

    game.setCallbacks({
      onStateChange,
      onAttemptChange,
      onLevelComplete,
    });

    if (levelData) {
      game.loadLevel(levelData);
    }

    game.start();

    return () => {
      game.stop();
    };
  }, [levelData, onStateChange, onAttemptChange, onLevelComplete, gameRef]);

  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, [initGame]);

  useEffect(() => {
    if (internalGameRef.current && levelData) {
      internalGameRef.current.loadLevel(levelData);
    }
  }, [levelData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
      }}
    />
  );
}
