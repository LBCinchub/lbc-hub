import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LUMINA_AVATAR = 'https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=80&h=80&fit=crop&crop=face';

export default function LuminaChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [user, setUser] = useState(null);
  const [memory, setMemory] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  // Load current user
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  // Load history when opened
  useEffect(() => {
    if (open && user && !initialized.current) {
      initialized.current = true;
      loadHistory();
    }
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    setInitializing(true);
    try {
      const res = await base44.functions.invoke('luminaChat', { action: 'load' });
      const { history, memory: mem, user_name } = res.data;
      setMemory(mem);

      if (history && history.length > 0) {
        setMessages(history.map(m => ({ role: m.role, content: m.content, id: m.id })));
      } else {
        // First time or no history — show greeting
        const greeting = mem
          ? buildReturningGreeting(user_name, mem)
          : buildNewUserGreeting(user_name);
        setMessages([{ role: 'lumina', content: greeting, id: 'greeting' }]);
      }
    } catch {
      setMessages([{ role: 'lumina', content: "Hey! I'm Lumina 👋 Your personal AI on LBC Hub. How can I help you today?", id: 'greeting' }]);
    }
    setInitializing(false);
  };

  const buildReturningGreeting = (name, mem) => {
    const firstName = (name || '').split(' ')[0] || 'there';
    const ref = mem.past_requests?.[mem.past_requests.length - 1];
    if (ref) return `Hey ${firstName}! Welcome back 👋 Last time you were asking about "${ref}". How can I help you today?`;
    if (mem.conversation_summary) return `Hey ${firstName}! Good to see you again 👋 ${mem.conversation_summary} What can I do for you?`;
    return `Hey ${firstName}! Great to have you back 👋 What can I help you with today?`;
  };

  const buildNewUserGreeting = (name) => {
    const firstName = (name || '').split(' ')[0];
    if (firstName && firstName !== name) {
      return `Hey ${firstName}! I'm Lumina 👋 Your personal AI on LBC Hub. I'll remember everything you share with me. What are you looking for today?`;
    }
    return "Hey! I'm Lumina 👋 Your personal AI on LBC Hub. Tell me your name and what you're looking for — I'll remember everything from now on!";
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('luminaChat', { action: 'send', message: text });
      const reply = res.data?.reply || "I'm here! What can I help you with?";
      setMessages(prev => [...prev, { role: 'lumina', content: reply, id: Date.now().toString() + '_l' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'lumina', content: "Sorry, I had a little hiccup. Try again? 😊", id: 'err' }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show unread dot after 2s if not open
  useEffect(() => {
    if (!open && user && !initialized.current) {
      const t = setTimeout(() => setHasUnread(true), 2000);
      return () => clearTimeout(t);
    }
  }, [user, open]);

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            style={{ height: 'min(520px, calc(100vh - 120px))', background: '#18181b' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
              <div className="relative">
                <img src={LUMINA_AVATAR} alt="Lumina" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-purple-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">Lumina</div>
                <div className="text-xs text-purple-200">Online — your personal AI</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
              {initializing ? (
                <div className="flex justify-start">
                  <TypingDots />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <TypingDots />
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/10 flex gap-2 items-end bg-zinc-900">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Message Lumina..."
                rows={1}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors max-h-24"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bubble */}
      <motion.div
        className="fixed bottom-6 right-6 z-[9999]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative group">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-800 border border-white/10">
            Chat with Lumina
          </div>

          <button
            onClick={() => setOpen(o => !o)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-purple-900/50 transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
          >
            {open ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <img src={LUMINA_AVATAR} alt="Lumina" className="w-10 h-10 rounded-full object-cover" />
            )}
          </button>

          {/* Unread dot */}
          {hasUnread && !open && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          )}
        </div>
      </motion.div>
    </>
  );
}

function MessageBubble({ msg }) {
  const isLumina = msg.role === 'lumina';
  return (
    <div className={`flex ${isLumina ? 'justify-start' : 'justify-end'}`}>
      {isLumina && (
        <img src={LUMINA_AVATAR} alt="Lumina" className="w-6 h-6 rounded-full object-cover mr-2 mt-1 flex-shrink-0" />
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isLumina
            ? 'rounded-tl-sm text-white'
            : 'rounded-tr-sm text-white bg-zinc-700'
        }`}
        style={isLumina ? { background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' } : {}}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
      <img src={LUMINA_AVATAR} alt="" className="w-4 h-4 rounded-full object-cover -ml-1 mr-1" />
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-white/70 rounded-full"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}