import { useState } from 'react';
import styled from '@emotion/styled';
import { useGameStore } from '../store/gameStore';
import type { Tile } from '../types/game';

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  max-width: 600px;
  margin: 0 auto;
`;

const Tile = styled.div<{ type: string }>`
  aspect-ratio: 1;
  background: ${({ type }) => {
    switch (type) {
      case 'pulse':
        return 'linear-gradient(45deg, #ff6b6b, #ff8787)';
      case 'link':
        return 'linear-gradient(45deg, #4ecdc4, #45b7af)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  position: relative;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
  }
`;

const EnergyIndicator = styled.div<{ energy: number }>`
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
`;

const GameBoard: React.FC = () => {
  const { grid, placeLink, triggerChain } = useGameStore();
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  const handleTileClick = (tile: Tile) => {
    if (tile.type === 'pulse') {
      triggerChain(tile.position);
    } else if (tile.type === 'empty' && selectedTile) {
      placeLink(selectedTile.position, tile.position);
      setSelectedTile(null);
    } else if (tile.type === 'link') {
      setSelectedTile(tile);
    }
  };

  return (
    <Board>
      {grid.map(row =>
        row.map(tile => (
          <Tile
            key={tile.id}
            type={tile.type}
            onClick={() => handleTileClick(tile)}
            style={{
              transform: selectedTile?.id === tile.id ? 'scale(1.1)' : undefined,
              boxShadow: selectedTile?.id === tile.id ? '0 0 20px rgba(255, 255, 255, 0.3)' : undefined,
            }}
          >
            {tile.type === 'pulse' && '⚡'}
            {tile.type === 'link' && '🔗'}
            {tile.energy > 0 && <EnergyIndicator energy={tile.energy}>{tile.energy}</EnergyIndicator>}
          </Tile>
        ))
      )}
    </Board>
  );
};

export default GameBoard; 