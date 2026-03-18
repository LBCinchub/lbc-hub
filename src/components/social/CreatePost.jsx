import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Video, Radio, X, Loader2, Tag, Plane, MapPin, Calendar, FolderOpen, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import TopicSelector from './TopicSelector';
import RichTextEditor from './RichTextEditor';
import UserGallery from './UserGallery';
import CrossPostSelector from './CrossPostSelector';
import SocialAccountsModal from './SocialAccountsModal';
import { Link } from 'react-router-dom';

// Extract SharedTrip id from a pasted URL
function extractTripId(text) {
  const match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function CreatePost({ user, onGoLive }) {
  const urlParams = new URLSearchParams(window.location.search);
  const shareTripId = urlParams.get('shareTrip');
  const shareTripName = urlParams.get('tripName');
  const shareTripDest = urlParams.get('dest');
  const shareTripDays = urlParams.get('days');

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
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Auto-focus textarea when trip is pre-loaded from share
  React.useEffect(() => {
    if (shareTripId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  const queryClient = useQueryClient();

  const tripLookupTimer = useRef(null);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // If a trip was pre-loaded from URL params, don't try to re-fetch from typed text
    if (shareTripId) return;

    const tripId = extractTripId(val);
    if (!tripId) {
      setTripPreview(null);
      return;
    }
    if (tripPreview?.id === tripId) return;

    // Debounce: only fetch after user stops typing for 600ms
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
    const previews = arr.map(f => URL.createObjectURL(f));
    setMediaPreviews(previews);
  };

  const removeMedia = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaType('none');
  };

  const createMutation = useMutation({
    mutationFn: async ({ text, mediaType }) => {
      let mediaUrls = [];
      if (mediaFiles.length > 0) {
        setUploading(true);
        const uploads = await Promise.all(
          mediaFiles.map(f => base44.integrations.Core.UploadFile({ file: f }))
        );
        mediaUrls = uploads.map(u => u.file_url);
        setUploading(false);
      }
      const post = await base44.entities.Post.create({
        content: text,
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

      // Trigger cross-posting in background (don't await to keep UX snappy)
      if (selectedPlatforms.length > 0) {
        base44.functions.invoke('crossPostToSocial', {
          post_id: post.id,
          content: text,
          media_urls: mediaUrls,
          platforms: selectedPlatforms,
          user_email: user.email,
        }).catch(() => {});
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setText('');
      removeMedia();
      setSelectedTopics([]);
      setShowTopics(false);
      setTripPreview(null);
      setSelectedPlatforms([]);
    },
  });

  const handlePost = () => {
    if (!text.trim() && mediaFiles.length === 0) return;
    createMutation.mutate({ text, mediaType });
  };

  const handleGallerySelect = (selectedItems) => {
    const urls = selectedItems.map(item => item.url);
    const type = selectedItems[0].type || 'image';
    setMediaFiles(urls.map(url => ({ url })));
    setMediaPreviews(urls);
    setMediaType(type);
  };

  return (
    <motion.div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
            {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <RichTextEditor
            value={text}
            onChange={handleTextChange}
            placeholder={tripPreview ? `Say something about your ${tripPreview.destination} trip... ✈️` : "What's on your mind? Paste a trip link to share your itinerary ✈️"}
          />

          {/* Trip Link Preview */}
          <AnimatePresence>
            {(tripPreview || loadingTrip) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 flex items-center gap-3"
              >
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
                      <img key={i} src={src} alt="" className="w-full rounded-xl object-cover max-h-48" />
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
                  prev.includes(platform)
                    ? prev.filter(p => p !== platform)
                    : [...prev, platform]
                );
              }}
              onManageAccounts={() => setShowSocialModal(true)}
            />
          </div>

          <div className="flex items-center justify-between mt-3 sm:mt-4">
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelect(e.target.files, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e.target.files, 'video')} />
              <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3 h-8">
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Photo</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3 h-8">
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Video</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowGallery(true)} className="text-zinc-400 hover:text-white hover:bg-white/10 text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3 h-8">
                <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Gallery</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onGoLive} className="text-rose-400 hover:text-rose-300 hover:bg-white/10 text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3 h-8">
                <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Live</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTopics(s => !s)} className={`text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 ${showTopics ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Topics</span>
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={(!text.trim() && mediaFiles.length === 0) || createMutation.isPending}
              className="btn-primary rounded-full px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0"
            >
              {uploading ? <><Loader2 className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 animate-spin" /><span className="hidden sm:inline">Uploading...</span><span className="sm:hidden">Up...</span></> : createMutation.isPending ? <span className="hidden sm:inline">Posting...</span> : 'Post'}
            </Button>
          </div>
        </div>
      </div>

      <UserGallery isOpen={showGallery} onClose={() => setShowGallery(false)} onSelectMedia={handleGallerySelect} />

      {showSocialModal && (
        <SocialAccountsModal
          user={user}
          onClose={() => setShowSocialModal(false)}
        />
      )}
    </motion.div>
  );
}