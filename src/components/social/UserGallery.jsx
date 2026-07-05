import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function UserGallery({ isOpen, onClose, onSelectMedia }) {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadGallery();
    }
  }, [isOpen]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      // Fetch user's posts to get media URLs
      const user = await base44.auth.me();
      const posts = await base44.entities.Post.filter({ author_email: user.email }, '-created_date', 50);
      
      const items = [];
      posts.forEach(post => {
        if (post.media_urls && post.media_urls.length > 0) {
          post.media_urls.forEach(url => {
            items.push({
              id: `${post.id}-${url}`,
              url,
              type: post.media_type,
              postId: post.id,
            });
          });
        }
      });
      setGalleryItems(items);
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedItems.length > 0) {
      onSelectMedia(selectedItems);
      setSelectedItems([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Your Gallery</h3>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-zinc-400">
                <p>No media in your gallery yet. Upload some posts first!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {galleryItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedItems.find(i => i.id === item.id)
                        ? 'ring-2 ring-indigo-500 scale-95'
                        : 'hover:opacity-80'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-24 bg-black/50 flex items-center justify-center">
                        <span className="text-xs text-zinc-400">Video</span>
                      </div>
                    ) : (
                      <img src={item.url} alt="" loading="lazy" className="w-full h-24 object-cover" />
                    )}
                    {selectedItems.find(i => i.id === item.id) && (
                      <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <span className="text-sm text-zinc-400">
              {selectedItems.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-white/20 text-zinc-300">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedItems.length === 0}
                className="btn-primary"
              >
                Add {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}