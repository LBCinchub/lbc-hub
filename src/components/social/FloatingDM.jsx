import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, X, ArrowLeft, Minus, Plus, Search, Users, ShoppingBag, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

export default function FloatingDM({ user }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'community' | 'marketplace' | 'requests'
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth - 380), y: Math.max(80, window.innerHeight - 560) });
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const hasDragged = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allMessages = [] } = useQuery({
    queryKey: ['dms', user?.email],
    queryFn: async () => {
      const sent = await base44.entities.DirectMessage.filter({ from_email: user.email }, '-created_date', 100);
      const received = await base44.entities.DirectMessage.filter({ to_email: user.email }, '-created_date', 100);
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!user?.email,
    refetchInterval: 3000,
  });

  const { data: communityMessages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    enabled: !!user?.email && activeTab === 'community',
    refetchInterval: 5000,
  });

  const { data: marketplaceInquiries = [] } = useQuery({
    queryKey: ['buyerInquiries', user?.email],
    queryFn: async () => {
      const asBuyer = await base44.entities.BuyerInquiry.filter({ buyer_email: user.email }, '-created_date', 50);
      const asSeller = await base44.entities.BuyerInquiry.filter({ seller_email: user.email }, '-created_date', 50);
      return [...asBuyer, ...asSeller].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email && activeTab === 'marketplace',
    refetchInterval: 5000,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['serviceRequests', user?.email],
    queryFn: () => base44.entities.ServiceBooking.filter({ email: user.email }, '-created_date', 50),
    enabled: !!user?.email && activeTab === 'requests',
    refetchInterval: 5000,
  });

  const sendCommunityMutation = useMutation({
    mutationFn: (content) => base44.entities.ChatMessage.create({ content, author_name: user.full_name || user.email, author_email: user.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chatMessages'] }); setText(''); }
  });

  const threads = {};
  allMessages.forEach(msg => {
    const other = msg.from_email === user.email ? msg.to_email : msg.from_email;
    const otherName = msg.from_email === user.email ? msg.to_name : msg.from_name;
    if (!threads[other]) threads[other] = { email: other, name: otherName, messages: [] };
    threads[other].messages.push(msg);
  });
  const threadList = Object.values(threads);
  const convoMessages = activeConvo ? (threads[activeConvo]?.messages || []) : [];
  const unreadCount = allMessages.filter(m => m.to_email === user?.email && !m.read).length;

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.DirectMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms'] });
      setText('');
      base44.entities.Notification.create({
        to_email: activeConvo || newRecipient,
        from_name: user.full_name || user.email,
        type: 'message',
        message: `${user.full_name || user.email} sent you a message`,
        read: false,
      }).catch(() => {});
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    const toEmail = activeConvo || newRecipient.trim();
    if (!text.trim() || !toEmail) return;
    sendMutation.mutate({
      to_email: toEmail,
      to_name: activeName || newRecipient,
      from_email: user.email,
      from_name: user.full_name || user.email,
      content: text,
      read: false,
    });
    if (composing) {
      setActiveConvo(toEmail);
      setActiveName(newRecipient);
      setComposing(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convoMessages.length]);

  useEffect(() => {
    if ((activeConvo || composing) && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeConvo, composing]);

  const startDrag = (e) => {
    if (e.button !== 0) return;
    hasDragged.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: position.x, py: position.y };

    const onMove = (ev) => {
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 64, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 64, dragStart.current.py + dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleButtonClick = () => {
    if (!hasDragged.current) setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-dm-panel]')) {
        setOpen(false);
        setMinimized(false);
        setActiveConvo(null);
        setComposing(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 0);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  if (!user) return null;

  const initials = (name) => name?.[0]?.toUpperCase() || '?';
  const avatarGradient = (email) => {
    const colors = [
      'from-violet-500 to-indigo-600',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-500',
      'from-cyan-500 to-blue-600',
    ];
    const idx = (email?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };

  return (
    <div style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }}>
      {/* Floating button (when closed) */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.08 }}
          onMouseDown={startDrag}
          onClick={handleButtonClick}
          className="relative w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center cursor-move select-none"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}
        >
          <Mail className="w-6 h-6 text-white drop-shadow" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-emerald-400 text-white text-xs flex items-center justify-center font-bold shadow-lg"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            data-dm-panel
            className="w-[340px] rounded-3xl flex flex-col overflow-hidden"
            style={{
              background: 'rgba(13, 13, 20, 0.96)',
              backdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)',
            }}
          >
            {/* Header */}
            <div
              onMouseDown={startDrag}
              className="flex items-center justify-between px-4 py-3.5 cursor-grab active:cursor-grabbing select-none"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.1) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-2.5" onMouseDown={e => e.stopPropagation()}>
                {activeConvo ? (
                  <button
                    onClick={() => { setActiveConvo(null); setActiveName(''); setComposing(false); }}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{activeName || activeConvo}</p>
                      <p className="text-xs text-emerald-400">Online</p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white leading-tight">Messages</h3>
                      {unreadCount > 0 && <p className="text-xs text-indigo-400">{unreadCount} unread</p>}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
                {!activeConvo && activeTab === 'direct' && (
                  <button
                    onClick={() => { setComposing(true); setActiveConvo(null); }}
                    className="w-7 h-7 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 flex items-center justify-center transition-colors"
                    title="New message"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                )}
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-300"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setOpen(false); setMinimized(false); setActiveConvo(null); setComposing(false); }}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            {!activeConvo && (
              <div className="flex border-b select-none" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }} onMouseDown={e => e.stopPropagation()}>
                {[
                  { id: 'direct', icon: Mail, label: 'DMs' },
                  { id: 'community', icon: Users, label: 'Community' },
                  { id: 'marketplace', icon: ShoppingBag, label: 'Market' },
                  { id: 'requests', icon: Bell, label: 'Requests' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setComposing(false); }}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${activeTab === tab.id ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                    style={{ borderBottomColor: activeTab === tab.id ? '#6366f1' : 'transparent' }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col overflow-hidden"
                >
                  {/* Compose recipient input */}
                  {composing && !activeConvo && (
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <input
                          value={newRecipient}
                          onChange={e => setNewRecipient(e.target.value)}
                          placeholder="Enter email address..."
                          className="bg-transparent flex-1 text-sm text-white placeholder:text-zinc-600 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Community Tab */}
                  {activeTab === 'community' && !activeConvo && (
                    <div className="flex flex-col" style={{ maxHeight: 400 }}>
                      <div className="overflow-y-auto flex-1 px-3 py-2 space-y-2" style={{ maxHeight: 320 }}>
                        {communityMessages.length === 0 ? (
                          <div className="py-10 flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-zinc-600" />
                            <p className="text-xs text-zinc-500">No community messages yet</p>
                          </div>
                        ) : [...communityMessages].reverse().map(msg => {
                          const mine = msg.author_email === user.email;
                          return (
                            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                              {!mine && (
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient(msg.author_email)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5`}>
                                  {initials(msg.author_name)}
                                </div>
                              )}
                              <div className="max-w-[75%]">
                                {!mine && <p className="text-[10px] text-zinc-500 mb-0.5 ml-1">{msg.author_name}</p>}
                                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${mine ? 'text-white rounded-br-sm' : 'text-zinc-100 rounded-bl-sm'}`}
                                  style={mine ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <form onSubmit={e => { e.preventDefault(); if (text.trim()) sendCommunityMutation.mutate(text); }} className="px-3 py-2 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message community..." className="flex-1 bg-white/5 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none border border-white/8" />
                        <button type="submit" disabled={!text.trim()} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                          <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Marketplace Tab */}
                  {activeTab === 'marketplace' && !activeConvo && (
                    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                      {marketplaceInquiries.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2">
                          <ShoppingBag className="w-8 h-8 text-zinc-600" />
                          <p className="text-xs text-zinc-500">No marketplace messages</p>
                        </div>
                      ) : marketplaceInquiries.map(inq => (
                        <div key={inq.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-white truncate">{inq.product_name || 'Product Inquiry'}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${inq.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' : inq.status === 'closed' ? 'bg-zinc-700 text-zinc-500' : 'bg-indigo-500/20 text-indigo-400'}`}>{inq.status}</span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">{inq.message}</p>
                          {inq.reply && <p className="text-xs text-indigo-300 mt-1 italic">↳ {inq.reply}</p>}
                          <p className="text-[10px] text-zinc-600 mt-1">{inq.buyer_email === user.email ? `To: ${inq.seller_email}` : `From: ${inq.buyer_name || inq.buyer_email}`}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Requests Tab */}
                  {activeTab === 'requests' && !activeConvo && (
                    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                      {serviceRequests.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2">
                          <Bell className="w-8 h-8 text-zinc-600" />
                          <p className="text-xs text-zinc-500">No service requests</p>
                        </div>
                      ) : serviceRequests.map(req => (
                        <div key={req.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-white truncate">{req.service_category}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${req.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : req.status === 'completed' ? 'bg-zinc-700 text-zinc-400' : 'bg-amber-500/20 text-amber-400'}`}>{req.status}</span>
                          </div>
                          {req.message && <p className="text-xs text-zinc-400 line-clamp-2">{req.message}</p>}
                          <p className="text-[10px] text-zinc-600 mt-1">{format(new Date(req.created_date), 'MMM d, h:mm a')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thread list (Direct tab) */}
                  {activeTab === 'direct' && !activeConvo && !composing && (
                    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                      {threadList.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                            <Mail className="w-6 h-6 text-zinc-600" />
                          </div>
                          <p className="text-sm text-zinc-500 font-medium">No messages yet</p>
                          <button
                            onClick={() => setComposing(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Start a conversation
                          </button>
                        </div>
                      ) : threadList.map(thread => {
                        const last = thread.messages[thread.messages.length - 1];
                        const hasUnread = thread.messages.some(m => m.to_email === user.email && !m.read);
                        return (
                          <button
                            key={thread.email}
                            onClick={() => { setActiveConvo(thread.email); setActiveName(thread.name); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left group"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <div className="relative flex-shrink-0">
                              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarGradient(thread.email)} flex items-center justify-center text-white text-sm font-bold`}>
                                {initials(thread.name)}
                              </div>
                              {hasUnread && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#0d0d14]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-zinc-300'}`}>{thread.name || thread.email}</p>
                                <p className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">{format(new Date(last.created_date), 'h:mm a')}</p>
                              </div>
                              <p className={`text-xs truncate ${hasUnread ? 'text-zinc-400' : 'text-zinc-600'}`}>{last.content}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Conversation */}
                  {(activeConvo || composing) && (
                    <>
                      <div
                        className="overflow-y-auto px-4 py-3 space-y-2"
                        style={{ maxHeight: 300, minHeight: 200 }}
                      >
                        {convoMessages.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-32 gap-2">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(activeConvo)} flex items-center justify-center text-white font-bold text-lg`}>
                              {initials(activeName)}
                            </div>
                            <p className="text-xs text-zinc-600">Say hello to {activeName || activeConvo}!</p>
                          </div>
                        )}
                        {convoMessages.map((msg, i) => {
                          const mine = msg.from_email === user.email;
                          const showTime = i === 0 || (new Date(msg.created_date) - new Date(convoMessages[i - 1]?.created_date)) > 300000;
                          return (
                            <div key={msg.id}>
                              {showTime && (
                                <p className="text-center text-[10px] text-zinc-700 my-2">
                                  {format(new Date(msg.created_date), 'h:mm a')}
                                </p>
                              )}
                              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                    mine
                                      ? 'text-white rounded-br-sm'
                                      : 'text-zinc-100 rounded-bl-sm'
                                  }`}
                                  style={mine
                                    ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }
                                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)' }
                                  }
                                >
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>

                      {/* Input */}
                      <form
                        onSubmit={handleSend}
                        className="px-3 py-3 flex items-center gap-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <input
                            ref={inputRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                            placeholder="Message..."
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!text.trim()}
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                          <Send className="w-4 h-4 text-white" />
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}