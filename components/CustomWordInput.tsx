'use client';

import { useState } from 'react';

interface CustomWordInputProps {
  onSubmit: (word: string) => void;
  placeholder?: string;
}

export function CustomWordInput({ onSubmit, placeholder = 'Type a custom word...' }: CustomWordInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-600"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className={`
          px-6 py-3 rounded-xl font-medium 
          transition-all duration-200 transform
          btn-ripple
          ${value.trim()
            ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 text-white shadow-lg shadow-blue-500/20'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        Add
      </button>
    </form>
  );
}
