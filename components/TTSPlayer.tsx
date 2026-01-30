'use client';

import { useState, useRef, useCallback } from 'react';

interface TTSPlayerProps {
  text: string;
  disabled?: boolean;
  onSpeak?: (text: string) => void;
  sessionId?: string;
}

export function TTSPlayer({ text, disabled = false, onSpeak, sessionId }: TTSPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Clean up audio URL
  const cleanupAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Handle speak button click
  const handleSpeak = async () => {
    if (!text.trim() || disabled || isLoading) return;

    // Stop current playback if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cleanupAudio();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        cleanupAudio();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setError('Audio playback failed');
        cleanupAudio();
      };

      await audio.play();

      // Callback for stats tracking
      onSpeak?.(text.trim());

      // Update word stats in memory if sessionId provided
      if (sessionId) {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            action: 'updateStats', 
            words, 
            utterance: text.trim() 
          }),
        }).catch(console.error);
      }

    } catch (err) {
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : 'Speech generation failed');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    handleSpeak();
  };

  // Determine button state
  const isDisabled = disabled || !text.trim();
  const showError = error && !isLoading && !isPlaying;

  return (
    <div className="space-y-2">
      <button
        onClick={handleSpeak}
        disabled={isDisabled || isLoading}
        className={`
          w-full py-4 rounded-xl text-xl font-bold 
          transition-all duration-300 transform
          btn-ripple
          ${isPlaying
            ? 'bg-green-600 text-white speaking-glow scale-[1.02]'
            : isLoading
            ? 'bg-green-700 text-white animate-pulse cursor-wait'
            : isDisabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-500 hover:scale-[1.02] active:scale-[0.98] text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40'
          }
        `}
      >
        <span className="flex items-center justify-center gap-3">
          {isLoading ? (
            <>
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              Loading...
            </>
          ) : isPlaying ? (
            <>
              <span className="text-2xl animate-pulse">🔊</span>
              Speaking...
            </>
          ) : (
            <>
              <span className="text-2xl">🔊</span>
              Speak
            </>
          )}
        </span>
      </button>

      {/* Error message with retry */}
      {showError && (
        <div className="flex items-center justify-between p-3 bg-red-900/30 border border-red-700 rounded-lg animate-slide-up">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={handleRetry}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
