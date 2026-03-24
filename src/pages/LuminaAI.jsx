import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Zap, Bot, Loader2, Mic, MicOff, Volume2, VolumeX, ArrowUp, ArrowDown, Image as ImageIcon, X, Download, Save } from 'lucide-react';
import LinkText from '../components/ui/LinkText';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LuminaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(30); // 30 requests per day
  const [chatId, setChatId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceChatMode, setVoiceChatMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
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

  const handleGenerateImage = async () => {
    if (generatingImage || !user) return;

    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const isPremium = user?.premium === true;
    const hasUnlimitedAccess = isFounder || isDevLead || isPremium;
    
    if (!hasUnlimitedAccess && usageCount >= usageLimit) {
      const errorMessage = { 
        role: 'assistant', 
        content: `⚠️ Daily limit reached (${usageLimit} requests/day).\n\nUpgrade to Premium for unlimited access!`
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const conversationContext = messages.slice(-5).map(m => m.content).join(' ');
    const imagePromptContext = conversationContext || 'creative artistic image';

    setGeneratingImage(true);
    const loadingMessage = { role: 'assistant', content: '🎨 Generating image...', isImageLoading: true };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const enhancedPromptResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this conversation context: "${imagePromptContext}", create a detailed, vivid image generation prompt (max 200 words) that describes a beautiful, high-quality image. Be creative and specific about colors, lighting, composition, and style.`,
        model: 'gemini_3_flash'
      });

      const imageUrl = await base44.integrations.Core.GenerateImage({
        prompt: enhancedPromptResponse
      });

      const imageMessage = { 
        role: 'assistant', 
        content: `✨ Here's your generated image!`, 
        imageUrl: imageUrl.url,
        imagePrompt: enhancedPromptResponse
      };
      
      setMessages(prev => [...prev.filter(m => !m.isImageLoading), imageMessage]);

      const finalMessages = [...messages, imageMessage];
      if (chatId) {
        await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
      }

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
      console.error('Image generation error:', error);
      const errorMsg = { 
        role: 'assistant', 
        content: `❌ Image generation failed: ${error.message || 'Please try again.'}` 
      };
      setMessages(prev => [...prev.filter(m => !m.isImageLoading), errorMsg]);
    } finally {
      setGeneratingImage(false);
    }
  };

  const downloadImage = async (imageUrl, filename = 'lumina-image.png') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image');
    }
  };

  const saveToGallery = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `lumina-${Date.now()}.png`, { type: 'image/png' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Post.create({
        content: '🎨 AI-generated image by Lumina AI',
        media_urls: [file_url],
        media_type: 'image',
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_avatar: user.avatar_url,
        topics: ['ai-art', 'lumina']
      });

      alert('✅ Saved to your gallery and posted!');
    } catch (error) {
      console.error('Save to gallery failed:', error);
      alert('Failed to save to gallery');
    }
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
      // Detect image generation request
      const imageKeywords = /\b(generate|create|make|draw|paint|design)\b[^.!?]*\b(image|photo|picture|pic|art|illustration|drawing|painting)\b/i;
      const isPhotoRequest = imageKeywords.test(text);

      if (isPhotoRequest) {
        // Use exact user description as prompt
        const subject = text
          .replace(/^(please\s+)?(can you\s+)?(generate|create|make|draw|paint|design)\s+(me\s+)?(a\s+|an\s+)?/i, '')
          .replace(/^(image|photo|picture|pic|art|illustration|drawing|painting)\s+(of\s+)?/i, '')
          .trim() || text;

        const generatingMsg = { 
          role: 'assistant', 
          content: `🎨 Generating your image...`,
          isImageLoading: true,
          timestamp: new Date().toISOString()
        };
        setMessages([...updatedMessages, generatingMsg]);

        const imageResult = await base44.integrations.Core.GenerateImage({ prompt: subject });
        
        const imageMessage = { 
          role: 'assistant', 
          content: `✨ Here's your image:`,
          image_url: imageResult.url,
          timestamp: new Date().toISOString()
        };
        
        const finalMessages = [...updatedMessages, imageMessage];
        setMessages(finalMessages);
        if (voiceEnabled) speakText('Your image is ready!');
        if (chatId) await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
        if (!hasUnlimitedAccess && !hasUnlimitedCredits) {
          const usageRecords = await base44.entities.AIUsage.filter({ user_email: user.email }).catch(() => []);
          if (usageRecords.length > 0) {
            await base44.entities.AIUsage.update(usageRecords[0].id, { count: usageRecords[0].count + 1 });
            setUsageCount(usageRecords[0].count + 1);
          }
        }
        setLoading(false);
        return;
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
        prompt: `You are Lumina AI — a neutral, intelligent, and personal AI companion.${user?.email === 'mokhtartareksamara@gmail.com' ? '\n\n⭐ You are speaking with Mokhtar Tarek Samara, the founder of LBC Hub.' : user?.email === 'kiprocolloaj254@gmail.com' ? '\n\n👨‍💻 You are speaking with the Development Lead of LBC Hub.' : ''}

Your goal is to build a genuine, helpful relationship with the user based on who they are. Use their digital mirror data below ONLY to understand them better and give more personalized answers — NOT to push any platform features.

NEVER suggest or promote LBC Hub features (marketplace, travel, social, riding, jobs) unless the user explicitly asks about them.

User's digital mirror:
${JSON.stringify(digitalMirror, null, 2)}

Previous conversation:
${conversationContext}

User: ${text}`,
        add_context_from_internet: true,
        file_urls: uploadedImages.length > 0 ? uploadedImages : undefined,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            text: { type: 'string' }
          }
        }
      });

      const aiMessage = { role: 'assistant', content: response.text || response, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Clear uploaded images after sending
      setUploadedImages([]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response.text || response);
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
                     <LinkText text={msg.content} className="text-sm leading-relaxed" />
                     {msg.image_urls && msg.image_urls.length > 0 && (
                       <div className="mt-3 grid grid-cols-2 gap-2">
                         {msg.image_urls.map((url, idx) => (
                           <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                             <img
                               src={url}
                               alt={`Result ${idx + 1}`}
                               className="rounded-lg w-full h-32 object-cover hover:opacity-90 transition-opacity border border-white/10"
                               onError={(e) => { e.target.style.display = 'none'; }}
                             />
                           </a>
                         ))}
                       </div>
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
              onClick={handleGenerateImage}
              disabled={generatingImage || !user}
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-2 ${generatingImage ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-zinc-400'} disabled:opacity-50`}
              title="Generate AI image from conversation"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{generatingImage ? 'Generating...' : 'Generate Image'}</span>
            </button>
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