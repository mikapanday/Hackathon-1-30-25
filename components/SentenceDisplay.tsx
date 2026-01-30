'use client';

import { useEffect, useRef, useState } from 'react';
import { SlotType, SentenceSlot } from '@/lib/types';
import { STEP_ORDER } from '@/lib/core-vocab';

interface SentenceDisplayProps {
  slots: Record<SlotType, SentenceSlot>;
  currentStep?: SlotType;
  onWordTap?: (step: SlotType) => void;
}

export function SentenceDisplay({ slots, currentStep, onWordTap }: SentenceDisplayProps) {
  const [animatingWord, setAnimatingWord] = useState<SlotType | null>(null);
  const prevSlotsRef = useRef<Record<SlotType, SentenceSlot>>(slots);

  // Detect when a new word is added
  useEffect(() => {
    for (const step of STEP_ORDER) {
      const prevValue = prevSlotsRef.current[step].value;
      const currentValue = slots[step].value;
      
      if (currentValue && !prevValue) {
        // New word added - trigger animation
        setAnimatingWord(step);
        setTimeout(() => setAnimatingWord(null), 300);
        break;
      }
    }
    prevSlotsRef.current = { ...slots };
  }, [slots]);

  // Check if any slots are filled
  const hasWords = STEP_ORDER.some(step => slots[step].value !== null);

  return (
    <div className="px-4 py-6 border-b border-gray-800 animate-fade-in">
      <p className="text-sm text-gray-500 mb-2">[Constructing Sentence here]</p>
      <div className="min-h-[60px] flex items-center flex-wrap gap-2">
        {hasWords ? (
          STEP_ORDER.map((step) => {
            const slot = slots[step];
            if (!slot.value) return null;
            
            const isCurrentStep = step === currentStep;
            const isAnimating = step === animatingWord;
            
            return (
              <button
                key={step}
                onClick={() => onWordTap?.(step)}
                className={`
                  px-4 py-2 rounded-lg text-lg font-medium 
                  transition-all duration-200 transform
                  ${isAnimating ? 'animate-pop-in' : ''}
                  ${isCurrentStep
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-[#1a1a1a] scale-105'
                    : 'bg-gray-700 text-white hover:bg-gray-600 hover:scale-105 active:scale-95'
                  }
                `}
              >
                {slot.value}
                {slot.isCustom && (
                  <span className="ml-1 text-xs opacity-60">✏️</span>
                )}
              </button>
            );
          })
        ) : (
          <p className="text-gray-500 italic animate-fade-in">
            Tap words below to build your sentence
          </p>
        )}
      </div>
    </div>
  );
}
