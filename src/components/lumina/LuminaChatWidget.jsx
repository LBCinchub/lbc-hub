import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Mic, MicOff, Volume2, VolumeX, Phone, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useVoice } from '@/hooks/useVoice';
import LuminaCallMode from './LuminaCallMode';

const LUMINA_AVATAR = 'https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=80&h=80&fit=crop&crop=face';

export default function LuminaChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [user, setUser] = useState(null);
  const [callMode, setCallMode] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  const voice = useVoice({
    onTranscript: (t) => setInput(t),
    onFinalTranscript: (t) => {
      setInput(t);
      // Auto-send after 1.5s pause (already handled inside hook, we just trigger send)
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

  // Stop listening when widget closes
  useEffect(() => {
    if (!open) {
      voice.stopListening();
      voice.stopSpeaking();
    }
  }, [open]);

  const loadHistory = async () => {
    setInitializing(true);
    try {
      // Load last 20 messages from ChatMessage entity
      const chatMessages = await base44.entities.ChatMessage.filter(
        { user_id: user.email },
        '-created_date',
        20
      );
      const history = chatMessages.reverse();

      // Load user memory for greeting context
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

  const sendMessageText = async (text) => {
    if (!text || loading || !user) return;
    const userMsg = { role: 'user', content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Save user message to ChatMessage entity
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        role: 'user',
        content: text
      });

      // Get AI response
      const res = await base44.functions.invoke('luminaChat', { action: 'send', message: text });
      const reply = res.data?.reply || "I'm here! What can I help you with?";
      
      // Save Lumina response to ChatMessage entity
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        role: 'lumina',
        content: reply
      });

      // Sync user memory with new learning
      try {
        await base44.functions.invoke('syncUserMemory', { lumina_response: reply });
      } catch (err) {
        console.error('Failed to sync memory:', err);
      }

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
              {/* Listening indicator */}
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
                  placeholder={voice.isListening ? 'Speak now...' : 'Message Lumina...'}
                  rows={1}
                  className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors max-h-24"
                  style={{ lineHeight: '1.5' }}
                />
                {/* Mic button */}
                <button
                  onClick={voice.toggleListening}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: voice.isListening
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: voice.isListening ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
                  }}
                  title={voice.isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {voice.isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-zinc-300" />}
                </button>
                {/* Mute toggle */}
                <button
                  onClick={voice.isSpeaking ? voice.stopSpeaking : voice.toggleMute}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  title={voice.isMuted ? 'Unmute Lumina' : voice.isSpeaking ? 'Stop speaking' : 'Mute Lumina'}
                >
                  {voice.isMuted ? (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  ) : voice.isSpeaking ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                      <Volume2 className="w-4 h-4 text-purple-400" />
                    </motion.div>
                  ) : (
                    <Volume2 className="w-4 h-4 text-zinc-300" />
                  )}
                </button>
                {/* Send */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
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
              <Sparkles className="w-7 h-7 text-white" />
            )}
          </button>
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
          isLumina ? 'rounded-tl-sm text-white' : 'rounded-tr-sm text-white bg-zinc-700'
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