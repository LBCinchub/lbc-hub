import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, Search, X, Bookmark, Filter, Globe, UserCheck, Video, Image, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import SuggestedPosts from '../components/social/SuggestedPosts';
import TrendingWidget from '../components/social/TrendingWidget';
import { TOPICS } from '../components/social/TopicSelector';

export default function Social() {
  const [user, setUser] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [feedTab, setFeedTab] = useState('forYou'); // 'forYou' | 'following' | 'videos' | 'photos'

  const { data: follows = [] } = useQuery({
    queryKey: ['follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user,
    retry: false,
    staleTime: Infinity,
  });
  const followingEmails = new Set(follows.map(f => f.following_email));
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 30),
    refetchInterval: false,
    retry: false,
    staleTime: Infinity,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    refetchInterval: false,
    retry: false,
    staleTime: Infinity,
  });

  const [knownChatters] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('lbc_chatters') || '[]')); } catch { return new Set(); }
  });

  const sendChatMutation = useMutation({
    mutationFn: async (data) => {
      const msg = await base44.entities.ChatMessage.create(data);
      const isNew = !knownChatters.has(data.author_email);
      if (isNew) {
        knownChatters.add(data.author_email);
        localStorage.setItem('lbc_chatters', JSON.stringify([...knownChatters]));
      }
      // Call AI moderator in background (don't await to keep UX snappy)
      base44.functions.invoke('aiModerator', {
        message_id: msg.id,
        content: data.content,
        author_name: data.author_name,
        author_email: data.author_email,
        is_new_user: isNew,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      }).catch(() => {});
      return msg;
    },
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
    <div className="min-h-screen bg-zinc-950 py-4 sm:py-8 px-3 sm:px-4 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 w-full">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-4xl font-bold mb-1 truncate">Social Hub</h1>
            <p className="text-xs sm:text-base text-zinc-400 hidden sm:block truncate">Connect, share, and engage with the community</p>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to={createPageUrl('FollowedPosts')} title="Saved Posts" className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-indigo-400">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <NotificationBell user={user} />
              <DirectMessages user={user} />
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 w-full">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-5 w-full min-w-0">
            {user ? (
              <CreatePost user={user} onGoLive={() => setGoLiveOpen(true)} />
            ) : null}

            {/* Feed Tabs */}
            <div className="flex items-center gap-1 p-1 glass rounded-2xl overflow-x-auto scrollbar-hide w-full">
              {[
                { key: 'forYou', label: 'For You', icon: Globe },
                { key: 'following', label: 'Following', icon: UserCheck },
                { key: 'videos', label: 'Videos', icon: Video },
                { key: 'photos', label: 'Photos', icon: Image },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFeedTab(key)}
                  className={`flex items-center gap-1 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap ${
                    feedTab === key
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden xs:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Topic Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
              {activeTopic ? (
                <button
                  onClick={() => setActiveTopic(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              )}
              <button
                onClick={() => setActiveTopic(null)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${!activeTopic ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                All
              </button>
              {TOPICS.filter(t => posts.some(p => p.topics?.includes(t))).map(topic => (
                <button
                  key={topic}
                  onClick={() => setActiveTopic(activeTopic === topic ? null : topic)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTopic === topic ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                >
                  #{topic}
                </button>
              ))}
            </div>

            {!user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-zinc-400 mb-3">Sign in to post and interact</p>
                <Button onClick={() => base44.auth.redirectToLogin()} className="btn-primary rounded-full px-6 text-sm sm:text-base">
                  Sign In
                </Button>
              </motion.div>
            )}

            {/* Feed */}
            {(() => {
              let filteredPosts = posts;

              // Feed tab filter
              if (feedTab === 'following') {
                filteredPosts = filteredPosts.filter(p => followingEmails.has(p.author_email));
              } else if (feedTab === 'videos') {
                filteredPosts = filteredPosts.filter(p => p.media_type === 'video' || p.media_type === 'live');
              } else if (feedTab === 'photos') {
                filteredPosts = filteredPosts.filter(p => p.media_type === 'image');
              }

              if (searchQuery.trim()) {
                filteredPosts = filteredPosts.filter(p =>
                  p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.author_name?.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }
              if (activeTopic) {
                filteredPosts = filteredPosts.filter(p => 
                  p.topics?.includes(activeTopic) || 
                  p.content?.toLowerCase().includes(`#${activeTopic.toLowerCase()}`)
                );
              }
              return (
                <div className="space-y-4">
                  {postsLoading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="glass rounded-2xl p-4 sm:p-6 animate-pulse">
                        <div className="flex gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex-shrink-0" />
                          <div className="flex-1 space-y-2 sm:space-y-3">
                            <div className="h-3 sm:h-4 w-24 sm:w-32 bg-white/10 rounded" />
                            <div className="h-3 sm:h-4 w-full bg-white/10 rounded" />
                            <div className="h-3 sm:h-4 w-2/3 bg-white/10 rounded" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredPosts.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 sm:p-12 text-center">
                      <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-zinc-600 mb-3 sm:mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">{searchQuery ? 'No posts found' : 'No posts yet'}</h3>
                      <p className="text-sm sm:text-base text-zinc-400">{searchQuery ? `No results for "${searchQuery}"` : 'Be the first to share something!'}</p>
                    </motion.div>
                  ) : (
                    filteredPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        user={user}
                        onDmUser={handleDmUser}
                        onViewProfile={handleViewProfile}
                        onHashtagClick={(tag) => {
                          setActiveTopic(tag);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    ))
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 hidden lg:block">
            {/* Trending Topics */}
            <TrendingWidget 
              posts={posts} 
              onTopicClick={(topic) => setActiveTopic(topic)} 
            />

            {/* Suggested Posts */}
            {user && (
              <motion.div
                className="glass rounded-2xl overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SuggestedPosts user={user} allPosts={posts} onViewProfile={handleViewProfile} />
              </motion.div>
            )}

            {/* Community Chat */}
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

              <ScrollArea className="h-[340px] p-4">
                <div className="space-y-4">
                  {[...chatMessages].reverse().map((msg) => {
                    const isAIMod = msg.author_email === 'ai.mod@lbchub.ai';
                    const isMine = msg.author_email === user?.email;
                    return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {isAIMod ? (
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">🤖</AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                            {msg.author_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={`max-w-[75%] ${isMine ? 'items-end flex flex-col' : ''}`}>
                        <p className={`text-xs mb-1 ${isMine ? 'text-right text-zinc-500' : isAIMod ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                          {msg.author_name}
                        </p>
                        <div className={`rounded-2xl px-3 py-2 text-sm ${
                          isMine
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                            : isAIMod
                            ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-100'
                            : 'bg-white/10'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );})}
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

      {/* User Profile Modal */}
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