import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

import CreatePost from '../components/social/CreatePost';
import PostCard from '../components/social/PostCard';
import NotificationBell from '../components/social/NotificationBell';
import DirectMessages from '../components/social/DirectMessages';
import GoLiveModal from '../components/social/GoLiveModal';
import UserProfileModal from '../components/social/UserProfileModal';
import { AnimatePresence } from 'framer-motion';

export default function Social() {
  const [user, setUser] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 30),
    refetchInterval: 10000,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    refetchInterval: 3000,
  });

  const sendChatMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setChatMessage('');
    }
  });

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user) return;
    sendChatMutation.mutate({
      content: chatMessage,
      author_name: user.full_name || user.email,
      author_email: user.email
    });
  };

  const handleStartLive = async () => {
    if (!user) return;
    await base44.entities.Post.create({
      content: `${user.full_name || user.email} is live! 🔴`,
      author_name: user.full_name || user.email,
      author_email: user.email,
      likes: 0,
      liked_by: [],
      is_live: true,
      media_type: 'live',
      media_urls: [],
    });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleDmUser = (email, name) => {
    if (!user || email === user.email) return;
    setDmTarget({ email, name });
  };

  const handleViewProfile = (targetUser) => {
    setProfileTarget(targetUser);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-1">Social Hub</h1>
            <p className="text-zinc-400">Connect, share, and engage with the community</p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <NotificationBell user={user} />
              <DirectMessages user={user} />
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-5">
            {user ? (
              <CreatePost user={user} onGoLive={() => setGoLiveOpen(true)} />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 text-center">
                <p className="text-zinc-400 mb-3">Sign in to post and interact</p>
                <Button onClick={() => base44.auth.redirectToLogin()} className="btn-primary rounded-full px-6">
                  Sign In
                </Button>
              </motion.div>
            )}

            {/* Feed */}
            <div className="space-y-4">
              {postsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-32 bg-white/10 rounded" />
                        <div className="h-4 w-full bg-white/10 rounded" />
                        <div className="h-4 w-2/3 bg-white/10 rounded" />
                      </div>
                    </div>
                  </div>
                ))
              ) : posts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-zinc-400">Be the first to share something!</p>
                </motion.div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    onDmUser={handleDmUser}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </div>
          </div>

          {/* Sidebar - Live Chat */}
          <div className="lg:col-span-1">
            <motion.div
              className="glass rounded-2xl overflow-hidden sticky top-24"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Community Chat
                  </h3>
                  <span className="text-xs text-zinc-500">{chatMessages.length} msgs</span>
                </div>
              </div>

              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {[...chatMessages].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.author_email === user?.email ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {msg.author_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] ${msg.author_email === user?.email ? 'items-end flex flex-col' : ''}`}>
                        <p className={`text-xs text-zinc-500 mb-1 ${msg.author_email === user?.email ? 'text-right' : ''}`}>
                          {msg.author_name}
                        </p>
                        <div className={`rounded-2xl px-3 py-2 text-sm ${
                          msg.author_email === user?.email
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                            : 'bg-white/10'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {user ? (
                <form onSubmit={handleSendChat} className="p-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!chatMessage.trim()}
                      className="btn-primary rounded-full flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-white/10 text-center">
                  <button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    Sign in to chat
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Go Live Modal */}
      <GoLiveModal
        open={goLiveOpen}
        onClose={() => setGoLiveOpen(false)}
        onStartLive={handleStartLive}
      />
    </div>
  );
}