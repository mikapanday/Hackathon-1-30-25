'use client';

interface ManualChatToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function ManualChatToggle({ isActive, onToggle }: ManualChatToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium 
        transition-all duration-300 transform
        btn-ripple
        ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white hover:scale-[1.02]'
        }
      `}
    >
      <span className="flex items-center gap-2">
        <span className={isActive ? 'animate-pulse' : ''}>
          {isActive ? '💬' : '⌨️'}
        </span>
        Manual Chat
      </span>
    </button>
  );
}
