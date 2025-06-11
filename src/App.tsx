import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import GameBoard from './components/GameBoard';
import { useGameStore } from './store/gameStore';
import type { GameMode } from './types/game';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: white;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin: 0;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
`;

const GameStats = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Stat = styled.div`
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: #fff;
  font-family: 'Courier New', monospace;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Timer = styled(Stat)`
  color: #ff6b6b;
  font-size: 1.2rem;
  font-weight: bold;
`;

const Objective = styled.div`
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: #fff;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &.completed {
    color: #4caf50;
  }
`;

const ObjectiveProgress = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: #4caf50;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const GameModes = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ModeButton = styled.button<{ active: boolean }>`
  background: ${({ active }) => active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: #fff;
  font-size: 3rem;
  font-weight: bold;
`;

const HowToPlay = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  border-radius: 8px;
  max-width: 300px;
  color: #fff;
  font-size: 0.9rem;
  line-height: 1.5;
`;

function App() {
  const { 
    score, 
    combo, 
    energy, 
    gameMode,
    timeRemaining,
    objectives,
    completedObjectives,
    challengeType,
    target,
    initializeGame,
    highScore,
    currentStreak,
    bestStreak,
    gameOver
  } = useGameStore();

  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');
  const [showStart, setShowStart] = useState(true);
  const [showEnd, setShowEnd] = useState(false);
  const [startText, setStartText] = useState('Ready...');

  useEffect(() => {
    setShowStart(true);
    setShowEnd(false);
    setStartText('Ready...');
    const readyTimeout = setTimeout(() => setStartText('Go!'), 1000);
    const goTimeout = setTimeout(() => setShowStart(false), 2000);
    return () => {
      clearTimeout(readyTimeout);
      clearTimeout(goTimeout);
    };
  }, [gameMode]);

  useEffect(() => {
    if (gameOver) {
      setShowEnd(true);
    }
  }, [gameOver]);

  useEffect(() => {
    initializeGame(selectedMode);
  }, [initializeGame, selectedMode]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getObjectiveProgress = (type: string) => {
    switch (type) {
      case 'score':
        return Math.min(100, (score / (target || 1000)) * 100);
      case 'chains':
        return Math.min(100, (useGameStore.getState().totalChains / (target || 5)) * 100);
      case 'links':
        return Math.min(100, (useGameStore.getState().grid.flat().filter(t => t.type === 'link').length / (target || 10)) * 100);
      default:
        return 0;
    }
  };

  const handleRestart = () => {
    initializeGame(gameMode);
    setShowEnd(false);
    setShowStart(true);
    setStartText('Ready...');
    setTimeout(() => setStartText('Go!'), 1000);
    setTimeout(() => setShowStart(false), 2000);
  };

  return (
    <AppContainer>
      <Header>
        <Title>LinkDrop</Title>
        <GameModes>
          <ModeButton 
            active={selectedMode === 'endless'} 
            onClick={() => setSelectedMode('endless')}
          >
            Endless
          </ModeButton>
          <ModeButton 
            active={selectedMode === 'timeAttack'} 
            onClick={() => setSelectedMode('timeAttack')}
          >
            Time Attack
          </ModeButton>
          <ModeButton 
            active={selectedMode === 'puzzle'} 
            onClick={() => setSelectedMode('puzzle')}
          >
            Puzzle
          </ModeButton>
          <ModeButton 
            active={selectedMode === 'challenge'} 
            onClick={() => setSelectedMode('challenge')}
          >
            Challenge
          </ModeButton>
        </GameModes>
        <GameStats>
          <Stat>Score: {score}</Stat>
          <Stat>High Score: {highScore}</Stat>
          <Stat>Combo: {combo}x</Stat>
          <Stat>Energy: {energy}</Stat>
          <Stat>Streak: {currentStreak}</Stat>
          <Stat>Best Streak: {bestStreak}</Stat>
          {gameMode === 'timeAttack' && timeRemaining && (
            <Timer>Time: {formatTime(timeRemaining)}</Timer>
          )}
          {gameMode === 'challenge' && timeRemaining && (
            <Timer>Time: {formatTime(timeRemaining)}</Timer>
          )}
        </GameStats>
        {gameMode === 'puzzle' && objectives && (
          <div>
            {objectives.map((obj, index) => (
              <Objective key={index} className={completedObjectives && completedObjectives > index ? 'completed' : ''}>
                {obj.type === 'score' && '🎯'}
                {obj.type === 'chains' && '⚡'}
                {obj.type === 'links' && '🔗'}
                {obj.type === 'score' && `Score ${score}/${obj.target}`}
                {obj.type === 'chains' && `Chains ${useGameStore.getState().totalChains}/${obj.target}`}
                {obj.type === 'links' && `Links ${useGameStore.getState().grid.flat().filter(t => t.type === 'link').length}/${obj.target}`}
                <ObjectiveProgress>
                  <ProgressFill progress={getObjectiveProgress(obj.type)} />
                </ObjectiveProgress>
              </Objective>
            ))}
          </div>
        )}
        {gameMode === 'challenge' && challengeType && target && (
          <Objective>
            {challengeType === 'score' && '🎯'}
            {challengeType === 'chains' && '⚡'}
            {challengeType === 'links' && '🔗'}
            {challengeType === 'score' && `Score ${score}/${target}`}
            {challengeType === 'chains' && `Chains ${useGameStore.getState().totalChains}/${target}`}
            {challengeType === 'links' && `Links ${useGameStore.getState().grid.flat().filter(t => t.type === 'link').length}/${target}`}
            <ObjectiveProgress>
              <ProgressFill progress={getObjectiveProgress(challengeType)} />
            </ObjectiveProgress>
          </Objective>
        )}
      </Header>
      <AnimatePresence>
        {showStart && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="start"
          >
            {startText}
          </Overlay>
        )}
        {showEnd && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="end"
            onClick={handleRestart}
            style={{ cursor: 'pointer', fontSize: '2.5rem', flexDirection: 'column' }}
          >
            {gameMode === 'timeAttack' ? "Time's Up!" : 'Game Over'}
            <div style={{ fontSize: '1.5rem', marginTop: '1rem' }}>(Click to restart)</div>
          </Overlay>
        )}
      </AnimatePresence>
      <div style={{ pointerEvents: showStart || showEnd ? 'none' : 'auto', filter: showStart || showEnd ? 'blur(2px)' : 'none' }}>
        <GameBoard />
      </div>
      <HowToPlay>
        <h3>How to Play</h3>
        <p>• Place green (link) tiles adjacent to existing green tiles.</p>
        <p>• The first green tile can be placed anywhere.</p>
        <p>• Click on pulse tiles (red) to trigger chain reactions.</p>
        <p>• Complete objectives to progress in Puzzle and Challenge modes.</p>
        <h3>Game Modes</h3>
        <p><strong>Endless:</strong> Play as long as you can, with no time limit.</p>
        <p><strong>Time Attack:</strong> Race against the clock to score as many points as possible.</p>
        <p><strong>Puzzle:</strong> Complete specific objectives to advance to the next level.</p>
        <p><strong>Challenge:</strong> Endless levels with increasing difficulty. Complete objectives to level up and earn more time.</p>
      </HowToPlay>
    </AppContainer>
  );
}

export default App;
