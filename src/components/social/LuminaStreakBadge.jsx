import React from 'react';
import { Flame, Zap } from 'lucide-react';

export default function LuminaStreakBadge({ streak, sparks, compact = false }) {
  if (!streak) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-xs font-semibold">
          <Flame className="w-3 h-3" />
          {streak}
        </div>
        <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-semibold">
          <Zap className="w-3 h-3" />
          {sparks}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 min-w-[60px]">
        <Flame className="w-5 h-5 text-orange-400 mb-0.5" />
        <span className="text-white font-bold text-lg leading-none">{streak}</span>
        <span className="text-orange-300 text-xs mt-0.5">day streak</span>
      </div>
      <div className="flex flex-col items-center bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 min-w-[60px]">
        <Zap className="w-5 h-5 text-yellow-400 mb-0.5" />
        <span className="text-white font-bold text-lg leading-none">{sparks}</span>
        <span className="text-yellow-300 text-xs mt-0.5">sparks</span>
      </div>
    </div>
  );
}