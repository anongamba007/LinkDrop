export type Position = {
  x: number;
  y: number;
};

export type TileType = 'empty' | 'pulse' | 'link';

export type LinkType = 'normal' | 'strong' | 'chain';

export type GameMode = 'endless' | 'timeAttack' | 'puzzle' | 'challenge';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  progress: number;
  completed: boolean;
  reward: number;
};

export type Upgrade = {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  effect: {
    type: string;
    value: number;
  };
};

export type Tile = {
  id: string;
  type: TileType;
  position: Position;
  energy: number;
  links: string[];
  linkType?: LinkType;
};

export type ObjectiveType = 'score' | 'chains' | 'links';

export interface Objective {
  type: ObjectiveType;
  target: number;
}

export interface GameModeState {
  endless: Record<string, never>;
  timeAttack: {
    timeRemaining: number;
  };
  puzzle: {
    objectives: Objective[];
    completedObjectives: number;
  };
  challenge: {
    timeRemaining: number;
    challengeType: ObjectiveType;
    target: number;
  };
}

export interface GameState {
  grid: Tile[][];
  score: number;
  combo: number;
  energy: number;
  gameOver: boolean;
  gameMode: GameMode;
  chainReactionHistory: string[];
  lastChainTimestamp: number;
  totalChains: number;
  currentStreak: number;
  bestStreak: number;
  achievements: Achievement[];
  upgrades: Upgrade[];
  unlockedAbilities: string[];
  highScore: number;
  timeRemaining?: number;
  objectives?: Objective[];
  completedObjectives?: number;
  challengeType?: ObjectiveType;
  target?: number;
  level: number;
} 