'use client';

import { useState } from 'react';

interface WordGridProps {
  words: string[];
  onWordSelect: (word: string) => void;
  columns?: 2 | 3;
  selectedWord?: string | null;
}

export function WordGrid({ words, onWordSelect, columns = 3, selectedWord }: WordGridProps) {
  const [tappedWord, setTappedWord] = useState<string | null>(null);
  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  const handleWordClick = (word: string) => {
    setTappedWord(word);
    
    // Trigger the fly-up animation, then select
    setTimeout(() => {
      onWordSelect(word);
      setTappedWord(null);
    }, 150);
  };

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {words.map((word, index) => {
        const isSelected = word === selectedWord;
        const isTapped = word === tappedWord;
        
        return (
          <button
            key={word}
            onClick={() => handleWordClick(word)}
            className={`
              min-h-[60px] px-4 py-3 rounded-xl text-lg font-medium 
              transition-all duration-200 transform
              btn-ripple tap-scale
              animate-slide-up
              ${isSelected
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 text-white hover-glow'
              }
              ${isTapped ? 'scale-110 bg-blue-500 shadow-lg shadow-blue-500/50' : ''}
            `}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards',
            }}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}
