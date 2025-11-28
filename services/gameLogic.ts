import { BOARD_SIZE, DIRECTIONS } from '../constants';
import { Player } from '../types';

export const createEmptyGrid = (): Player[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
};

export const checkWin = (
  grid: Player[][],
  x: number,
  y: number,
  player: Player
): { x: number; y: number }[] | null => {
  for (const [dx, dy] of DIRECTIONS) {
    const line: { x: number; y: number }[] = [{ x, y }];

    // Check forward
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && grid[ny][nx] === player) {
        line.push({ x: nx, y: ny });
      } else {
        break;
      }
    }

    // Check backward
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && grid[ny][nx] === player) {
        line.push({ x: nx, y: ny });
      } else {
        break;
      }
    }

    if (line.length >= 5) {
      return line;
    }
  }
  return null;
};

// Check if board is full (Draw)
export const checkDraw = (grid: Player[][]): boolean => {
  return grid.every(row => row.every(cell => cell !== Player.None));
};