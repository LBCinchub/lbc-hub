import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

export default function SuggestedPosts({ user, allPosts, onViewProfile }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || allPosts.length < 3) return;
    fetchSuggestions();
  }, [user?.email, allPosts.length]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Get user's interaction signals: liked posts & commented posts
      const likedPosts = allPosts.filter(p => p.liked_by?.includes(user.email));
      const likedKeywords = likedPosts.map(p => p.content?.slice(0, 80)).join('; ');

      const otherPosts = allPosts
        .filter(p => p.author_email !== user.email && !p.liked_by?.includes(user.email))
        .slice(0, 20);

      if (otherPosts.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const postList = otherPosts.map((p, i) => `[${i}] ${p.author_name}: ${p.content?.slice(0, 100)}`).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a social feed recommendation engine.

User's interests (posts they liked): ${likedKeywords || 'No likes yet, suggest the most engaging posts.'}

Available posts (by index):
${postList}

Return the indices (0-based) of the top 3 most relevant posts for this user, as a JSON array of numbers. Return ONLY indices that exist above.`,
        response_json_schema: {
          type: 'object',
          properties: {
            indices: { type: 'array', items: { type: 'number' } }
          }
        }
      });

      const indices = result?.indices || [];
      const suggested = indices.slice(0, 3).map(i => otherPosts[i]).filter(Boolean);
      setSuggestions(suggested);
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden mt-4">
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <h3 className="font-semibold text-sm">Suggested For You</h3>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-zinc-500 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding posts for you…
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-4">Like some posts to get personalized suggestions.</p>
        ) : (
          suggestions.map(post => (
            <div key={post.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => onViewProfile?.({ email: post.author_email, full_name: post.author_name, avatar_url: post.author_avatar })}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={post.author_avatar} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs">
                  {post.author_name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-400 truncate">{post.author_name}</p>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{post.content}</p>
                <p className="text-xs text-zinc-600 mt-1">{format(new Date(post.created_date), 'MMM d')}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}