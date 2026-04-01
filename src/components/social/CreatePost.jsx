import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Video, Radio, X, Loader2, Tag, Plane, MapPin, Calendar, FolderOpen, PenLine, Smile, Hash } from 'lucide-react';
import ImageEditor from './ImageEditor';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import TopicSelector from './TopicSelector';
import RichTextEditor from './RichTextEditor';
import UserGallery from './UserGallery';
import CrossPostSelector from './CrossPostSelector';
import SocialAccountsModal from './SocialAccountsModal';

function extractTripId(text) {
  const match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

const MOODS = [
  { emoji: '😊', label: 'Happy' }, { emoji: '😍', label: 'Loved' }, { emoji: '🔥', label: 'Excited' },
  { emoji: '😂', label: 'Laughing' }, { emoji: '😢', label: 'Sad' }, { emoji: '😴', label: 'Tired' },
  { emoji: '🤔', label: 'Thoughtful' }, { emoji: '😎', label: 'Cool' }, { emoji: '🙏', label: 'Grateful' },
  { emoji: '💪', label: 'Motivated' }, { emoji: '😤', label: 'Frustrated' }, { emoji: '🥳', label: 'Celebrating' },
];

const SUGGESTED_HASHTAGS = ['#travel', '#lifestyle', '#motivation', '#photography', '#food', '#fitness', '#art', '#music', '#tech', '#fashion', '#nature', '#vibes'];

export default function CreatePost({ user, onGoLive }) {
  const urlParams = new URLSearchParams(window.location.search);
  const shareTripId = urlParams.get('shareTrip');
  const shareTripName = urlParams.get('tripName');
  const shareTripDest = urlParams.get('dest');
  const shareTripDays = urlParams.get('days');

  const [expanded, setExpanded] = useState(!!shareTripId);
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [mediaType, setMediaType] = useState('none');
  const [uploading, setUploading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [showTopics, setShowTopics] = useState(false);
  const [tripPreview, setTripPreview] = useState(() => {
    if (shareTripId && shareTripName) {
      return { id: shareTripId, trip_name: shareTripName, destination: shareTripDest, num_days: Number(shareTripDays), user_name: user?.full_name || user?.email };
    }
    return null;
  });
  const textareaRef = useRef(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [location, setLocation] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mood, setMood] = useState(null);
  const [showMood, setShowMood] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  const queryClient = useQueryClient();
  const tripLookupTimer = useRef(null);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (shareTripId) return;
    const tripId = extractTripId(val);
    if (!tripId) { setTripPreview(null); return; }
    if (tripPreview?.id === tripId) return;
    clearTimeout(tripLookupTimer.current);
    tripLookupTimer.current = setTimeout(async () => {
      setLoadingTrip(true);
      try {
        const trip = await base44.entities.TripItinerary.filter({ id: tripId }, '-created_date', 1);
        if (trip?.[0]) setTripPreview(trip[0]);
      } catch {}
      setLoadingTrip(false);
    }, 600);
  };

  const handleFileSelect = (files, type) => {
    const arr = Array.from(files);
    setMediaFiles(arr);
    setMediaType(type);
    setMediaPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const removeMedia = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaType('none');
  };

  const handleHashtagClick = (tag) => {
    setText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + tag + ' ');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const createMutation = useMutation({
    mutationFn: async ({ text, mediaType, mood, location }) => {
      let mediaUrls = [];
      if (mediaFiles.length > 0) {
        setUploading(true);
        const uploads = await Promise.all(mediaFiles.map(f => base44.integrations.Core.UploadFile({ file: f })));
        mediaUrls = uploads.map(u => u.file_url);
        setUploading(false);
      }
      const moodSuffix = mood ? ` — feeling ${mood.emoji} ${mood.label}` : '';
      const locationSuffix = location ? ` 📍 ${location}` : '';
      const fullText = text + moodSuffix + locationSuffix;
      const post = await base44.entities.Post.create({
        content: fullText,
        trip_id: tripPreview?.id || undefined,
        trip_name: tripPreview?.trip_name || undefined,
        trip_destination: tripPreview?.destination || undefined,
        trip_days: tripPreview?.num_days || undefined,
        trip_user: tripPreview?.user_name || undefined,
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_avatar: user.avatar_url || '',
        likes: 0,
        liked_by: [],
        media_type: mediaType,
        media_urls: mediaUrls,
        is_live: false,
        topics: selectedTopics,
        cross_post_platforms: selectedPlatforms,
      });
      if (selectedPlatforms.length > 0) {
        base44.functions.invoke('crossPostToSocial', {
          post_id: post.id, content: fullText, media_urls: mediaUrls,
          platforms: selectedPlatforms, user_email: user.email,
        }).catch(err => console.error('Cross-post error:', err));
      }
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setText(''); removeMedia(); setSelectedTopics([]); setShowTopics(false);
      setTripPreview(null); setSelectedPlatforms([]); setMood(null);
      setLocation(''); setShowLocation(false); setShowMood(false); setShowHashtags(false);
      setExpanded(false);
    },
  });

  const handlePost = () => {
    if (!text.trim() && mediaFiles.length === 0) return;
    createMutation.mutate({ text, mediaType, mood, location });
  };

  const handleGallerySelect = (selectedItems) => {
    const urls = selectedItems.map(item => item.url);
    const type = selectedItems[0].type || 'image';
    setMediaFiles(urls.map(url => ({ url })));
    setMediaPreviews(urls);
    setMediaType(type);
  };

  // Collapsed state
  if (!expanded) {
    return (
      <motion.div
        className="glass rounded-xl sm:rounded-2xl p-4 shadow-lg cursor-pointer hover:bg-white/5 transition-colors"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-zinc-400 text-sm">
            What's on your mind, {user.full_name?.split(' ')[0] || 'there'}? ✨
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="p-2 rounded-lg bg-white/5 text-indigo-400"><ImageIcon className="w-4 h-4" /></span>
            <span className="p-2 rounded-lg bg-white/5 text-yellow-400"><Smile className="w-4 h-4" /></span>
            <span className="p-2 rounded-lg bg-white/5 text-rose-400"><MapPin className="w-4 h-4" /></span>
            <span className="p-2 rounded-lg bg-white/5 text-indigo-300"><Hash className="w-4 h-4" /></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Expanded state
  return (
    <motion.div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
            {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <RichTextEditor
            value={text}
            onChange={handleTextChange}
            placeholder={tripPreview ? `Say something about your ${tripPreview.destination} trip... ✈️` : "What's on your mind? Share your thoughts..."}
            autoFocus
          />

          {/* Mood display */}
          {mood && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-zinc-300">Feeling {mood.emoji} <span className="text-zinc-400">{mood.label}</span></span>
              <button onClick={() => setMood(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Location input */}
          <AnimatePresence>
            {showLocation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                  <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Add your location..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                  />
                  {location && <button onClick={() => setLocation('')} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hashtag suggestions */}
          <AnimatePresence>
            {showHashtags && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                <p className="text-xs text-zinc-500 mb-2">Tap to add hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_HASHTAGS.map(tag => (
                    <button key={tag} onClick={() => handleHashtagClick(tag)}
                      className="px-2.5 py-1 rounded-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mood picker */}
          <AnimatePresence>
            {showMood && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                <p className="text-xs text-zinc-500 mb-2">How are you feeling?</p>
                <div className="grid grid-cols-6 gap-1">
                  {MOODS.map(m => (
                    <button key={m.label} onClick={() => { setMood(m); setShowMood(false); }}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-white/10 transition-colors ${mood?.label === m.label ? 'bg-white/10 ring-1 ring-yellow-400/50' : ''}`}>
                      <span className="text-xl">{m.emoji}</span>
                      <span className="text-[9px] text-zinc-400">{m.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trip Link Preview */}
          <AnimatePresence>
            {(tripPreview || loadingTrip) && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-4 h-4 text-white" />
                </div>
                {loadingTrip ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading trip...</div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{tripPreview.trip_name}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" />{tripPreview.destination}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400" />{tripPreview.num_days} days</span>
                      <span className="text-zinc-500">by {tripPreview.user_name}</span>
                    </div>
                  </div>
                )}
                <button onClick={() => setTripPreview(null)} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media Preview */}
          <AnimatePresence>
            {mediaPreviews.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 relative">
                <button onClick={removeMedia} className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
                {mediaType === 'video' ? (
                  <video src={mediaPreviews[0]} className="w-full rounded-xl max-h-48 object-cover" controls />
                ) : (
                  <div className={`grid gap-1 ${mediaPreviews.length > 1 ? 'grid-cols-2' : ''}`}>
                    {mediaPreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="" className="w-full rounded-xl object-cover max-h-48" />
                        {mediaType === 'image' && (
                          <button onClick={() => setEditingImageUrl(src)}
                            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PenLine className="w-3 h-3" /> Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Topic Picker */}
          <AnimatePresence>
            {showTopics && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <TopicSelector selected={selectedTopics} onChange={setSelectedTopics} />
              </motion.div>
            )}
          </AnimatePresence>

          {selectedTopics.length > 0 && !showTopics && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedTopics.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 text-xs">#{t}</span>
              ))}
            </div>
          )}

          {/* Cross-Post Selector */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <CrossPostSelector
              user={user}
              selectedPlatforms={selectedPlatforms}
              onToggle={(platform) => {
                setSelectedPlatforms(prev =>
                  prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
                );
              }}
              onManageAccounts={() => setShowSocialModal(true)}
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 sm:mt-4">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelect(e.target.files, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e.target.files, 'video')} />
              <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs gap-1 px-2 h-8">
                <ImageIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Photo</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs gap-1 px-2 h-8">
                <Video className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Video</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowGallery(true)} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs gap-1 px-2 h-8">
                <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Gallery</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onGoLive} className="text-rose-400 hover:text-rose-300 hover:bg-white/10 text-xs gap-1 px-2 h-8">
                <Radio className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Live</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowMood(s => !s); setShowHashtags(false); }}
                className={`text-xs gap-1 px-2 h-8 ${showMood ? 'text-yellow-400 bg-yellow-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <Smile className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Feeling</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLocation(s => !s)}
                className={`text-xs gap-1 px-2 h-8 ${showLocation ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <MapPin className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Location</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowHashtags(s => !s); setShowMood(false); }}
                className={`text-xs gap-1 px-2 h-8 ${showHashtags ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <Hash className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tags</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTopics(s => !s)}
                className={`text-xs gap-1 px-2 h-8 ${showTopics ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <Tag className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Topics</span>
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={(!text.trim() && mediaFiles.length === 0) || createMutation.isPending}
              className="btn-primary rounded-full px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0 ml-2"
            >
              {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</> : createMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
          <button onClick={() => setExpanded(false)} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full text-center">
            Collapse ↑
          </button>
        </div>
      </div>

      <UserGallery isOpen={showGallery} onClose={() => setShowGallery(false)} onSelectMedia={handleGallerySelect} />

      {editingImageUrl && (
        <ImageEditor
          imageUrl={editingImageUrl}
          user={user}
          onClose={() => setEditingImageUrl(null)}
          onUseInPost={(blob) => {
            const file = new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });
            const previewUrl = URL.createObjectURL(blob);
            const idx = mediaPreviews.indexOf(editingImageUrl);
            if (idx !== -1) {
              const newFiles = [...mediaFiles];
              const newPreviews = [...mediaPreviews];
              newFiles[idx] = file;
              newPreviews[idx] = previewUrl;
              setMediaFiles(newFiles);
              setMediaPreviews(newPreviews);
            } else {
              setMediaFiles([file]);
              setMediaPreviews([previewUrl]);
              setMediaType('image');
            }
            setEditingImageUrl(null);
          }}
        />
      )}

      {showSocialModal && (
        <SocialAccountsModal user={user} onClose={() => setShowSocialModal(false)} />
      )}
    </motion.div>
  );
}