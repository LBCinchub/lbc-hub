import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Share2, MoreHorizontal, Radio, Bookmark, Sparkles, Loader2, Plane, MapPin, Calendar, ArrowRight, Copy, Check, X, ChevronLeft, ChevronRight, UserPlus, UserCheck, Trash2, Edit, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import RichText from './RichText';
import LuminaStreakBadge from './LuminaStreakBadge';
import PostReactions from './PostReactions';
import PostComments from './PostComments';

export default function PostCard({ post, user, onDmUser, onViewProfile, onHashtagClick }) {
  const [showComments, setShowComments] = useState(false);
  const [authorStreak, setAuthorStreak] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [luminaCheck, setLuminaCheck] = useState(null);
  const [luminaLoading, setLuminaLoading] = useState(false);
  const [showLumina, setShowLumina] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedContent, setEditedContent] = useState(post?.content || '');
  const queryClient = useQueryClient();
  const videoRef = useRef(null);

  const { data: follows = [] } = useQuery({
    queryKey: ['follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user,
  });
  const isFollowing = follows.some(f => f.following_email === post.author_email);

  useEffect(() => {
    if (!videoRef.current || !post || post.media_type !== 'video') return;

    const handlePlay = () => {
      document.querySelectorAll('video').forEach(v => {
        if (v !== videoRef.current) v.pause();
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => { /* intentional silent catch */ });
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.5 }
    );

    const currentVideo = videoRef.current;
    currentVideo.addEventListener('play', handlePlay);
    observer.observe(currentVideo);

    return () => {
      currentVideo.removeEventListener('play', handlePlay);
      observer.disconnect();
    };
  }, [post.media_type]);

  useEffect(() => {
    if (post.author_email) {
      base44.entities.LuminaStreak.filter({ user_email: post.author_email }).then(records => {
        if (records.length > 0) setAuthorStreak(records[0]);
      }).catch(() => { /* intentional silent catch */ });
    }
  }, [post.author_email]);

  const handleShareToSocial = () => {
    const url = `${window.location.origin}${createPageUrl('Social')}?post=${post.id}`;
    const text = `Check out this post by ${post.author_name}: "${post.content?.slice(0, 80)}${post.content?.length > 80 ? '...' : ''}" — ${url}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowShareMenu(false); }, 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${createPageUrl('Social')}?post=${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowShareMenu(false); }, 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowShareMenu(false); }, 2000);
  };

  const postUrl = `${window.location.origin}${createPageUrl('Social')}?post=${post.id}`;
  const shareText = `${post.author_name}: "${post.content?.slice(0, 100)}${post.content?.length > 100 ? '...' : ''}" — ${postUrl}`;

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(`${post.author_name}: ${post.content?.slice(0, 100)}`)}`, '_blank');
    setShowShareMenu(false);
  };

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

  const handleLuminaCheck = async () => {
    if (luminaCheck) { setShowLumina(s => !s); return; }
    setLuminaLoading(true);
    try {
      const prompt = `You are Lumina AI, an advanced fact-checker and AI content detector. Analyze this post:

Content: "${post.content}"
${post.media_type === 'video' ? 'Contains: Video content' : ''}
${post.media_type === 'image' ? 'Contains: Image content' : ''}

Provide a brief analysis in JSON format:
{
  "verdict": "verified" | "disputed" | "ai_generated" | "needs_context",
  "confidence": 0-100,
  "explanation": "brief 1-2 sentence explanation",
  "recommendation": "short user-facing message"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            verdict: { type: "string" },
            confidence: { type: "number" },
            explanation: { type: "string" },
            recommendation: { type: "string" }
          }
        }
      });
      setLuminaCheck(result);
      setShowLumina(true);
    } catch { 
      setLuminaCheck({ verdict: 'error', confidence: 0, explanation: 'Analysis failed', recommendation: 'Could not verify content' }); 
      setShowLumina(true); 
    }
    setLuminaLoading(false);
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
    onError: () => { /* silent — action failed silently */ },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followedPost', post.id, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['followedPosts', user?.email] });
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, 'created_date', 50),
    enabled: showComments,
  });

  const toggleReactionMutation = useMutation({
    mutationFn: ({ emoji, prevEmoji }) => {
      const reactions = { ...(post.reactions || {}) };

      // Remove previous reaction from all emojis (single reaction per user)
      if (prevEmoji && prevEmoji !== emoji) {
        const prev = reactions[prevEmoji] || [];
        reactions[prevEmoji] = prev.filter(e => e !== user.email);
        if (reactions[prevEmoji].length === 0) delete reactions[prevEmoji];
      }

      // Toggle selected emoji
      const current = reactions[emoji] || [];
      const alreadyReacted = current.includes(user.email);
      if (alreadyReacted) {
        reactions[emoji] = current.filter(e => e !== user.email);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...current, user.email];
      }

      return base44.entities.Post.update(post.id, { reactions });
    },
    onSuccess: async (_, { emoji, prevEmoji }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const alreadyReacted = (post.reactions?.[emoji] || []).includes(user.email);
      if (!alreadyReacted && post.author_email && post.author_email !== user.email) {
        await base44.entities.Notification.create({
          to_email: post.author_email,
          from_name: user.full_name || user.email,
          type: 'like',
          message: `${user.full_name || user.email} reacted ${emoji} to your post`,
          post_id: post.id,
          read: false,
    onError: () => { /* silent — action failed silently */ },
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
    onError: () => { /* silent — action failed silently */ },
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.Comment.delete(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', post.id] }),
    onError: () => { /* silent — action failed silently */ },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follow = follows.find(f => f.following_email === post.author_email);
        await base44.entities.Follow.delete(follow.id);
      } else {
        await base44.entities.Follow.create({
          follower_email: user.email,
          follower_name: user.full_name || user.email,
          following_email: post.author_email,
          following_name: post.author_name,
    onError: () => { /* silent — action failed silently */ },
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follows', user?.email] }),
  });

  const deletePostMutation = useMutation({
    mutationFn: () => base44.entities.Post.delete(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
    onError: () => { /* silent — action failed silently */ },
  });

  const editPostMutation = useMutation({
    mutationFn: () => base44.entities.Post.update(post.id, { content: editedContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      setIsEditingPost(false);
    },
    onError: () => { /* silent — action failed silently */ },
  });

  if (!post || !post.content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-white/10"
    >
      {post.is_live && (
        <div className="bg-rose-600 px-4 py-1.5 flex items-center gap-2 text-sm font-medium">
          <Radio className="w-4 h-4 animate-pulse" />
          LIVE NOW
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <button onClick={() => onViewProfile?.({ email: post.author_email, full_name: post.author_name, avatar_url: post.author_avatar })}>
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white font-medium">
                {post.author_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <button
                   onClick={() => onViewProfile?.({ email: post.author_email, full_name: post.author_name, avatar_url: post.author_avatar })}
                   className="text-sm sm:text-base font-semibold hover:text-indigo-400 transition-colors truncate block"
                 >
                   {post.author_name || 'Anonymous'}
                 </button>
                 {authorStreak && <div className="mt-1"><LuminaStreakBadge streak={authorStreak.current_streak} sparks={authorStreak.total_sparks} compact /></div>}
                 <p className="text-[10px] sm:text-xs text-zinc-500">{format(new Date(post.created_date), 'MMM d, h:mm a')}</p>
              </div>
              {user && post.author_email !== user.email && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDmUser?.(post.author_email, post.author_name)}
                  title={`Message ${post.author_name || 'user'}`}
                  className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-7 w-7 mr-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                </Button>
              )}
              {user && post.author_email !== user.email && (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={`${isFollowing ? 'bg-white/5 hover:bg-white/10 border-white/20' : 'bg-indigo-600 hover:bg-indigo-700'} rounded-full px-2 sm:px-3 h-7 text-xs mr-1 sm:mr-2`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">Follow</span>
                    </>
                  )}
                </Button>
              )}
              {user && post.author_email === user.email && (
                <div className="relative">
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => setShowPostMenu(!showPostMenu)}>
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                  <AnimatePresence>
                    {showPostMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 6 }}
                        className="absolute top-8 right-0 z-50 bg-zinc-800 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
                      >
                        <button
                          onClick={() => { setIsEditingPost(true); setShowPostMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                          Edit
                        </button>
                        <button
                          onClick={() => { deletePostMutation.mutate(); setShowPostMenu(false); }}
                          disabled={deletePostMutation.isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors border-t border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletePostMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {user && post.author_email !== user.email && (
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              )}
            </div>

            {isEditingPost ? (
              <div className="mb-4 flex flex-col gap-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-indigo-500 resize-none"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                    onClick={() => editPostMutation.mutate()}
                    disabled={editPostMutation.isPending || !editedContent.trim()}
                  >
                    {editPostMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    onClick={() => { setIsEditingPost(false); setEditedContent(post.content); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <p className="text-sm text-zinc-200" style={{ lineHeight: '1.6' }}>
                  <RichText
                    text={expanded || (post.content?.length || 0) <= 300 ? post.content : post.content?.slice(0, 300) + '\u2026'}
                    onHashtagClick={onHashtagClick}
                  />
                </p>
                {(post.content?.length || 0) > 300 && (
                  <button onClick={() => setExpanded(e => !e)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors">
                    {expanded ? 'See less' : 'See more'}
                  </button>
                )}
              </div>
            )}
            {post.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-3">
                {post.topics.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-medium">#{t}</span>
                ))}
              </div>
            )}

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

            {post.media_urls?.length > 0 && (
              <div className="mb-4 rounded-xl overflow-hidden bg-zinc-900 relative">
                {post.media_type === 'video' ? (
                  post.media_urls.length === 1 ? (
                    <video ref={videoRef} src={post.media_urls[0]} controls loop muted playsInline className="w-full rounded-xl max-h-80 object-cover bg-zinc-900" />
                  ) : (
                    <div className="relative">
                      <video src={post.media_urls[carouselIndex]} controls loop muted playsInline className="w-full rounded-xl max-h-80 object-cover bg-zinc-900" />
                      {post.media_urls.length > 1 && (
                        <>
                          <button
                            onClick={() => setCarouselIndex(i => i > 0 ? i - 1 : post.media_urls.length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCarouselIndex(i => i < post.media_urls.length - 1 ? i + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {post.media_urls.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCarouselIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${i === carouselIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                ) : post.media_urls.length > 1 && post.media_urls.length <= 4 ? (
                  <div className={`grid gap-1 ${post.media_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {post.media_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt=""
                        loading="lazy"
                        onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                        className="w-full object-cover rounded-lg cursor-pointer bg-zinc-900"
                        style={{ aspectRatio: '1/1' }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <img
                        src={post.media_urls[carouselIndex]}
                        alt=""
                        loading="lazy"
                        onClick={() => { setLightboxIndex(carouselIndex); setLightboxOpen(true); }}
                        className="w-full object-cover rounded-xl max-h-80 cursor-pointer bg-zinc-900"
                      />
                      {post.media_urls.length > 1 && (
                        <>
                          <button
                            onClick={() => setCarouselIndex(i => i > 0 ? i - 1 : post.media_urls.length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCarouselIndex(i => i < post.media_urls.length - 1 ? i + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && (
              <PostReactions
                post={post}
                user={user}
                onToggle={(emoji, prevEmoji) => toggleReactionMutation.mutate({ emoji, prevEmoji })}
              />
            )}

            <div className="mb-3">
              <button
                onClick={handleLuminaCheck}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {luminaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {luminaLoading ? 'Analyzing…' : showLumina ? 'Hide Lumina AI' : '🔍 Check with Lumina AI'}
              </button>
              <AnimatePresence>
                {showLumina && luminaCheck && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border ${
                      luminaCheck.verdict === 'verified' ? 'bg-emerald-950/50 border-emerald-500/30' :
                      luminaCheck.verdict === 'ai_generated' ? 'bg-purple-950/50 border-purple-500/30' :
                      luminaCheck.verdict === 'disputed' ? 'bg-red-950/50 border-red-500/30' :
                      'bg-amber-950/50 border-amber-500/30'
                    }`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {luminaCheck.verdict === 'verified' ? '✅' :
                         luminaCheck.verdict === 'ai_generated' ? '🤖' :
                         luminaCheck.verdict === 'disputed' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">Lumina AI</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            luminaCheck.verdict === 'verified' ? 'bg-emerald-500/20 text-emerald-300' :
                            luminaCheck.verdict === 'ai_generated' ? 'bg-purple-500/20 text-purple-300' :
                            luminaCheck.verdict === 'disputed' ? 'bg-red-500/20 text-red-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {luminaCheck.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mb-1">{luminaCheck.explanation}</p>
                        <p className="text-xs font-medium text-white">{luminaCheck.recommendation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-white/10 pt-3 mt-1 flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => setShowComments(s => !s)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-indigo-400' : 'text-zinc-400 hover:text-indigo-400'}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Comment'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(s => !s)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 6 }}
                      className="absolute bottom-8 left-0 z-50 bg-zinc-800 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                    >
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Share to</p>
                      </div>
                      <button
                        onClick={handleShareTwitter}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="text-base">𝕏</span>
                        Twitter / X
                      </button>
                      <button
                        onClick={handleShareWhatsApp}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="text-base">💬</span>
                        WhatsApp
                      </button>
                      <button
                        onClick={handleShareTelegram}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="text-base">✈️</span>
                        Telegram
                      </button>
                      <div className="border-t border-white/5">
                        <button
                          onClick={handleCopyText}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Copy className="w-4 h-4 text-zinc-400" />
                          Copy Text
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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

            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <PostComments
                    post={post}
                    user={user}
                    comments={comments}
                    onComment={(text) => commentMutation.mutate(text)}
                    onDelete={(id) => deleteCommentMutation.mutate(id)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && post.media_urls?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
              {post.media_type === 'video' ? (
                <video
                  src={post.media_urls[lightboxIndex]}
                  controls
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <motion.img
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  src={post.media_urls[lightboxIndex]}
                  alt=""
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}

              {post.media_urls.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i > 0 ? i - 1 : post.media_urls.length - 1); }}
                    className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i < post.media_urls.length - 1 ? i + 1 : 0); }}
                    className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {post.media_urls.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}