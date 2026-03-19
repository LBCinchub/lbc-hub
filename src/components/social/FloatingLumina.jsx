import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Minimize2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SolanaPayment from '../payment/SolanaPayment';

export default function FloatingLumina({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(10);
  const [chatId, setChatId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceChatMode, setVoiceChatMode] = useState(false);
  const [showSolanaPayment, setShowSolanaPayment] = useState(false);
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const recognitionRef = useRef(null);

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

  // Removed auto-scroll to keep chat at top

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (voiceChatMode) {
          handleSend(transcript);
        } else {
          setInput(transcript);
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = () => {
        if (!voiceChatMode) setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (voiceChatMode) {
          recognitionRef.current.start();
        } else {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [voiceChatMode]);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
        console.error('Microphone error:', error);
      }
    }
  };

  const toggleVoiceChat = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (voiceChatMode) {
      recognitionRef.current.stop();
      window.speechSynthesis.cancel();
      setVoiceChatMode(false);
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setVoiceChatMode(true);
        setVoiceEnabled(true);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
        console.error('Microphone error:', error);
      }
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

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;

    // Unlimited credits for founder, dev lead, and premium users
    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const isPremium = user?.premium === true;
    const hasUnlimitedAccess = isFounder || isDevLead || isPremium;
    
    if (!hasUnlimitedAccess && usageCount >= usageLimit) {
      const errorMessage = { 
        role: 'assistant', 
        content: `⚠️ Daily limit reached (${usageLimit} requests/day).\n\n🌟 Upgrade to LBC Hub Premium for $19.99/month to get unlimited access to Lumina AI!\n\nChoose your payment method below.`,
        showUpgrade: true
      };
      setMessages(prev => [...prev, errorMessage]);
      if (voiceEnabled) speakText('Daily limit reached. Upgrade to Premium for unlimited access.');
      return;
    }

    const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!voiceChatMode) setInput('');
    setLoading(true);

    try {
      const conversationContext = updatedMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
      
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

You have access to real-time internet information to provide current, accurate answers.

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

      if (voiceEnabled) {
        speakText(response);
      }

      // Save chat history
      if (chatId) {
        await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
      }

      // Only track usage for users without unlimited access
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
    <>
      {/* Solana Payment Modal */}
      {showSolanaPayment && (
        <SolanaPayment
          userEmail={user?.email}
          onClose={() => setShowSolanaPayment(false)}
        />
      )}

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-50 w-96 h-[500px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxWidth: 'calc(100vw - 3rem)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Lumina AI</h3>
                  <p className="text-xs text-white/70">
                    {user?.email === 'mokhtartareksamara@gmail.com' || user?.email === 'kiprocolloaj254@gmail.com' || user?.premium ? '∞ Unlimited' : `${usageCount}/${usageLimit} requests used`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoiceChat}
                  className={`transition-colors ${voiceChatMode ? 'text-green-400 animate-pulse' : 'text-white/70 hover:text-white'}`}
                  title={voiceChatMode ? 'Stop voice chat' : 'Start voice chat'}
                >
                  {voiceChatMode ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    if (isSpeaking) stopSpeaking();
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                  title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-500 text-sm mt-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                    <p>Ask me anything!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user'
                            ? 'bg-zinc-700'
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }`}>
                          {msg.role === 'user' ? (
                            <Avatar className="w-full h-full">
                              <AvatarFallback className="bg-transparent text-white text-xs">
                                {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <Sparkles className="w-4 h-4 text-white" />
                          )}
                        </div>

                        <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block rounded-xl px-3 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-800 text-zinc-100'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.showUpgrade && (
                              <div className="mt-3 space-y-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const { url } = await base44.functions.invoke('createPremiumCheckout', {});
                                      if (url) window.location.href = url;
                                    } catch (err) {
                                      console.error('Checkout error:', err);
                                    }
                                  }}
                                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                  💳 Pay with Card - $19.99/mo
                                </button>
                                <button
                                  onClick={() => setShowSolanaPayment(true)}
                                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                  ◎ Pay with Solana - $19.99/mo
                                </button>
                              </div>
                            )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-zinc-800 rounded-xl px-3 py-2">
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              </div>

            {/* Input */}
            {!voiceChatMode && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="p-3 border-t border-white/5"
              >
                <div className="flex items-center gap-2 bg-zinc-800 rounded-xl p-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={loading}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isListening 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-zinc-700 hover:bg-zinc-600'
                    } disabled:opacity-40`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
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
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </form>
            )}
            
            {voiceChatMode && (
              <div className="p-3 border-t border-white/5 bg-green-500/10">
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Voice Chat Active - Speak to chat with Lumina</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}