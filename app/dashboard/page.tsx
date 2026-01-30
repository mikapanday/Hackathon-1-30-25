'use client';

import { useState, useEffect } from 'react';
import { UserMemory, MasteryForecast } from '@/lib/types';
import { CORE_VOCABULARY } from '@/lib/core-vocab';

// Determine slot type for a word (for color coding)
function getSlotTypeForWord(word: string): string | null {
  const lowerWord = word.toLowerCase();
  for (const [slotType, words] of Object.entries(CORE_VOCABULARY)) {
    if (words.map(w => w.toLowerCase()).includes(lowerWord)) {
      return slotType;
    }
  }
  return null;
}

// Get color for slot type
function getSlotColor(slotType: string | null): string {
  switch (slotType) {
    case 'WHO': return 'bg-purple-500';
    case 'ACTION': return 'bg-blue-500';
    case 'OBJECT': return 'bg-green-500';
    case 'LOCATION': return 'bg-orange-500';
    case 'MODIFIERS': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
}

// Get mastery level color
function getMasteryColor(level: MasteryForecast['level']): string {
  switch (level) {
    case 'emerging': return 'text-red-400 bg-red-500/20';
    case 'developing': return 'text-yellow-400 bg-yellow-500/20';
    case 'mastered': return 'text-green-400 bg-green-500/20';
  }
}

// Get mastery progress percentage
function getMasteryProgress(level: MasteryForecast['level']): number {
  switch (level) {
    case 'emerging': return 25;
    case 'developing': return 60;
    case 'mastered': return 100;
  }
}

export default function Dashboard() {
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setError('Failed to load statistics');
      }
      setIsLoading(false);
      // Trigger animations after data loads
      setTimeout(() => setIsAnimated(true), 100);
    };

    fetchMemory();
  }, []);

  // Calculate stats
  const wordStats = memory?.wordStats || {};
  const combinationStats = memory?.combinationStats || {};
  const masteryForecast = memory?.masteryForecast || [];

  const totalWordsSpoken = Object.values(wordStats).reduce((sum, stat) => sum + stat.count, 0);
  const uniqueWordsUsed = Object.keys(wordStats).length;
  
  // Find most used word
  const sortedWords = Object.entries(wordStats).sort((a, b) => b[1].count - a[1].count);
  const mostUsedWord = sortedWords[0]?.[0] || 'None yet';
  const topWords = sortedWords.slice(0, 15);
  const maxWordCount = topWords[0]?.[1].count || 1;

  // Sort combinations
  const sortedCombinations = Object.entries(combinationStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading your stats...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (totalWordsSpoken === 0) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-slide-up">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-white mb-2">No Stats Yet</h1>
          <p className="text-gray-400">
            Start using words to see your statistics! Go back to the home page and speak some sentences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] p-4 space-y-6 page-transition">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-white animate-fade-in">Dashboard</h1>

      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalWordsSpoken, label: 'Total Words', color: 'text-blue-400' },
          { value: uniqueWordsUsed, label: 'Unique Words', color: 'text-green-400' },
          { value: mostUsedWord, label: 'Most Used', color: 'text-purple-400', isText: true },
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-gray-800 rounded-xl p-4 text-center animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`${stat.isText ? 'text-xl truncate' : 'text-3xl'} font-bold ${stat.color} ${isAnimated ? 'animate-count-up' : ''}`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Word Frequency Section */}
      <div className="bg-gray-800 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Word Usage</h2>
        {topWords.length > 0 ? (
          <div className="space-y-2">
            {topWords.map(([word, stats], index) => {
              const slotType = getSlotTypeForWord(word);
              const barWidth = (stats.count / maxWordCount) * 100;
              
              return (
                <div 
                  key={word} 
                  className="flex items-center gap-3 animate-slide-up"
                  style={{ animationDelay: `${400 + index * 50}ms` }}
                >
                  <div className="w-20 text-sm text-white truncate capitalize">{word}</div>
                  <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getSlotColor(slotType)} transition-all duration-1000 ease-out`}
                      style={{ 
                        width: isAnimated ? `${barWidth}%` : '0%',
                        transitionDelay: `${500 + index * 50}ms`
                      }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm text-gray-400">{stats.count}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No word data yet</p>
        )}
      </div>

      {/* Common Combinations */}
      <div className="bg-gray-800 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Common Phrases</h2>
        {sortedCombinations.length > 0 ? (
          <div className="space-y-2">
            {sortedCombinations.map(([combination, stats], index) => {
              const [word1, word2] = combination.split('+');
              return (
                <div
                  key={combination}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg animate-slide-up hover:bg-gray-700 transition-colors"
                  style={{ animationDelay: `${600 + index * 50}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white capitalize">{word1}</span>
                    <span className="text-gray-500">+</span>
                    <span className="text-white capitalize">{word2}</span>
                  </div>
                  <div className="px-3 py-1 bg-gray-600 rounded-full text-sm text-gray-300">
                    {stats.count}×
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No phrase combinations yet</p>
        )}
      </div>

      {/* Mastery Forecast */}
      <div className="bg-gray-800 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '700ms' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Learning Progress</h2>
        {masteryForecast.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {masteryForecast.map((forecast, index) => (
              <div
                key={forecast.word}
                className="p-4 bg-gray-700/50 rounded-xl animate-slide-up hover:bg-gray-700 transition-colors"
                style={{ animationDelay: `${800 + index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium capitalize">{forecast.word}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMasteryColor(forecast.level)}`}>
                    {forecast.level === 'emerging' && '🌱'}
                    {forecast.level === 'developing' && '📈'}
                    {forecast.level === 'mastered' && '⭐'}
                    {' '}{forecast.level}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${
                      forecast.level === 'mastered'
                        ? 'bg-green-500'
                        : forecast.level === 'developing'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      width: isAnimated ? `${getMasteryProgress(forecast.level)}%` : '0%',
                      transitionDelay: `${900 + index * 50}ms`
                    }}
                  />
                </div>

                {/* Projected date */}
                {forecast.projectedMasteryDate && forecast.level !== 'mastered' && (
                  <p className="text-xs text-gray-400">
                    Est. mastery: {new Date(forecast.projectedMasteryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            Keep using words to see your learning progress!
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-800 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '900ms' }}>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Word Type Colors</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { type: 'WHO', color: 'bg-purple-500' },
            { type: 'ACTION', color: 'bg-blue-500' },
            { type: 'OBJECT', color: 'bg-green-500' },
            { type: 'LOCATION', color: 'bg-orange-500' },
            { type: 'MODIFIERS', color: 'bg-pink-500' },
            { type: 'Custom', color: 'bg-gray-500' },
          ].map(({ type, color }) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-xs text-gray-400">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
