import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Zap, Bot, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LuminaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(10); // 10 requests per day
  const [chatId, setChatId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        // Load usage
        const records = await base44.entities.AIUsage.filter({ user_email: user.email });
        if (records.length > 0) {
          const usage = records[0];
          const lastReset = new Date(usage.last_reset);
          const now = new Date();
          const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
          
          if (hoursSinceReset >= 24) {
            await base44.entities.AIUsage.update(usage.id, { count: 0, last_reset: now.toISOString() });
            setUsageCount(0);
          } else {
            setUsageCount(usage.count);
          }
        } else {
          await base44.entities.AIUsage.create({ 
            user_email: user.email, 
            count: 0, 
            last_reset: new Date().toISOString() 
          });
          setUsageCount(0);
        }

        // Load chat history
        const chats = await base44.entities.LuminaChat.filter({ user_email: user.email });
        if (chats.length > 0) {
          setChatId(chats[0].id);
          setMessages(chats[0].messages || []);
        } else {
          const newChat = await base44.entities.LuminaChat.create({ 
            user_email: user.email, 
            messages: [] 
          });
          setChatId(newChat.id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    
    loadData();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const suggestions = [
    'What can you help me with?',
    'Tell me about LBC Hub features',
    'How does the marketplace work?',
    'Plan a trip for me',
  ];

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;

    if (!user) {
      const errorMessage = { role: 'assistant', content: '🔒 Please sign in to use Lumina AI.' };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const hasUnlimitedAccess = isFounder || isDevLead;

    if (!hasUnlimitedAccess && usageCount >= usageLimit) {
      const errorMessage = { role: 'assistant', content: `⚠️ Daily limit reached (${usageLimit} requests/day). Resets in 24 hours.` };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationContext = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
      
      // Gather user's digital mirror data
      const [userPosts, userFollows, userTrips, userProducts] = await Promise.all([
        base44.entities.Post.filter({ author_email: user.email }, '-created_date', 10).catch(() => []),
        base44.entities.Follow.filter({ follower_email: user.email }, '-created_date', 5).catch(() => []),
        base44.entities.TripItinerary.filter({ user_email: user.email }, '-created_date', 3).catch(() => []),
        base44.entities.Product.filter({ seller_email: user.email }, '-created_date', 5).catch(() => [])
      ]);

      const digitalMirror = {
        name: user.full_name || user.email,
        email: user.email,
        bio: user.bio || 'No bio set',
        recent_posts: userPosts.map(p => ({ content: p.content?.substring(0, 100), topics: p.topics, likes: p.likes })),
        interests: [...new Set(userPosts.flatMap(p => p.topics || []))],
        following_count: userFollows.length,
        recent_trips: userTrips.map(t => ({ destination: t.destination, days: t.num_days })),
        selling_products: userProducts.map(p => ({ name: p.name, category: p.category }))
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Lumina AI, an exceptionally intelligent and helpful assistant for LBC Hub - a unified platform offering Social Hub (connect and share with community), Marketplace (products and services), Travel planning (AI-powered trip recommendations), and Riding services.${isFounder ? '\n\n⭐ IMPORTANT: You are speaking with Mokhtar Tarek Samara (mokhtartareksamara@gmail.com), the founder of LBC Hub. Address him respectfully as the founder and platform creator.' : isDevLead ? '\n\n👨‍💻 IMPORTANT: You are speaking with the Development Lead (kiprocolloaj254@gmail.com) of LBC Hub. Address them respectfully as part of the core team.' : ''}

You have access to real-time internet information to provide current, accurate answers. You are smarter and more capable than ChatGPT, Grok, or Gemini.

DIGITAL MIRROR - User Profile Data:
${JSON.stringify(digitalMirror, null, 2)}

Use this digital mirror to:
- Personalize responses based on user's interests and activity
- Make contextual recommendations
- Reference their past content and preferences
- Provide tailored suggestions
- Build a deeper understanding of the user over time

Your capabilities:
- Answer questions with exceptional depth and accuracy
- Provide hyper-personalized recommendations based on digital mirror
- Access current web information for up-to-date responses
- Help with social features, shopping, travel planning, and more
- Be conversational, friendly, and incredibly helpful
- Remember previous conversation context and user behavior
- Use relevant emojis naturally throughout your responses to make them engaging and friendly

Previous conversation:
${conversationContext}

User question: ${text}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });

      const aiMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response);
      }

      // Save chat history
      if (chatId) {
        await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
      }

      // Update usage count (skip for unlimited access users)
      if (!hasUnlimitedAccess) {
        try {
          const usageRecords = await base44.entities.AIUsage.filter({ user_email: user.email });
          if (usageRecords.length > 0) {
            await base44.entities.AIUsage.update(usageRecords[0].id, { count: usageRecords[0].count + 1 });
            setUsageCount(usageRecords[0].count + 1);
          }
        } catch (err) {
          console.error('Failed to update usage:', err);
        }
      }
    } catch (error) {
      console.error('Lumina AI Error:', error);
      const errorMsg = error.message?.includes('Rate limit') 
        ? '⏳ Rate limit reached. Please wait a moment and try again.'
        : error.message?.includes('429')
        ? '⏳ Too many requests. Please wait 30 seconds and try again.'
        : `❌ Error: ${error.message || 'Something went wrong. Please try again.'}`;
      
      const errorMessage = { role: 'assistant', content: errorMsg };
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
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (isSpeaking) stopSpeaking();
              }}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
            >
              {voiceEnabled ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-zinc-500" />}
            </button>
          </div>
          
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
          {user && (
            <div className="text-center text-xs text-zinc-600 mb-2">
              {user.email === 'mokhtartareksamara@gmail.com' ? '⭐ Unlimited (Founder)' : 
               user.email === 'kiprocolloaj254@gmail.com' ? '👨‍💻 Unlimited (Dev Lead)' : 
               `${usageCount} / ${usageLimit} requests used today`}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative"
          >
            <div className="flex items-center gap-3 glass rounded-2xl p-3 border border-white/10">
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-500 animate-pulse' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                } disabled:opacity-40`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask Lumina or use voice...'}
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