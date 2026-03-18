import React, { useMemo } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrendingWidget({ posts, onTopicClick }) {
  const trendingTopics = useMemo(() => {
    const topicStats = {};
    
    posts.forEach(post => {
      // Count topics
      post.topics?.forEach(topic => {
        if (!topicStats[topic]) {
          topicStats[topic] = { count: 0, engagement: 0 };
        }
        topicStats[topic].count += 1;
        
        // Calculate engagement (likes + comments + reactions)
        const likes = post.liked_by?.length || 0;
        const reactions = Object.values(post.reactions || {}).reduce((sum, users) => sum + users.length, 0);
        topicStats[topic].engagement += likes + reactions;
      });
    });

    // Convert to array and sort by engagement score
    return Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        count: stats.count,
        engagement: stats.engagement,
        score: stats.count * 2 + stats.engagement // Weighted score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [posts]);

  if (trendingTopics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-white">Trending Now</h3>
      </div>

      <div className="space-y-2">
        {trendingTopics.map((item, idx) => (
          <button
            key={item.topic}
            onClick={() => onTopicClick?.(item.topic)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-zinc-500 text-sm font-mono w-4 flex-shrink-0">
                {idx + 1}
              </span>
              <Hash className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="text-white font-medium text-sm truncate group-hover:text-indigo-400 transition-colors">
                {item.topic}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-zinc-500">{item.count} posts</span>
              <div className={`w-1 h-1 rounded-full ${
                idx === 0 ? 'bg-rose-500' :
                idx === 1 ? 'bg-orange-500' :
                idx === 2 ? 'bg-amber-500' :
                'bg-zinc-600'
              }`} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <p className="text-xs text-zinc-500 text-center">
          Based on {posts.length} recent posts
        </p>
      </div>
    </motion.div>
  );
}