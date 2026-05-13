import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTION_SETS = {
  business: [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '💡', label: 'Insight' },
    { emoji: '💪', label: 'Motivating' },
    { emoji: '🚀', label: "Let's Go" },
  ],
  finance: [
    { emoji: '💰', label: 'Money' },
    { emoji: '📈', label: 'Bullish' },
    { emoji: '🤝', label: 'Deal' },
    { emoji: '👀', label: 'Watching' },
  ],
  tech: [
    { emoji: '⚡', label: 'Based' },
    { emoji: '🛠️', label: 'Building' },
    { emoji: '🧠', label: 'Big Brain' },
    { emoji: '🌐', label: 'Web3' },
  ],
  general: [
    { emoji: '❤️', label: 'Love' },
    { emoji: '👏', label: 'Respect' },
    { emoji: '🙌', label: 'Agree' },
    { emoji: '😂', label: 'Funny' },
  ],
  default: [
    { emoji: '❤️', label: 'Like' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '👏', label: 'Respect' },
    { emoji: '💡', label: 'Insight' },
  ],
};

function detectCategory(content = '') {
  const lower = content.toLowerCase();
  if (/entrepreneur|business|startup|hustle|grind|brand|revenue|client|profit|sell|product|market/i.test(lower)) return 'business';
  if (/finance|money|invest|stock|bull|bear|portfolio|wealth|income|dividend|budget|crypto.*price|token.*price/i.test(lower)) return 'finance';
  if (/web3|blockchain|crypto|nft|solana|bitcoin|ethereum|defi|dao|smart contract|developer|coding|tech|ai|build/i.test(lower)) return 'tech';
  return 'general';
}

export default function PostReactions({ post, user, onToggle }) {
  const [showAll, setShowAll] = useState(false);

  const category = detectCategory(post.content);
  const contextReactions = REACTION_SETS[category];
  // Merge default + context reactions deduped
  const allReactions = [
    ...REACTION_SETS.default,
    ...contextReactions.filter(r => !REACTION_SETS.default.some(d => d.emoji === r.emoji)),
  ];

  const reactions = post.reactions || {};
  // Find what the current user has already reacted with
  const userCurrentReaction = Object.entries(reactions).find(
    ([, users]) => Array.isArray(users) && users.includes(user?.email)
  )?.[0] || null;

  // Build top 3 from existing reactions with counts
  const existingWithCounts = Object.entries(reactions)
    .map(([emoji, users]) => ({ emoji, count: Array.isArray(users) ? users.length : 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const top3 = existingWithCounts.slice(0, 3);

  const handleReact = (emoji) => {
    if (!user) return;
    onToggle(emoji, userCurrentReaction);
  };

  return (
    <div className="mb-3">
      {/* Top 3 summary pills (collapsed view) */}
      {top3.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {top3.map(({ emoji, count }) => {
            const isSelected = userCurrentReaction === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                  isSelected
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm shadow-indigo-500/20'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 border-white/10'
                }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
          {existingWithCounts.length > 3 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
            >
              {showAll ? 'less' : `+${existingWithCounts.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* All remaining existing reactions expanded */}
      <AnimatePresence>
        {showAll && existingWithCounts.slice(3).length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 flex-wrap mb-2 overflow-hidden"
          >
            {existingWithCounts.slice(3).map(({ emoji, count }) => {
              const isSelected = userCurrentReaction === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction picker bar */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {allReactions.map(({ emoji, label }) => {
          const isSelected = userCurrentReaction === emoji;
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              title={label}
              className={`p-1.5 rounded-lg text-base transition-all active:scale-90 hover:scale-110 ${
                isSelected ? 'bg-indigo-600/20 ring-1 ring-indigo-500/40' : 'hover:bg-white/5'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}