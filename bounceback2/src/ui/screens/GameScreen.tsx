import { useState, useRef, useCallback } from 'react';
import type { LevelData, PlayState } from '@/types';
import { Game } from '@/engine';
import { Canvas } from '../components/Canvas';
import { Button } from '../components/Button';

interface GameScreenProps {
  level: LevelData;
  levelIndex: number;
  totalLevels: number;
  onComplete: (attempts: number) => void;
  onBack: () => void;
  onNextLevel: () => void;
}

export function GameScreen({
  level,
  levelIndex,
  totalLevels,
  onComplete,
  onBack,
  onNextLevel,
}: GameScreenProps) {
  const [attempts, setAttempts] = useState(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [showComplete, setShowComplete] = useState(false);
  const gameRef = useRef<Game | null>(null);

  const handleStateChange = useCallback((state: PlayState) => {
    setPlayState(state);
  }, []);

  const handleAttemptChange = useCallback((newAttempts: number) => {
    setAttempts(newAttempts);
  }, []);

  const handleLevelComplete = useCallback(() => {
    setShowComplete(true);
    onComplete(attempts + 1); // +1 because the winning attempt hasn't been counted yet
  }, [attempts, onComplete]);

  const handleReset = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.reset();
    }
  }, []);

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    setAttempts(0);
    onNextLevel();
  }, [onNextLevel]);

  const isLastLevel = levelIndex >= totalLevels - 1;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 backdrop-blur-sm z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Levels</span>
        </Button>

        <div className="text-center">
          <div className="text-white font-semibold">
            Level {levelIndex + 1}
          </div>
          <div className="text-slate-400 text-sm">
            {level.name}
          </div>
        </div>

        <div className="text-right">
          <div className="text-amber-400 font-semibold">
            {attempts}
          </div>
          <div className="text-slate-400 text-xs">
            attempts
          </div>
        </div>
      </div>

      {/* Game canvas */}
      <div className="flex-1 relative">
        <Canvas
          levelData={level}
          onStateChange={handleStateChange}
          onAttemptChange={handleAttemptChange}
          onLevelComplete={handleLevelComplete}
          gameRef={gameRef}
        />

        {/* Instructions overlay */}
        {playState === 'idle' && attempts === 0 && (
          <div className="absolute inset-0 flex items-end justify-center pb-20 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-full text-center">
              Drag toward target to launch!
            </div>
          </div>
        )}

        {/* Reset button */}
        {playState !== 'launched' && playState !== 'success' && attempts > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Reset Ball
            </Button>
          </div>
        )}
      </div>

      {/* Level complete modal */}
      {showComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="bg-white rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-indigo-600 mb-2">
              Level Complete!
            </h2>
            <p className="text-slate-600 mb-6">
              You did it in <span className="font-bold text-amber-500">{attempts}</span> {attempts === 1 ? 'try' : 'tries'}!
            </p>
            <div className="flex flex-col gap-3">
              {!isLastLevel && (
                <Button size="lg" onClick={handleNextLevel}>
                  Next Level
                </Button>
              )}
              <Button
                variant={isLastLevel ? 'primary' : 'secondary'}
                onClick={onBack}
              >
                {isLastLevel ? '🏆 All Levels Complete!' : 'Back to Levels'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
