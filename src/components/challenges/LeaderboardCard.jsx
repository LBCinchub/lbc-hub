import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LeaderboardCard({ participants, challenge }) {
  const sorted = [...participants].sort((a, b) => b.progress - a.progress).slice(0, 10);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-zinc-400 fill-zinc-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-600 fill-orange-600" />;
    return <Award className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h3 className="font-bold text-lg">Leaderboard</h3>
      </div>

      <div className="space-y-2">
        {sorted.map((participant, idx) => (
          <motion.div
            key={participant.email}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              idx < 3 ? 'bg-white/10' : 'bg-white/5 hover:bg-white/8'
            }`}
          >
            <div className="flex-shrink-0 w-6 flex items-center justify-center">
              {getRankIcon(idx)}
            </div>

            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                {(participant.name || participant.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{participant.name || participant.email}</p>
              <p className="text-xs text-zinc-500">
                {participant.progress} / {challenge.target}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-indigo-400">
                {Math.round((participant.progress / challenge.target) * 100)}%
              </div>
              {idx < 3 && challenge.reward_badge && (
                <div className="text-lg">{challenge.reward_badge}</div>
              )}
            </div>
          </motion.div>
        ))}

        {sorted.length === 0 && (
          <p className="text-center text-zinc-500 text-sm py-8">No participants yet</p>
        )}
      </div>
    </div>
  );
}