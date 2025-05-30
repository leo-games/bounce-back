
import React from 'react';
import { ContextMenuState, GameState, EditorState, Brick, BrickMovementType, SelectedItem } from '../../types';
import { BASE_DEFAULT_MOVE_RANGE, DEFAULT_MOVE_SPEED } from '../../constants';

interface ContextMenuComponentProps {
  contextMenuState: ContextMenuState;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  saveHistory: () => void;
  showUIMessage: (text: string, duration?: number) => void;
}

const ContextMenuComponent: React.FC<ContextMenuComponentProps> = ({
  contextMenuState, gameState, setGameState, editorState, setEditorState, saveHistory, showUIMessage
}) => {
  if (!contextMenuState.target) return null;

  const { x, y, target } = contextMenuState;

  const addBrick = (type: 'static' | 'kill' | 'vertical' | 'horizontal') => {
    saveHistory();
    const { lastSizeScaleX, lastSizeScaleY, scaledMinBrickDimension } = gameState;
    const baseWidth = 100;
    const baseHeight = 20;
    const scaledWidth = Math.max(scaledMinBrickDimension, baseWidth * lastSizeScaleX);
    const scaledHeight = Math.max(scaledMinBrickDimension, baseHeight * lastSizeScaleY);

    const scaledX = target.x - scaledWidth / 2;
    const scaledY = target.y - scaledHeight / 2;

    let movementType: BrickMovementType | null = null;
    let scaledMoveRange = BASE_DEFAULT_MOVE_RANGE;
    if (type === BrickMovementType.Vertical) {
      movementType = BrickMovementType.Vertical;
      scaledMoveRange *= lastSizeScaleY;
    } else if (type === BrickMovementType.Horizontal) {
      movementType = BrickMovementType.Horizontal;
      scaledMoveRange *= lastSizeScaleX;
    }
    
    const newBrick: Brick = {
      x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight, angle: 0,
      isKillBrick: type === 'kill',
      movementType: movementType,
      moveRange: scaledMoveRange,
      moveSpeed: DEFAULT_MOVE_SPEED,
      initialX: movementType ? scaledX : undefined,
      initialY: movementType ? scaledY : undefined,
      baseWidth: baseWidth,
      baseHeight: baseHeight,
    };

    setGameState(prevGS => {
      const updatedBricks = [...prevGS.bricks, newBrick];
      setEditorState(prevES => ({ 
        ...prevES, 
        selectedItems: [{ type: 'brick', index: updatedBricks.length - 1 }],
        contextMenu: null 
      }));
      return { ...prevGS, bricks: updatedBricks };
    });
  };

  const ensureItemSelectedAndHideMenu = (itemToSelect: SelectedItem) => {
    setEditorState(prevES => {
        let newSelectedItems = prevES.selectedItems;
        if (!prevES.selectedItems.some(sel => sel.type === itemToSelect.type && sel.index === itemToSelect.index)) {
            // If multi-selecting, add. Otherwise, replace. For context menu, usually replace or ensure.
            // For simplicity here, ensure it's selected, potentially as the only item.
            newSelectedItems = [itemToSelect];
        }
        return {...prevES, selectedItems: newSelectedItems, contextMenu: null};
    });
  };


  const toggleKillBrick = (index: number) => {
    saveHistory();
    setGameState(prevGS => {
      const newBricks = [...prevGS.bricks];
      if (newBricks[index]) newBricks[index].isKillBrick = !newBricks[index].isKillBrick;
      ensureItemSelectedAndHideMenu({type: 'brick', index});
      return { ...prevGS, bricks: newBricks };
    });
  };
  
  const setMovementType = (index: number, newType: BrickMovementType | null) => {
    saveHistory();
    setGameState(prevGS => {
        const newBricks = [...prevGS.bricks];
        const brick = newBricks[index];
        if (brick) {
            if (newType === null) {
                brick.movementType = null;
            } else {
                if (brick.movementType !== newType || brick.initialX === undefined || brick.initialY === undefined) {
                    brick.initialX = brick.x;
                    brick.initialY = brick.y;
                }
                brick.movementType = newType;
                brick.moveSpeed = brick.moveSpeed ?? DEFAULT_MOVE_SPEED;

                let scaledMoveRange = BASE_DEFAULT_MOVE_RANGE;
                if (brick.movementType === BrickMovementType.Horizontal) scaledMoveRange *= prevGS.lastSizeScaleX;
                else if (brick.movementType === BrickMovementType.Vertical) scaledMoveRange *= prevGS.lastSizeScaleY;
                brick.moveRange = scaledMoveRange;
            }
        }
        ensureItemSelectedAndHideMenu({type: 'brick', index});
        return { ...prevGS, bricks: newBricks };
    });
  };

  const deleteSingleBrick = (index: number) => {
    saveHistory();
    setGameState(prevGS => {
      const newBricks = prevGS.bricks.filter((_, i) => i !== index);
      setEditorState(prevES => ({
        ...prevES,
        selectedItems: prevES.selectedItems
          .filter(item => !(item.type === 'brick' && item.index === index))
          .map(item => {
            if (item.type === 'brick' && item.index !== null && item.index > index) {
              return { ...item, index: item.index - 1 };
            }
            return item;
          }),
        contextMenu: null,
      }));
      return { ...prevGS, bricks: newBricks };
    });
  };

  const handleCopy = () => {
    if (editorState.selectedItems.length === 0) {
        setEditorState(prev => ({...prev, contextMenu: null}));
        return;
    }
    const { lastSizeScaleX, lastSizeScaleY } = gameState;
    const clipboard: Partial<Brick>[] = [];
    editorState.selectedItems.forEach(item => {
        if (item.type === 'brick' && item.index !== null && item.index < gameState.bricks.length) { // Check index bounds
            const brick = gameState.bricks[item.index];
            if (brick) {
                let unscaledMoveRange = brick.moveRange;
                if (brick.movementType === BrickMovementType.Horizontal && lastSizeScaleX) unscaledMoveRange /= lastSizeScaleX;
                else if (brick.movementType === BrickMovementType.Vertical && lastSizeScaleY) unscaledMoveRange /= lastSizeScaleY;
                
                clipboard.push({
                    x: brick.x, 
                    y: brick.y, 
                    width: brick.baseWidth ?? brick.width / (lastSizeScaleX || 1),
                    height: brick.baseHeight ?? brick.height / (lastSizeScaleY || 1),
                    angle: brick.angle, isKillBrick: brick.isKillBrick, movementType: brick.movementType,
                    moveRange: unscaledMoveRange, moveSpeed: brick.moveSpeed,
                });
            }
        }
    });

    setEditorState(prev => ({...prev, clipboard, contextMenu: null}));
    if (clipboard.length > 0) {
        showUIMessage(`Copied ${clipboard.length} brick(s).`, 1000);
    } else {
        showUIMessage("Cannot copy Player or Hole. Or selected brick not found.", 1000);
    }
  };

  const createButton = (text: string, onClickAction: () => void, disabled: boolean = false) => (
    <button
      onClick={onClickAction}
      disabled={disabled}
      className="block w-full text-left px-4 py-2 text-sm text-gray-700 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
  
  let menuItems: React.ReactNode[] = [];
  if (target.type === 'empty') {
    menuItems = [
      createButton('Add Static Brick', () => addBrick('static')),
      createButton('Add Kill Brick', () => addBrick('kill')),
      createButton('Add Vertical Mover', () => addBrick('vertical')),
      createButton('Add Horizontal Mover', () => addBrick('horizontal')),
    ];
  } else if (target.type === 'brick' && target.index !== undefined) {
    const brick = gameState.bricks[target.index];
    if (brick) {
      menuItems.push(createButton(brick.isKillBrick ? 'Make Normal Brick' : 'Make Kill Brick', () => toggleKillBrick(target.index!)));
      menuItems.push(<hr key="hr1" className="my-1" />);
      if (brick.movementType !== BrickMovementType.Vertical) {
        menuItems.push(createButton('Make Vertical Mover', () => setMovementType(target.index!, BrickMovementType.Vertical)));
      }
      if (brick.movementType !== BrickMovementType.Horizontal) {
        menuItems.push(createButton('Make Horizontal Mover', () => setMovementType(target.index!, BrickMovementType.Horizontal)));
      }
      if (brick.movementType !== null) {
        menuItems.push(createButton('Make Static', () => setMovementType(target.index!, null)));
      }
      menuItems.push(<hr key="hr2" className="my-1" />);
      menuItems.push(createButton('Copy', handleCopy, editorState.selectedItems.filter(si => si.type === 'brick').length === 0));
      menuItems.push(createButton('Delete Brick', () => deleteSingleBrick(target.index!)));
    }
  } else if (target.type === 'player' || target.type === 'hole') {
    menuItems.push(createButton('Cannot Delete Object', () => { 
        showUIMessage("Player and Hole cannot be deleted.", 1500); 
        setEditorState(prev => ({ ...prev, contextMenu: null }));
    }, true));
  }


  return (
    <div
      onMouseDown={(e) => e.stopPropagation()} // Prevent canvas mousedown when clicking on menu
      style={{ top: y, left: x }}
      className="absolute bg-white border border-gray-200 rounded-md shadow-lg p-1 min-w-[180px] z-40"
    >
      {menuItems}
    </div>
  );
};

export default ContextMenuComponent;
