import { create } from 'zustand';
import type { GameState, GameMode, Position, Tile, Objective, ObjectiveType } from '../types/game';

interface GameStore extends GameState {
  initializeGame: (mode?: GameMode) => void;
  placeLink: (from: Position, to: Position) => void;
  triggerChain: (position: Position) => void;
  updateScore: (points: number) => void;
  resetGame: () => void;
  generatePulses: () => void;
  upgradeAbility: (upgradeId: string) => void;
  checkAchievements: () => void;
  updateTimeRemaining: (time: number) => void;
}

const GRID_SIZE = 8;
const INITIAL_ENERGY = 100;
const PULSE_INTERVAL = 5000;
const CHAIN_TIMEOUT = 2000;
const TIME_ATTACK_DURATION = 60000;
const CHALLENGE_DURATION = 120000;

const LINK_COSTS = {
  normal: 10,
  strong: 20,
  chain: 30,
};

const PUZZLE_OBJECTIVES: Objective[] = [
  { type: 'score', target: 1000 },
  { type: 'chains', target: 5 },
  { type: 'links', target: 10 },
];

const createInitialGrid = (): Tile[][] => {
  return Array(GRID_SIZE).fill(null).map((_, y) =>
    Array(GRID_SIZE).fill(null).map((_, x) => ({
      type: 'empty',
      energy: 0,
      position: { x, y },
      id: `${x}-${y}`,
      links: [],
    }))
  );
};

const getAdjacentTiles = (grid: Tile[][], position: Position, range = 1): Tile[] => {
  const adjacent: Tile[] = [];
  for (let y = Math.max(0, position.y - range); y <= Math.min(GRID_SIZE - 1, position.y + range); y++) {
    for (let x = Math.max(0, position.x - range); x <= Math.min(GRID_SIZE - 1, position.x + range); x++) {
      if (x === position.x && y === position.y) continue;
      adjacent.push(grid[y][x]);
    }
  }
  return adjacent;
};

export const useGameStore = create<GameStore>((set, get) => {
  const getObjectiveProgress = (type: ObjectiveType): number => {
    const state = get();
    switch (type) {
      case 'score':
        return Math.min(100, (state.score / (state.target || 1000)) * 100);
      case 'chains':
        return Math.min(100, (state.totalChains / (state.target || 5)) * 100);
      case 'links':
        return Math.min(100, (state.grid.flat().filter((t: Tile) => t.type === 'link').length / (state.target || 10)) * 100);
      default:
        return 0;
    }
  };

  return {
    grid: createInitialGrid(),
    score: 0,
    combo: 0,
    energy: INITIAL_ENERGY,
    gameOver: false,
    gameMode: 'endless',
    chainReactionHistory: [],
    lastChainTimestamp: 0,
    totalChains: 0,
    currentStreak: 0,
    bestStreak: 0,
    achievements: [],
    upgrades: [],
    unlockedAbilities: [],
    highScore: 0,
    level: 1,

    initializeGame: (mode = 'endless') => {
      const grid = createInitialGrid();
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        grid[y][x] = {
          ...grid[y][x],
          type: 'pulse',
          energy: 1,
        };
      }
      const modeState = {
        endless: {},
        timeAttack: { timeRemaining: TIME_ATTACK_DURATION },
        puzzle: { 
          objectives: [PUZZLE_OBJECTIVES[Math.floor(Math.random() * PUZZLE_OBJECTIVES.length)]],
          completedObjectives: 0,
        },
        challenge: { 
          timeRemaining: CHALLENGE_DURATION,
          challengeType: ['score', 'chains', 'links'][Math.floor(Math.random() * 3)] as ObjectiveType,
          target: 500 + (get().level * 100),
          level: get().level || 1,
        },
      }[mode];
      set({
        grid,
        score: 0,
        combo: 0,
        energy: INITIAL_ENERGY,
        gameOver: false,
        gameMode: mode,
        chainReactionHistory: [],
        lastChainTimestamp: 0,
        totalChains: 0,
        currentStreak: 0,
        bestStreak: 0,
        achievements: [],
        upgrades: [],
        unlockedAbilities: [],
        highScore: 0,
        level: modeState.level,
        ...modeState,
      });
      // Timer logic
      if (mode === 'timeAttack' || mode === 'challenge') {
        let timer: ReturnType<typeof setInterval> | null = null;
        timer = setInterval(() => {
          const state = get();
          if (state.gameOver) {
            if (timer) clearInterval(timer);
            return;
          }
          if (state.timeRemaining && state.timeRemaining > 0) {
            set({ timeRemaining: state.timeRemaining - 1000 });
          } else {
            if (timer) clearInterval(timer);
            set({ gameOver: true, timeRemaining: 0 });
          }
        }, 1000);
      }
      setInterval(() => {
        if (!get().gameOver) get().generatePulses();
      }, PULSE_INTERVAL);
    },

    placeLink: (from: Position, to: Position) => {
      set((state) => {
        const newGrid = [...state.grid];
        const fromTile = newGrid[from.y][from.x];
        const toTile = newGrid[to.y][to.x];

        // Check if this is the first link tile
        const isFirstLink = !newGrid.flat().some(tile => tile.type === 'link');

        // Allow placing the first link anywhere, or subsequent links adjacent to an existing link
        const adjacentTiles = getAdjacentTiles(newGrid, to);
        const hasAdjacentLink = adjacentTiles.some(tile => tile.type === 'link');

        if (fromTile.type === 'empty' && toTile.type === 'empty' && state.energy >= LINK_COSTS.normal && (isFirstLink || hasAdjacentLink)) {
          newGrid[to.y][to.x] = {
            ...toTile,
            type: 'link',
            linkType: 'normal',
            energy: 1,
          };

          // Return some energy for completing a link
          const energyReturn = Math.floor(LINK_COSTS.normal * 0.2);
          const newEnergy = Math.min(INITIAL_ENERGY, state.energy - LINK_COSTS.normal + energyReturn);

          return {
            grid: newGrid,
            energy: newEnergy,
          };
        }

        return state;
      });
    },

    triggerChain: (position: Position) => {
      set((state) => {
        const newGrid = [...state.grid];
        const tile = newGrid[position.y][position.x];
        
        if (tile.type === 'pulse' && tile.energy >= 1) {
          const now = Date.now();
          const timeSinceLastChain = now - state.lastChainTimestamp;
          const newCombo = timeSinceLastChain < CHAIN_TIMEOUT ? state.combo + 1 : 1;
          const comboMultiplier = Math.min(2, 1 + (newCombo * 0.1));
          
          // Set the clicked pulse tile to empty
          tile.type = 'empty';
          tile.energy = 0;
          
          // Get adjacent tiles
          const adjacentTiles = getAdjacentTiles(newGrid, position);
          
          // Process adjacent tiles
          adjacentTiles.forEach(adjTile => {
            if (adjTile.type === 'pulse') {
              adjTile.energy += 1;
            } else if (adjTile.type === 'link') {
              // Trigger a chain reaction on link tiles
              get().triggerChain(adjTile.position);
            }
          });
          
          // Count both pulse and link tiles in the chain
          const chainTiles = newGrid.flat().filter(t => t.type === 'pulse' || t.type === 'link');
          const chainValue = chainTiles.reduce((sum, t) => sum + (t.energy || 0), 0);
          const points = Math.floor(chainValue * 10 * comboMultiplier);
          
          // Update score and combo
          const newScore = state.score + points;
          const newStreak = state.currentStreak + 1;
          const bestStreak = Math.max(state.bestStreak, newStreak);
          
          // Mode-specific updates
          if (state.gameMode === 'puzzle' && state.objectives) {
            const completedObjectives = state.completedObjectives || 0;
            const newCompletedObjectives = state.objectives.reduce((count, obj) => {
              if (obj.type === 'score' && newScore >= obj.target) return count + 1;
              if (obj.type === 'chains' && state.totalChains + 1 >= obj.target) return count + 1;
              if (obj.type === 'links' && newGrid.flat().filter(t => t.type === 'link').length >= obj.target) return count + 1;
              return count;
            }, completedObjectives);
            
            if (newCompletedObjectives === state.objectives.length) {
              set({ gameOver: true });
            }
            
            return {
              grid: newGrid,
              combo: newCombo,
              score: newScore,
              energy: Math.min(INITIAL_ENERGY, state.energy + 5),
              lastChainTimestamp: now,
              totalChains: state.totalChains + 1,
              currentStreak: newStreak,
              bestStreak,
              chainReactionHistory: [...state.chainReactionHistory, `${position.x},${position.y}`],
              completedObjectives: newCompletedObjectives,
            };
          }
          
          if (state.gameMode === 'challenge' && state.challengeType && state.target) {
            const progress = getObjectiveProgress(state.challengeType);
            if (progress >= 100) {
              // Level up
              const newLevel = state.level + 1;
              set({ 
                level: newLevel,
                timeRemaining: CHALLENGE_DURATION + (newLevel * 10000),
                target: 500 + (newLevel * 100),
                gameOver: false,
              });
            }
          }
          
          return {
            grid: newGrid,
            combo: newCombo,
            score: newScore,
            energy: Math.min(INITIAL_ENERGY, state.energy + 5),
            lastChainTimestamp: now,
            totalChains: state.totalChains + 1,
            currentStreak: newStreak,
            bestStreak,
            chainReactionHistory: [...state.chainReactionHistory, `${position.x},${position.y}`],
          };
        }
        
        return state;
      });
    },

    generatePulses: () => {
      set((state) => {
        const newGrid = [...state.grid];
        let pulseCount = 0;
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (newGrid[y][x].type === 'pulse') {
              pulseCount++;
            }
          }
        }
        while (pulseCount < 5) {
          const x = Math.floor(Math.random() * GRID_SIZE);
          const y = Math.floor(Math.random() * GRID_SIZE);
          if (newGrid[y][x].type === 'empty') {
            newGrid[y][x] = {
              ...newGrid[y][x],
              type: 'pulse',
              energy: 1,
            };
            pulseCount++;
          }
        }
        return { grid: newGrid };
      });
    },

    upgradeAbility: (upgradeId: string) => {
      set((state) => {
        const upgrade = state.upgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel || state.energy < upgrade.cost) {
          return state;
        }

        return {
          upgrades: state.upgrades.map(u => 
            u.id === upgradeId 
              ? { ...u, level: u.level + 1, effect: { ...u.effect, ...u.effect } }
              : u
          ),
          energy: state.energy - upgrade.cost,
        };
      });
    },

    checkAchievements: () => {
      set((state) => {
        const newAchievements = state.achievements.map(achievement => {
          let progress = achievement.progress;
          switch (achievement.id) {
            case 'total_chains':
              progress = state.totalChains;
              break;
            case 'high_score':
              progress = state.score;
              break;
            case 'best_streak':
              progress = state.bestStreak;
              break;
          }
          return {
            ...achievement,
            progress,
            completed: progress >= 100,
          };
        });
        return { achievements: newAchievements };
      });
    },

    updateTimeRemaining: (time: number) => {
      set({ timeRemaining: time });
    },

    updateScore: (points: number) => {
      set((state) => ({
        score: state.score + points,
        highScore: Math.max(state.highScore, state.score + points),
      }));
    },

    resetGame: () => {
      set({
        grid: createInitialGrid(),
        score: 0,
        combo: 0,
        energy: INITIAL_ENERGY,
        gameOver: false,
        currentStreak: 0,
        chainReactionHistory: [],
        lastChainTimestamp: 0,
      });
    },
  };
}); 