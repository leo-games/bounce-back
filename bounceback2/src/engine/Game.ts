import type { Vector, LevelData, PlayState } from '@/types';
import { Level } from './Level';
import { Physics, type PhysicsResult } from './Physics';
import { Renderer, type LaunchIndicator } from './Renderer';
import { Vec } from '@/utils/Vector';
import {
  MAX_BALL_SPEED,
  MIN_LAUNCH_MAGNITUDE,
  MAX_LAUNCH_MAGNITUDE,
} from '@/utils/constants';

export interface GameCallbacks {
  onStateChange?: (state: PlayState) => void;
  onAttemptChange?: (attempts: number) => void;
  onLevelComplete?: () => void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private physics: Physics;
  private level: Level | null = null;
  private animationId: number | null = null;
  private lastTime: number = 0;

  // Game state
  private playState: PlayState = 'idle';
  private attempts: number = 0;

  // Launch state
  private isDragging: boolean = false;
  private dragCurrentPos: Vector = Vec.zero();
  private launchDirection: Vector = Vec.zero();
  private launchMagnitude: number = 0;

  // Callbacks
  private callbacks: GameCallbacks = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handlePointerUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.renderer.resize();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handlePointerDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
      } as MouseEvent);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handlePointerMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
      } as MouseEvent);
    }
  }

  private handleTouchEnd(): void {
    this.handlePointerUp();
  }

  private handlePointerDown(e: MouseEvent): void {
    if (!this.level || this.playState === 'launched' || this.playState === 'success') {
      return;
    }

    const screenPos = { x: e.offsetX, y: e.offsetY };
    const normalizedPos = this.renderer.toNormalized(screenPos);

    this.isDragging = true;
    this.dragCurrentPos = normalizedPos;
    this.setPlayState('aiming');
  }

  private handlePointerMove(e: MouseEvent): void {
    if (!this.isDragging || !this.level) return;

    const screenPos = { x: e.offsetX, y: e.offsetY };
    this.dragCurrentPos = this.renderer.toNormalized(screenPos);

    // Calculate launch parameters
    // Direction is FROM player TOWARD drag position (intuitive aiming)
    const playerPos = this.level.player.getBallOrbitCenter();
    const aimVector = Vec.sub(this.dragCurrentPos, playerPos);
    const aimDistance = Vec.length(aimVector);

    // Magnitude based on distance from player (clamped)
    this.launchMagnitude = Math.min(
      Math.max(aimDistance / 0.3, 0), // 0.3 normalized distance = max power
      MAX_LAUNCH_MAGNITUDE
    );

    if (aimDistance > 0.001) {
      this.launchDirection = Vec.normalize(aimVector);
    }
  }

  private handlePointerUp(): void {
    if (!this.isDragging || !this.level) {
      this.isDragging = false;
      return;
    }

    this.isDragging = false;

    // Launch if magnitude is sufficient
    if (this.launchMagnitude >= MIN_LAUNCH_MAGNITUDE) {
      this.launchBall();
    } else {
      this.setPlayState('idle');
    }
  }

  private launchBall(): void {
    if (!this.level) return;

    const speed = (this.launchMagnitude / MAX_LAUNCH_MAGNITUDE) * MAX_BALL_SPEED;
    this.level.ball.launch(this.launchDirection, speed);
    this.attempts++;
    this.callbacks.onAttemptChange?.(this.attempts);
    this.setPlayState('launched');
  }

  private setPlayState(state: PlayState): void {
    this.playState = state;
    this.callbacks.onStateChange?.(state);
  }

  setCallbacks(callbacks: GameCallbacks): void {
    this.callbacks = callbacks;
  }

  loadLevel(levelData: LevelData): void {
    this.level = new Level(levelData);
    this.attempts = 0;
    this.playState = 'idle';
    this.isDragging = false;
    this.callbacks.onAttemptChange?.(0);
    this.callbacks.onStateChange?.('idle');
  }

  start(): void {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset(): void {
    if (!this.level) return;
    this.level.reset();
    this.isDragging = false;
    this.setPlayState('idle');
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (!this.level) return;

    // Update level (moving bricks, ball orbit)
    this.level.update(deltaTime);

    // Check physics if ball is launched
    if (this.playState === 'launched') {
      const result = this.physics.checkCollisions(this.level, deltaTime);
      this.handlePhysicsResult(result);
    }
  }

  private handlePhysicsResult(result: PhysicsResult): void {
    if (!this.level) return;

    switch (result.type) {
      case 'wall':
      case 'killBrick':
        // Ball is out - reset
        this.level.reset();
        this.setPlayState('failed');
        // Auto-restart after a brief moment
        setTimeout(() => {
          if (this.playState === 'failed') {
            this.setPlayState('idle');
          }
        }, 300);
        break;

      case 'hole':
        // Level complete!
        this.setPlayState('success');
        this.callbacks.onLevelComplete?.();
        break;

      case 'brick':
        // Bounce off brick
        if (result.newPosition) {
          this.level.ball.position = result.newPosition;
        }
        if (result.newVelocity) {
          this.level.ball.velocity = result.newVelocity;
        }
        break;

      case 'none':
        // No collision, continue
        break;
    }
  }

  private render(): void {
    if (!this.level) {
      this.renderer.clear();
      return;
    }

    // Prepare launch indicator
    let launchIndicator: LaunchIndicator | null = null;
    if (this.isDragging && this.launchMagnitude >= MIN_LAUNCH_MAGNITUDE) {
      launchIndicator = {
        active: true,
        startPos: this.level.player.getBallOrbitCenter(),
        direction: this.launchDirection,
        magnitude: this.launchMagnitude,
      };
    }

    this.renderer.render(this.level, launchIndicator);
  }

  // Getters for UI
  getPlayState(): PlayState {
    return this.playState;
  }

  getAttempts(): number {
    return this.attempts;
  }

  getLevel(): Level | null {
    return this.level;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }
}
