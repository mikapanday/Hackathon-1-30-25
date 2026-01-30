'use client';

import { useState } from 'react';
import { TTSPlayer } from './TTSPlayer';

interface FreeTypeModeProps {
  sessionId?: string;
  onSpeak?: (text: string) => void;
}

const QUICK_PHRASES = [
  'Yes',
  'No', 
  'Help',
  'More please',
  'All done',
  'Thank you',
  'I need help',
  'Wait',
];

export function FreeTypeMode({ sessionId, onSpeak }: FreeTypeModeProps) {
  const [text, setText] = useState('');

  const handleQuickPhrase = (phrase: string) => {
    setText(phrase);
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Text Input Area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        <div className="relative flex-1 animate-slide-up">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type anything to speak..."
            className="w-full h-full min-h-[120px] p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-gray-600"
          />
          {text && (
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
              title="Clear text"
            >
              ×
            </button>
          )}
        </div>

        {/* Character count */}
        <div className="text-right text-sm text-gray-500 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {text.length} characters
        </div>
      </div>

      {/* Quick Phrases */}
      <div className="px-4 pb-4">
        <p className="text-sm text-gray-500 mb-2 animate-fade-in" style={{ animationDelay: '150ms' }}>Quick phrases:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PHRASES.map((phrase, index) => (
            <button
              key={phrase}
              onClick={() => handleQuickPhrase(phrase)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium 
                transition-all duration-200 transform
                btn-ripple
                animate-slide-up
                ${text === phrase
                  ? 'bg-blue-600 text-white scale-[1.02] shadow-lg shadow-blue-500/20'
                  : 'bg-gray-700 hover:bg-gray-600 hover:scale-[1.02] active:scale-[0.98] text-white'
                }
              `}
              style={{ animationDelay: `${200 + index * 50}ms` }}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* TTS Player */}
      <div className="px-4 pb-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <TTSPlayer 
          text={text} 
          sessionId={sessionId}
          onSpeak={onSpeak}
        />
      </div>
    </div>
  );
}
