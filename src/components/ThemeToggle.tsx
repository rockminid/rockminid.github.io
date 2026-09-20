import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        id="theme-toggle-btn"
        type="button"
        role="switch"
        aria-checked={!isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleTheme}
        className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border border-stone-700 bg-stone-850 p-1 transition-colors duration-200 ease-in-out hover:border-amber-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {/* Track Icons */}
        <span className="sr-only">Toggle dark and light mode</span>
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-stone-400">
          <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'opacity-90 text-amber-400' : 'opacity-30'}`} />
          <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${!isDark ? 'opacity-90 text-amber-600' : 'opacity-30'}`} />
        </div>

        {/* Sliding Thumb */}
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-stone-900 shadow-md ring-1 ring-stone-700 ${
            isDark ? 'translate-x-0' : 'translate-x-6'
          }`}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-600" />
          )}
        </motion.span>
      </button>

      {showLabel && (
        <span className="text-xs font-medium text-stone-400 select-none">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};
