import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Zap, Bot, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LuminaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = [
    'What can you help me with?',
    'Tell me about LBC Hub features',
    'How does the marketplace work?',
    'Plan a trip for me',
  ];

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Lumina AI, a helpful assistant for LBC Hub - a unified platform with Social Hub, Marketplace, Travel planning, and Riding services. User question: ${text}`,
      });

      const aiMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Hero Header */}
      <div className="relative border-b border-white/5">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold mb-3"
          >
            <span className="gradient-text">Lumina AI</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400"
          >
            Your intelligent assistant for everything LBC Hub
          </motion.p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-6">
                  {[Brain, Zap, Bot].map((Icon, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"
                    >
                      <Icon className="w-6 h-6 text-indigo-400" />
                    </motion.div>
                  ))}
                </div>
                
                <h2 className="text-2xl font-semibold text-white">How can I help you today?</h2>
                <p className="text-zinc-500">Ask me anything about our platform, or try a suggestion below</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestions.map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    onClick={() => handleSend(suggestion)}
                    className="glass rounded-2xl p-4 text-left hover:bg-white/10 transition-colors group"
                  >
                    <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">{suggestion}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}>
                    {msg.role === 'user' ? (
                      <Avatar className="w-full h-full">
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block rounded-2xl px-5 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'glass text-zinc-100'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="glass rounded-2xl px-5 py-3">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative"
          >
            <div className="flex items-center gap-3 glass rounded-2xl p-3 border border-white/10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Lumina anything..."
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder:text-zinc-600 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}