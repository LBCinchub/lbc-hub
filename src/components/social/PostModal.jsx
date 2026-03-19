import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PostCard from './PostCard';

export default function PostModal({ post, isOpen, onClose, user, onDmUser, onViewProfile, onHashtagClick }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-2xl max-h-[90vh] bg-zinc-950 rounded-2xl z-[71] overflow-y-auto"
          >
            <div className="sticky top-0 flex items-center justify-between p-4 bg-zinc-950/95 backdrop-blur-sm border-b border-white/10 z-10">
              <h3 className="font-semibold">Post</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 lg:p-6">
              <PostCard
                post={post}
                user={user}
                onDmUser={onDmUser}
                onViewProfile={onViewProfile}
                onHashtagClick={onHashtagClick}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}