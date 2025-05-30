
import React from 'react';
import { Brick, GameState, EditorState, BrickMovementType } from '../../types';
import { DEFAULT_MOVE_SPEED } from '../../constants';


interface BrickPropertiesEditorProps {
  gameState: GameState;
  editorState: EditorState;
  onPropertyChange: (propertyName: keyof Brick, value: number) => void;
}

const BrickPropertiesEditor: React.FC<BrickPropertiesEditorProps> = ({
  gameState,
  editorState,
  onPropertyChange,
}) => {
  if (editorState.selectedItems.length !== 1 || editorState.selectedItems[0].type !== 'brick' || editorState.selectedItems[0].index === null) {
    return null; // Hide if no single brick is selected
  }

  const brickIndex = editorState.selectedItems[0].index;
  if (brickIndex === null || brickIndex < 0 || brickIndex >= gameState.bricks.length) return null;
  
  const brick = gameState.bricks[brickIndex];
  if (!brick) return null;

  const isMover = brick.movementType === BrickMovementType.Vertical || brick.movementType === BrickMovementType.Horizontal;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const propertyName = e.target.name as keyof Brick;
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >=0) {
      onPropertyChange(propertyName, value);
    }
  };

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3 mt-3">
      <h4 className="text-sm font-medium text-center text-gray-700">Brick Properties</h4>
      <div>
        <label htmlFor="propMoveRange" className="block mb-1 text-xs text-gray-600">Move Range:</label>
        <input
          type="number"
          id="propMoveRange"
          name="moveRange"
          min="0"
          step="1"
          value={isMover ? (brick.moveRange ?? 0).toFixed(1) : ''}
          onChange={handleInputChange}
          disabled={!isMover || editorState.isUpdatingPropertiesFromInput}
          placeholder={isMover ? '' : 'N/A (Static)'}
          className="w-full px-2 py-1 border border-gray-300 rounded-sm text-xs disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
      <div>
        <label htmlFor="propMoveSpeed" className="block mb-1 text-xs text-gray-600">Move Speed:</label>
        <input
          type="number"
          id="propMoveSpeed"
          name="moveSpeed"
          min="0"
          step="0.1"
          value={isMover ? (brick.moveSpeed ?? DEFAULT_MOVE_SPEED).toFixed(1) : ''}
          onChange={handleInputChange}
          disabled={!isMover || editorState.isUpdatingPropertiesFromInput}
          placeholder={isMover ? '' : 'N/A (Static)'}
          className="w-full px-2 py-1 border border-gray-300 rounded-sm text-xs disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </div>
  );
};

export default BrickPropertiesEditor;
    