import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Edit2, Save, X, Loader2, MapPin, Plane, Bookmark, Image as ImageIcon, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PostCard from '../components/social/PostCard';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'trips' | 'saved'
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setBio(u.bio || '');
      setLocation(u.location || '');
    }).catch(() => {});
  }, []);

  const { data: myPosts = [] } = useQuery({
    queryKey: ['myPosts', user?.email],
    queryFn: () => base44.entities.Post.filter({ author_email: user.email }, '-created_date', 50),
    enabled: !!user,
  });

  const { data: myTrips = [] } = useQuery({
    queryKey: ['myTrips', user?.email],
    queryFn: () => base44.entities.TripItinerary.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user,
  });

  const { data: savedPosts = [] } = useQuery({
    queryKey: ['savedPosts', user?.email],
    queryFn: async () => {
      const followed = await base44.entities.FollowedPost.filter({ user_email: user.email });
      const postIds = followed.map(f => f.post_id);
      if (postIds.length === 0) return [];
      const allPosts = await base44.entities.Post.list('-created_date', 100);
      return allPosts.filter(p => postIds.includes(p.id));
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({ bio, location });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      const updated = await base44.auth.me();
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <Avatar className="w-32 h-32">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
                  {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </label>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold">{user.full_name || 'User'}</h1>
                  <p className="text-zinc-400 text-sm">{user.email}</p>
                </div>
                {!editMode ? (
                  <Button onClick={() => setEditMode(true)} variant="outline" className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditMode(false); setBio(user.bio || ''); setLocation(user.location || ''); }} variant="outline" size="icon">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleSave} className="btn-primary gap-2" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Bio</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="bg-white/5 border-white/10 text-white resize-none h-24"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {location && (
                    <p className="flex items-center gap-2 text-zinc-300">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      {location}
                    </p>
                  )}
                  {bio && <p className="text-zinc-300 leading-relaxed">{bio}</p>}
                  {!bio && !location && <p className="text-zinc-500 italic">No bio yet. Click "Edit Profile" to add one!</p>}
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-2xl font-bold text-white">{myPosts.length}</p>
                  <p className="text-xs text-zinc-500">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{myTrips.length}</p>
                  <p className="text-xs text-zinc-500">Trips</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{savedPosts.length}</p>
                  <p className="text-xs text-zinc-500">Saved</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 glass rounded-2xl mb-6">
          {[
            { key: 'posts', label: 'My Posts', icon: ImageIcon },
            { key: 'trips', label: 'My Trips', icon: Plane },
            { key: 'saved', label: 'Saved', icon: Bookmark },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {myPosts.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <ImageIcon className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-zinc-400 mb-4">Share your first post on the Social page</p>
                  <Link to={createPageUrl('Social')}>
                    <Button className="btn-primary">Go to Social</Button>
                  </Link>
                </div>
              ) : (
                myPosts.map(post => <PostCard key={post.id} post={post} user={user} />)
              )}
            </motion.div>
          )}

          {activeTab === 'trips' && (
            <motion.div key="trips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid sm:grid-cols-2 gap-4">
              {myTrips.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center col-span-2">
                  <Plane className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
                  <p className="text-zinc-400 mb-4">Plan your first adventure on the Travel page</p>
                  <Link to={createPageUrl('Travel')}>
                    <Button className="btn-primary">Explore Travel</Button>
                  </Link>
                </div>
              ) : (
                myTrips.map(trip => (
                  <Link
                    key={trip.id}
                    to={`${createPageUrl('SharedTrip')}?id=${trip.id}`}
                    className="glass rounded-2xl p-5 hover:border-indigo-500/30 transition-all border border-white/10 group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Plane className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate group-hover:text-indigo-400 transition-colors">{trip.trip_name}</h3>
                        <p className="text-zinc-400 text-sm">{trip.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.num_days} days</span>
                      {trip.start_date && <span>{new Date(trip.start_date).toLocaleDateString()}</span>}
                      {trip.is_public && <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Public</span>}
                    </div>
                  </Link>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {savedPosts.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Bookmark className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No saved posts</h3>
                  <p className="text-zinc-400">Bookmark posts you want to revisit later</p>
                </div>
              ) : (
                savedPosts.map(post => <PostCard key={post.id} post={post} user={user} />)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}