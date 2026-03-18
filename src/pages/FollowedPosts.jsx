import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PostCard from '../components/social/PostCard';
import UserProfileModal from '../components/social/UserProfileModal';
import { AnimatePresence } from 'framer-motion';

export default function FollowedPosts() {
  const [user, setUser] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: followedRecords = [], isLoading: followLoading } = useQuery({
    queryKey: ['followedPosts', user?.email],
    queryFn: () => base44.entities.FollowedPost.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: allPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 100),
    enabled: followedRecords.length > 0,
  });

  const followedPostIds = new Set(followedRecords.map(r => r.post_id));
  const followedPosts = allPosts.filter(p => followedPostIds.has(p.id));
  const isLoading = followLoading || postsLoading;

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Social')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bookmark className="w-7 h-7 text-indigo-400 fill-indigo-400" />
              Saved Posts
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">Posts you've bookmarked</p>
          </div>
        </div>

        {!user ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Sign in to view your saved posts</p>
            <button onClick={() => base44.auth.redirectToLogin()} className="mt-4 btn-primary px-6 py-2 rounded-full text-sm font-medium">
              Sign In
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-4 w-full bg-white/10 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : followedPosts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold mb-2">No saved posts yet</h3>
            <p className="text-zinc-400 text-sm">Tap the bookmark icon on any post to save it here.</p>
            <Link to={createPageUrl('Social')} className="inline-block mt-5 btn-primary px-6 py-2 rounded-full text-sm font-medium">
              Browse Posts
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {followedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                onViewProfile={setProfileTarget}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {profileTarget && (
          <UserProfileModal
            targetUser={profileTarget}
            currentUser={user}
            onClose={() => setProfileTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}