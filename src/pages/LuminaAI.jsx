import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Zap, Bot, Loader2, Mic, MicOff, Volume2, VolumeX, ArrowUp, ArrowDown, Image as ImageIcon, X } from 'lucide-react';
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
  const [voiceChatMode, setVoiceChatMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const newImages = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        newImages.push(result.file_url);
      }
      setUploadedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const suggestions = [
    'What can you help me with?',
    'Tell me about LBC Hub features',
    'How does the marketplace work?',
    'Generate a photo of...',
  ];

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;

    if (!user) {
      const errorMessage = { role: 'assistant', content: '🔒 Please sign in to use Lumina AI.' };
      setMessages(prev => [...prev, errorMessage]);
      if (voiceEnabled) speakText(errorMessage.content);
      return;
    }

    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const hasUnlimitedAccess = isFounder || isDevLead;
    const hasUnlimitedCredits = user?.unlimited_credits;

    if (!hasUnlimitedAccess && !hasUnlimitedCredits && usageCount >= usageLimit) {
      const errorMessage = { role: 'assistant', content: `⚠️ Daily limit reached (${usageLimit} requests/day). Resets in 24 hours.` };
      setMessages(prev => [...prev, errorMessage]);
      if (voiceEnabled) speakText(errorMessage.content);
      return;
    }

    const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!voiceChatMode) setInput('');
    setLoading(true);

    try {
      // Check if user wants to generate a photo
      const isPhotoRequest = text.toLowerCase().includes('generate') && (text.toLowerCase().includes('photo') || text.toLowerCase().includes('image'));
      
      if (isPhotoRequest) {
        const photoPrompt = text.replace(/generate\s+(a\s+)?photo\s+(of\s+)?/i, '').trim() || 'a beautiful landscape';
        
        try {
          const imageResult = await base44.integrations.Core.GenerateImage({
            prompt: photoPrompt
          });
          
          const imageMessage = { 
            role: 'assistant', 
            content: `🎨 Generated image based on: "${photoPrompt}"`,
            image_url: imageResult.url,
            timestamp: new Date().toISOString()
          };
          const finalMessages = [...updatedMessages, imageMessage];
          setMessages(finalMessages);

          // Save chat history
          if (chatId) {
            await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
          }

          // Update usage count
          if (!hasUnlimitedAccess && !hasUnlimitedCredits) {
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
          setLoading(false);
          return;
        } catch (imgError) {
          console.error('Image generation error:', imgError);
          const errorMessage = { role: 'assistant', content: '❌ Could not generate image. Please try again with a different description.' };
          setMessages(prev => [...prev, errorMessage]);
          setLoading(false);
          return;
        }
      }

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
        file_urls: uploadedImages.length > 0 ? uploadedImages : undefined,
        model: 'gemini_3_flash'
      });

      const aiMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Clear uploaded images after sending
      setUploadedImages([]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response);
      }

      // Save chat history
      if (chatId) {
        await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
      }

      // Update usage count (skip for unlimited access users)
      if (!hasUnlimitedAccess && !hasUnlimitedCredits) {
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center mb-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
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
      <div className="flex-1 overflow-y-auto relative">
        {messages.length > 0 && (
          <div className="fixed left-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
            <button
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              title="Scroll to top"
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={scrollToBottom}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div ref={topRef} />
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
                     {msg.image_url && (
                       <img src={msg.image_url} alt="Generated" className="mt-3 rounded-lg max-w-full h-auto max-h-96" />
                     )}
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
          
          {voiceChatMode ? (
            <div className="glass rounded-2xl p-6 border border-green-500/30 bg-green-500/10">
              <div className="flex items-center justify-center gap-3 text-green-400">
                <Mic className="w-6 h-6 animate-pulse" />
                <div className="text-center">
                  <p className="font-semibold">Voice Chat Active</p>
                  <p className="text-sm text-zinc-400">Speak to chat with Lumina</p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative space-y-3"
            >
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {uploadedImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img src={imgUrl} alt="Uploaded" className="h-20 w-20 object-cover rounded-lg border border-white/10" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={loading || uploadingImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploadingImage}
                  className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center disabled:opacity-40 transition-all"
                  title="Add photos from gallery"
                >
                  {uploadingImage ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <ImageIcon className="w-5 h-5 text-white" />}
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
          )}

          {/* Voice Controls */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={toggleVoiceChat}
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-2 ${voiceChatMode ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
              title={voiceChatMode ? 'Stop voice chat' : 'Start voice chat'}
            >
              {voiceChatMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span>{voiceChatMode ? 'Voice Chat On' : 'Voice Chat'}</span>
            </button>
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (isSpeaking) stopSpeaking();
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs flex items-center gap-2 text-zinc-400"
              title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              <span>{voiceEnabled ? 'Speaker On' : 'Speaker Off'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}