import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Mic, MicOff, Volume2, VolumeX, Phone, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useVoice } from '@/hooks/useVoice';
import LuminaCallMode from './LuminaCallMode';
import MessageActionBar from './MessageActionBar';

const LUMINA_AVATAR = 'https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=80&h=80&fit=crop&crop=face';
const DAILY_LIMIT = 30;

export default function LuminaChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [user, setUser] = useState(null);
  const [callMode, setCallMode] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageRecordId, setUsageRecordId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  const voice = useVoice({
    onTranscript: (t) => setInput(t),
    onFinalTranscript: (t) => {
      setInput(t);
      setTimeout(() => {
        setInput(prev => {
          if (prev.trim()) sendMessageText(prev.trim());
          return '';
        });
      }, 100);
    },
    continuous: false,
  });

  // Load current user
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  // Load history + usage when opened
  useEffect(() => {
    if (open && user && !initialized.current) {
      initialized.current = true;
      loadHistory();
      loadUsage();
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

  // Stop listening when widget closes
  useEffect(() => {
    if (!open) {
      voice.stopListening();
      voice.stopSpeaking();
    }
  }, [open]);

  const loadUsage = async () => {
    if (!user?.email) return;
    try {
      const isFounder = user.email === 'tarek-samara@lbc-hub.com' || user.role === 'admin';
      if (isFounder) return; // unlimited

      const records = await base44.entities.AIUsage.filter({ user_email: user.email });
      if (records.length > 0) {
        const rec = records[0];
        // Reset daily count if last_reset was yesterday or earlier
        const lastReset = new Date(rec.last_reset || 0);
        const now = new Date();
        const isNewDay = lastReset.toDateString() !== now.toDateString();
        if (isNewDay) {
          await base44.entities.AIUsage.update(rec.id, { count: 0, last_reset: now.toISOString() });
          setUsageCount(0);
        } else {
          setUsageCount(rec.count || 0);
        }
        setUsageRecordId(rec.id);
      } else {
        // Create fresh record
        const newRec = await base44.entities.AIUsage.create({
          user_email: user.email,
          count: 0,
          last_reset: new Date().toISOString()
        });
        setUsageRecordId(newRec.id);
        setUsageCount(0);
      }
    } catch (err) {
      console.error('Usage load error:', err);
    }
  };

  const incrementUsage = async () => {
    try {
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      if (usageRecordId) {
        await base44.entities.AIUsage.update(usageRecordId, { count: newCount });
      }
    } catch (err) {
      console.error('Usage increment error:', err);
    }
  };

  const loadHistory = async () => {
    setInitializing(true);
    try {
      const chatMessages = await base44.entities.LuminaMessage.filter(
        { user_id: user.email },
        '-created_date',
        40
      );
      const history = chatMessages.reverse();

      const memories = await base44.entities.UserMemory.filter({ user_id: user.email });
      const mem = memories.length > 0 ? memories[0] : null;

      if (history && history.length > 0) {
        setMessages(history.map(m => ({ role: m.role, content: m.content, id: m.id })));
      } else {
        const greeting = mem
          ? buildReturningGreeting(user.full_name, mem)
          : buildNewUserGreeting(user.full_name);
        setMessages([{ role: 'lumina', content: greeting, id: 'greeting' }]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
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

  const isOverLimit = () => {
    if (!user) return false;
    const isFounder = user.email === 'tarek-samara@lbc-hub.com' || user.role === 'admin';
    const isPremium = user.premium === true;
    return !isFounder && !isPremium && usageCount >= DAILY_LIMIT;
  };

  const sendMessageText = async (text) => {
    if (!text || loading || !user) return;

    // Usage gate
    if (isOverLimit()) {
      setMessages(prev => [...prev, {
        role: 'lumina',
        content: `⚠️ Daily limit reached (${DAILY_LIMIT}/day). Upgrade to Premium for unlimited access!`,
        id: Date.now() + '_lim'
      }]);
      return;
    }

    const userMsg = { role: 'user', content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('luminaChat', { action: 'send', message: text });
      const reply = res.data?.reply || "I'm here! What can I help you with?";

      // Sync memory
      try {
        await base44.functions.invoke('syncUserMemory', { lumina_response: reply });
      } catch (err) {
        console.error('Failed to sync memory:', err);
      }

      // Increment usage counter
      await incrementUsage();

      setMessages(prev => [...prev, { role: 'lumina', content: reply, id: Date.now().toString() + '_l' }]);
      if (!voice.isMuted) voice.speak(reply);
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => [...prev, { role: 'lumina', content: "Sorry, I had a little hiccup. Try again? 😊", id: 'err' }]);
    }
    setLoading(false);
  };

  const sendMessage = () => sendMessageText(input.trim());

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

  const isFounder = user?.email === 'tarek-samara@lbc-hub.com' || user?.role === 'admin';
  const isPremium = user?.premium === true;
  const showUsageBadge = user && !isFounder && !isPremium;

  if (callMode) {
    return <LuminaCallMode onEnd={() => setCallMode(false)} />;
  }

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
                <div className="text-xs text-purple-200">
                  {voice.isSpeaking ? '🔊 Speaking...' : voice.isListening ? '🎤 Listening...' : 'Online — your personal AI'}
                </div>
              </div>
              {/* Usage badge */}
              {showUsageBadge && (
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${usageCount >= DAILY_LIMIT ? 'bg-red-500/30 text-red-300' : 'bg-white/15 text-purple-100'}`}>
                  {usageCount}/{DAILY_LIMIT}
                </div>
              )}
              {/* Call button */}
              <button
                onClick={() => setCallMode(true)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                title="Call Lumina"
              >
                <Phone className="w-3.5 h-3.5 text-white" />
              </button>
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
            <div className="px-3 py-3 border-t border-white/10 bg-zinc-900 space-y-2">
              {voice.isListening && (
                <div className="flex items-center gap-2 px-2">
                  <motion.div className="w-2 h-2 rounded-full bg-red-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  <span className="text-xs text-red-400">Listening...</span>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={isOverLimit() ? '⚠️ Daily limit reached' : voice.isListening ? 'Speak now...' : 'Message Lumina...'}
                  rows={1}
                  disabled={isOverLimit()}
                  className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors max-h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ lineHeight: '1.5' }}
                />
                {/* Mic button */}
                <button
                  onClick={voice.toggleListening}
                  disabled={isOverLimit()}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    voice.isListening ? 'bg-red-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                {/* Mute button */}
                <button
                  onClick={voice.toggleMute}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                  title={voice.isMuted ? 'Unmute' : 'Mute'}
                >
                  {voice.isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                </button>
                {/* Send */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || isOverLimit()}
                  className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-4 z-[9998] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="spark" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {hasUnread && !open && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-purple-700" />
        )}
      </button>
    </>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/8 max-w-[80px]">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-white/8 text-zinc-100 rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}
