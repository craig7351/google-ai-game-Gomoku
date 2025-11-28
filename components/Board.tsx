import React from 'react';
import { BOARD_SIZE } from '../constants';
import { Player, Move } from '../types';
import { Stone } from './Stone';

interface BoardProps {
  grid: Player[][];
  lastMove: Move | null;
  winningLine: { x: number; y: number }[] | null;
  onCellClick: (x: number, y: number) => void;
  disabled?: boolean;
}

export const Board: React.FC<BoardProps> = ({ grid, lastMove, winningLine, onCellClick, disabled }) => {
  return (
    <div 
      className="relative wood-texture rounded shadow-2xl p-2 sm:p-4 select-none"
      style={{
        width: 'min(90vw, 600px)',
        height: 'min(90vw, 600px)',
      }}
    >
      {/* Grid Lines Layer */}
      <div className="absolute inset-0 m-2 sm:m-4 grid grid-cols-15 grid-rows-15 pointer-events-none">
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
          const x = i % BOARD_SIZE;
          const y = Math.floor(i / BOARD_SIZE);
          
          // Determine borders for grid lines
          const isTop = y === 0;
          const isBottom = y === BOARD_SIZE - 1;
          const isLeft = x === 0;
          const isRight = x === BOARD_SIZE - 1;

          return (
            <div key={i} className="relative w-full h-full flex items-center justify-center">
              {/* Horizontal Line */}
              <div className={`absolute h-px bg-stone-800 w-full ${isLeft ? 'left-1/2 w-1/2' : ''} ${isRight ? 'right-1/2 w-1/2' : ''}`} />
              {/* Vertical Line */}
              <div className={`absolute w-px bg-stone-800 h-full ${isTop ? 'top-1/2 h-1/2' : ''} ${isBottom ? 'bottom-1/2 h-1/2' : ''}`} />
              
              {/* Center Dot (Tengen) and Star points */}
              {((x === 3 || x === 11 || x === 7) && (y === 3 || y === 11 || y === 7)) && (
                <div className="absolute w-1.5 h-1.5 bg-stone-900 rounded-full z-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Interactivity Layer (Click & Stones) */}
      <div className="absolute inset-0 m-2 sm:m-4 grid grid-cols-15 grid-rows-15 z-10">
        {grid.map((row, y) => (
           row.map((cell, x) => {
             const isWinning = winningLine?.some(p => p.x === x && p.y === y);
             const isLast = lastMove?.x === x && lastMove?.y === y;
             
             return (
               <div 
                 key={`${x}-${y}`}
                 className={`
                    relative flex items-center justify-center cursor-pointer
                    ${isWinning ? 'bg-green-500/30 rounded-full' : ''}
                 `}
                 onClick={() => !disabled && onCellClick(x, y)}
               >
                 <Stone type={cell} isLastMove={isLast} />
                 
                 {/* Transparent hover target for empty cells */}
                 {!disabled && cell === Player.None && (
                   <div className="absolute w-4 h-4 rounded-full bg-black/0 hover:bg-black/10 transition-colors" />
                 )}
               </div>
             );
           })
         ))}
      </div>
    </div>
  );
};