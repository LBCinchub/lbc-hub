import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Minimize2, Mic, MicOff, Volume2, VolumeX, Image, PenLine, Upload, MapPin, Hash, Share2, Code, Copy, Check } from 'lucide-react';
import LuminaStreakBadge from './LuminaStreakBadge';
import ImageEditor from '../social/ImageEditor';
import LinkText from '../ui/LinkText';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SolanaPayment from '../payment/SolanaPayment';

export default function FloatingLumina({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(30);
  const [chatId, setChatId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceChatMode, setVoiceChatMode] = useState(false);
  const [showSolanaPayment, setShowSolanaPayment] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [postingImage, setPostingImage] = useState(null);
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postingToGallery, setPostingToGallery] = useState(false);
  const [codingMode, setCodingMode] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

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
          const isNewDay = lastReset.toDateString() !== now.toDateString();
          
          if (isNewDay) {
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

        // Load / update streak
        const today = new Date().toISOString().split('T')[0];
        const streakRecords = await base44.entities.LuminaStreak.filter({ user_email: user.email });
        if (streakRecords.length > 0) {
          const s = streakRecords[0];
          const last = s.last_active_date;
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          let newStreak = s.current_streak || 0;
          let newSparks = s.total_sparks || 0;
          if (last !== today) {
            newStreak = last === yesterday ? newStreak + 1 : 1;
            newSparks += 10;
            const updated = await base44.entities.LuminaStreak.update(s.id, {
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, s.longest_streak || 0),
              total_sparks: newSparks,
              last_active_date: today
            });
            setStreakData(updated);
          } else {
            setStreakData(s);
          }
        } else {
          const created = await base44.entities.LuminaStreak.create({
            user_email: user.email,
            current_streak: 1,
            longest_streak: 1,
            total_sparks: 10,
            last_active_date: today
          });
          setStreakData(created);
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

  // Scroll to bottom when messages change (not on open)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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
        if (voiceChatMode && !isSpeaking) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (err) {
            console.error('Recognition restart error:', err);
          }
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

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Stop recognition error:', err);
      }
      setIsListening(false);
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (voiceChatMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (err) {
            console.error('Failed to restart recognition:', err);
          }
        }, 500);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (voiceChatMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (err) {
            console.error('Failed to restart recognition:', err);
          }
        }, 500);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleGenerateImage = async () => {
    if (generatingImage) return;

    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const isPremium = user?.premium === true;
    const hasUnlimitedAccess = isFounder || isDevLead || isPremium;
    
    if (!hasUnlimitedAccess && usageCount >= usageLimit) {
      const errorMessage = { 
        role: 'assistant', 
        content: `⚠️ Daily limit reached (${usageLimit} requests/day).\n\n🌟 Upgrade to LBC Hub Premium for $19.99/month to get unlimited access!`,
        showUpgrade: true
      };
      setMessages(prev => [...prev, errorMessage]);
      if (voiceEnabled) speakText('Daily limit reached. Upgrade to Premium for unlimited access.');
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
      
      try {
        await base44.entities.Post.create({
          content: `🎨 AI-generated image by Lumina AI\n\n"${enhancedPromptResponse}"`,
          media_urls: [imageUrl.url],
          media_type: 'image',
          author_name: user.full_name || user.email,
          author_email: user.email,
          author_avatar: user.avatar_url,
          topics: ['ai-art', 'lumina-ai']
        });
      } catch (err) {
        console.error('Failed to post to feed:', err);
      }

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

  const saveToGallery = async (imageUrl, hashtags = '', location = '') => {
    setPostingToGallery(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `lumina-${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const tags = hashtags.split(/\s+/).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t).join(' ');
      const locationSuffix = location ? `\n📍 ${location}` : '';
      const tagsSuffix = tags ? `\n${tags}` : '';
      const postContent = (postCaption.trim() + locationSuffix + tagsSuffix).trim();

      await base44.entities.Post.create({
        content: postContent,
        media_urls: [file_url],
        media_type: 'image',
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_avatar: user.avatar_url,
        topics: ['ai-art', 'lumina']
      });

      alert('✅ Posted to your gallery!');
      setPostingImage(null);
      setPostCaption('');
      setPostHashtags('');
      setPostLocation('');
    } catch (error) {
      console.error('Save to gallery failed:', error);
      alert('Failed to save to gallery');
    } finally {
      setPostingToGallery(false);
    }
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
      alert('Failed to upload images');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeUploadedImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;

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
      const imageKeywords = /\b(generate|create|make|draw|paint|design)\b[^.!?]*\b(image|photo|picture|pic|art|illustration|drawing|painting)\b/i;
      const isImageRequest = imageKeywords.test(text);

      if (isImageRequest) {
        const subject = text
          .replace(/^(please\s+)?(can you\s+)?(generate|create|make|draw|paint|design)\s+(me\s+)?(a\s+|an\s+)?/i, '')
          .replace(/^(image|photo|picture|pic|art|illustration|drawing|painting)\s+(of\s+)?/i, '')
          .trim() || text;

        const loadingMsg = { role: 'assistant', content: '🎨 Generating your image...', isImageLoading: true };
        setMessages(prev => [...prev, loadingMsg]);

        const imageResult = await base44.integrations.Core.GenerateImage({ prompt: subject });

        const imageMsg = {
          role: 'assistant',
          content: `✨ Here's your image:`,
          imageUrl: imageResult.url,
          imagePrompt: subject,
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, imageMsg];
        setMessages(prev => [...prev.filter(m => !m.isImageLoading), imageMsg]);
        setUploadedImages([]);
        if (chatId) await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });
        if (!hasUnlimitedAccess) {
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

      const systemPrompt = codingMode
        ? `You are Lumina AI — an elite coding expert and software architect. You specialize in:

🎯 CODE MASTERY:
- Write production-ready, optimized code
- Deep expertise in JavaScript, React, TypeScript, Python, SQL, and more
- Explain complex algorithms and data structures
- Debug and refactor code with precision
- Provide performance optimization strategies
- Best practices, design patterns, and architecture

💡 TEACHING EXCELLENCE:
- Break down complex concepts into digestible parts
- Provide well-commented code examples
- Explain the 'why' behind solutions
- Suggest multiple approaches when applicable

⚡ CODE EXECUTION READY:
- Format code for easy copy/paste in IDE
- Include proper imports and dependencies
- Add TypeScript types when relevant
- Provide both short snippets and full solutions

Always start with a brief explanation, then provide clean, executable code. Use markdown code blocks with language specification.`
        : `You are Lumina AI — a neutral, intelligent, and personal AI companion.${isFounder ? '\n\n⭐ You are speaking with Mokhtar Tarek Samara, the founder of LBC Hub.' : isDevLead ? '\n\n👨‍💻 You are speaking with the Development Lead of LBC Hub.' : ''}

Your goal is to build a genuine, helpful relationship with the user. NEVER suggest or promote LBC Hub features (marketplace, travel, social, riding, jobs) unless the user explicitly asks about them.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}

Previous conversation:
${conversationContext}

User: ${text}

- "text": your helpful, warm, personalized answer.`,
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
      setUploadedImages([]);
      if (chatId) await base44.entities.LuminaChat.update(chatId, { messages: finalMessages });

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
      {editingImage && <ImageEditor imageUrl={editingImage} user={user} onClose={() => setEditingImage(null)} />}
      {showSolanaPayment && (
        <SolanaPayment
          userEmail={user?.email}
          onClose={() => setShowSolanaPayment(false)}
        />
      )}

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-50 w-96 h-[500px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxWidth: 'calc(100vw - 3rem)' }}
          >
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
                {streakData && <LuminaStreakBadge streak={streakData.current_streak} sparks={streakData.total_sparks} compact />}
                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className={`transition-colors ${generatingImage ? 'text-purple-400 animate-pulse' : 'text-white/70 hover:text-white'} disabled:opacity-50`}
                  title="Generate AI image"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCodingMode(!codingMode)}
                  className={`transition-colors ${codingMode ? 'text-green-400' : 'text-white/70 hover:text-white'}`}
                  title={codingMode ? 'Exit Code Master mode' : 'Enter Code Master mode'}
                >
                  <Code className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm mt-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                  <p>Ask me anything!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                          {codingMode && msg.role === 'assistant' ? (
                            <div className="space-y-2">
                              {msg.content.split(/```[a-z]*\n/).map((block, idx) => {
                                const isCode = idx % 2 === 1;
                                if (!block.trim()) return null;
                                return isCode ? (
                                  <div key={idx} className="bg-zinc-900 rounded-lg p-3 font-mono text-xs overflow-x-auto border border-zinc-700">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-zinc-500">Code</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(block.trim());
                                          setCopiedIndex(idx);
                                          setTimeout(() => setCopiedIndex(null), 2000);
                                        }}
                                        className="text-zinc-400 hover:text-white transition-colors"
                                      >
                                        {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                      </button>
                                    </div>
                                    <pre className="text-green-400">{block.trim()}</pre>
                                  </div>
                                ) : (
                                  <div key={idx} className="text-zinc-100">
                                    <LinkText text={block.trim()} />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <LinkText text={msg.content} />
                          )}
                        </div>
                        {msg.imageUrl && (
                          <div className="mt-3 space-y-2">
                            <img 
                              src={msg.imageUrl} 
                              alt="AI Generated" 
                              className="rounded-lg max-w-full h-auto"
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <button
                                onClick={() => setEditingImage(msg.imageUrl)}
                                className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition-colors"
                              >
                                <PenLine className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => setPostingImage({ url: msg.imageUrl })}
                                className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Share2 className="w-3 h-3" /> Post
                              </button>
                            </div>
                          </div>
                        )}
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
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 border-t border-white/5 space-y-2"
            >
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap px-2">
                    {uploadedImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative inline-block">
                        <img src={imgUrl} alt="Uploaded" className="h-16 w-16 object-cover rounded-lg border border-white/10" />
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                    className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center disabled:opacity-40 transition-all"
                    title="Upload photos from gallery"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}