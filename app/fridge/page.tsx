'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserMemory } from '@/lib/types';
import { CORE_VOCABULARY } from '@/lib/core-vocab';

// Get slot type for color coding
function getSlotTypeForWord(word: string): string | null {
  const lowerWord = word.toLowerCase();
  for (const [slotType, words] of Object.entries(CORE_VOCABULARY)) {
    if (words.map(w => w.toLowerCase()).includes(lowerWord)) {
      return slotType;
    }
  }
  return null;
}

// Magnet colors based on slot type
function getMagnetColor(slotType: string | null): string {
  switch (slotType) {
    case 'WHO': return 'bg-gradient-to-br from-purple-400 to-purple-600';
    case 'ACTION': return 'bg-gradient-to-br from-blue-400 to-blue-600';
    case 'OBJECT': return 'bg-gradient-to-br from-green-400 to-green-600';
    case 'LOCATION': return 'bg-gradient-to-br from-orange-400 to-orange-600';
    case 'MODIFIERS': return 'bg-gradient-to-br from-pink-400 to-pink-600';
    default: return 'bg-gradient-to-br from-gray-400 to-gray-600';
  }
}

// Generate pseudo-random rotation based on word
function getRotation(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = word.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (hash % 11) - 5; // -5 to +5 degrees
}

// Achievement type
interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
}

export default function Fridge() {
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimated, setIsAnimated] = useState(false);

  // Fetch memory on load
  useEffect(() => {
    const fetchMemory = async () => {
      const sessionId = localStorage.getItem('aac-session-id');
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/memory?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setMemory(data);
        }
      } catch (err) {
        console.error('Failed to fetch memory:', err);
      }
      setIsLoading(false);
      // Trigger animations after data loads
      setTimeout(() => setIsAnimated(true), 100);
    };

    fetchMemory();
  }, []);

  // Calculate magnets and achievements
  const { magnets, achievements } = useMemo(() => {
    if (!memory) return { magnets: [], achievements: [] };

    const wordStats = memory.wordStats || {};
    const masteryForecast = memory.masteryForecast || [];

    // Words with count > 3 become magnets
    const magnetWords = Object.entries(wordStats)
      .filter(([, stats]) => stats.count >= 3)
      .map(([word, stats]) => ({
        word,
        count: stats.count,
        slotType: getSlotTypeForWord(word),
        rotation: getRotation(word),
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate achievements
    const achievementList: Achievement[] = [];

    // Check for first words (count = 1)
    const firstWords = Object.entries(wordStats).filter(([, s]) => s.count === 1);
    if (firstWords.length > 0) {
      achievementList.push({
        id: 'first-word',
        title: 'First Steps!',
        description: `${firstWords.length} new word${firstWords.length > 1 ? 's' : ''} started`,
        emoji: '🌟',
        color: 'from-yellow-400 to-amber-500',
      });
    }

    // Check for 5+ uses
    const fiveUses = Object.entries(wordStats).filter(([, s]) => s.count >= 5 && s.count < 10);
    if (fiveUses.length > 0) {
      achievementList.push({
        id: 'five-uses',
        title: '5 Uses Club!',
        description: `${fiveUses.length} word${fiveUses.length > 1 ? 's' : ''} used 5+ times`,
        emoji: '🎯',
        color: 'from-blue-400 to-cyan-500',
      });
    }

    // Check for 10+ uses
    const tenUses = Object.entries(wordStats).filter(([, s]) => s.count >= 10 && s.count < 15);
    if (tenUses.length > 0) {
      achievementList.push({
        id: 'ten-uses',
        title: '10 Uses Pro!',
        description: `${tenUses.length} word${tenUses.length > 1 ? 's' : ''} used 10+ times`,
        emoji: '🏆',
        color: 'from-purple-400 to-violet-500',
      });
    }

    // Check for mastered words
    const masteredWords = masteryForecast.filter(f => f.level === 'mastered');
    if (masteredWords.length > 0) {
      achievementList.push({
        id: 'mastered',
        title: 'Word Master!',
        description: `${masteredWords.length} word${masteredWords.length > 1 ? 's' : ''} mastered!`,
        emoji: '👑',
        color: 'from-green-400 to-emerald-500',
      });
    }

    // Total words achievement
    const totalWords = Object.values(wordStats).reduce((sum, s) => sum + s.count, 0);
    if (totalWords >= 10) {
      achievementList.push({
        id: 'communicator',
        title: totalWords >= 50 ? 'Super Communicator!' : 'Active Communicator!',
        description: `${totalWords} total words spoken`,
        emoji: totalWords >= 50 ? '🚀' : '💬',
        color: totalWords >= 50 ? 'from-rose-400 to-red-500' : 'from-teal-400 to-cyan-500',
      });
    }

    return { magnets: magnetWords, achievements: achievementList };
  }, [memory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Opening the fridge...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (magnets.length === 0) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-slide-up">
          <div className="text-6xl mb-4 animate-bounce-in">🧲</div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Fridge is Empty!</h1>
          <p className="text-gray-400 mb-4">
            Use words 3 or more times to earn magnets for your celebration fridge!
          </p>
          <p className="text-sm text-gray-500">
            Keep speaking sentences to fill up your fridge with colorful word magnets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col page-transition">
      {/* Fridge Door */}
      <div 
        className="flex-1 m-4 rounded-3xl overflow-hidden relative animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 50%, #c0c0c0 100%)',
          boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.5), inset 0 -5px 20px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Fridge Handle */}
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-32 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #999 0%, #ccc 50%, #999 100%)',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
          }}
        />

        {/* Magnets Area */}
        <div className="p-6 pr-12">
          <div className="flex flex-wrap gap-4 justify-center">
            {magnets.map(({ word, count, slotType, rotation }, index) => {
              // Scale size based on count
              const scale = Math.min(1 + (count - 3) * 0.05, 1.3);
              
              return (
                <div
                  key={word}
                  className={`
                    ${getMagnetColor(slotType)}
                    px-4 py-2 rounded-lg text-white font-bold
                    shadow-lg cursor-default select-none
                    transition-transform duration-300
                    hover-wiggle hover:scale-110
                    ${isAnimated ? 'animate-fall-in' : 'opacity-0'}
                  `}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${scale})`,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <span className="capitalize">{word}</span>
                  {count >= 10 && <span className="ml-1 text-xs opacity-75">⭐</span>}
                </div>
              );
            })}
          </div>

          {/* Stickers scattered around */}
          {achievements.length > 0 && (
            <>
              {/* Top-left sticker */}
              <div 
                className={`absolute top-4 left-4 transform -rotate-6 ${isAnimated ? 'animate-bounce-in' : 'opacity-0'}`}
                style={{ 
                  filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
                  animationDelay: '500ms',
                }}
              >
                <div className="bg-yellow-300 text-yellow-900 px-3 py-2 rounded-lg text-sm font-bold">
                  ⭐ {magnets.length} magnets!
                </div>
              </div>

              {/* Bottom-right sticker */}
              {achievements.find(a => a.id === 'mastered') && (
                <div 
                  className={`absolute bottom-20 right-16 transform rotate-3 ${isAnimated ? 'animate-bounce-in' : 'opacity-0'}`}
                  style={{ 
                    filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
                    animationDelay: '700ms',
                  }}
                >
                  <div className="bg-green-300 text-green-900 px-3 py-2 rounded-lg text-sm font-bold">
                    👑 Word Master!
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2 animate-slide-up">
          <span>🏅</span> Achievements
        </h2>
        
        {achievements.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`
                  p-4 rounded-xl bg-gradient-to-br ${achievement.color}
                  text-white shadow-lg
                  transition-all duration-300
                  hover:scale-[1.02] hover:shadow-xl
                  ${isAnimated ? 'animate-slide-up' : 'opacity-0'}
                `}
                style={{ 
                  animationDelay: `${800 + index * 100}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl animate-bounce-in" style={{ animationDelay: `${1000 + index * 100}ms` }}>
                    {achievement.emoji}
                  </span>
                  <div>
                    <h3 className="font-bold">{achievement.title}</h3>
                    <p className="text-sm opacity-90">{achievement.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-4 text-center animate-fade-in">
            <p className="text-gray-400">
              Keep using words to unlock achievements! 🎯
            </p>
          </div>
        )}
      </div>

      {/* Fun footer */}
      <div className="px-4 pb-4 text-center animate-fade-in" style={{ animationDelay: '1200ms' }}>
        <p className="text-gray-500 text-sm">
          ✨ Every word you speak adds to your collection! ✨
        </p>
      </div>
    </div>
  );
}
