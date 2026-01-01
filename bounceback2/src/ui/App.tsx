import { useState, useCallback, useEffect } from 'react';
import type { LevelData, LevelProgress, GameMode } from '@/types';
import { MainMenu } from './screens/MainMenu';
import { LevelSelect } from './screens/LevelSelect';
import { GameScreen } from './screens/GameScreen';
import { EditorScreen } from './screens/EditorScreen';
import { defaultLevels } from '@/data/levels';
import { loadCustomLevels, saveCustomLevels, loadProgress, saveProgress } from '@/utils/storage';

export function App() {
  const [mode, setMode] = useState<GameMode>('menu');
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [customLevels, setCustomLevels] = useState<LevelData[]>([]);
  const [progress, setProgress] = useState<Record<string, LevelProgress>>({});
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [editingLevel, setEditingLevel] = useState<LevelData | undefined>(undefined);

  // Load data on mount
  useEffect(() => {
    setLevels(defaultLevels);
    setCustomLevels(loadCustomLevels());
    setProgress(loadProgress());
  }, []);

  const allLevels = [...levels, ...customLevels];

  const handlePlay = useCallback(() => {
    setMode('levelSelect');
  }, []);

  const handleEditor = useCallback(() => {
    setEditingLevel(undefined);
    setMode('editor');
  }, []);

  const handleSelectLevel = useCallback((level: LevelData) => {
    const index = allLevels.findIndex((l) => l.id === level.id);
    setCurrentLevelIndex(index >= 0 ? index : 0);
    setMode('playing');
  }, [allLevels]);

  const handleLevelComplete = useCallback(
    (attempts: number) => {
      const level = allLevels[currentLevelIndex];
      if (!level) return;

      const currentProgress = progress[level.id];
      const newProgress: LevelProgress = {
        levelId: level.id,
        completed: true,
        bestAttempts:
          currentProgress?.bestAttempts === null || currentProgress?.bestAttempts === undefined
            ? attempts
            : Math.min(currentProgress.bestAttempts, attempts),
      };

      const updatedProgress = { ...progress, [level.id]: newProgress };
      setProgress(updatedProgress);
      saveProgress(updatedProgress);
    },
    [allLevels, currentLevelIndex, progress]
  );

  const handleNextLevel = useCallback(() => {
    if (currentLevelIndex < allLevels.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
    }
  }, [currentLevelIndex, allLevels.length]);

  const handleSaveLevel = useCallback(
    (level: LevelData) => {
      const existingIndex = customLevels.findIndex((l) => l.id === level.id);
      let newCustomLevels: LevelData[];

      if (existingIndex >= 0) {
        newCustomLevels = [...customLevels];
        newCustomLevels[existingIndex] = level;
      } else {
        newCustomLevels = [...customLevels, level];
      }

      setCustomLevels(newCustomLevels);
      saveCustomLevels(newCustomLevels);
      setMode('levelSelect');
    },
    [customLevels]
  );

  const handleBack = useCallback(() => {
    if (mode === 'playing' || mode === 'editor') {
      setMode('levelSelect');
    } else {
      setMode('menu');
    }
  }, [mode]);

  const handleBackToMenu = useCallback(() => {
    setMode('menu');
  }, []);

  return (
    <div className="w-full h-full">
      {mode === 'menu' && <MainMenu onPlay={handlePlay} onEditor={handleEditor} />}

      {mode === 'levelSelect' && (
        <LevelSelect
          levels={allLevels}
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToMenu}
        />
      )}

      {mode === 'playing' && allLevels[currentLevelIndex] && (
        <GameScreen
          level={allLevels[currentLevelIndex]}
          levelIndex={currentLevelIndex}
          totalLevels={allLevels.length}
          onComplete={handleLevelComplete}
          onBack={handleBack}
          onNextLevel={handleNextLevel}
        />
      )}

      {mode === 'editor' && (
        <EditorScreen
          initialLevel={editingLevel}
          onSave={handleSaveLevel}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
