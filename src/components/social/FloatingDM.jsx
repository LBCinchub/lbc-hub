import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, X, ArrowLeft, Minus } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function FloatingDM({ user }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 520 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const bottomRef = useRef(null);
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

  // Drag logic
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('form')) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: position.x, py: position.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  if (!user) return null;

  return (
    <div
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }}
    >
      {/* Floating button (when closed) */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setOpen(true)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
          onMouseDown={onMouseDown}
        >
          <Mail className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-80 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
            style={{ background: 'rgba(18,18,28,0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Draggable Header */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-3 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <div className="flex items-center gap-2">
                {activeConvo ? (
                  <button onMouseDown={e => e.stopPropagation()} onClick={() => { setActiveConvo(null); setActiveName(''); }} className="flex items-center gap-1.5 text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> {activeName || activeConvo}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-semibold text-sm text-white">Messages</h3>
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">{unreadCount}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
                {!activeConvo && (
                  <button onClick={() => { setComposing(true); setActiveConvo(null); }} className="text-xs text-indigo-400 hover:text-indigo-300 px-2">+ New</button>
                )}
                <button onClick={() => setMinimized(m => !m)} className="p-1 rounded hover:bg-white/10 text-zinc-400">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1 rounded hover:bg-white/10 text-zinc-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Compose */}
                {composing && !activeConvo && (
                  <div className="p-3 border-b border-white/10">
                    <Input
                      value={newRecipient}
                      onChange={e => setNewRecipient(e.target.value)}
                      placeholder="Recipient email..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm"
                    />
                  </div>
                )}

                {/* Thread list */}
                {!activeConvo && !composing && (
                  <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380 }}>
                    {threadList.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500">
                        <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                        <p className="text-sm">No messages yet</p>
                        <button onClick={() => setComposing(true)} className="text-indigo-400 text-xs mt-2 hover:underline">Start a conversation</button>
                      </div>
                    ) : threadList.map(thread => {
                      const last = thread.messages[thread.messages.length - 1];
                      const hasUnread = thread.messages.some(m => m.to_email === user.email && !m.read);
                      return (
                        <button
                          key={thread.email}
                          onClick={() => { setActiveConvo(thread.email); setActiveName(thread.name); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors text-left"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                              {thread.name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <p className={`text-sm font-medium truncate ${hasUnread ? 'text-white' : 'text-zinc-300'}`}>{thread.name || thread.email}</p>
                              <p className="text-xs text-zinc-600">{format(new Date(last.created_date), 'h:mm a')}</p>
                            </div>
                            <p className={`text-xs truncate ${hasUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>{last.content}</p>
                          </div>
                          {hasUnread && <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Conversation messages */}
                {(activeConvo || composing) && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 320 }}>
                    {convoMessages.map(msg => {
                      const mine = msg.from_email === user.email;
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-white/10 text-zinc-100'}`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}

                {/* Input */}
                {(activeConvo || composing) && (
                  <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2">
                    <Input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm"
                    />
                    <Button type="submit" size="icon" className="btn-primary rounded-full flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}