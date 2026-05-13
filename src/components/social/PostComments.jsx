import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Trash2, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

function CommentItem({ comment, user, postOwnerEmail, postId, replies = [], onDelete }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: (content) => base44.entities.Comment.create({
      post_id: postId,
      post_author_email: postOwnerEmail,
      content,
      author_name: user.full_name || user.email,
      author_email: user.email,
      author_avatar: user.avatar_url || '',
      parent_id: comment.id,
      reply_to_name: comment.author_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
    },
  });

  const likeMutation = useMutation({
    mutationFn: () => base44.entities.Comment.update(comment.id, { likes: liked ? likeCount - 1 : likeCount + 1 }),
    onMutate: () => {
      setLiked(l => !l);
      setLikeCount(c => liked ? c - 1 : c + 1);
    },
  });

  const timeAgo = comment.created_date
    ? formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })
    : '';

  const canDelete = user && (user.email === comment.author_email || user.email === postOwnerEmail);

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
          <AvatarImage src={comment.author_avatar} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
            {comment.author_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-white/5 rounded-2xl px-3 py-2">
            <p className="text-xs font-semibold text-indigo-300 mb-0.5">{comment.author_name}</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[10px] text-zinc-600">{timeAgo}</span>
            {user && (
              <button
                onClick={() => likeMutation.mutate()}
                className={`flex items-center gap-1 text-[10px] transition-colors ${liked ? 'text-rose-400' : 'text-zinc-500 hover:text-rose-400'}`}
              >
                <Heart className={`w-3 h-3 ${liked ? 'fill-rose-400' : ''}`} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
            )}
            {user && (
              <button
                onClick={() => { setShowReplyInput(s => !s); setReplyText(''); }}
                className="text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors font-medium"
              >
                Reply
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(s => !s)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showReplies ? 'Hide replies' : `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors ml-auto"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center gap-2 overflow-hidden"
              >
                <Input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && replyText.trim() && replyMutation.mutate(replyText)}
                  placeholder={`Reply to ${comment.author_name}...`}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 text-xs h-8"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
                  disabled={!replyText.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate(replyText)}
                >
                  <Send className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => setShowReplyInput(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2 pl-2 border-l border-white/10 overflow-hidden"
              >
                {replies.map(r => (
                  <div key={r.id} className="flex items-start gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                      <AvatarImage src={r.author_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-[10px]">
                        {r.author_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/5 rounded-xl px-3 py-1.5">
                        <p className="text-[11px] font-semibold text-purple-300 mb-0.5">
                          {r.author_name} <span className="text-zinc-600 font-normal">→ {r.reply_to_name}</span>
                        </p>
                        <p className="text-xs text-zinc-200">{r.content}</p>
                      </div>
                      {(user?.email === r.author_email || user?.email === postOwnerEmail) && (
                        <button onClick={() => onDelete(r.id)} className="mt-0.5 px-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function PostComments({ post, user, comments = [], onComment, onDelete }) {
  const [commentText, setCommentText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const topLevelComments = comments.filter(c => !c.parent_id);
  const visibleComments = showAll ? topLevelComments : topLevelComments.slice(-3);
  const hiddenCount = topLevelComments.length - 3;

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    onComment(commentText);
    setCommentText('');
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      {/* Expand older comments */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-3 block"
        >
          View all {topLevelComments.length} comments
        </button>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        {visibleComments.map(c => (
          <CommentItem
            key={c.id}
            comment={c}
            user={user}
            postOwnerEmail={post.author_email}
            postId={post.id}
            replies={comments.filter(r => r.parent_id === c.id)}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Show less */}
      {showAll && topLevelComments.length > 3 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2 block"
        >
          Show less
        </button>
      )}

      {/* Comment input */}
      {user && (
        <div className="flex items-center gap-2 mt-3">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Write a comment..."
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm h-9 rounded-full px-4"
            />
            <Button
              size="icon"
              disabled={!commentText.trim()}
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-full w-9 h-9 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}