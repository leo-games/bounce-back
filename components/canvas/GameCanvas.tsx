
import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, EditorState, SelectedItem, Point, Brick, ContextMenuTarget, DraggingHandle, BrickMovementType } from '../../types';
import * as Constants from '../../constants';
import { Vec } from '../../utils/vector';
import { getRectVertices, getBrickHandles, isPointInRotatedRect, getRectBoundingBox, doRectsOverlap } from '../../utils/geometry';
import { deepClone } from '../../utils/common';

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  showUIMessage: (text: string, duration?: number) => void;
  resetBall: (currentGameState: GameState) => void; // This prop updates App.tsx state and returns void
  saveHistoryState: (forceSave?: boolean) => void;
  isPointerOverUIRef: React.RefObject<boolean>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  canvasRef,
  gameState,
  setGameState,
  editorState,
  setEditorState,
  showUIMessage,
  resetBall,
  saveHistoryState,
  isPointerOverUIRef,
}) => {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const isTouchInteraction = useRef(false);

  // Drawing functions
  const drawHole = useCallback((ctx: CanvasRenderingContext2D) => {
    const isSelected = gameState.mode === 'editor' && editorState.selectedItems.some(item => item.type === 'hole');
    ctx.fillStyle = "#203649";
    ctx.beginPath();
    ctx.arc(gameState.hole.x, gameState.hole.y, gameState.hole.radius, 0, Math.PI * 2);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = Constants.SELECTED_ITEM_OUTLINE_COLOR;
      ctx.lineWidth = 2 * gameState.lastSizeScaleMin;
      ctx.stroke();
    }
  }, [gameState, editorState.selectedItems]);

  const drawBrick = useCallback((ctx: CanvasRenderingContext2D, brick: Brick, index: number) => {
    const isSelected = gameState.mode === 'editor' && editorState.selectedItems.some(item => item.type === 'brick' && item.index === index);
    ctx.save();
    const centerX = brick.x + brick.width / 2;
    const centerY = brick.y + brick.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(brick.angle || 0);
    ctx.translate(-centerX, -centerY);

    let fillColor = Constants.BRICK_COLOR;
    if (brick.isKillBrick) fillColor = Constants.KILL_BRICK_COLOR;
    else if (brick.movementType === BrickMovementType.Vertical) fillColor = Constants.VERTICAL_MOVER_COLOR;
    else if (brick.movementType === BrickMovementType.Horizontal) fillColor = Constants.HORIZONTAL_MOVER_COLOR;
    
    if (isSelected) fillColor = Constants.SELECTED_BRICK_COLOR;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = Constants.BRICK_STROKE_COLOR;
    ctx.lineWidth = Math.max(1, 1 * gameState.lastSizeScaleMin);
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    ctx.restore();
  }, [gameState, editorState.selectedItems]);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const isSelected = gameState.mode === 'editor' && editorState.selectedItems.some(item => item.type === 'player');
    const player = gameState.player;
    ctx.fillStyle = "#247c6b";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    const headX = player.x + player.width / 2;
    const headY = player.y - player.headRadius;
    ctx.fillStyle = "#38a98f";
    ctx.beginPath();
    ctx.arc(headX, headY, player.headRadius, 0, Math.PI * 2);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = Constants.SELECTED_ITEM_OUTLINE_COLOR;
      ctx.lineWidth = 2 * gameState.lastSizeScaleMin;
      ctx.strokeRect(player.x, player.y, player.width, player.height);
      ctx.beginPath();
      ctx.arc(headX, headY, player.headRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [gameState, editorState.selectedItems]);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = "#fffef9";
    ctx.strokeStyle = "#203649";
    ctx.lineWidth = gameState.scaledBallOutlineWidth;
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [gameState]);

  const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!editorState.aim.active || !gameState.ball.onPlayer) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gameState.ball.x, gameState.ball.y);
    const potentialVx = editorState.aim.dx;
    const potentialVy = editorState.aim.dy;
    // Use scaledAimLineLength for consistent visual representation of power,
    // but dx/dy are actual velocity components
    const aimLineVec = Vec.normalize(Vec.create(potentialVx, potentialVy));
    const displayLength = Vec.len(Vec.create(potentialVx,potentialVy)) * Constants.AIM_VISUAL_SCALE;

    const endX = gameState.ball.x + aimLineVec.x * displayLength;
    const endY = gameState.ball.y + aimLineVec.y * displayLength;
    
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "rgba(239, 106, 51, 0.82)";
    ctx.lineWidth = Math.max(1, 2 * gameState.lastSizeScaleMin);
    ctx.setLineDash([5 * gameState.lastSizeScaleMin, 3 * gameState.lastSizeScaleMin]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.arc(endX, endY, Math.max(1, 3 * gameState.lastSizeScaleMin), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(239, 106, 51, 0.88)";
    ctx.fill();
    ctx.restore();
  }, [gameState, editorState.aim]);

 const drawMovementRange = useCallback((ctx: CanvasRenderingContext2D, brick: Brick) => {
    const initialX = brick.initialX ?? brick.x;
    const initialY = brick.initialY ?? brick.y;
    const range = brick.moveRange;

    ctx.save();
    ctx.strokeStyle = Constants.MOVER_RANGE_INDICATOR_COLOR;
    ctx.lineWidth = Constants.MOVER_RANGE_INDICATOR_WIDTH * gameState.lastSizeScaleMin;
    ctx.setLineDash([4 * gameState.lastSizeScaleMin, 4 * gameState.lastSizeScaleMin]);
    ctx.beginPath();

    if (brick.movementType === BrickMovementType.Vertical) {
        const y1 = initialY - range + brick.height / 2;
        const y2 = initialY + range + brick.height / 2;
        const centerX = initialX + brick.width / 2;
        ctx.moveTo(centerX, y1);
        ctx.lineTo(centerX, y2);
        // End caps
        ctx.moveTo(centerX - 5 * gameState.lastSizeScaleMin, y1);
        ctx.lineTo(centerX + 5 * gameState.lastSizeScaleMin, y1);
        ctx.moveTo(centerX - 5 * gameState.lastSizeScaleMin, y2);
        ctx.lineTo(centerX + 5 * gameState.lastSizeScaleMin, y2);
    } else if (brick.movementType === BrickMovementType.Horizontal) {
        const x1 = initialX - range + brick.width / 2;
        const x2 = initialX + range + brick.width / 2;
        const centerY = initialY + brick.height / 2;
        ctx.moveTo(x1, centerY);
        ctx.lineTo(x2, centerY);
        // End caps
        ctx.moveTo(x1, centerY - 5 * gameState.lastSizeScaleMin);
        ctx.lineTo(x1, centerY + 5 * gameState.lastSizeScaleMin);
        ctx.moveTo(x2, centerY - 5 * gameState.lastSizeScaleMin);
        ctx.lineTo(x2, centerY + 5 * gameState.lastSizeScaleMin);
    }
    ctx.stroke();
    ctx.restore();
}, [gameState.lastSizeScaleMin]);


  const drawHandles = useCallback((ctx: CanvasRenderingContext2D, brick: Brick) => {
    const handles = getBrickHandles(brick, gameState.scaledRotateHandleOffset);
    const handleDrawSize = gameState.scaledHandleSize; // Actual radius for drawing
    
    ctx.fillStyle = Constants.HANDLE_COLOR;
    for (const type of ['tl', 'tr', 'bl', 'br'] as const) {
        ctx.fillRect(handles[type].x - handleDrawSize, handles[type].y - handleDrawSize, handleDrawSize * 2, handleDrawSize * 2);
    }
    
    ctx.beginPath();
    ctx.arc(handles.rotate.x, handles.rotate.y, handleDrawSize * Constants.ROTATE_HANDLE_SIZE_FACTOR, 0, Math.PI * 2);
    ctx.fill();

    // Line to rotate handle
    ctx.beginPath();
    ctx.moveTo(handles.center.x, handles.center.y);
    ctx.lineTo(handles.rotate.x, handles.rotate.y);
    ctx.strokeStyle = Constants.HANDLE_COLOR;
    ctx.lineWidth = Math.max(1, 1 * gameState.lastSizeScaleMin);
    ctx.setLineDash([2 * gameState.lastSizeScaleMin, 2 * gameState.lastSizeScaleMin]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [gameState.scaledRotateHandleOffset, gameState.scaledHandleSize, gameState.lastSizeScaleMin]);


  const drawEditorOverlays = useCallback((ctx: CanvasRenderingContext2D) => {
    if (editorState.selectedItems.length === 1 && editorState.selectedItems[0].type === 'brick') {
        const brickIndex = editorState.selectedItems[0].index;
        if (brickIndex !== null && brickIndex >=0 && brickIndex < gameState.bricks.length) {
            const brick = gameState.bricks[brickIndex];
            if (brick) {
                if (brick.movementType) {
                    drawMovementRange(ctx, brick);
                }
                drawHandles(ctx, brick);
            }
        }
    }
  }, [gameState.bricks, editorState.selectedItems, drawMovementRange, drawHandles]);


  // Main draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, Constants.CANVAS_BACKGROUND_COLOR);
    bgGradient.addColorStop(1, "#eaf6ff");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawHole(ctx);
    gameState.bricks.forEach((brick, index) => drawBrick(ctx, brick, index));
    drawPlayer(ctx);
    drawBall(ctx);

    if (gameState.mode === 'play') {
      drawAimLine(ctx);
    } else if (gameState.mode === 'editor') {
      drawEditorOverlays(ctx);
    }
  }, [canvasRef, gameState, editorState, drawHole, drawBrick, drawPlayer, drawBall, drawAimLine, drawEditorOverlays]);

  useEffect(() => {
    draw();
  }, [gameState, editorState, draw]); // Redraw whenever gameState or editorState changes

  // --- Event Handling Logic ---
  const getPointerPosition = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return { x: editorState.mouse.x, y: editorState.mouse.y }; // Fallback
      }
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const getItemAtPoint = useCallback((px: number, py: number): SelectedItem | null => {
    // Check bricks (last drawn is on top, so check in reverse)
    for (let i = gameState.bricks.length - 1; i >= 0; i--) {
        if (isPointInRotatedRect(px, py, gameState.bricks[i])) {
            return { type: 'brick', index: i };
        }
    }
    // Check player (body and head)
    const player = gameState.player;
    const headCenter = { x: player.x + player.width / 2, y: player.y - player.headRadius };
    const distSqToHead = Vec.lenSq(Vec.sub({ x: px, y: py }, headCenter));
    const isOverHead = distSqToHead <= (player.headRadius * player.headRadius);
    const isOverBody = px >= player.x && px <= player.x + player.width && py >= player.y && py <= player.y + player.height;
    if (isOverHead || isOverBody) {
        return { type: 'player', index: null };
    }
    // Check hole
    const distSqToHole = Vec.lenSq(Vec.sub({ x: px, y: py }, gameState.hole));
    if (distSqToHole <= (gameState.hole.radius * gameState.hole.radius)) {
        return { type: 'hole', index: null };
    }
    return null;
  }, [gameState]);

  const getHandleAtPoint = useCallback((px: number, py: number): DraggingHandle | null => {
    if (editorState.selectedItems.length !== 1 || editorState.selectedItems[0].type !== 'brick') return null;
    const brickIndex = editorState.selectedItems[0].index;
    if (brickIndex === null || brickIndex < 0 || brickIndex >= gameState.bricks.length) return null;
    
    const brick = gameState.bricks[brickIndex];
    const handles = getBrickHandles(brick, gameState.scaledRotateHandleOffset);
    const handleHitRadius = gameState.scaledHandleSize * 1.5; // Make handles easier to click

    if (Vec.lenSq(Vec.sub({ x: px, y: py }, handles.rotate)) <= (handleHitRadius * Constants.ROTATE_HANDLE_SIZE_FACTOR) ** 2) {
        return { type: 'rotate', itemRef: editorState.selectedItems[0], startBrickState: deepClone(brick) };
    }
    for (const type of ['tl', 'tr', 'bl', 'br'] as const) {
        if (Vec.lenSq(Vec.sub({ x: px, y: py }, handles[type])) <= handleHitRadius ** 2) {
            return { type: type, itemRef: editorState.selectedItems[0], startBrickState: deepClone(brick) };
        }
    }
    return null;
  }, [gameState, editorState.selectedItems]);

  const isPointOverSelection = useCallback((px: number, py: number): boolean => {
    return editorState.selectedItems.some(item => {
        if (item.type === 'brick' && item.index !== null) {
            const brick = gameState.bricks[item.index];
            return brick && isPointInRotatedRect(px, py, brick);
        } else if (item.type === 'player') {
            const player = gameState.player;
            const headCenter = { x: player.x + player.width / 2, y: player.y - player.headRadius };
            return (Vec.lenSq(Vec.sub({x:px,y:py}, headCenter)) <= player.headRadius**2) ||
                   (px >= player.x && px <= player.x + player.width && py >= player.y && py <= player.y + player.height);
        } else if (item.type === 'hole') {
            return Vec.lenSq(Vec.sub({x:px,y:py}, gameState.hole)) <= gameState.hole.radius**2;
        }
        return false;
    });
  }, [gameState, editorState.selectedItems]);
  
  const updateCursorStyle = useCallback((mx: number, my: number) => {
    if (isPointerOverUIRef.current || gameState.mode !== 'editor' || isTouchInteraction.current) {
        setEditorState(prev => ({...prev, cursorStyle: 'default'}));
        return;
    }
    let newCursor = 'default';
    if (editorState.draggingHandle) {
        newCursor = editorState.draggingHandle.type === 'rotate' ? 'grabbing' : (editorState.draggingHandle.type === 'tl' || editorState.draggingHandle.type === 'br') ? 'nwse-resize' : 'nesw-resize';
    } else if (editorState.isDraggingSelection) {
        newCursor = 'move';
    } else if (editorState.isMarqueeSelecting) {
        newCursor = 'crosshair';
    } else {
        const handle = getHandleAtPoint(mx, my);
        if (handle) {
            newCursor = handle.type === 'rotate' ? 'grab' : (handle.type === 'tl' || handle.type === 'br') ? 'nwse-resize' : 'nesw-resize';
        } else if (isPointOverSelection(mx, my)) {
            newCursor = 'move';
        } else if (getItemAtPoint(mx, my)) {
            newCursor = 'pointer';
        }
    }
    setEditorState(prev => ({...prev, cursorStyle: newCursor}));
  }, [gameState.mode, getHandleAtPoint, getItemAtPoint, isPointOverSelection, isPointerOverUIRef, editorState.draggingHandle, editorState.isDraggingSelection, editorState.isMarqueeSelecting, setEditorState]);


  // --- Unified Event Handlers ---
  const handlePointerDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    if (isPointerOverUIRef.current) return;

    isTouchInteraction.current = e.type.startsWith('touch');
    if (isTouchInteraction.current) {
        e.preventDefault(); // Prevent mouse event emulation
    }

    const { x: mx, y: my } = getPointerPosition(e);

    setEditorState(prev => ({ ...prev, mouse: { ...prev.mouse, x: mx, y: my, down: true, dragStartX: mx, dragStartY: my }, contextMenu: null }));

    // Long press for context menu on touch
    if (isTouchInteraction.current && gameState.mode === 'editor') {
        longPressTimeoutRef.current = window.setTimeout(() => {
            handleContextMenu(e);
            longPressTimeoutRef.current = null;
        }, 500); // 500ms for long press
    }

    if (gameState.mode === 'editor') {
        const ctrlPressed = e instanceof MouseEvent ? (e.ctrlKey || e.metaKey) : false; // No ctrl key on touch
        const clickedHandle = getHandleAtPoint(mx, my);

        if (clickedHandle) {
            saveHistoryState();
            setEditorState(prev => ({ ...prev, draggingHandle: clickedHandle, dragStart: { x: mx, y: my }, isDraggingSelection: false, isMarqueeSelecting: false }));
        } else {
            const clickedItem = getItemAtPoint(mx, my);
            let newSelectedItems = [...editorState.selectedItems];
            if (clickedItem) {
                const isAlreadySelected = editorState.selectedItems.some(sel => sel.type === clickedItem.type && sel.index === clickedItem.index);
                if (ctrlPressed) {
                    if (isAlreadySelected) {
                        newSelectedItems = newSelectedItems.filter(sel => !(sel.type === clickedItem.type && sel.index === clickedItem.index));
                    } else {
                        newSelectedItems.push(clickedItem);
                    }
                } else {
                    if (!isAlreadySelected || newSelectedItems.length > 1) {
                        newSelectedItems = [clickedItem];
                    }
                }
                setEditorState(prev => ({...prev, selectedItems: newSelectedItems}));

                if (isPointOverSelection(mx,my)) {
                    saveHistoryState();
                    setEditorState(prev => ({
                        ...prev,
                        isDraggingSelection: true,
                        dragStart: { x: mx, y: my },
                        originalItemStates: newSelectedItems.map(item => {
                            if (item.type === 'brick' && item.index !== null) return deepClone(gameState.bricks[item.index]);
                            if (item.type === 'player') return deepClone(gameState.player);
                            if (item.type === 'hole') return deepClone(gameState.hole);
                            return null;
                        }).filter(s => s !== null),
                        isMarqueeSelecting: false,
                    }));
                }

            } else { // Clicked on empty space
                if (!ctrlPressed) {
                     setEditorState(prev => ({...prev, selectedItems: []}));
                }
                setEditorState(prev => ({
                    ...prev,
                    isMarqueeSelecting: true,
                    marqueeStart: { x: mx, y: my },
                    marqueeEnd: { x: mx, y: my },
                    isDraggingSelection: false,
                }));
            }
        }
    } else { // Play mode
        if (gameState.ball.onPlayer) {
            setEditorState(prev => ({ ...prev, aim: { ...prev.aim, active: true } }));
            const aimVecRaw = Vec.sub({ x: mx, y: my }, { x: gameState.ball.x, y: gameState.ball.y });
            let aimPowerLength = Vec.len(aimVecRaw);
            aimPowerLength = Math.min(aimPowerLength, gameState.scaledAimLineLength);
            const power = Constants.AIM_POWER_FACTOR;
            const normAimVec = Vec.normalize(aimVecRaw);
            let finalVy = normAimVec.y * power;
            if (finalVy > Constants.MIN_AIM_VY) finalVy = Constants.MIN_AIM_VY;
            setEditorState(prev => ({...prev, aim: {...prev.aim, dx: normAimVec.x * power, dy: finalVy }}));
        }
    }
    updateCursorStyle(mx, my);
  }, [gameState, editorState, getItemAtPoint, getHandleAtPoint, saveHistoryState, isPointerOverUIRef, updateCursorStyle, isPointOverSelection, setEditorState]);

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!editorState.mouse.down) {
        if (!isTouchInteraction.current) {
            const { x: mx, y: my } = getPointerPosition(e);
            updateCursorStyle(mx, my);
        }
        return;
    }
    if (isPointerOverUIRef.current) return;
    
    if (isTouchInteraction.current) {
        e.preventDefault();
    }

    const { x: mx, y: my } = getPointerPosition(e);

    // If moving, cancel long press
    if (longPressTimeoutRef.current && Vec.lenSq(Vec.sub({x:mx, y:my}, {x: editorState.mouse.dragStartX, y: editorState.mouse.dragStartY})) > Constants.CLICK_THRESHOLD_SQ) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
    }

    setEditorState(prev => ({ ...prev, mouse: { ...prev.mouse, x: mx, y: my } }));

    if (gameState.mode === 'editor') {
        const dx = mx - editorState.dragStart.x;
        const dy = my - editorState.dragStart.y;

        if (editorState.draggingHandle) {
            const handleType = editorState.draggingHandle.type;
            const brickIndex = editorState.draggingHandle.itemRef.index;
            if (brickIndex === null) return;

            setGameState(prevGS => {
                const newBricks = [...prevGS.bricks];
                const brickToUpdate = deepClone(newBricks[brickIndex]);
                const origState = editorState.draggingHandle!.startBrickState;

                if (handleType === 'rotate') {
                    const center = getBrickHandles(origState, prevGS.scaledRotateHandleOffset).center;
                    const startAngleToMouse = Math.atan2(editorState.dragStart.y - center.y, editorState.dragStart.x - center.x);
                    const currentAngleToMouse = Math.atan2(my - center.y, mx - center.x);
                    brickToUpdate.angle = origState.angle + (currentAngleToMouse - startAngleToMouse);
                } else { // Resize handle
                    const origAngle = origState.angle || 0;
                    const cosA = Math.cos(-origAngle); const sinA = Math.sin(-origAngle);
                    const ocx = origState.x + origState.width / 2; const ocy = origState.y + origState.height / 2;
                    
                    const dxWorld = mx - ocx; const dyWorld = my - ocy;
                    const localMx = dxWorld * cosA - dyWorld * sinA;
                    const localMy = dxWorld * sinA + dyWorld * cosA;

                    let newHalfWidth, newHalfHeight;
                    switch (handleType) {
                        case 'br': newHalfWidth = localMx; newHalfHeight = localMy; break;
                        case 'bl': newHalfWidth = -localMx; newHalfHeight = localMy; break;
                        case 'tr': newHalfWidth = localMx; newHalfHeight = -localMy; break;
                        case 'tl': newHalfWidth = -localMx; newHalfHeight = -localMy; break;
                        default: return prevGS;
                    }
                    
                    newHalfWidth = Math.max(prevGS.scaledMinBrickDimension / 2, newHalfWidth);
                    newHalfHeight = Math.max(prevGS.scaledMinBrickDimension / 2, newHalfHeight);

                    const newWidth = 2 * newHalfWidth;
                    const newHeight = 2 * newHalfHeight;

                    let centerShiftXLocal = 0; let centerShiftYLocal = 0;
                    if (handleType === 'tl' || handleType === 'bl') centerShiftXLocal = (origState.width - newWidth) / 2;
                    else centerShiftXLocal = (newWidth - origState.width) / 2;
                    if (handleType === 'tl' || handleType === 'tr') centerShiftYLocal = (origState.height - newHeight) / 2;
                    else centerShiftYLocal = (newHeight - origState.height) / 2;
                    
                    const cosARot = Math.cos(origAngle); const sinARot = Math.sin(origAngle);
                    const centerShiftWorldX = centerShiftXLocal * cosARot - centerShiftYLocal * sinARot;
                    const centerShiftWorldY = centerShiftXLocal * sinARot + centerShiftYLocal * cosARot;

                    const newCx = ocx + centerShiftWorldX;
                    const newCy = ocy + centerShiftWorldY;
                    
                    brickToUpdate.x = newCx - newWidth / 2;
                    brickToUpdate.y = newCy - newHeight / 2;
                    brickToUpdate.width = newWidth;
                    brickToUpdate.height = newHeight;
                    brickToUpdate.baseWidth = newWidth / (prevGS.lastSizeScaleX || 1);
                    brickToUpdate.baseHeight = newHeight / (prevGS.lastSizeScaleY || 1);
                    if (brickToUpdate.initialX !== undefined) brickToUpdate.initialX = brickToUpdate.x;
                    if (brickToUpdate.initialY !== undefined) brickToUpdate.initialY = brickToUpdate.y;
                }
                newBricks[brickIndex] = brickToUpdate;
                return { ...prevGS, bricks: newBricks };
            });

        } else if (editorState.isDraggingSelection) {
            setGameState(prevGS => {
                const newBricks = [...prevGS.bricks];
                let newPlayer = { ...prevGS.player };
                let newHole = { ...prevGS.hole };

                editorState.selectedItems.forEach((item, i) => {
                    const origState = editorState.originalItemStates[i];
                    if (!origState) return;

                    if (item.type === 'brick' && item.index !== null) {
                        const brick = newBricks[item.index];
                        if (brick) {
                            brick.x = (origState as Brick).x + dx;
                            brick.y = (origState as Brick).y + dy;
                            if (brick.initialX !== undefined && (origState as Brick).initialX !== undefined) brick.initialX = (origState as Brick).initialX! + dx;
                            if (brick.initialY !== undefined && (origState as Brick).initialY !== undefined) brick.initialY = (origState as Brick).initialY! + dy;
                        }
                    } else if (item.type === 'player') {
                        newPlayer.x = (origState as Point).x + dx;
                        newPlayer.y = (origState as Point).y + dy;
                    } else if (item.type === 'hole') {
                        newHole.x = (origState as Point).x + dx;
                        newHole.y = (origState as Point).y + dy;
                    }
                });
                const finalState = { ...prevGS, bricks: newBricks, player: newPlayer, hole: newHole };
                if (editorState.selectedItems.some(it => it.type === 'player') && finalState.ball.onPlayer) {
                     resetBall(finalState);
                }
                return finalState;
            });
        } else if (editorState.isMarqueeSelecting) {
            setEditorState(prev => ({ ...prev, marqueeEnd: { x: mx, y: my } }));
        }
    } else { // Play mode
        if (editorState.aim.active && gameState.ball.onPlayer) {
            const aimVecRaw = Vec.sub({ x: mx, y: my }, { x: gameState.ball.x, y: gameState.ball.y });
            let aimPowerLength = Vec.len(aimVecRaw);
            aimPowerLength = Math.min(aimPowerLength, gameState.scaledAimLineLength);
            const power = Constants.AIM_POWER_FACTOR;
            const normAimVec = Vec.normalize(aimVecRaw);
            let finalVy = normAimVec.y * power;
            if (finalVy > Constants.MIN_AIM_VY) finalVy = Constants.MIN_AIM_VY;
            setEditorState(prev => ({...prev, aim: {...prev.aim, dx: normAimVec.x * power, dy: finalVy }}));
        }
    }
    if (!isPointerOverUIRef.current) updateCursorStyle(mx,my);
  }, [gameState, editorState, resetBall, isPointerOverUIRef, updateCursorStyle, setGameState, setEditorState]);

  const handlePointerUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (!editorState.mouse.down) return;
    if (isPointerOverUIRef.current && editorState.mouse.down) {
        // Let go over UI
    } else if (isPointerOverUIRef.current) {
        setEditorState(prev => ({ ...prev, mouse: { ...prev.mouse, down: false } }));
        return;
    }

    if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
    }

    const wasDraggingHandle = !!editorState.draggingHandle;
    const wasDraggingSelection = editorState.isDraggingSelection;

    setEditorState(prev => ({ ...prev, mouse: { ...prev.mouse, down: false } }));

    if (gameState.mode === 'editor') {
        if (wasDraggingHandle || wasDraggingSelection) {
            setGameState(prevGS => {
                const newBricks = prevGS.bricks.map((brick, idx) => {
                    if (editorState.selectedItems.some(sel => sel.type === 'brick' && sel.index === idx) || 
                        (editorState.draggingHandle && editorState.draggingHandle.itemRef.type === 'brick' && editorState.draggingHandle.itemRef.index === idx)
                    ) {
                        const updatedBrick = {...brick};
                        if (updatedBrick.movementType) {
                            updatedBrick.initialX = updatedBrick.x;
                            updatedBrick.initialY = updatedBrick.y;
                        }
                        return updatedBrick;
                    }
                    return brick;
                });
                return {...prevGS, bricks: newBricks};
            });
            saveHistoryState();
        }

        if (editorState.isMarqueeSelecting) {
            const marqueeRect = {
                x: Math.min(editorState.marqueeStart.x, editorState.marqueeEnd.x),
                y: Math.min(editorState.marqueeStart.y, editorState.marqueeEnd.y),
                width: Math.abs(editorState.marqueeStart.x - editorState.marqueeEnd.x),
                height: Math.abs(editorState.marqueeStart.y - editorState.marqueeEnd.y),
            };
            if (marqueeRect.width < Constants.CLICK_THRESHOLD_SQ && marqueeRect.height < Constants.CLICK_THRESHOLD_SQ) {
                // Simple click/tap handled in pointer down
            } else { // Proper marquee selection
                const newlySelected: SelectedItem[] = [];
                gameState.bricks.forEach((brick, index) => {
                    const brickBounds = getRectBoundingBox(brick);
                    if (doRectsOverlap(marqueeRect, brickBounds)) {
                        newlySelected.push({ type: 'brick', index: index });
                    }
                });
                const playerBounds = {x: gameState.player.x, y: gameState.player.y - gameState.player.headRadius, width: gameState.player.width, height: gameState.player.height + gameState.player.headRadius};
                if (doRectsOverlap(marqueeRect, playerBounds)) newlySelected.push({type:'player', index: null});
                const holeBounds = {x: gameState.hole.x - gameState.hole.radius, y: gameState.hole.y - gameState.hole.radius, width: gameState.hole.radius*2, height: gameState.hole.radius*2};
                if (doRectsOverlap(marqueeRect, holeBounds)) newlySelected.push({type:'hole', index: null});

                const ctrlPressed = e instanceof MouseEvent ? (e.ctrlKey || e.metaKey) : false;
                if (ctrlPressed) {
                    setEditorState(prev => {
                        const currentSelectionMap = new Map<string, SelectedItem>();
                        prev.selectedItems.forEach(item => currentSelectionMap.set(`${item.type}-${item.index}`, item));
                        newlySelected.forEach(newItem => {
                           const key = `${newItem.type}-${newItem.index}`;
                           if (!currentSelectionMap.has(key)) {
                                currentSelectionMap.set(key, newItem);
                           }
                        });
                        return {...prev, selectedItems: Array.from(currentSelectionMap.values())};
                    });
                } else {
                    setEditorState(prev => ({...prev, selectedItems: newlySelected}));
                }
            }
        }
        
        setEditorState(prev => ({
            ...prev,
            draggingHandle: null,
            isDraggingSelection: false,
            isMarqueeSelecting: false,
            originalItemStates: [],
        }));

    } else { // Play mode
        if (editorState.aim.active && gameState.ball.onPlayer) {
            if (Math.abs(editorState.aim.dx) > 0.01 || Math.abs(editorState.aim.dy) > 0.01) {
                setGameState(prev => ({ ...prev, ball: { ...prev.ball, fired: true, onPlayer: false, vx: editorState.aim.dx, vy: editorState.aim.dy } }));
            }
            setEditorState(prev => ({ ...prev, aim: { ...prev.aim, active: false } }));
        }
    }
    const { x: mx, y: my } = getPointerPosition(e);
    updateCursorStyle(mx, my);
    isTouchInteraction.current = false; // Reset on up
  }, [gameState, editorState, updateCursorStyle, saveHistoryState, setGameState, setEditorState, isPointerOverUIRef]);

  const handleContextMenu = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (isPointerOverUIRef.current) return;
    
    const { x: clientX, y: clientY } = (e instanceof MouseEvent) 
        ? { x: e.clientX, y: e.clientY }
        : { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };

    const { x: mx, y: my } = getPointerPosition(e);

    if (gameState.mode === 'editor') {
        let target: ContextMenuTarget | null = null;
        const itemAtPoint = getItemAtPoint(mx, my);
        if (itemAtPoint) {
            target = { type: itemAtPoint.type, index: itemAtPoint.index, x: mx, y: my };
            const isAlreadySelected = editorState.selectedItems.some(sel => sel.type === itemAtPoint.type && sel.index === itemAtPoint.index);
            if (!isAlreadySelected) {
                 setEditorState(prev => ({...prev, selectedItems: [itemAtPoint]}));
            }
        } else {
            target = { type: 'empty', x: mx, y: my };
            const ctrlPressed = e instanceof MouseEvent ? (e.ctrlKey || e.metaKey) : false;
            if (!ctrlPressed) {
                setEditorState(prev => ({...prev, selectedItems: []}));
            }
        }
        setEditorState(prev => ({ ...prev, contextMenu: { x: clientX, y: clientY, target } }));
    }
  }, [gameState.mode, getItemAtPoint, editorState.selectedItems, isPointerOverUIRef, setEditorState]);

  const handlePointerLeave = useCallback((e: MouseEvent | TouchEvent) => {
    if(editorState.mouse.down) { 
        setEditorState(prev => ({
            ...prev, 
            mouse: {...prev.mouse, down: false},
            draggingHandle: null,
            isDraggingSelection: false,
            aim: {...prev.aim, active: false}
        }));
    }
    if (editorState.aim.active) {
        setEditorState(prev => ({...prev, aim: {...prev.aim, active: false}}));
    }
    setEditorState(prev => ({...prev, cursorStyle: 'default'}));
    isTouchInteraction.current = false;
  }, [editorState.mouse.down, editorState.aim.active, setEditorState]);


  // Keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isPointerOverUIRef.current) return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable) ) {
      return;
    }
    
    if (gameState.mode !== 'editor') return;

    const ctrlPressed = e.ctrlKey || e.metaKey;

    if (ctrlPressed && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'v')) {
        return;
    }
    else if ((e.key === "Delete" || e.key === "Backspace") && editorState.selectedItems.length > 0) {
        e.preventDefault();
        const containsNonBrick = editorState.selectedItems.some(item => item.type !== 'brick');
        if (containsNonBrick) {
            showUIMessage("Player/Hole cannot be deleted with Delete key. Use context menu if applicable.", 2500);
        }

        saveHistoryState();
        setGameState(prevGS => {
            const bricksToDeleteIndices = editorState.selectedItems
                .filter(item => item.type === 'brick' && item.index !== null)
                .map(item => item.index!);

            if (bricksToDeleteIndices.length === 0 && containsNonBrick) return prevGS;
            if (bricksToDeleteIndices.length === 0 && !containsNonBrick) return prevGS;

            const newBricks = prevGS.bricks.filter((_, index) => !bricksToDeleteIndices.includes(index));
            return {...prevGS, bricks: newBricks };
        });
        setEditorState(prevES => ({...prevES, selectedItems: []})); 
        if (!containsNonBrick && editorState.selectedItems.length > 0){
             showUIMessage(`Deleted ${editorState.selectedItems.length} brick(s).`);
        }

    } else {
        let dx = 0, dy = 0;
        const nudge = e.shiftKey ? Constants.NUDGE_AMOUNT * 5 : Constants.NUDGE_AMOUNT;
        switch (e.key) {
            case "ArrowUp": dy = -nudge; break;
            case "ArrowDown": dy = nudge; break;
            case "ArrowLeft": dx = -nudge; break;
            case "ArrowRight": dx = nudge; break;
            default: return;
        }
        if (dx !== 0 || dy !== 0) {
            e.preventDefault();
            if (editorState.selectedItems.length > 0) {
                if (!editorState.isNudging) {
                    saveHistoryState();
                    setEditorState(prev => ({...prev, isNudging: true}));
                }
                setGameState(prevGS => {
                    const newBricks = [...prevGS.bricks];
                    let newPlayer = {...prevGS.player};
                    let newHole = {...prevGS.hole};
                    editorState.selectedItems.forEach(item => {
                        if (item.type === 'brick' && item.index !== null) {
                            const brick = newBricks[item.index];
                            if(brick) {
                                brick.x += dx; brick.y += dy;
                                if(brick.initialX !== undefined) brick.initialX += dx;
                                if(brick.initialY !== undefined) brick.initialY += dy;
                            }
                        } else if (item.type === 'player') {
                            newPlayer.x += dx; newPlayer.y += dy;
                        } else if (item.type === 'hole') {
                            newHole.x += dx; newHole.y += dy;
                        }
                    });
                    const finalState = { ...prevGS, bricks: newBricks, player: newPlayer, hole: newHole };
                    if (editorState.selectedItems.some(it => it.type === 'player') && finalState.ball.onPlayer) {
                         resetBall(finalState);
                    }
                    return finalState;
                });
            }
        }
    }
  }, [gameState.mode, editorState.selectedItems, editorState.isNudging, saveHistoryState, showUIMessage, resetBall, isPointerOverUIRef, setGameState, setEditorState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
     if (isPointerOverUIRef.current) return;
     const activeEl = document.activeElement;
     if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable) ) {
       return;
     }
     if (gameState.mode !== 'editor') return;

     if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (editorState.isNudging) {
            setEditorState(prev => ({...prev, isNudging: false}));
        }
    }
  }, [gameState.mode, editorState.isNudging, isPointerOverUIRef, setEditorState]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use passive: false for touch events to allow preventDefault
    const eventOptions = { passive: false };

    // Pointer events
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown, eventOptions);
    
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('touchmove', handlePointerMove, eventOptions);

    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp, eventOptions);

    // Other events
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mouseleave', handlePointerLeave);
    canvas.addEventListener('touchcancel', handlePointerLeave);
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mouseleave', handlePointerLeave);
      canvas.removeEventListener('touchcancel', handlePointerLeave);

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu, handlePointerLeave, handleKeyDown, handleKeyUp, canvasRef]);
  
  useEffect(() => {
    if (canvasRef.current) {
        canvasRef.current.style.cursor = editorState.cursorStyle;
    }
  }, [editorState.cursorStyle, canvasRef]);

  return <canvas ref={canvasRef} className="w-full h-full outline-none" tabIndex={0} />; // Added tabIndex for keyboard events if needed directly on canvas
};

export default GameCanvas;
