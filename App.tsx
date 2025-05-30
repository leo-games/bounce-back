
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, EditorState, LevelData, SelectedItem, Point, Brick, Player, Hole, ContextMenuState, ContextMenuTarget, DraggingHandle, GameHistoryEntry, BrickMovementType } from './types';
import *_constants from './constants'; // Import all constants
import { Vec } from './utils/vector';
import { getRectVertices, getRectAxes, projectShapeOntoAxis, projectCircleOntoAxis, checkCircleRectCollision, isPointInRotatedRect, getBrickHandles, getRectBoundingBox, doRectsOverlap } from './utils/geometry';
import { deepClone, sanitizeFilename, statesAreEqual } from './utils/common';
import GameCanvas from './components/canvas/GameCanvas';
import StartMenu from './components/menu/StartMenu';
import GameMenu from './components/menu/GameMenu';
import ContextMenuComponent from './components/ui/ContextMenuComponent';
import MessageBox from './components/ui/MessageBox';
import MarqueeBox from './components/ui/MarqueeBox';

// Destructure constants for easier use
const {
    BASE_PLAYER_WIDTH, BASE_PLAYER_HEIGHT, BASE_PLAYER_HEAD_RADIUS, BASE_BALL_RADIUS, BASE_HOLE_RADIUS,
    BASE_AIM_LINE_LENGTH, AIM_POWER_FACTOR, AIM_VISUAL_SCALE, MIN_AIM_VY, BASE_HANDLE_SIZE,
    BASE_ROTATE_HANDLE_OFFSET, ROTATE_HANDLE_SIZE_FACTOR, BASE_MIN_BRICK_DIMENSION,
    COLLISION_PUSH_FACTOR, BASE_PLAYER_DEFAULT_BOTTOM_OFFSET, BASE_HOLE_DEFAULT_Y,
    BASE_BALL_OUTLINE_WIDTH, NUDGE_AMOUNT, PASTE_OFFSET, MAX_HISTORY, MESSAGE_DISPLAY_TIME_MS,
    BASE_DEFAULT_MOVE_RANGE, DEFAULT_MOVE_SPEED, CLICK_THRESHOLD_SQ,
    DEFAULT_LEVEL_FILES, FALLBACK_CANVAS_WIDTH, FALLBACK_CANVAS_HEIGHT, LOCAL_STORAGE_LEVELS_KEY
} = _constants;


const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showMenuUI, setShowMenuUI] = useState<boolean>(false); // Controls visibility of the main GameMenu
  const [levels, setLevels] = useState<LevelData[]>([]);
  
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initial default state, will be properly initialized by level loading
    const initialSizeScale = 1; // Assume 1 initially
    return {
      player: { x: 0, y: 0, width: BASE_PLAYER_WIDTH * initialSizeScale, height: BASE_PLAYER_HEIGHT * initialSizeScale, headRadius: BASE_PLAYER_HEAD_RADIUS * initialSizeScale },
      ball: { x: 0, y: 0, radius: BASE_BALL_RADIUS * initialSizeScale, vx: 0, vy: 0, fired: false, onPlayer: true },
      hole: { x: 0, y: 0, radius: BASE_HOLE_RADIUS * initialSizeScale },
      bricks: [],
      currentLevelIndex: 0,
      mode: 'editor',
      scaledPlayerBottomOffset: BASE_PLAYER_DEFAULT_BOTTOM_OFFSET * initialSizeScale,
      scaledMinBrickDimension: BASE_MIN_BRICK_DIMENSION * initialSizeScale,
      scaledHandleSize: BASE_HANDLE_SIZE * initialSizeScale,
      scaledRotateHandleOffset: BASE_ROTATE_HANDLE_OFFSET * initialSizeScale,
      scaledAimLineLength: BASE_AIM_LINE_LENGTH * initialSizeScale,
      scaledBallOutlineWidth: BASE_BALL_OUTLINE_WIDTH * initialSizeScale,
      lastSizeScaleX: initialSizeScale,
      lastSizeScaleY: initialSizeScale,
      lastSizeScaleMin: initialSizeScale,
    };
  });

  const [editorState, setEditorState] = useState<EditorState>({
    selectedItems: [],
    draggingHandle: null,
    dragStart: { x: 0, y: 0 },
    originalItemStates: [],
    mouse: { x: 0, y: 0, down: false, dragStartX: 0, dragStartY: 0 },
    aim: { dx: 0, dy: 0, active: false },
    isMarqueeSelecting: false,
    marqueeStart: { x: 0, y: 0 },
    marqueeEnd: { x: 0, y: 0 },
    isDraggingSelection: false,
    clipboard: [],
    history: [],
    historyIndex: -1,
    isNudging: false,
    contextMenu: null,
    isUpdatingPropertiesFromInput: false,
    cursorStyle: 'default',
  });

  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isPointerOverUIRef = useRef(false); // To track if mouse is over UI elements like GameMenu

  // --- Utility functions that might rely on state or refs ---
  const showUIMessage = useCallback((text: string, duration: number = MESSAGE_DISPLAY_TIME_MS) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage({ text, id: Date.now() });
    if (duration > 0) {
      messageTimeoutRef.current = window.setTimeout(() => {
        setMessage(null);
      }, duration);
    }
  }, []);

  const hideUIMessage = useCallback(() => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage(null);
  }, []);


  // --- Level Management ---
  const createDefaultLevelData = useCallback((levelIndex: number = 0): LevelData => {
    const fallbackWidth = FALLBACK_CANVAS_WIDTH;
    const fallbackHeight = FALLBACK_CANVAS_HEIGHT;
    const centerX = fallbackWidth / 2;
    const fallbackBricks: Brick[] = [
      { x: centerX - 150, y: 300, width: 200, height: 15, angle: -Math.PI / 16, isKillBrick: false, movementType: null, moveRange: BASE_DEFAULT_MOVE_RANGE, moveSpeed: DEFAULT_MOVE_SPEED, baseWidth: 200, baseHeight: 15 },
      { x: centerX - 50, y: 180, width: 100, height: 15, angle: 0, isKillBrick: false, movementType: BrickMovementType.Horizontal, moveRange: 80, moveSpeed: 1.5, initialX: centerX - 50, initialY: 180, baseWidth: 100, baseHeight: 15 },
      { x: centerX + 150 - (15/2), y: 250, width: 15, height: 80, angle: 0, isKillBrick: true, movementType: BrickMovementType.Vertical, moveRange: 40, moveSpeed: 0.8, initialX: centerX + 150 - (15/2), initialY: 250, baseWidth: 15, baseHeight: 80 }
    ];
    return {
      name: `Fallback Level ${levelIndex + 1}`,
      savedCanvasWidth: fallbackWidth,
      savedCanvasHeight: fallbackHeight,
      bricks: fallbackBricks,
      player: { x: centerX - (BASE_PLAYER_WIDTH / 2), y: fallbackHeight - BASE_PLAYER_DEFAULT_BOTTOM_OFFSET },
      hole: { x: centerX, y: BASE_HOLE_DEFAULT_Y }
    };
  }, []);

  const validateAndDefaultLevel = useCallback((lvl: Partial<LevelData>, index: number): LevelData => {
    const defaultLvl = createDefaultLevelData(index);
    
    let playerX = lvl.player?.x ?? defaultLvl.player.x;
    let playerY = lvl.player?.y ?? defaultLvl.player.y;
    let holeX = lvl.hole?.x ?? defaultLvl.hole.x;
    let holeY = lvl.hole?.y ?? defaultLvl.hole.y;

    const savedW = lvl.savedCanvasWidth || defaultLvl.savedCanvasWidth;
    const savedH = lvl.savedCanvasHeight || defaultLvl.savedCanvasHeight;

    // Sanitize player/hole coordinates if they are excessively out of bounds
    const coordBoundFactor = 3; // Allow items to be up to 2x canvas dimension off-screen
    if (typeof playerX === 'number' && (playerX < -savedW * (coordBoundFactor-1) || playerX > savedW * coordBoundFactor)) {
        console.warn(`Player X coordinate ${playerX} for level "${lvl.name || index+1}" is out of bounds (savedW: ${savedW}). Resetting to default.`);
        playerX = defaultLvl.player.x;
    }
    if (typeof playerY === 'number' && (playerY < -savedH * (coordBoundFactor-1) || playerY > savedH * coordBoundFactor)) {
        console.warn(`Player Y coordinate ${playerY} for level "${lvl.name || index+1}" is out of bounds (savedH: ${savedH}). Resetting to default.`);
        playerY = defaultLvl.player.y;
    }
     if (typeof holeX === 'number' && (holeX < -savedW * (coordBoundFactor-1) || holeX > savedW * coordBoundFactor)) {
        console.warn(`Hole X coordinate ${holeX} for level "${lvl.name || index+1}" is out of bounds (savedW: ${savedW}). Resetting to default.`);
        holeX = defaultLvl.hole.x;
    }
    if (typeof holeY === 'number' && (holeY < -savedH * (coordBoundFactor-1) || holeY > savedH * coordBoundFactor)) {
        console.warn(`Hole Y coordinate ${holeY} for level "${lvl.name || index+1}" is out of bounds (savedH: ${savedH}). Resetting to default.`);
        holeY = defaultLvl.hole.y;
    }

    const validatedLvl: LevelData = {
        name: lvl.name || defaultLvl.name,
        savedCanvasWidth: savedW,
        savedCanvasHeight: savedH,
        player: { x: playerX, y: playerY },
        hole: { x: holeX, y: holeY },
        bricks: Array.isArray(lvl.bricks) ? lvl.bricks.map((brick, brickIndex) => {
            const defaultBrick = defaultLvl.bricks[brickIndex] || defaultLvl.bricks[0] || {} as Brick; 
            const validatedBrick: Brick = {
                x: brick.x ?? defaultBrick.x ?? (FALLBACK_CANVAS_WIDTH / 2 - 50),
                y: brick.y ?? defaultBrick.y ?? (FALLBACK_CANVAS_HEIGHT / 2),
                width: brick.width ?? defaultBrick.width ?? 100,
                height: brick.height ?? defaultBrick.height ?? 20,
                angle: brick.angle || 0,
                isKillBrick: brick.isKillBrick || false,
                movementType: brick.movementType || null,
                moveRange: brick.moveRange ?? BASE_DEFAULT_MOVE_RANGE,
                moveSpeed: brick.moveSpeed ?? DEFAULT_MOVE_SPEED,
                initialX: brick.initialX, 
                initialY: brick.initialY,
                baseWidth: brick.width ?? defaultBrick.width ?? 100, 
                baseHeight: brick.height ?? defaultBrick.height ?? 20,
            };
            if (validatedBrick.movementType && (validatedBrick.initialX === undefined || validatedBrick.initialY === undefined)) {
                validatedBrick.initialX = validatedBrick.x;
                validatedBrick.initialY = validatedBrick.y;
            }
            return validatedBrick;
        }) : defaultLvl.bricks,
    };
    return validatedLvl;
  }, [createDefaultLevelData]);
  
  const resetBall = useCallback((currentGameState: GameState): Partial<GameState> => {
    const newBallX = currentGameState.player.x + currentGameState.player.width / 2;
    const newBallY = currentGameState.player.y - currentGameState.ball.radius - (2 * currentGameState.lastSizeScaleMin); // Small gap
    return {
      ball: {
        ...currentGameState.ball,
        x: newBallX,
        y: newBallY,
        vx: 0,
        vy: 0,
        fired: false,
        onPlayer: true,
      },
    };
  }, []);

  const resetEditorSelectionAndHistory = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      selectedItems: [],
      draggingHandle: null,
      isDraggingSelection: false,
      isMarqueeSelecting: false,
      originalItemStates: [],
      history: [],
      historyIndex: -1,
      contextMenu: null,
    }));
  }, []);

  const loadLevelData = useCallback((levelIndex: number, currentLevels: LevelData[], canvasWidthParam: number, canvasHeightParam: number) => {
    console.log(`[LoadLevelData] Attempting to load level index: ${levelIndex}. Canvas: ${canvasWidthParam}x${canvasHeightParam}`);
    const actualCanvasWidth = Math.max(1, canvasWidthParam); 
    const actualCanvasHeight = Math.max(1, canvasHeightParam);

    if (levelIndex < 0 || levelIndex >= currentLevels.length) {
        console.error(`[LoadLevelData] Invalid level index: ${levelIndex}. Max index: ${currentLevels.length - 1}.`);
        levelIndex = 0;
        if (currentLevels.length === 0) {
            console.warn("[LoadLevelData] No levels exist, creating default level 0.");
            currentLevels.push(createDefaultLevelData(0)); 
        }
    }
    const levelData = currentLevels[levelIndex];
    if (!levelData || !levelData.bricks || !levelData.player || !levelData.hole) {
        showUIMessage(`Error: Corrupted data for Level ${levelIndex + 1}. Loading fallback.`, 3000);
        console.error(`[LoadLevelData] Corrupted level data structure for index ${levelIndex}:`, levelData);
        currentLevels[levelIndex] = validateAndDefaultLevel({}, levelIndex); // Force full default
        // Recursive call to ensure state is set based on the new (fallback) data
        // Note: This structure assumes setGameState happens outside or after this recursive call resolves if it were to return data
        loadLevelData(levelIndex, currentLevels, actualCanvasWidth, actualCanvasHeight); 
        return; 
    }
    console.log(`[LoadLevelData] Loading validated level: "${levelData.name}". Saved Dims: ${levelData.savedCanvasWidth}x${levelData.savedCanvasHeight}`);
    console.log(`[LoadLevelData] Player original (rel to saved): x=${levelData.player.x}, y=${levelData.player.y}`);
    console.log(`[LoadLevelData] Hole original (rel to saved): x=${levelData.hole.x}, y=${levelData.hole.y}`);


    const positionReferenceWidth = levelData.savedCanvasWidth || FALLBACK_CANVAS_WIDTH;
    const positionReferenceHeight = levelData.savedCanvasHeight || FALLBACK_CANVAS_HEIGHT;
    const positionScaleX = actualCanvasWidth / positionReferenceWidth;
    const positionScaleY = actualCanvasHeight / positionReferenceHeight;

    if (Math.abs(positionScaleX) > 10 || (Math.abs(positionScaleX) < 0.1 && positionScaleX !== 0) || 
        Math.abs(positionScaleY) > 10 || (Math.abs(positionScaleY) < 0.1 && positionScaleY !== 0)) {
        console.warn(`[LoadLevelData] Extreme positionScale factors: X=${positionScaleX.toFixed(3)}, Y=${positionScaleY.toFixed(3)}. Canvas: ${actualCanvasWidth}x${actualCanvasHeight}, Ref: ${positionReferenceWidth}x${positionReferenceHeight}`);
    }


    const sizeReferenceWidth = FALLBACK_CANVAS_WIDTH;
    const sizeReferenceHeight = FALLBACK_CANVAS_HEIGHT;
    const sizeScaleX = actualCanvasWidth / sizeReferenceWidth;
    const sizeScaleY = actualCanvasHeight / sizeReferenceHeight;
    const sizeScaleMin = Math.min(sizeScaleX, sizeScaleY);

    const newGameState: GameState = {
        ...gameState, 
        currentLevelIndex: levelIndex,
        lastSizeScaleX: sizeScaleX,
        lastSizeScaleY: sizeScaleY,
        lastSizeScaleMin: sizeScaleMin,
        scaledPlayerBottomOffset: BASE_PLAYER_DEFAULT_BOTTOM_OFFSET * sizeScaleY,
        scaledMinBrickDimension: BASE_MIN_BRICK_DIMENSION * sizeScaleMin,
        scaledHandleSize: BASE_HANDLE_SIZE * sizeScaleMin,
        scaledRotateHandleOffset: BASE_ROTATE_HANDLE_OFFSET * sizeScaleMin,
        scaledAimLineLength: BASE_AIM_LINE_LENGTH * sizeScaleMin,
        scaledBallOutlineWidth: BASE_BALL_OUTLINE_WIDTH * sizeScaleMin, 
        
        player: {
            x: (levelData.player.x || positionReferenceWidth / 2) * positionScaleX,
            y: (levelData.player.y || positionReferenceHeight - BASE_PLAYER_DEFAULT_BOTTOM_OFFSET) * positionScaleY,
            width: BASE_PLAYER_WIDTH * sizeScaleX,
            height: BASE_PLAYER_HEIGHT * sizeScaleY,
            headRadius: BASE_PLAYER_HEAD_RADIUS * sizeScaleMin,
        },
        hole: {
            x: (levelData.hole.x || positionReferenceWidth / 2) * positionScaleX,
            y: (levelData.hole.y || BASE_HOLE_DEFAULT_Y) * positionScaleY,
            radius: BASE_HOLE_RADIUS * sizeScaleMin,
        },
        ball: {
            ...(gameState.ball), 
            radius: BASE_BALL_RADIUS * sizeScaleMin,
            vx: 0, vy: 0, fired: false, onPlayer: true, 
            x:0, y:0 
        },
        bricks: levelData.bricks.map(brickData => {
            const unscaledX = brickData.x;
            const unscaledY = brickData.y;
            const unscaledWidth = brickData.baseWidth ?? brickData.width; 
            const unscaledHeight = brickData.baseHeight ?? brickData.height;
            const unscaledInitialX = brickData.initialX !== undefined ? brickData.initialX : unscaledX;
            const unscaledInitialY = brickData.initialY !== undefined ? brickData.initialY : unscaledY;
            const unscaledMoveRange = brickData.moveRange;

            const scaledX = unscaledX * positionScaleX;
            const scaledY = unscaledY * positionScaleY;
            const scaledInitialX = unscaledInitialX * positionScaleX;
            const scaledInitialY = unscaledInitialY * positionScaleY;

            const scaledWidth = Math.max(BASE_MIN_BRICK_DIMENSION * sizeScaleMin, unscaledWidth * sizeScaleX);
            const scaledHeight = Math.max(BASE_MIN_BRICK_DIMENSION * sizeScaleMin, unscaledHeight * sizeScaleY);
            
            let scaledMoveRange = unscaledMoveRange;
            if (brickData.movementType === BrickMovementType.Horizontal) {
                scaledMoveRange *= sizeScaleX;
            } else if (brickData.movementType === BrickMovementType.Vertical) {
                scaledMoveRange *= sizeScaleY;
            }

            return {
                ...brickData,
                x: scaledX, y: scaledY,
                width: scaledWidth, height: scaledHeight,
                initialX: scaledInitialX, initialY: scaledInitialY,
                moveRange: scaledMoveRange,
                baseWidth: unscaledWidth, 
                baseHeight: unscaledHeight,
            };
        }),
    };
    
    console.log(`[LoadLevelData] Player scaled: x=${newGameState.player.x.toFixed(2)}, y=${newGameState.player.y.toFixed(2)}`);
    console.log(`[LoadLevelData] Hole scaled: x=${newGameState.hole.x.toFixed(2)}, y=${newGameState.hole.y.toFixed(2)}`);
    
    const ballResetState = resetBall(newGameState);
    newGameState.ball = {...newGameState.ball, ...ballResetState.ball };

    setGameState(newGameState); 
    
    setEditorState(prev => ({ 
      ...prev,
      selectedItems: [],
      draggingHandle: null,
      isDraggingSelection: false,
      isMarqueeSelecting: false,
      originalItemStates: [],
      contextMenu: null, 
    }));
    console.log("[LoadLevelData] Level loading complete.");
  }, [gameState, createDefaultLevelData, validateAndDefaultLevel, resetBall, showUIMessage ]);


  const saveLevelsToStorage = useCallback((currentLevels: LevelData[]) => {
    try {
      const levelsToSave = deepClone(currentLevels);
      levelsToSave.forEach(level => {
        if (!level.bricks || !level.player || !level.hole || !level.savedCanvasWidth) {
          console.warn("Attempting to save incomplete level structure:", level);
        }
      });
      localStorage.setItem(LOCAL_STORAGE_LEVELS_KEY, JSON.stringify(levelsToSave));
    } catch (e) {
      console.error("Failed to save levels to localStorage:", e);
      showUIMessage("Error saving levels. Storage might be full.", 3000);
    }
  }, [showUIMessage]);

  const loadLevelsFromStorage = useCallback(async () => {
    let loadedLevels: LevelData[] = [];
    const storedLevels = localStorage.getItem(LOCAL_STORAGE_LEVELS_KEY);
    let loadedFromStorage = false;

    if (storedLevels) {
        try {
            const parsedLevels = JSON.parse(storedLevels) as Partial<LevelData>[];
            if (Array.isArray(parsedLevels) && parsedLevels.length > 0 && parsedLevels[0]?.bricks && parsedLevels[0]?.player && parsedLevels[0]?.hole && parsedLevels[0]?.savedCanvasWidth) {
                loadedLevels = parsedLevels.map((lvl, index) => validateAndDefaultLevel(lvl, index));
                loadedFromStorage = true;
                console.log("[App] Loaded levels from localStorage.");
            } else {
                 console.warn("[App] Invalid level structure in localStorage. Will fetch defaults.");
            }
        } catch (e) { 
            console.error("Failed to parse levels from localStorage:", e);
            showUIMessage("Error loading saved levels. Using defaults.", 3000);
        }
    }

    if (!loadedFromStorage) {
        console.log("[App] No valid levels in localStorage or parse error, fetching default levels...");
        try {
            const responses = await Promise.all(DEFAULT_LEVEL_FILES.map(url => fetch(url)));
            const fetchedLevelDataPromises = responses.map(async (res, idx) => {
                if (!res.ok) {
                    console.warn(`Failed to fetch default level: ${DEFAULT_LEVEL_FILES[idx]} (${res.statusText}). Using fallback.`);
                    return createDefaultLevelData(idx); 
                }
                try {
                    const jsonData = await res.json();
                    return validateAndDefaultLevel(jsonData, idx);
                } catch (e) {
                    console.warn(`Failed to parse JSON for ${DEFAULT_LEVEL_FILES[idx]}. Using fallback.`, e);
                    return createDefaultLevelData(idx);
                }
            });
            loadedLevels = await Promise.all(fetchedLevelDataPromises);
            if (loadedLevels.length > 0) {
                console.log(`[App] Successfully fetched and validated ${loadedLevels.length} default levels.`);
                saveLevelsToStorage(loadedLevels);
            } else {
                throw new Error("Fetched default level data was empty or all failed.");
            }
        } catch (fetchError) {
            console.error("Failed to fetch or process default levels:", fetchError);
            showUIMessage("Could not load default levels. Using fallback.", 3000);
            loadedLevels = [createDefaultLevelData(0)];
        }
    }
    
    if (loadedLevels.length === 0) {
        console.warn("[App] Level loading resulted in empty array, creating one fallback level.");
        loadedLevels = [createDefaultLevelData(0)];
    }
    setLevels(loadedLevels);

    // Initial loadLevelData is deferred to an effect after gameStarted=true and canvas is ready.
    // This ensures dimensions are available.
    if (gameStarted && canvasRef.current && canvasContainerRef.current && loadedLevels.length > 0) {
        console.log("[App loadLevelsFromStorage] Game already started, attempting to load level 0 data.");
        loadLevelData(0, loadedLevels, canvasContainerRef.current.offsetWidth, canvasContainerRef.current.offsetHeight);
    } else {
         console.log("[App loadLevelsFromStorage] Levels loaded. Game not started or canvas not ready for immediate level data load.");
    }
  }, [validateAndDefaultLevel, createDefaultLevelData, saveLevelsToStorage, showUIMessage, loadLevelData, gameStarted]); // Added gameStarted


  // --- History Management ---
  const getCurrentHistorySnapshot = useCallback((currentGameState: GameState): GameHistoryEntry => {
    return {
      bricks: deepClone(currentGameState.bricks),
      player: deepClone(currentGameState.player),
      hole: deepClone(currentGameState.hole),
      scaledPlayerBottomOffset: currentGameState.scaledPlayerBottomOffset,
      scaledMinBrickDimension: currentGameState.scaledMinBrickDimension,
      scaledHandleSize: currentGameState.scaledHandleSize,
      scaledRotateHandleOffset: currentGameState.scaledRotateHandleOffset,
      scaledAimLineLength: currentGameState.scaledAimLineLength,
      scaledBallOutlineWidth: currentGameState.scaledBallOutlineWidth,
      lastSizeScaleX: currentGameState.lastSizeScaleX,
      lastSizeScaleY: currentGameState.lastSizeScaleY,
      lastSizeScaleMin: currentGameState.lastSizeScaleMin,
    };
  }, []);
  
  const saveHistoryState = useCallback((
    forceSave: boolean = false, 
    currentGameState: GameState, 
    currentEditorState: EditorState
  ) => {
    if (currentGameState.mode !== 'editor') return;
    if (!forceSave && currentEditorState.isNudging) return;

    const newHistoryEntry = getCurrentHistorySnapshot(currentGameState);
    
    setEditorState(prev => {
        if (!forceSave && prev.historyIndex >= 0 && prev.history.length > 0 && statesAreEqual(newHistoryEntry, prev.history[prev.historyIndex])) {
          return prev; 
        }
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(newHistoryEntry);
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift(); 
        }
        return {
          ...prev,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isNudging: false, 
        };
    });
  }, [getCurrentHistorySnapshot]);

  useEffect(() => {
    if (levels.length > 0 && gameState.bricks.length > 0 && gameState.mode === 'editor' && gameStarted) { 
        const currentSnapshot = getCurrentHistorySnapshot(gameState);
        if (editorState.history.length === 0 || editorState.historyIndex < 0 || 
            (editorState.history[editorState.historyIndex] && !statesAreEqual(currentSnapshot, editorState.history[editorState.historyIndex]))) {
            // This ensures that after loadLevelData sets new bricks, player, hole, etc.,
            // this new state is captured as the first history entry for that level context.
             saveHistoryState(true, gameState, editorState);
        }
    }
  }, [gameState.bricks, gameState.player, gameState.hole, gameState.currentLevelIndex, levels, gameState.mode, gameStarted, editorState.history, editorState.historyIndex, getCurrentHistorySnapshot, saveHistoryState]); 


  // --- Game Loop ---
  const gameLoopRef = useRef<number>();
  const lastTimestampRef = useRef<number>(0);

  const runGameLoop = useCallback((timestamp: number) => {
    if (!gameStarted) return;
    const deltaTime = (timestamp - lastTimestampRef.current) / 1000;
    lastTimestampRef.current = timestamp;

    setGameState(prevGameState => {
      let newGameState = { ...prevGameState };
      const time = Date.now() * 0.001; 

      newGameState.bricks = newGameState.bricks.map(brick => {
        if (brick.movementType && brick.initialX !== undefined && brick.initialY !== undefined) {
          const speed = brick.moveSpeed ?? DEFAULT_MOVE_SPEED;
          const range = brick.moveRange;
          const offset = range * Math.sin(time * speed);
          if (brick.movementType === BrickMovementType.Vertical) {
            return { ...brick, y: brick.initialY + offset };
          } else if (brick.movementType === BrickMovementType.Horizontal) {
            return { ...brick, x: brick.initialX + offset };
          }
        }
        return brick;
      });

      if (newGameState.mode === 'play' && newGameState.ball.fired) {
        let newBall = { ...newGameState.ball };
        newBall.x += newBall.vx * deltaTime * 60; 
        newBall.y += newBall.vy * deltaTime * 60;

        if (!canvasRef.current) return prevGameState;
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;

        if (newBall.x - newBall.radius < 0 || newBall.x + newBall.radius > canvasWidth || newBall.y - newBall.radius < 0) {
          showUIMessage("Hit wall! Restarting.");
          const ballReset = resetBall(newGameState as GameState);
          return {...newGameState, ball: {...newGameState.ball, ...ballReset.ball} };
        }
        if (newBall.y > canvasHeight + newBall.radius * 2) {
          showUIMessage("Fell off bottom! Restarting.");
          const ballReset = resetBall(newGameState);
          return {...newGameState, ball: {...newGameState.ball, ...ballReset.ball} };
        }

        for (const brick of newGameState.bricks) {
          const collision = checkCircleRectCollision(newBall, brick);
          if (collision.collision) {
            if (brick.isKillBrick) {
              showUIMessage("Hit a kill brick! Restarting.");
              const ballReset = resetBall(newGameState);
              return {...newGameState, ball: {...newGameState.ball, ...ballReset.ball} };
            }
            if (collision.normal && collision.overlap) {
              const pushVector = Vec.scale(collision.normal, collision.overlap * COLLISION_PUSH_FACTOR);
              newBall.x += pushVector.x;
              newBall.y += pushVector.y;
              const velocity = Vec.create(newBall.vx, newBall.vy);
              const reflectedVel = Vec.reflect(velocity, collision.normal);
              newBall.vx = reflectedVel.x;
              newBall.vy = reflectedVel.y;
            }
          }
        }
        
        const playerRect = { x: newGameState.player.x, y: newGameState.player.y, width: newGameState.player.width, height: newGameState.player.height };
        const ballRect = { x: newBall.x - newBall.radius, y: newBall.y - newBall.radius, width: newBall.radius * 2, height: newBall.radius * 2 };
        if (doRectsOverlap(ballRect, playerRect)) {
            showUIMessage("Ball hit player! Restarting.");
            const ballReset = resetBall(newGameState);
            return {...newGameState, ball: {...newGameState.ball, ...ballReset.ball} };
        }

        const distToHoleSq = Vec.lenSq(Vec.sub(Vec.create(newBall.x, newBall.y), Vec.create(newGameState.hole.x, newGameState.hole.y)));
        const radiiSumSq = (newBall.radius + newGameState.hole.radius) * (newBall.radius + newGameState.hole.radius);
        if (distToHoleSq < radiiSumSq * 0.8) { 
          showUIMessage(`Level ${newGameState.currentLevelIndex + 1} Complete!`);
          const nextLevelIndex = newGameState.currentLevelIndex + 1;
          if (nextLevelIndex < levels.length) {
            setTimeout(() => {
                if (canvasRef.current && canvasContainerRef.current) {
                    loadLevelData(nextLevelIndex, levels, canvasContainerRef.current.offsetWidth, canvasContainerRef.current.offsetHeight);
                }
            }, 0);
            return prevGameState; 
          } else {
            showUIMessage("Congratulations! You beat all levels!", 0);
            const ballReset = resetBall(newGameState); 
            return {...newGameState, mode: 'editor', ball: {...newGameState.ball, ...ballReset.ball, fired: false, onPlayer: true}};
          }
        }
        newGameState.ball = newBall;
      } else if (!newGameState.ball.fired && newGameState.ball.onPlayer) {
         const ballReset = resetBall(newGameState); 
         newGameState.ball = {...newGameState.ball, ...ballReset.ball};
      }
      return newGameState;
    });

    gameLoopRef.current = requestAnimationFrame(runGameLoop);
  }, [gameStarted, showUIMessage, resetBall, loadLevelData, levels]);

  useEffect(() => {
    if (gameStarted) {
      lastTimestampRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, runGameLoop]);


  // --- Initial Load and Resize ---
  useEffect(() => {
    const initLoad = async () => {
      await loadLevelsFromStorage();
    };
    initLoad();
  }, []); 

  const handleResize = useCallback(() => {
    requestAnimationFrame(() => { // Defer to next animation frame
        if (canvasRef.current && canvasContainerRef.current) {
            const container = canvasContainerRef.current;
            const newWidth = container.offsetWidth;
            const newHeight = container.offsetHeight;
            
            if (canvasRef.current.width !== newWidth || canvasRef.current.height !== newHeight) {
                console.log(`[HandleResize] Canvas resize detected. New: ${newWidth}x${newHeight}, Old: ${canvasRef.current.width}x${canvasRef.current.height}`);
                canvasRef.current.width = newWidth;
                canvasRef.current.height = newHeight;
                if (levels.length > 0 && gameStarted) { 
                    loadLevelData(gameState.currentLevelIndex, levels, newWidth, newHeight);
                } else {
                    console.log("[HandleResize] Conditions not met for loadLevelData (levels empty or game not started).");
                }
            }
        }
    });
  }, [levels, gameState.currentLevelIndex, gameStarted, loadLevelData]); 

  useEffect(() => {
    // This effect calls handleResize once when the game starts and levels are available.
    // handleResize itself now uses requestAnimationFrame.
    if (gameStarted && levels.length > 0) {
        console.log("[App gameStarted/levels Effect] Game started and levels available. Calling initial handleResize.");
        handleResize(); 
    }
  }, [gameStarted, levels, handleResize]);


  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);


  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    setShowMenuUI(true); 
    // Initial loadLevelData is now handled by the useEffect listening to [gameStarted, levels, handleResize]
    // to ensure canvas dimensions from canvasContainerRef are more stable.
  }, []); 

  const toggleGameMenu = useCallback(() => {
    setShowMenuUI(prev => !prev);
  }, []);
  
  const onPointerOverUIChanged = useCallback((isOverUI: boolean) => {
    isPointerOverUIRef.current = isOverUI;
  }, []);


  if (!gameStarted) {
    return <StartMenu onStart={handleStartGame} />;
  }
  
  return (
    <div className="w-full h-full flex relative bg-gray-800">
      {showMenuUI && (
        <GameMenu
          gameState={gameState}
          setGameState={setGameState} 
          editorState={editorState}
          setEditorState={setEditorState} 
          levels={levels}
          setLevels={setLevels} 
          loadLevelData={(idx) => {
            if (canvasRef.current && canvasContainerRef.current) {
                loadLevelData(idx, levels, canvasContainerRef.current.offsetWidth, canvasContainerRef.current.offsetHeight);
            } else {
                console.warn("[GameMenu loadLevelData] Canvas or container not ready.");
            }
          }}
          saveCurrentLevelData={() => {
             if (!canvasRef.current || !canvasContainerRef.current) {
                 showUIMessage("Canvas not ready for saving.", 2000);
                 return;
             }
             const currentCanvasWidth = canvasRef.current.width;
             const currentCanvasHeight = canvasRef.current.height;
             const index = gameState.currentLevelIndex;

             if (index < 0 || index >= levels.length) {
                 showUIMessage("Invalid level index for saving.", 2000);
                 return;
             }

             const updatedLevelData = deepClone(levels[index]);
             updatedLevelData.savedCanvasWidth = FALLBACK_CANVAS_WIDTH; 
             updatedLevelData.savedCanvasHeight = FALLBACK_CANVAS_HEIGHT;
             
             const toFallbackScaleX = currentCanvasWidth > 0 ? FALLBACK_CANVAS_WIDTH / currentCanvasWidth : 1;
             const toFallbackScaleY = currentCanvasHeight > 0 ? FALLBACK_CANVAS_HEIGHT / currentCanvasHeight : 1;

             updatedLevelData.bricks = gameState.bricks.map(brick => {
                const unscaledWidth = brick.baseWidth ?? (brick.width / (gameState.lastSizeScaleX || 1));
                const unscaledHeight = brick.baseHeight ?? (brick.height / (gameState.lastSizeScaleY || 1));
                
                let unscaledMoveRange = brick.moveRange;
                const lastValidSizeScaleX = gameState.lastSizeScaleX || 1;
                const lastValidSizeScaleY = gameState.lastSizeScaleY || 1;

                if (brick.movementType === BrickMovementType.Horizontal && lastValidSizeScaleX !== 0) {
                    unscaledMoveRange /= lastValidSizeScaleX;
                } else if (brick.movementType === BrickMovementType.Vertical && lastValidSizeScaleY !== 0) {
                    unscaledMoveRange /= lastValidSizeScaleY;
                }
                
                const currentBrickX = brick.initialX ?? brick.x;
                const currentBrickY = brick.initialY ?? brick.y;

                return {
                    ...brick, 
                    x: currentBrickX * toFallbackScaleX,
                    y: currentBrickY * toFallbackScaleY,
                    width: unscaledWidth, 
                    height: unscaledHeight, 
                    moveRange: unscaledMoveRange,
                    baseWidth: unscaledWidth, 
                    baseHeight: unscaledHeight,
                    initialX: brick.initialX !== undefined ? (brick.initialX * toFallbackScaleX) : undefined,
                    initialY: brick.initialY !== undefined ? (brick.initialY * toFallbackScaleY) : undefined,
                };
             });
             updatedLevelData.player = { 
                x: gameState.player.x * toFallbackScaleX, 
                y: gameState.player.y * toFallbackScaleY
             };
             updatedLevelData.hole = { 
                x: gameState.hole.x * toFallbackScaleX, 
                y: gameState.hole.y * toFallbackScaleY
            };
             
             const newLevels = [...levels];
             newLevels[index] = updatedLevelData;
             setLevels(newLevels);
             saveLevelsToStorage(newLevels);
             showUIMessage(`Level ${index + 1} ('${updatedLevelData.name}') saved!`, 1500);
          }}
          showUIMessage={showUIMessage}
          fileInputRef={fileInputRef}
          onPointerOverUIChanged={onPointerOverUIChanged}
          saveHistoryState={(force?: boolean) => saveHistoryState(force, gameState, editorState)}
          undo={() => {
            if (gameState.mode !== 'editor' || editorState.historyIndex <= 0) return;
            const newHistoryIndex = editorState.historyIndex - 1;
            const stateToLoad = editorState.history[newHistoryIndex];
            if (stateToLoad) {
                const restoredGameState = {
                    ...gameState, 
                    ...stateToLoad 
                };
                const ballAfterPlayerRestore = {
                    ...restoredGameState.ball, 
                    radius: BASE_BALL_RADIUS * restoredGameState.lastSizeScaleMin, 
                };
                const tempGameStateForBallReset = {...restoredGameState, ball: ballAfterPlayerRestore};
                const ballResetData = resetBall(tempGameStateForBallReset); 

                setGameState({
                    ...restoredGameState,
                    ball: { ...ballAfterPlayerRestore, ...ballResetData.ball } 
                });
                setEditorState(prevES => ({...prevES, historyIndex: newHistoryIndex, selectedItems: [], contextMenu: null}));
            }
          }}
          redo={() => {
            if (gameState.mode !== 'editor' || editorState.historyIndex >= editorState.history.length - 1) return;
            const newHistoryIndex = editorState.historyIndex + 1;
            const stateToLoad = editorState.history[newHistoryIndex];
             if (stateToLoad) {
                const restoredGameState = {
                    ...gameState,
                    ...stateToLoad
                };
                const ballAfterPlayerRestore = {
                    ...restoredGameState.ball,
                    radius: BASE_BALL_RADIUS * restoredGameState.lastSizeScaleMin,
                };
                const tempGameStateForBallReset = {...restoredGameState, ball: ballAfterPlayerRestore};
                const ballResetData = resetBall(tempGameStateForBallReset);

                setGameState({
                     ...restoredGameState,
                     ball: { ...ballAfterPlayerRestore, ...ballResetData.ball }
                });
                setEditorState(prevES => ({...prevES, historyIndex: newHistoryIndex, selectedItems: [], contextMenu: null}));
            }
          }}
          createDefaultLevelData={createDefaultLevelData}
          validateAndDefaultLevel={validateAndDefaultLevel}
          resetBall={(currentGS) => setGameState(prev => ({...prev, ...resetBall(currentGS)}))}
        />
      )}
      <button 
        onClick={toggleGameMenu} 
        className={`absolute top-4 ${showMenuUI ? 'left-[17rem]' : 'left-4'} z-30 bg-gray-600 text-white p-2 rounded-md hover:bg-gray-700 transition-all duration-150 ease-in-out`}
        title={showMenuUI ? "Hide Menu" : "Show Menu"}
      >
        {showMenuUI ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>
      
      <div ref={canvasContainerRef} className="flex-grow h-full relative">
        <GameCanvas 
            canvasRef={canvasRef}
            gameState={gameState}
            setGameState={setGameState}
            editorState={editorState}
            setEditorState={setEditorState}
            showUIMessage={showUIMessage}
            resetBall={(currentGS) => setGameState(prev => ({...prev, ...resetBall(currentGS)}))}
            saveHistoryState={() => saveHistoryState(false, gameState, editorState)} 
            isPointerOverUIRef={isPointerOverUIRef}
         />
        {editorState.contextMenu && (
          <ContextMenuComponent
            contextMenuState={editorState.contextMenu}
            gameState={gameState}
            setGameState={setGameState}
            editorState={editorState}
            setEditorState={setEditorState}
            saveHistory={() => saveHistoryState(false, gameState, editorState)}
            showUIMessage={showUIMessage}
          />
        )}
        {editorState.isMarqueeSelecting && <MarqueeBox marqueeState={editorState} />}
      </div>

      {message && <MessageBox message={message.text} onClose={hideUIMessage} />}
    </div>
  );
};

export default App;
