'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SlotType, SentenceSlot } from '@/lib/types';
import { CORE_VOCABULARY, STEP_ORDER } from '@/lib/core-vocab';
import { SentenceDisplay } from '@/components/SentenceDisplay';
import { WordGrid } from '@/components/WordGrid';
import { CustomWordInput } from '@/components/CustomWordInput';
import { StepIndicator } from '@/components/StepIndicator';
import { ManualChatToggle } from '@/components/ManualChatToggle';
import { TTSPlayer } from '@/components/TTSPlayer';
import { FreeTypeMode } from '@/components/FreeTypeMode';

// Initial empty slots
const createEmptySlots = (): Record<SlotType, SentenceSlot> => ({
  WHO: { type: 'WHO', value: null, isCustom: false },
  ACTION: { type: 'ACTION', value: null, isCustom: false },
  OBJECT: { type: 'OBJECT', value: null, isCustom: false },
  LOCATION: { type: 'LOCATION', value: null, isCustom: false },
  MODIFIERS: { type: 'MODIFIERS', value: null, isCustom: false },
});

export default function Home() {
  // State
  const [currentStep, setCurrentStep] = useState<SlotType>('WHO');
  const [slots, setSlots] = useState<Record<SlotType, SentenceSlot>>(createEmptySlots);
  const [isManualChat, setIsManualChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showIEPModal, setShowIEPModal] = useState(false);
  const [iepText, setIepText] = useState('');

  // Initialize session ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('aac-session-id');
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = uuidv4();
      localStorage.setItem('aac-session-id', newId);
      setSessionId(newId);
    }
  }, []);

  // Get current step index
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  // Build sentence from filled slots
  const buildSentence = useCallback(() => {
    return STEP_ORDER
      .map(step => slots[step].value)
      .filter(Boolean)
      .join(' ');
  }, [slots]);

  const sentence = buildSentence();
  const hasAnyWords = STEP_ORDER.some(step => slots[step].value !== null);

  // Handle word selection
  const handleWordSelect = (word: string, isCustom = false) => {
    // Update the slot
    setSlots(prev => ({
      ...prev,
      [currentStep]: { type: currentStep, value: word, isCustom },
    }));

    // Advance to next step if not last
    if (!isLastStep) {
      const nextStep = STEP_ORDER[currentStepIndex + 1];
      setCurrentStep(nextStep);
    }
  };

  // Handle custom word submit
  const handleCustomWordSubmit = (word: string) => {
    handleWordSelect(word, true);
  };

  // Handle clicking on a word in the sentence (to edit)
  const handleSentenceWordClick = (step: SlotType) => {
    setCurrentStep(step);
  };

  // Skip current step
  const handleSkip = () => {
    if (!isLastStep) {
      const nextStep = STEP_ORDER[currentStepIndex + 1];
      setCurrentStep(nextStep);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = STEP_ORDER[currentStepIndex - 1];
      setCurrentStep(prevStep);
    }
  };

  // Start over
  const handleStartOver = () => {
    setSlots(createEmptySlots());
    setCurrentStep('WHO');
  };

  // Save IEP context
  const handleSaveIEP = async () => {
    if (iepText.trim()) {
      setIsLoading(true);
      try {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            action: 'saveIEP', 
            iepText: iepText.trim() 
          }),
        });
      } catch (error) {
        console.error('Failed to save IEP:', error);
      }
      setIsLoading(false);
    }
    setShowIEPModal(false);
  };

  // Current vocabulary words
  const currentWords = CORE_VOCABULARY[currentStep];

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col page-transition">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-gray-300">Formulating a sentence</span>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIEPModal(true)}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
            title="IEP Settings"
          >
            ⚙️ IEP
          </button>
          <ManualChatToggle 
            isActive={isManualChat} 
            onToggle={() => setIsManualChat(!isManualChat)} 
          />
        </div>
      </div>

      {isManualChat ? (
        /* Manual Chat Mode - Using FreeTypeMode Component */
        <FreeTypeMode sessionId={sessionId} />
      ) : (
        /* Wizard Mode */
        <div className="flex-1 flex flex-col">
          {/* Sentence Display Component */}
          <SentenceDisplay
            slots={slots}
            currentStep={currentStep}
            onWordTap={handleSentenceWordClick}
          />

          {/* Word Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <WordGrid
              words={currentWords}
              onWordSelect={handleWordSelect}
              selectedWord={slots[currentStep].value}
            />

            {/* Custom Word Input Component */}
            <CustomWordInput onSubmit={handleCustomWordSubmit} />
          </div>

          {/* Navigation / Actions */}
          <div className="px-4 py-3 border-t border-gray-800 animate-slide-up" style={{ animationDelay: '300ms' }}>
            {hasAnyWords ? (
              <div className="flex gap-3">
                <button
                  onClick={handleStartOver}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] btn-ripple"
                >
                  Start Over
                </button>
                <div className="flex-[2]">
                  <TTSPlayer 
                    text={sentence} 
                    sessionId={sessionId}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none btn-ripple"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isLastStep}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none btn-ripple"
                >
                  Skip →
                </button>
              </div>
            )}
          </div>

          {/* Step Indicator Component */}
          <div className="px-4 py-3 border-t border-gray-800 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <StepIndicator currentStep={currentStep} slots={slots} />
          </div>
        </div>
      )}

      {/* IEP Modal */}
      {showIEPModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">IEP Context</h2>
              <button
                onClick={() => setShowIEPModal(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none transition-all duration-200 hover:scale-110 active:scale-95"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-gray-400 text-sm animate-fade-in">
                Paste IEP text to help personalize word suggestions based on communication goals.
              </p>
              <textarea
                value={iepText}
                onChange={(e) => setIepText(e.target.value)}
                placeholder="Paste IEP text here..."
                className="w-full h-48 p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-gray-600 animate-slide-up"
                style={{ animationDelay: '100ms' }}
              />
              <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <button
                  onClick={() => {
                    setIepText('');
                    setShowIEPModal(false);
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] btn-ripple"
                >
                  Use Default Profile
                </button>
                <button
                  onClick={handleSaveIEP}
                  disabled={!iepText.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none btn-ripple"
                >
                  Save IEP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
