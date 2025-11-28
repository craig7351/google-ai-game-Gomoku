import React from 'react';
import { Player } from '../types';

interface StoneProps {
  type: Player;
  isLastMove?: boolean;
}

export const Stone: React.FC<StoneProps> = ({ type, isLastMove }) => {
  if (type === Player.None) return null;

  const isBlack = type === Player.Black;

  return (
    <div className={`
      w-[85%] h-[85%] rounded-full stone-shadow
      transition-all duration-300 transform scale-100
      flex items-center justify-center
      ${isBlack 
        ? 'bg-gradient-to-br from-stone-700 via-stone-900 to-black' 
        : 'bg-gradient-to-br from-white via-stone-100 to-stone-300'}
    `}>
      {/* Glossy reflection */}
      <div className={`
        absolute top-[15%] left-[15%] w-[30%] h-[30%] rounded-full 
        bg-gradient-to-br from-white/40 to-transparent
      `} />
      
      {/* Last move indicator */}
      {isLastMove && (
        <div className={`w-2 h-2 rounded-full ${isBlack ? 'bg-red-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(239,68,68,0.8)]`} />
      )}
    </div>
  );
};