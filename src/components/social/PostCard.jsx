import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Radio, Bookmark, Sparkles, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

export default function PostCard({ post, user, onDmUser, onViewProfile }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

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

  const liked = post.liked_by?.includes(user?.email);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, 'created_date', 50),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => {
      const likedBy = post.liked_by || [];
      if (liked) {
        return base44.entities.Post.update(post.id, {
          likes: Math.max(0, (post.likes || 0) - 1),
          liked_by: likedBy.filter(e => e !== user.email),
        });
      }
      return base44.entities.Post.update(post.id, {
        likes: (post.likes || 0) + 1,
        liked_by: [...likedBy, user.email],
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (!liked && post.author_email && post.author_email !== user.email) {
        await base44.entities.Notification.create({
          to_email: post.author_email,
          from_name: user.full_name || user.email,
          type: 'like',
          message: `${user.full_name || user.email} liked your post`,
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

            <p className="text-zinc-200 leading-relaxed mb-4">{post.content}</p>

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

            {/* Actions */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => user && likeMutation.mutate()}
                className={`flex items-center gap-2 transition-colors ${liked ? 'text-rose-400' : 'text-zinc-400 hover:text-rose-400'}`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-rose-400' : ''}`} />
                <span className="text-sm">{post.likes || 0}</span>
              </button>
              <button
                onClick={() => setShowComments(s => !s)}
                className="flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors"
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