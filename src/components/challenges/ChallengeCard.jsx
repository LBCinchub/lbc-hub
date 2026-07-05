import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Calendar, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ChallengeCard({ challenge, user, onViewLeaderboard }) {
  const queryClient = useQueryClient();
  const isParticipant = challenge.participants?.some(p => p.email === user?.email);
  const userProgress = challenge.participants?.find(p => p.email === user?.email)?.progress || 0;

  const joinMutation = useMutation({
    mutationFn: async () => {
      const participants = challenge.participants || [];
      participants.push({
        email: user.email,
        name: user.full_name || user.email,
        progress: 0,
        joined_date: new Date().toISOString()
      });
      return base44.entities.Challenge.update(challenge.id, { participants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    }
  });

  const getTypeIcon = (type) => {
    const icons = {
      travel_miles: '✈️',
      products_sold: '🛍️',
      posts_created: '📝',
      trips_planned: '🗺️',
      connections_made: '🤝'
    };
    return icons[type] || '🎯';
  };

  const getTypeLabel = (type) => {
    const labels = {
      travel_miles: 'Travel Miles',
      products_sold: 'Products Sold',
      posts_created: 'Posts Created',
      trips_planned: 'Trips Planned',
      connections_made: 'Connections Made'
    };
    return labels[type] || type;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 hover:bg-white/8 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getTypeIcon(challenge.type)}</div>
          <div>
            <h3 className="font-bold text-lg">{challenge.title}</h3>
            <p className="text-sm text-zinc-400">{challenge.description}</p>
          </div>
        </div>
        {challenge.reward_badge && (
          <div className="text-2xl" title="Reward badge">
            {challenge.reward_badge}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-indigo-400" />
          <span className="text-zinc-400">Goal:</span>
          <span className="font-semibold">{challenge.target}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-zinc-400">Participants:</span>
          <span className="font-semibold">{challenge.participants?.length || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm col-span-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-zinc-400">
            {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {isParticipant && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-400">Your Progress</span>
            <span className="font-semibold text-indigo-400">
              {userProgress} / {challenge.target}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min((userProgress / challenge.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {isParticipant ? (
          <>
            <Button
              onClick={onViewLeaderboard}
              variant="outline"
              className="flex-1 border-white/20 bg-transparent hover:bg-white/10 rounded-xl"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Leaderboard
            </Button>
            <Badge className="bg-green-500/20 text-green-400 border-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              Joined
            </Badge>
          </>
        ) : (
          <Button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending || !user}
            className="flex-1 btn-primary rounded-xl"
          >
            Join Challenge
          </Button>
        )}
      </div>
    </motion.div>
  );
}