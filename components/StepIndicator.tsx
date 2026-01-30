'use client';

import { SlotType, SentenceSlot } from '@/lib/types';
import { STEP_ORDER, STEP_LABELS } from '@/lib/core-vocab';

interface StepIndicatorProps {
  currentStep: SlotType;
  slots: Record<SlotType, SentenceSlot>;
}

export function StepIndicator({ currentStep, slots }: StepIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const label = STEP_LABELS[currentStep];

  return (
    <div className="flex items-center gap-3 animate-fade-in">
      {/* Step label */}
      <div className="text-sm font-medium text-gray-400 min-w-[80px]">
        {label}
      </div>
      
      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {STEP_ORDER.map((step, index) => {
          const slot = slots[step];
          const isCurrent = step === currentStep;
          const isFilled = slot.value !== null;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <div
              key={step}
              className={`
                w-3 h-3 rounded-full transition-all duration-300 transform
                ${isCurrent 
                  ? 'bg-blue-500 scale-125 ring-2 ring-blue-400 ring-offset-1 ring-offset-[#1a1a1a] animate-pulse'
                  : isFilled
                  ? 'bg-green-500 animate-pop-in'
                  : isPast
                  ? 'bg-gray-600'
                  : isFuture
                  ? 'bg-gray-700'
                  : 'bg-gray-600'
                }
              `}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              title={STEP_LABELS[step]}
            />
          );
        })}
      </div>
      
      {/* Step counter */}
      <div className="text-xs text-gray-500 ml-2">
        {currentIndex + 1}/{STEP_ORDER.length}
      </div>
    </div>
  );
}
