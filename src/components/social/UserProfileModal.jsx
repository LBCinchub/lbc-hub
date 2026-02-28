import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, Camera, Save, UserPlus, UserMinus,
  Lock, Eye, EyeOff, FileText, ShoppingBag, Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function UserProfileModal({ targetUser, currentUser, onClose }) {
  const isOwnProfile = currentUser?.email === targetUser?.email;
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [savedData, setSavedData] = useState({});
  const [editForm, setEditForm] = useState({
    bio: targetUser?.bio || '',
    avatar_url: targetUser?.avatar_url || '',
    cover_url: targetUser?.cover_url || '',
    profile_visibility: targetUser?.profile_visibility || 'public',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const queryClient = useQueryClient();
  const displayUser = { ...targetUser, ...savedData };

  const { data: userPosts = [] } = useQuery({
    queryKey: ['userPosts', targetUser?.email],
    queryFn: () => base44.entities.Post.filter({ author_email: targetUser.email }, '-created_date', 20),
    enabled: !!targetUser?.email,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', targetUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: targetUser.email }, '-created_date', 50),
    enabled: !!targetUser?.email,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', targetUser?.email],
    queryFn: () => base44.entities.Follow.filter({ following_email: targetUser.email }, '-created_date', 50),
    enabled: !!targetUser?.email,
  });

  const { data: followRecord = [] } = useQuery({
    queryKey: ['followRecord', currentUser?.email, targetUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email, following_email: targetUser.email }),
    enabled: !!currentUser && !!targetUser && !isOwnProfile,
  });

  const { data: sellerReviews = [] } = useQuery({
    queryKey: ['sellerReviews', targetUser?.email],
    queryFn: () => base44.entities.Review.filter({ seller_email: targetUser.email }, '-created_date', 20),
    enabled: !!targetUser?.email,
  });

  const isFollowing = followRecord.length > 0;
  const avgRating = sellerReviews.length
    ? (sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length).toFixed(1)
    : null;

  const followMutation = useMutation({
    mutationFn: () => base44.entities.Follow.create({
      follower_email: currentUser.email,
      follower_name: currentUser.full_name || currentUser.email,
      following_email: targetUser.email,
      following_name: targetUser.full_name || targetUser.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', targetUser.email] });
      queryClient.invalidateQueries({ queryKey: ['followRecord'] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => base44.entities.Follow.delete(followRecord[0].id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', targetUser.email] });
      queryClient.invalidateQueries({ queryKey: ['followRecord'] });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setSavedData(prev => ({ ...prev, ...variables }));
      setEditing(false);
    }
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm(f => ({ ...f, avatar_url: file_url }));
    setUploading(false);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm(f => ({ ...f, cover_url: file_url }));
    setUploadingCover(false);
  };

  const visibilityIcon = { public: Eye, followers_only: EyeOff, private: Lock };

  const canViewContent = () => {
    const v = targetUser?.profile_visibility || 'public';
    if (v === 'public') return true;
    if (!currentUser) return false;
    if (isOwnProfile) return true;
    if (v === 'followers_only') return isFollowing;
    return false;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-6 px-4 pb-6 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl glass rounded-3xl overflow-hidden"
      >
        {/* Header / Cover */}
        <div className="relative h-36 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.4) 100%)' }}>
          {(editing ? editForm.cover_url : displayUser?.cover_url) && (
            <img
              src={editing ? editForm.cover_url : displayUser?.cover_url}
              alt="cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors" style={{ zIndex: 20 }}>
            <X className="w-5 h-5" />
          </button>
          {isOwnProfile && editing && (
            <label className="absolute inset-0 flex items-center justify-center cursor-pointer group" style={{ zIndex: 5 }}>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 bg-black/50 rounded-2xl px-4 py-3">
                <Camera className="w-6 h-6 text-white" />
                <span className="text-xs text-white font-medium">{uploadingCover ? 'Uploading...' : 'Change Cover'}</span>
              </div>
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="text-white text-sm font-medium animate-pulse">Uploading...</div>
                </div>
              )}
            </label>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-zinc-900">
                <AvatarImage src={editing ? editForm.avatar_url : displayUser?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
                  {(targetUser?.full_name || targetUser?.email || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && editing && (
                <label className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer bg-black/40 opacity-0 hover:opacity-100 transition-opacity group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  <div className="flex flex-col items-center gap-0.5">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[9px] text-white font-medium">{uploading ? '...' : 'Change'}</span>
                  </div>
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-16">
              {isOwnProfile ? (
                editing ? (
                  <>
                    <Button onClick={() => updateProfileMutation.mutate(editForm)} disabled={updateProfileMutation.isPending} className="btn-primary rounded-xl gap-1.5 text-sm">
                      <Save className="w-4 h-4" /> {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline" className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl text-sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)} variant="outline" className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl text-sm">
                    Edit Profile
                  </Button>
                )
              ) : currentUser && (
                <Button
                  onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className={`rounded-xl gap-1.5 text-sm ${isFollowing ? 'border border-white/20 bg-transparent hover:bg-white/10' : 'btn-primary'}`}
                >
                  {isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{displayUser?.full_name || displayUser?.email}</h2>
              {avgRating && (
                <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                  <Star className="w-4 h-4 fill-amber-400" /> {avgRating} seller
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400">{displayUser?.email}</p>

            {editing ? (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-zinc-400 mb-1 block text-sm">Bio</Label>
                  <Textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell the community about yourself..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 mb-1 block text-sm">Profile Visibility</Label>
                  <Select value={editForm.profile_visibility} onValueChange={v => setEditForm(f => ({ ...f, profile_visibility: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="public">🌐 Public — Anyone can view</SelectItem>
                      <SelectItem value="followers_only">👥 Followers Only</SelectItem>
                      <SelectItem value="private">🔒 Private — Only you</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <>
                {displayUser?.bio && <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{displayUser.bio}</p>}
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                  {displayUser?.profile_visibility === 'private' && <><Lock className="w-3 h-3" /> Private profile</>}
                  {displayUser?.profile_visibility === 'followers_only' && <><EyeOff className="w-3 h-3" /> Followers only</>}
                </div>
              </>
            )}

            {/* Stats */}
            <div className="flex gap-5 pt-2">
              <div className="text-center">
                <p className="font-bold">{userPosts.length}</p>
                <p className="text-xs text-zinc-500">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{followers.length}</p>
                <p className="text-xs text-zinc-500">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{following.length}</p>
                <p className="text-xs text-zinc-500">Following</p>
              </div>
              {sellerReviews.length > 0 && (
                <div className="text-center">
                  <p className="font-bold text-amber-400">{avgRating}</p>
                  <p className="text-xs text-zinc-500">Seller Rating</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        {canViewContent() ? (
          <>
            <div className="flex gap-1 px-4 pb-3 border-b border-white/10 overflow-x-auto">
              <TabBtn active={tab === 'posts'} onClick={() => setTab('posts')}>Posts</TabBtn>
              <TabBtn active={tab === 'following'} onClick={() => setTab('following')}>Following</TabBtn>
              <TabBtn active={tab === 'followers'} onClick={() => setTab('followers')}>Followers</TabBtn>
              {sellerReviews.length > 0 && (
                <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>Seller Reviews</TabBtn>
              )}
            </div>

            <div className="p-5 max-h-80 overflow-y-auto space-y-3">
              {/* Posts Tab */}
              {tab === 'posts' && (
                userPosts.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm">No posts yet</p>
                  </div>
                ) : userPosts.map(post => (
                  <div key={post.id} className="bg-white/5 rounded-2xl p-4">
                    <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3">{post.content}</p>
                    {post.media_urls?.length > 0 && (
                      <img src={post.media_urls[0]} alt="" className="mt-2 rounded-xl w-full h-32 object-cover" />
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                      <span>❤️ {post.likes || 0}</span>
                      {post.is_live && <Badge className="bg-rose-500/20 text-rose-400 border-0 text-xs">Live</Badge>}
                    </div>
                  </div>
                ))
              )}

              {/* Following Tab */}
              {tab === 'following' && (
                following.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">Not following anyone yet</div>
                ) : following.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                        {(f.following_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{f.following_name}</p>
                  </div>
                ))
              )}

              {/* Followers Tab */}
              {tab === 'followers' && (
                followers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">No followers yet</div>
                ) : followers.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                        {(f.follower_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{f.follower_name}</p>
                  </div>
                ))
              )}

              {/* Seller Reviews Tab */}
              {tab === 'reviews' && (
                sellerReviews.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">No seller reviews yet</div>
                ) : sellerReviews.map(review => (
                  <div key={review.id} className="bg-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{review.reviewer_name || 'Anonymous'}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${review.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-zinc-300">{review.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="p-10 text-center text-zinc-500">
            <Lock className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
            <p className="font-medium text-zinc-300">This profile is private</p>
            <p className="text-sm mt-1">
              {targetUser?.profile_visibility === 'followers_only'
                ? 'Follow this user to see their content'
                : 'This profile is only visible to the owner'}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}