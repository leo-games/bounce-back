import type { LevelData, BrickData } from '@/types';
import { Ball, Player, Hole, Brick } from './entities';
import { generateId } from '@/utils/storage';

export class Level {
  id: string;
  name: string;
  player: Player;
  hole: Hole;
  ball: Ball;
  bricks: Brick[];

  constructor(data: LevelData) {
    this.id = data.id;
    this.name = data.name;

    this.player = new Player(data.player);
    this.hole = new Hole(data.hole);
    this.ball = new Ball({ orbitCenter: this.player.getBallOrbitCenter() });
    this.bricks = data.bricks.map((b) => new Brick(b));
  }

  update(deltaTime: number): void {
    // Update all moving bricks
    for (const brick of this.bricks) {
      brick.update(deltaTime);
    }

    // Update ball
    this.ball.update(deltaTime);
  }

  reset(): void {
    this.ball.reset(this.player.getBallOrbitCenter());
  }

  toData(): LevelData {
    return {
      id: this.id,
      name: this.name,
      player: { x: this.player.position.x, y: this.player.position.y },
      hole: { x: this.hole.position.x, y: this.hole.position.y },
      bricks: this.bricks.map((b) => b.toData()),
    };
  }

  // Editor methods
  addBrick(data: Partial<BrickData>): Brick {
    const brickData: BrickData = {
      id: data.id ?? generateId(),
      position: data.position ?? { x: 0.5, y: 0.5 },
      size: data.size ?? { width: 0.12, height: 0.025 },
      angle: data.angle ?? 0,
      isKill: data.isKill ?? false,
      movement: data.movement,
    };

    const brick = new Brick(brickData);
    this.bricks.push(brick);
    return brick;
  }

  removeBrick(id: string): boolean {
    const index = this.bricks.findIndex((b) => b.id === id);
    if (index >= 0) {
      this.bricks.splice(index, 1);
      return true;
    }
    return false;
  }

  getBrickById(id: string): Brick | undefined {
    return this.bricks.find((b) => b.id === id);
  }
}

// Create empty level for editor
export function createEmptyLevel(name = 'Untitled'): LevelData {
  return {
    id: generateId(),
    name,
    player: { x: 0.5, y: 0.85 },
    hole: { x: 0.5, y: 0.15 },
    bricks: [],
  };
}
