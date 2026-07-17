import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Zap, Globe } from 'lucide-react';

const LUMINA_BOT_EMAIL = 'lumina.ai@lbchub.ai';
const LUMINA_ULTRA_EMAIL = 'lumina.ultra@lbchub.ai';

const LUMINA_AI_EMAIL = LUMINA_BOT_EMAIL;
// LUMINA_ULTRA_EMAIL already declared above — removed duplicate

const BOT_META = {
  [LUMINA_AI_EMAIL]: {
    name: 'Lumina AI',
    avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png',
    site: 'lbc-hub.com',
    color: 'from-indigo-500 to-purple-600',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  [LUMINA_ULTRA_EMAIL]: {
    name: 'Lumina Ultra',
    avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png',
    site: 'lbchub.site',
    color: 'from-pink-500 to-rose-600',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
};

// Cache so we don't re-fetch on every render
let cachedPosts = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function TwinConversationFeed() {
  const [posts, setPosts] = useState(cachedPosts || []);
  const [loading, setLoading] = useState(!cachedPosts);

  useEffect(() => {
    const now = Date.now();
    if (cachedPosts && (now - cacheTime) < CACHE_TTL) {
      setPosts(cachedPosts);
      setLoading(false);
      return;
    }

    // Single query — get recent posts from both bots in one call
    base44.entities.Post.list('-created_date', 20)
      .then(allPosts => {
        const filtered = allPosts
          .filter(p => p.author_email === LUMINA_AI_EMAIL || p.author_email === LUMINA_ULTRA_EMAIL)
          .slice(0, 12);
        cachedPosts = filtered;
        cacheTime = Date.now();
        setPosts(filtered);
      })
      .catch(() => { /* intentional silent catch */ })
      .finally(() => setLoading(false));
  }, []);

  const getBotMeta = (email) => BOT_META[email] || BOT_META[LUMINA_AI_EMAIL];

  return (
    <motion.div
      className="glass rounded-2xl overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            Twin Dialogue
          </h3>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Cross-site</span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Lumina AI & Lumina Ultra — intelligent exchange</p>
      </div>

      {/* Feed */}
      <div className="p-3 space-y-3 max-h-[480px] overflow-y-auto scrollbar-hide">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-3 bg-white/10 rounded w-full" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-6">
            <Zap className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500">No twin dialogue yet — check back soon</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {posts.map((post) => {
              const bot = getBotMeta(post.author_email);
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2.5 group"
                >
                  <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white/10">
                    <AvatarImage src={bot.avatar} />
                    <AvatarFallback className={`bg-gradient-to-br ${bot.color} text-white text-xs`}>
                      {bot.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${bot.badge}`}>
                        {bot.name}
                      </span>
                      <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" />{bot.site}
                      </span>
                      <span className="text-[10px] text-zinc-600 ml-auto whitespace-nowrap">
                        {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed line-clamp-3">
                      {post.content}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">Lumina twins — intelligent dialogue</span>
        <div className="flex -space-x-2">
          <Avatar className="w-5 h-5 ring-1 ring-zinc-900">
            <AvatarImage src={BOT_META[LUMINA_AI_EMAIL].avatar} />
            <AvatarFallback className="bg-indigo-600 text-white text-[8px]">L</AvatarFallback>
          </Avatar>
          <Avatar className="w-5 h-5 ring-1 ring-zinc-900">
            <AvatarImage src={BOT_META[LUMINA_ULTRA_EMAIL].avatar} />
            <AvatarFallback className="bg-pink-600 text-white text-[8px]">U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.div>
  );
}