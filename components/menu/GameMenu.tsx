
import React, { useCallback } from 'react';
import { GameState, EditorState, LevelData, Brick, BrickMovementType } from '../../types';
import LevelList from './LevelList';
import BrickPropertiesEditor from './BrickPropertiesEditor';
import { deepClone, sanitizeFilename } from '../../utils/common';
import { BASE_DEFAULT_MOVE_RANGE, DEFAULT_MOVE_SPEED, FALLBACK_CANVAS_HEIGHT, FALLBACK_CANVAS_WIDTH } from '../../constants';


interface GameMenuProps {
  showMenuUI: boolean;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  levels: LevelData[];
  setLevels: React.Dispatch<React.SetStateAction<LevelData[]>>;
  loadLevelData: (index: number) => void;
  saveCurrentLevelData: () => void;
  showUIMessage: (text: string, duration?: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPointerOverUIChanged: (isOverUI: boolean) => void;
  saveHistoryState: (forceSave?: boolean) => void;
  undo: () => void;
  redo: () => void;
  createDefaultLevelData: (index?: number) => LevelData;
  validateAndDefaultLevel: (lvl: Partial<LevelData>, index: number) => LevelData;
  resetBall: (gs: GameState) => void;
}

const GameMenu: React.FC<GameMenuProps> = ({
  showMenuUI, gameState, setGameState, editorState, setEditorState, levels, setLevels, loadLevelData, saveCurrentLevelData,
  showUIMessage, fileInputRef, onPointerOverUIChanged, saveHistoryState, undo, redo, createDefaultLevelData, validateAndDefaultLevel, resetBall
}) => {

  const handleModeChange = (newMode: 'play' | 'editor') => {
    setGameState(prev => ({ ...prev, mode: newMode }));
    setEditorState(prev => ({ ...prev, aim: { ...prev.aim, active: false }, contextMenu: null, selectedItems: [] }));
    if (newMode === 'play') {
        resetBall(gameState); // Reset ball when switching to play mode
    }
  };

  const handleRenameLevel = (index: number) => {
    const currentName = levels[index]?.name || `Level ${index + 1}`;
    const newName = prompt(`Enter new name for "${currentName}":`, currentName);
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (trimmedName === '') {
      showUIMessage("Level name cannot be empty.", 2000);
      return;
    }
    if (trimmedName !== currentName) {
      saveHistoryState(); // Potentially save if level content was being edited
      const newLevels = [...levels];
      newLevels[index].name = trimmedName;
      setLevels(newLevels);
      // saveLevelsToStorage(newLevels); // Handled by App.tsx
      showUIMessage(`Level ${index + 1} renamed to "${trimmedName}"`, 1500);
    }
  };

  const handleAddNewLevel = () => {
    saveHistoryState();
    const newLevelData = createDefaultLevelData(levels.length);
    // Assume current canvas size is the reference for the new level
    newLevelData.savedCanvasWidth = gameState.lastSizeScaleX * FALLBACK_CANVAS_WIDTH; // Approximate current canvas
    newLevelData.savedCanvasHeight = gameState.lastSizeScaleY * FALLBACK_CANVAS_HEIGHT;
    const newLevels = [...levels, newLevelData];
    setLevels(newLevels);
    loadLevelData(newLevels.length - 1);
    showUIMessage(`Added new Level ${newLevels.length}`, 1500);
  };

  const handleDeleteSelectedLevel = () => {
    const index = gameState.currentLevelIndex;
    if (levels.length <= 1) {
      showUIMessage("Cannot delete the last level!", 2000);
      return;
    }
    if (confirm(`Are you sure you want to delete Level ${index + 1} ('${levels[index].name}')? This cannot be undone.`)) {
      saveHistoryState();
      const newLevels = levels.filter((_, i) => i !== index);
      setLevels(newLevels);
      const newIndexToLoad = Math.max(0, index - 1);
      loadLevelData(newIndexToLoad);
      showUIMessage(`Deleted Level ${index + 1}`, 1500);
    }
  };
  
  const handleMoveLevel = (index: number, direction: 'up' | 'down') => {
    saveHistoryState();
    const newLevels = [...levels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLevels.length) return;
    [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];
    setLevels(newLevels);
    loadLevelData(targetIndex); // Select the moved level
  };

  const handleExportSelectedLevel = () => {
    const index = gameState.currentLevelIndex;
    if (index < 0 || index >= levels.length) {
      showUIMessage("No level selected to export.", 2000);
      return;
    }
    try {
      if (gameState.mode === 'editor') {
        saveCurrentLevelData(); // Ensure current state is saved to levels array first
      }
      // Use the latest version from `levels` state after potential save
      const levelDataToExport = deepClone(levels[index]); 
      if (!levelDataToExport || !levelDataToExport.bricks || !levelDataToExport.player || !levelDataToExport.hole || !levelDataToExport.savedCanvasWidth || !levelDataToExport.savedCanvasHeight) {
        throw new Error("Level data is incomplete for export.");
      }
      const levelJson = JSON.stringify(levelDataToExport, null, 2);
      const levelName = sanitizeFilename(levelDataToExport.name || `level_${index + 1}`);
      const filename = `${levelName}.json`;
      const blob = new Blob([levelJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showUIMessage(`Level '${levelDataToExport.name}' exported as ${filename}`, 2000);
    } catch (error: any) {
      console.error("Export failed:", error);
      showUIMessage(`Failed to export level: ${error.message}`, 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    saveHistoryState();
    let importedCount = 0;
    let failedCount = 0;
    const newLevels = [...levels];

    for (const file of Array.from(files)) {
        try {
            const fileContent = await file.text();
            const parsedLevel = JSON.parse(fileContent);
            // Basic validation, more robust validation happens in validateAndDefaultLevel
            if (typeof parsedLevel !== 'object' || !parsedLevel.name || !Array.isArray(parsedLevel.bricks) || typeof parsedLevel.player !== 'object' || typeof parsedLevel.hole !== 'object' || typeof parsedLevel.savedCanvasWidth !== 'number' || typeof parsedLevel.savedCanvasHeight !== 'number') {
                throw new Error(`Invalid base level structure or missing required fields in file ${file.name}.`);
            }
            const validatedLevel = validateAndDefaultLevel(parsedLevel, newLevels.length);
            newLevels.push(validatedLevel);
            importedCount++;
        } catch (error: any) {
            console.error(`Failed to import file ${file.name}:`, error);
            failedCount++;
        }
    }
    
    if (importedCount > 0) {
        setLevels(newLevels);
        loadLevelData(newLevels.length - 1); // Load the last imported level
    }
    let message = "";
    if (importedCount > 0) message += `Imported ${importedCount} level(s). `;
    if (failedCount > 0) message += `${failedCount} import(s) failed. Check console.`;
    if (message) showUIMessage(message, 3000);
    
    event.target.value = ''; // Reset file input
  };

  const handleBrickPropertyChange = (propertyName: keyof Brick, value: number) => {
    if (editorState.selectedItems.length !== 1 || editorState.selectedItems[0].type !== 'brick' || editorState.selectedItems[0].index === null) return;
    const brickIndex = editorState.selectedItems[0].index;
    if (brickIndex === null) return;

    saveHistoryState(); // Save before property change
    setEditorState(prev => ({...prev, isUpdatingPropertiesFromInput: true}));
    setGameState(prevGS => {
        const newBricks = [...prevGS.bricks];
        const brickToUpdate = {...newBricks[brickIndex]};
        
        if (propertyName === 'moveRange' || propertyName === 'moveSpeed') {
            (brickToUpdate as any)[propertyName] = value;
        }
        
        newBricks[brickIndex] = brickToUpdate;
        return {...prevGS, bricks: newBricks};
    });
    // Delay setting isUpdatingPropertiesFromInput to false to allow UI to re-render from value
    setTimeout(() => setEditorState(prev => ({...prev, isUpdatingPropertiesFromInput: false})), 0);
  };

  return (
    <div 
        className={`absolute top-0 left-0 h-full bg-white p-4 shadow-xl z-20 space-y-3 w-64 max-h-full overflow-y-auto transition-transform duration-300 ease-in-out ${
            showMenuUI ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:top-4 md:left-4 md:h-auto md:max-h-[calc(100vh-2rem)] md:rounded-lg md:translate-x-0`}
        onMouseEnter={() => onPointerOverUIChanged(true)}
        onMouseLeave={() => onPointerOverUIChanged(false)}
    >
      <div className="flex justify-center mb-2">
        {/* Placeholder for logo */}
        <div className="w-20 h-16 bg-gray-300 text-gray-600 flex items-center justify-center text-xs rounded">BounceBack Logo</div>
      </div>
      <h2 className="text-xl font-semibold text-center text-gray-800">Bounce Back</h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleModeChange('play')}
          className={`w-full px-4 py-2 rounded-md transition duration-150 ease-in-out text-sm font-medium
                        ${gameState.mode === 'play' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          Play Mode
        </button>
        <button
          onClick={() => handleModeChange('editor')}
          className={`w-full px-4 py-2 rounded-md transition duration-150 ease-in-out text-sm font-medium
                        ${gameState.mode === 'editor' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
        >
          Level Editor
        </button>
      </div>

      <div className="text-sm text-gray-600 text-center">
        Playing Level: <span className="font-medium">{levels[gameState.currentLevelIndex]?.name || gameState.currentLevelIndex + 1}</span>
      </div>

      {gameState.mode === 'editor' && (
        <div className="space-y-3 border-t border-gray-200 pt-3 mt-3">
          <h3 className="text-md font-semibold text-center text-gray-700">Level Editor</h3>
          <div className="text-sm text-gray-600 text-center">
            Editing Level: <span className="font-medium">{levels[gameState.currentLevelIndex]?.name || gameState.currentLevelIndex + 1}</span>
          </div>
          <div className="text-xs text-gray-500 text-center mb-2 p-1 bg-gray-50 rounded border border-gray-200">
            Dbl-Click Name: Rename | Ctrl+Click: Multi-Select | Drag: Marquee | Arrow Keys: Nudge | Ctrl+C/V/Z/Y/Del
          </div>
          
          <div className="flex space-x-1">
            <button onClick={undo} className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs">Undo</button>
            <button onClick={redo} className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs">Redo</button>
          </div>

          <LevelList
            levels={levels}
            currentLevelIndex={gameState.currentLevelIndex}
            onSelectLevel={loadLevelData}
            onRenameLevel={handleRenameLevel}
            onMoveLevelUp={(idx) => handleMoveLevel(idx, 'up')}
            onMoveLevelDown={(idx) => handleMoveLevel(idx, 'down')}
          />
          
          <div className="grid grid-cols-2 gap-1 mt-2">
            <button onClick={handleAddNewLevel} className="w-full px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-xs">Add New</button>
            <button onClick={handleImportClick} className="w-full px-3 py-1 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 text-xs">Import</button>
            <input type="file" ref={fileInputRef} accept=".json" multiple style={{ display: 'none' }} onChange={handleFileImport} />
            <button onClick={handleDeleteSelectedLevel} className="w-full px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs">Delete Sel.</button>
            <button onClick={handleExportSelectedLevel} className="w-full px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-xs">Export Sel.</button>
          </div>
          <button onClick={saveCurrentLevelData} className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium">
            Save Current Level
          </button>

          <BrickPropertiesEditor
            gameState={gameState}
            editorState={editorState}
            onPropertyChange={handleBrickPropertyChange}
          />
        </div>
      )}
    </div>
  );
};

export default GameMenu;
    