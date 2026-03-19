import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Flame, Target, Award } from 'lucide-react';
import ChallengeCard from '../components/challenges/ChallengeCard';
import LeaderboardCard from '../components/challenges/LeaderboardCard';

export default function Challenges() {
  const [user, setUser] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list('-created_date', 50),
    initialData: []
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ user_email: user.email }),
    enabled: !!user,
    initialData: []
  });

  const filteredChallenges = challenges.filter(c => {
    if (filter === 'active') return c.status === 'active';
    if (filter === 'joined') return c.participants?.some(p => p.email === user?.email);
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            <span className="gradient-text">Community Challenges</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Join weekly goals, compete with the community, and earn exclusive badges
          </p>
        </motion.div>

        {/* User Badges */}
        {userBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-xl">Your Badges</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {userBadges.map((badge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10"
                >
                  <span className="text-2xl">{badge.badge_emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{badge.badge_name}</p>
                    {badge.rank && (
                      <p className="text-xs text-zinc-500">Rank #{badge.rank}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 inline mr-1" />
            Active
          </button>
          <button
            onClick={() => setFilter('joined')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'joined'
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 inline mr-1" />
            My Challenges
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filteredChallenges.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-500">No challenges found</p>
              </div>
            ) : (
              filteredChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  user={user}
                  onViewLeaderboard={() => setSelectedChallenge(challenge)}
                />
              ))
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            {selectedChallenge ? (
              <div className="sticky top-20">
                <LeaderboardCard
                  participants={selectedChallenge.participants || []}
                  challenge={selectedChallenge}
                />
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 text-center sticky top-20">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-500 text-sm">
                  Select a challenge to view the leaderboard
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}