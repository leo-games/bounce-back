import type { Vector, CanvasDimensions } from '@/types';
import { Level } from './Level';
import { Brick } from './entities/bricks/Brick';
import { Ball } from './entities/Ball';
import {
  COLORS,
  ASPECT_RATIO,
  BALL_RADIUS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  HOLE_RADIUS,
  MAX_LAUNCH_MAGNITUDE,
} from '@/utils/constants';

export interface LaunchIndicator {
  active: boolean;
  startPos: Vector;
  direction: Vector;
  magnitude: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  dimensions: CanvasDimensions;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.dimensions = this.calculateDimensions();
  }

  calculateDimensions(): CanvasDimensions {
    const containerWidth = this.canvas.clientWidth;
    const containerHeight = this.canvas.clientHeight;

    // Set actual canvas resolution
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = containerWidth * dpr;
    this.canvas.height = containerHeight * dpr;
    this.ctx.scale(dpr, dpr);

    // Calculate game area with letterboxing
    const containerRatio = containerWidth / containerHeight;

    let gameWidth: number;
    let gameHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (containerRatio > ASPECT_RATIO) {
      // Container is wider - letterbox sides
      gameHeight = containerHeight;
      gameWidth = gameHeight * ASPECT_RATIO;
      offsetX = (containerWidth - gameWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller - letterbox top/bottom
      gameWidth = containerWidth;
      gameHeight = gameWidth / ASPECT_RATIO;
      offsetX = 0;
      offsetY = (containerHeight - gameHeight) / 2;
    }

    return {
      width: gameWidth,
      height: gameHeight,
      scale: gameWidth, // Use width as the scale (since normalized coords are 0-1)
      offsetX,
      offsetY,
    };
  }

  resize(): void {
    this.dimensions = this.calculateDimensions();
  }

  // Convert normalized coords to screen coords
  toScreen(normalized: Vector): Vector {
    return {
      x: this.dimensions.offsetX + normalized.x * this.dimensions.width,
      y: this.dimensions.offsetY + normalized.y * this.dimensions.height,
    };
  }

  // Convert screen coords to normalized coords
  toNormalized(screen: Vector): Vector {
    return {
      x: (screen.x - this.dimensions.offsetX) / this.dimensions.width,
      y: (screen.y - this.dimensions.offsetY) / this.dimensions.height,
    };
  }

  // Scale a normalized size to screen pixels
  scaleSize(normalizedSize: number, useHeight = false): number {
    return normalizedSize * (useHeight ? this.dimensions.height : this.dimensions.width);
  }

  clear(): void {
    const { ctx, dimensions } = this;
    const fullWidth = this.canvas.clientWidth;
    const fullHeight = this.canvas.clientHeight;

    // Clear everything
    ctx.clearRect(0, 0, fullWidth, fullHeight);

    // Draw letterbox background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, fullWidth, fullHeight);

    // Draw game background gradient
    const gradient = ctx.createLinearGradient(
      dimensions.offsetX,
      dimensions.offsetY,
      dimensions.offsetX,
      dimensions.offsetY + dimensions.height
    );
    gradient.addColorStop(0, COLORS.background.top);
    gradient.addColorStop(1, COLORS.background.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(dimensions.offsetX, dimensions.offsetY, dimensions.width, dimensions.height);
  }

  render(level: Level, launchIndicator: LaunchIndicator | null): void {
    this.clear();

    // Draw hole first (behind everything)
    this.drawHole(level.hole.position);

    // Draw bricks
    for (const brick of level.bricks) {
      this.drawBrick(brick);
    }

    // Handle 3D orbit effect - draw ball behind or in front of player
    const ball = level.ball;

    if (ball.isLaunched) {
      // When launched, draw player then ball (ball always in front)
      this.drawPlayer(level.player.position);
      this.drawBall(ball);
    } else {
      // Orbiting - respect depth order
      if (ball.orbitDepth < 0) {
        // Ball is behind player
        this.drawOrbitBall(ball);
        this.drawPlayer(level.player.position);
      } else {
        // Ball is in front of player
        this.drawPlayer(level.player.position);
        this.drawOrbitBall(ball);
      }
    }

    // Draw launch indicator
    if (launchIndicator?.active) {
      this.drawLaunchIndicator(launchIndicator);
    }
  }

  private drawHole(position: Vector): void {
    const { ctx } = this;
    const screenPos = this.toScreen(position);
    const radius = this.scaleSize(HOLE_RADIUS);

    // Outer glow
    const glowGradient = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      radius * 0.5,
      screenPos.x,
      screenPos.y,
      radius * 1.5
    );
    glowGradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    glowGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main hole
    const holeGradient = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      0,
      screenPos.x,
      screenPos.y,
      radius
    );
    holeGradient.addColorStop(0, COLORS.hole.inner);
    holeGradient.addColorStop(0.7, COLORS.hole.outer);
    holeGradient.addColorStop(1, COLORS.hole.outer);
    ctx.fillStyle = holeGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight ring
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawBrick(brick: Brick): void {
    const { ctx } = this;
    const screenPos = this.toScreen(brick.position);
    const width = this.scaleSize(brick.size.width);
    const height = this.scaleSize(brick.size.height, true);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(brick.angle);

    // Choose colors based on brick type
    let fillColor = COLORS.brick.normal;
    let lightColor = COLORS.brick.normalLight;

    if (brick.isKill) {
      fillColor = COLORS.brick.kill;
      lightColor = COLORS.brick.killLight;
    } else if (brick.movement) {
      fillColor = COLORS.brick.moving;
      lightColor = COLORS.brick.movingLight;
    }

    // Main brick body
    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, lightColor);
    gradient.addColorStop(1, fillColor);
    ctx.fillStyle = gradient;

    // Rounded rectangle
    const cornerRadius = Math.min(width, height) * 0.15;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, cornerRadius);
    ctx.fill();

    // Stroke - thick outline
    ctx.strokeStyle = COLORS.brick.stroke;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Kill brick hazard pattern
    if (brick.isKill) {
      ctx.strokeStyle = COLORS.brick.killStripe;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, cornerRadius * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawPlayer(position: Vector): void {
    const { ctx } = this;
    const screenPos = this.toScreen(position);
    const width = this.scaleSize(PLAYER_WIDTH);
    const height = this.scaleSize(PLAYER_HEIGHT, true);

    // Draw head and shoulders silhouette (like the reference image)
    const headRadius = width * 0.4;
    const shoulderWidth = width * 1.2;
    const shoulderHeight = height * 0.5;
    const neckWidth = width * 0.35;

    ctx.fillStyle = COLORS.player.face; // White fill

    ctx.beginPath();

    // Start from left shoulder
    const shoulderY = screenPos.y + headRadius * 0.3;
    const shoulderCurveY = shoulderY + shoulderHeight;

    // Left shoulder curve
    ctx.moveTo(screenPos.x - shoulderWidth / 2, shoulderCurveY);
    ctx.quadraticCurveTo(
      screenPos.x - shoulderWidth / 2,
      shoulderY,
      screenPos.x - neckWidth / 2,
      shoulderY
    );

    // Left side of neck up to head
    ctx.lineTo(screenPos.x - neckWidth / 2, screenPos.y + headRadius * 0.1);

    // Head (circle) - draw as arc
    ctx.arc(
      screenPos.x,
      screenPos.y - headRadius * 0.3,
      headRadius,
      Math.PI * 0.85,  // Start angle (left side)
      Math.PI * 0.15,  // End angle (right side)
      false
    );

    // Right side of neck
    ctx.lineTo(screenPos.x + neckWidth / 2, shoulderY);

    // Right shoulder curve
    ctx.quadraticCurveTo(
      screenPos.x + shoulderWidth / 2,
      shoulderY,
      screenPos.x + shoulderWidth / 2,
      shoulderCurveY
    );

    // Close the path across the bottom
    ctx.closePath();
    ctx.fill();
  }

  private drawBall(ball: Ball): void {
    const { ctx } = this;
    const screenPos = this.toScreen(ball.position);
    const radius = this.scaleSize(BALL_RADIUS);

    // Draw trail first
    if (ball.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 0; i < ball.trail.length - 1; i++) {
        const alpha = 1 - i / ball.trail.length;
        const trailRadius = radius * (1 - i / ball.trail.length) * 0.8;
        const pos = this.toScreen(ball.trail[i]);

        ctx.fillStyle = `rgba(251, 146, 60, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, trailRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer glow
    const glowGradient = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      radius * 0.5,
      screenPos.x,
      screenPos.y,
      radius * 2
    );
    glowGradient.addColorStop(0, 'rgba(252, 211, 77, 0.4)');
    glowGradient.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Main ball
    const ballGradient = ctx.createRadialGradient(
      screenPos.x - radius * 0.3,
      screenPos.y - radius * 0.3,
      0,
      screenPos.x,
      screenPos.y,
      radius
    );
    ballGradient.addColorStop(0, '#FFFFFF');
    ballGradient.addColorStop(0.7, '#F8FAFC');
    ballGradient.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw the smaller orbiting ball with 3D scale effect
  private drawOrbitBall(ball: Ball): void {
    const { ctx } = this;
    const screenPos = this.toScreen(ball.position);

    // Orbit ball is 1/3 the size of the head, which is ~0.4 * PLAYER_WIDTH
    // So orbit ball base radius = PLAYER_WIDTH * 0.4 / 3 ≈ 0.007
    const baseRadius = this.scaleSize(PLAYER_WIDTH * 0.4 / 3);
    const radius = baseRadius * ball.orbitScale;

    // Subtle glow (smaller than launched ball)
    const glowGradient = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      radius * 0.3,
      screenPos.x,
      screenPos.y,
      radius * 1.5
    );
    glowGradient.addColorStop(0, 'rgba(252, 211, 77, 0.3)');
    glowGradient.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main ball with gradient
    const ballGradient = ctx.createRadialGradient(
      screenPos.x - radius * 0.3,
      screenPos.y - radius * 0.3,
      0,
      screenPos.x,
      screenPos.y,
      radius
    );
    ballGradient.addColorStop(0, '#FFFFFF');
    ballGradient.addColorStop(0.6, '#F8FAFC');
    ballGradient.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawLaunchIndicator(indicator: LaunchIndicator): void {
    const { ctx } = this;
    const startScreen = this.toScreen(indicator.startPos);
    const magnitude = indicator.magnitude / MAX_LAUNCH_MAGNITUDE;

    // Direction line
    const lineLength = 80 + magnitude * 60;
    const endX = startScreen.x + indicator.direction.x * lineLength;
    const endY = startScreen.y + indicator.direction.y * lineLength;

    // Draw power gradient line
    const gradient = ctx.createLinearGradient(startScreen.x, startScreen.y, endX, endY);
    gradient.addColorStop(0, COLORS.launch.line);
    gradient.addColorStop(1, COLORS.launch.lineFaint);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4 + magnitude * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startScreen.x, startScreen.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    const arrowSize = 10 + magnitude * 5;
    const angle = Math.atan2(indicator.direction.y, indicator.direction.x);
    ctx.fillStyle = COLORS.launch.line;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Power indicator dots
    const dotCount = Math.floor(magnitude * 5) + 1;
    for (let i = 0; i < dotCount; i++) {
      const t = (i + 1) / 6;
      const dotX = startScreen.x + (endX - startScreen.x) * t;
      const dotY = startScreen.y + (endY - startScreen.y) * t;
      const dotRadius = 3 + magnitude * 2;

      ctx.fillStyle = i < dotCount - 1 ? COLORS.launch.power : COLORS.launch.line;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw editor-specific elements
  drawEditorOverlay(
    level: Level,
    selectedIds: Set<string>,
    hoveredId: string | null
  ): void {
    const { ctx } = this;

    // Draw selection boxes around selected bricks
    for (const brick of level.bricks) {
      const isSelected = selectedIds.has(brick.id);
      const isHovered = brick.id === hoveredId;

      if (isSelected || isHovered) {
        const screenPos = this.toScreen(brick.position);
        const width = this.scaleSize(brick.size.width);
        const height = this.scaleSize(brick.size.height, true);

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(brick.angle);

        ctx.strokeStyle = isSelected ? '#F59E0B' : '#94A3B8';
        ctx.lineWidth = 2;
        ctx.setLineDash(isHovered && !isSelected ? [5, 5] : []);
        ctx.strokeRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8);
        ctx.setLineDash([]);

        // Draw resize handles for selected bricks
        if (isSelected) {
          const handleSize = 8;
          ctx.fillStyle = '#F59E0B';
          const corners = [
            [-width / 2, -height / 2],
            [width / 2, -height / 2],
            [-width / 2, height / 2],
            [width / 2, height / 2],
          ];
          for (const [hx, hy] of corners) {
            ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          }

          // Rotation handle
          ctx.beginPath();
          ctx.arc(0, -height / 2 - 20, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -height / 2);
          ctx.lineTo(0, -height / 2 - 14);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // Highlight player if selected/hovered
    if (selectedIds.has('player') || hoveredId === 'player') {
      const screenPos = this.toScreen(level.player.position);
      const width = this.scaleSize(PLAYER_WIDTH);
      const height = this.scaleSize(PLAYER_HEIGHT, true);

      ctx.strokeStyle = selectedIds.has('player') ? '#F59E0B' : '#94A3B8';
      ctx.lineWidth = 2;
      ctx.setLineDash(hoveredId === 'player' && !selectedIds.has('player') ? [5, 5] : []);
      ctx.beginPath();
      ctx.ellipse(screenPos.x, screenPos.y, width / 2 + 4, height / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Highlight hole if selected/hovered
    if (selectedIds.has('hole') || hoveredId === 'hole') {
      const screenPos = this.toScreen(level.hole.position);
      const radius = this.scaleSize(HOLE_RADIUS);

      ctx.strokeStyle = selectedIds.has('hole') ? '#F59E0B' : '#94A3B8';
      ctx.lineWidth = 2;
      ctx.setLineDash(hoveredId === 'hole' && !selectedIds.has('hole') ? [5, 5] : []);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
