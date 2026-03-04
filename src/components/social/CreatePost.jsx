import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Video, Radio, X, Loader2, Tag, Plane, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import TopicSelector from './TopicSelector';
import { Link } from 'react-router-dom';

// Extract SharedTrip id from a pasted URL
function extractTripId(text) {
  const match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function CreatePost({ user, onGoLive }) {
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [mediaType, setMediaType] = useState('none');
  const [uploading, setUploading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [showTopics, setShowTopics] = useState(false);
  const [tripPreview, setTripPreview] = useState(null); // { id, trip_name, destination, num_days, user_name }
  const [loadingTrip, setLoadingTrip] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleTextChange = async (e) => {
    const val = e.target.value;
    setText(val);
    const tripId = extractTripId(val);
    if (tripId && (!tripPreview || tripPreview.id !== tripId)) {
      setLoadingTrip(true);
      try {
        const trip = await base44.entities.TripItinerary.filter({ id: tripId }, '-created_date', 1);
        if (trip?.[0]) setTripPreview(trip[0]);
      } catch {}
      setLoadingTrip(false);
    } else if (!tripId) {
      setTripPreview(null);
    }
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
      return base44.entities.Post.create({
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setText('');
      removeMedia();
      setSelectedTopics([]);
      setShowTopics(false);
    },
  });

  const handlePost = () => {
    if (!text.trim() && mediaFiles.length === 0) return;
    createMutation.mutate({ text, mediaType });
  };

  return (
    <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start gap-4">
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
            {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            value={text}
            onChange={e => setText(e.target.value)}
            className="bg-white/5 border-white/10 resize-none text-white placeholder:text-zinc-500 min-h-[90px]"
          />

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

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelect(e.target.files, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e.target.files, 'video')} />
              <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-sm gap-1.5">
                <ImageIcon className="w-4 h-4" /> Photo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} className="text-zinc-400 hover:text-white hover:bg-white/10 text-sm gap-1.5">
                <Video className="w-4 h-4" /> Video
              </Button>
              <Button variant="ghost" size="sm" onClick={onGoLive} className="text-rose-400 hover:text-rose-300 hover:bg-white/10 text-sm gap-1.5">
                <Radio className="w-4 h-4" /> Go Live
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTopics(s => !s)} className={`text-sm gap-1.5 ${showTopics ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <Tag className="w-4 h-4" /> Topics
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={(!text.trim() && mediaFiles.length === 0) || createMutation.isPending}
              className="btn-primary rounded-full px-6"
            >
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : createMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}