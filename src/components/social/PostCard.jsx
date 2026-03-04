import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Share2, MoreHorizontal, Send, Radio, Bookmark, Sparkles, Loader2, Plane, MapPin, Calendar, ArrowRight, Copy, Check, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

export default function PostCard({ post, user, onDmUser, onViewProfile }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const queryClient = useQueryClient();

  const isLongPost = (post.content?.length || 0) > 180;

  const handleSummarize = async () => {
    if (summary) { setShowSummary(s => !s); return; }
    setSummaryLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize this social media post in 1-2 concise sentences (TL;DR). Post: "${post.content}"`,
      });
      setSummary(result || '');
      setShowSummary(true);
    } catch { setSummary('Could not summarize.'); setShowSummary(true); }
    setSummaryLoading(false);
  };

  const { data: followedRecord = [] } = useQuery({
    queryKey: ['followedPost', post.id, user?.email],
    queryFn: () => base44.entities.FollowedPost.filter({ post_id: post.id, user_email: user.email }),
    enabled: !!user?.email,
  });
  const isFollowed = followedRecord.length > 0;

  const followPostMutation = useMutation({
    mutationFn: () => {
      if (isFollowed) {
        return base44.entities.FollowedPost.delete(followedRecord[0].id);
      }
      return base44.entities.FollowedPost.create({
        post_id: post.id,
        user_email: user.email,
        post_author_name: post.author_name,
        post_content_preview: post.content?.slice(0, 100),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followedPost', post.id, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['followedPosts', user?.email] });
    },
  });

  const reactionEmojis = ['👍', '❤️', '💡', '😂'];

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, 'created_date', 50),
    enabled: showComments,
  });

  const toggleReactionMutation = useMutation({
    mutationFn: (emoji) => {
      const reactions = post.reactions || {};
      const userReactions = reactions[emoji] || [];
      const hasReacted = userReactions.includes(user.email);

      const newReactions = { ...reactions };
      if (hasReacted) {
        newReactions[emoji] = userReactions.filter(e => e !== user.email);
        if (newReactions[emoji].length === 0) delete newReactions[emoji];
      } else {
        newReactions[emoji] = [...userReactions, user.email];
      }

      return base44.entities.Post.update(post.id, { reactions: newReactions });
    },
    onSuccess: async (_, emoji) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const userReactions = post.reactions?.[emoji] || [];
      const hasReacted = userReactions.includes(user.email);
      if (!hasReacted && post.author_email && post.author_email !== user.email) {
        await base44.entities.Notification.create({
          to_email: post.author_email,
          from_name: user.full_name || user.email,
          type: 'like',
          message: `${user.full_name || user.email} reacted ${emoji} to your post`,
          post_id: post.id,
          read: false,
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content) => base44.entities.Comment.create({
      post_id: post.id,
      post_author_email: post.author_email,
      content,
      author_name: user.full_name || user.email,
      author_email: user.email,
      author_avatar: user.avatar_url || '',
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      setCommentText('');
      if (post.author_email && post.author_email !== user.email) {
        await base44.entities.Notification.create({
          to_email: post.author_email,
          from_name: user.full_name || user.email,
          type: 'comment',
          message: `${user.full_name || user.email} commented on your post`,
          post_id: post.id,
          read: false,
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Live banner */}
      {post.is_live && (
        <div className="bg-rose-600 px-4 py-1.5 flex items-center gap-2 text-sm font-medium">
          <Radio className="w-4 h-4 animate-pulse" />
          LIVE NOW
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          <button onClick={() => onViewProfile?.({ email: post.author_email, full_name: post.author_name, avatar_url: post.author_avatar })}>
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white font-medium">
                {post.author_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <button
                  onClick={() => onViewProfile?.({ email: post.author_email, full_name: post.author_name, avatar_url: post.author_avatar })}
                  className="font-semibold hover:text-indigo-400 transition-colors"
                >
                  {post.author_name || 'Anonymous'}
                </button>
                <p className="text-xs text-zinc-500">{format(new Date(post.created_date), 'MMM d, h:mm a')}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>

            {/* Topic Tags */}
            {post.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.topics.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-medium">#{t}</span>
                ))}
              </div>
            )}

            <p className="text-zinc-200 leading-relaxed mb-2">{post.content}</p>

            {/* AI Summary */}
            {isLongPost && (
              <div className="mb-3">
                <button
                  onClick={handleSummarize}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {summaryLoading ? 'Summarizing…' : showSummary ? 'Hide summary' : 'TL;DR'}
                </button>
                <AnimatePresence>
                  {showSummary && summary && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 overflow-hidden"
                    >
                      <div className="flex items-start gap-2 bg-indigo-950/50 border border-indigo-500/20 rounded-xl px-3 py-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-indigo-200 leading-relaxed">{summary}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Trip Card Embed */}
            {post.trip_id && (
              <Link
                to={`${createPageUrl('SharedTrip')}?id=${post.trip_id}`}
                className="block mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all p-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{post.trip_name}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 flex-wrap">
                      {post.trip_destination && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" />{post.trip_destination}</span>}
                      {post.trip_days && <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400" />{post.trip_days} days</span>}
                      {post.trip_user && <span className="text-zinc-500">by {post.trip_user}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </Link>
            )}

            {/* Media */}
            {post.media_urls?.length > 0 && (
              <div className="mb-4 rounded-xl overflow-hidden">
                {post.media_type === 'video' ? (
                  <video src={post.media_urls[0]} controls className="w-full rounded-xl max-h-80 object-cover" />
                ) : (
                  <div className={`grid gap-1 ${post.media_urls.length > 1 ? 'grid-cols-2' : ''}`}>
                    {post.media_urls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full object-cover rounded-xl max-h-80" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reactions */}
            {(post.reactions && Object.keys(post.reactions).length > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3 pb-2 border-b border-white/5">
                {Object.entries(post.reactions).map(([emoji, users]) => {
                  const userReacted = users?.includes(user?.email);
                  return (
                    <button
                      key={emoji}
                      onClick={() => user && toggleReactionMutation.mutate(emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                        userReacted
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{users?.length || 0}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => user && toggleReactionMutation.mutate(emoji)}
                    className="p-2 rounded-lg hover:bg-white/5 text-lg transition-all"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowComments(s => !s)}
                className="flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors ml-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{comments.length || 0}</span>
              </button>

              <button className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>

              {user && (
                <button
                  onClick={() => followPostMutation.mutate()}
                  className={`flex items-center gap-2 ml-auto transition-colors ${isFollowed ? 'text-indigo-400' : 'text-zinc-400 hover:text-indigo-400'}`}
                  title={isFollowed ? 'Unsave post' : 'Save post'}
                >
                  <Bookmark className={`w-5 h-5 ${isFollowed ? 'fill-indigo-400' : ''}`} />
                </button>
              )}
            </div>

            {/* Comments */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 overflow-hidden"
                >
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={c.author_avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {c.author_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white/5 rounded-xl px-3 py-2 flex-1">
                        <p className="text-xs font-semibold text-indigo-400 mb-0.5">{c.author_name}</p>
                        <p className="text-sm text-zinc-300">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {user && (
                    <div className="flex items-center gap-2 pt-1">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && commentText.trim() && commentMutation.mutate(commentText)}
                          placeholder="Write a comment..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm"
                        />
                        <Button
                          size="icon"
                          disabled={!commentText.trim()}
                          onClick={() => commentMutation.mutate(commentText)}
                          className="btn-primary rounded-full flex-shrink-0 w-8 h-8"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}