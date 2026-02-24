import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image, Video, Send, Heart, MessageCircle, Share2, 
  Radio, X, Plus, Smile, MoreHorizontal, Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

export default function Social() {
  const [user, setUser] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 20),
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    refetchInterval: 3000,
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.Post.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewPost('');
      setShowCreatePost(false);
    }
  });

  const sendChatMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setChatMessage('');
    }
  });

  const likePostMutation = useMutation({
    mutationFn: ({ id, likes }) => base44.entities.Post.update(id, { likes: likes + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });

  const handleCreatePost = () => {
    if (!newPost.trim() || !user) return;
    createPostMutation.mutate({
      content: newPost,
      author_name: user.full_name || user.email,
      likes: 0,
      media_type: 'none'
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user) return;
    sendChatMutation.mutate({
      content: chatMessage,
      author_name: user.full_name || user.email,
      author_email: user.email
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Social Hub</h1>
          <p className="text-zinc-400">Connect, share, and engage with the community</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            {user && (
              <motion.div 
                className="glass rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                      {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="bg-white/5 border-white/10 resize-none text-white placeholder:text-zinc-500 min-h-[100px]"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/10">
                          <Image className="w-5 h-5 mr-2" />
                          Photo
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/10">
                          <Video className="w-5 h-5 mr-2" />
                          Video
                        </Button>
                        <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-white/10">
                          <Radio className="w-5 h-5 mr-2" />
                          Go Live
                        </Button>
                      </div>
                      <Button 
                        onClick={handleCreatePost}
                        disabled={!newPost.trim() || createPostMutation.isPending}
                        className="btn-primary rounded-full px-6"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              <AnimatePresence>
                {postsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-32 bg-white/10 rounded" />
                          <div className="h-4 w-full bg-white/10 rounded" />
                          <div className="h-4 w-2/3 bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : posts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass rounded-2xl p-12 text-center"
                  >
                    <Users className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                    <p className="text-zinc-400">Be the first to share something with the community!</p>
                  </motion.div>
                ) : (
                  posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass rounded-2xl p-6"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white font-medium">
                            {post.author_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{post.author_name || 'Anonymous'}</h4>
                              <p className="text-xs text-zinc-500">
                                {format(new Date(post.created_date), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </div>
                          <p className="text-zinc-200 leading-relaxed mb-4">{post.content}</p>
                          <div className="flex items-center gap-6">
                            <button 
                              onClick={() => likePostMutation.mutate({ id: post.id, likes: post.likes || 0 })}
                              className="flex items-center gap-2 text-zinc-400 hover:text-rose-400 transition-colors"
                            >
                              <Heart className="w-5 h-5" />
                              <span className="text-sm">{post.likes || 0}</span>
                            </button>
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors">
                              <MessageCircle className="w-5 h-5" />
                              <span className="text-sm">0</span>
                            </button>
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors">
                              <Share2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
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
                    Live Chat
                  </h3>
                  <span className="text-xs text-zinc-500">{chatMessages.length} messages</span>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {[...chatMessages].reverse().map((msg, index) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 ${msg.author_email === user?.email ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {msg.author_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] ${msg.author_email === user?.email ? 'items-end' : ''}`}>
                        <p className={`text-xs text-zinc-500 mb-1 ${msg.author_email === user?.email ? 'text-right' : ''}`}>
                          {msg.author_name}
                        </p>
                        <div className={`rounded-2xl px-4 py-2 ${
                          msg.author_email === user?.email 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                            : 'bg-white/10'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
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
    </div>
  );
}