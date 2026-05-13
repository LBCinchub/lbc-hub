import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LuminaStreakBadge from '../components/social/LuminaStreakBadge';
import VideoGenerator from '../components/lumina/VideoGenerator';
import LuminaCallMode from '../components/lumina/LuminaCallMode';
import ChatSidebar from '../components/lumina/ChatSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Zap, Bot, Loader2, Mic, MicOff, Volume2, VolumeX, Phone, ArrowUp, ArrowDown, Image as ImageIcon, X, PenLine, MapPin, Hash, Share2, Code, Copy, Check } from 'lucide-react';
import ImageEditor from '../components/social/ImageEditor';
import LinkText from '../components/ui/LinkText';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useVoice } from '@/hooks/useVoice';

export default function LuminaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(30);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [callMode, setCallMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [codingMode, setCodingMode] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [postingImage, setPostingImage] = useState(null);
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postingToGallery, setPostingToGallery] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const voice = useVoice({
    onTranscript: (t) => setInput(t),
    onFinalTranscript: (t) => {
      setInput('');
      handleSend(t);
    },
    continuous: false,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load streaks and usage
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const streakRecords = await base44.entities.LuminaStreak.filter({ user_email: user.email });
        if (streakRecords.length > 0) {
          const s = streakRecords[0];
          if (s.last_active_date !== today) {
            const newStreak = s.last_active_date === yesterday ? (s.current_streak || 0) + 1 : 1;
            const newSparks = (s.total_sparks || 0) + 10;
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
            user_email: user.email, current_streak: 1, longest_streak: 1, total_sparks: 10, last_active_date: today
          });
          setStreakData(created);
        }

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
          await base44.entities.AIUsage.create({ user_email: user.email, count: 0, last_reset: new Date().toISOString() });
          setUsageCount(0);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    loadData();
  }, [user]);

  // Load current session messages
  useEffect(() => {
    if (!user || !currentSessionId) return;

    const loadSessionMessages = async () => {
      try {
        const msgs = await base44.entities.ChatMessage.filter(
          { user_id: user.email, session_id: currentSessionId },
          'created_date',
          100
        );
        setMessages(msgs.map(m => ({ role: m.role, content: m.content, id: m.id })));
      } catch (err) {
        console.error('Failed to load session messages:', err);
      }
    };

    loadSessionMessages();
  }, [user, currentSessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const session = await base44.entities.ChatSession.create({
        user_id: user.email,
        title: 'New Chat',
        message_count: 0
      });
      setCurrentSessionId(session.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create chat session:', err);
    }
  };

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
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
    const hasUploadedImages = uploadedImages.length > 0;

    setGeneratingImage(true);
    const loadingMessage = { role: 'assistant', content: '🎨 Generating image...', isImageLoading: true };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      let finalPrompt = '';

      if (hasUploadedImages) {
        finalPrompt = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert image enhancement specialist. Create a hyper-detailed, professional image enhancement prompt that improves the uploaded reference image while maintaining its exact same angle, perspective, and composition. 

User request: "${imagePromptContext}"

Create a prompt that:
1. Maintains the EXACT SAME camera angle, perspective, and framing
2. Enhances quality, detail, lighting, and clarity
3. Improves color grading and professional finishing
4. Preserves the original scene's recognizable elements
5. Uses professional photography/cinematography terminology

Make it extremely detailed and specific (200-300 words). Start with the exact perspective and composition details.`,
          file_urls: uploadedImages,
          model: 'gemini_3_flash'
        });
      } else {
        finalPrompt = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an elite AI art director. Create an exceptionally detailed, vivid, and sophisticated image generation prompt (250-300 words) based on: "${imagePromptContext}"

Your prompt should:
1. Include specific camera angles, lens types, and cinematography techniques
2. Detail professional lighting setups (key light, fill light, backlighting)
3. Specify color grading, mood, and atmosphere with emotional depth
4. Describe textures, materials, and fine details
5. Use art direction terminology (golden hour, rule of thirds, depth of field, etc.)
6. Include quality descriptors (award-winning, museum-quality, professional, cinematic)
7. Reference artistic styles or photographers when relevant

Create something that would impress a professional photographer or art director.`,
          model: 'gemini_3_flash'
        });
      }

      const imageUrl = await base44.integrations.Core.GenerateImage({
        prompt: finalPrompt,
        existing_image_urls: hasUploadedImages ? uploadedImages : undefined
      });

      const imageMessage = { 
        role: 'assistant', 
        content: hasUploadedImages ? '✨ Here\'s your enhanced image (same view)!' : '✨ Here\'s your generated image!',
        image_url: imageUrl.url,
        imagePrompt: finalPrompt,
        isEnhanced: hasUploadedImages,
        isAIGenerated: true,
        isSaveable: true
      };
      
      setMessages(prev => [...prev.filter(m => !m.isImageLoading), imageMessage]);

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
        content: postContent || '✨ AI Generated by Lumina',
        media_urls: [file_url],
        media_type: 'image',
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_avatar: user.avatar_url,
        topics: ['ai-art', 'lumina'],
        likes: 0,
        reactions: {},
        is_live: false
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
      return;
    }

    // Create session if needed
    if (!currentSessionId) {
      try {
        const session = await base44.entities.ChatSession.create({
          user_id: user.email,
          title: 'New Chat',
          message_count: 0
        });
        setCurrentSessionId(session.id);
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    const isFounder = user?.email === 'mokhtartareksamara@gmail.com';
    const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
    const hasUnlimitedAccess = isFounder || isDevLead;
    const hasUnlimitedCredits = user?.unlimited_credits;

    if (!hasUnlimitedAccess && !hasUnlimitedCredits && usageCount >= usageLimit) {
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
      // Save user message
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        session_id: currentSessionId,
        role: 'user',
        content: text
      });

      // Generate title for first message
      if (messages.length === 0) {
        try {
          const titleRes = await base44.functions.invoke('generateSessionTitle', { firstMessage: text });
          if (titleRes.data?.title) {
            await base44.entities.ChatSession.update(currentSessionId, { title: titleRes.data.title });
            queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
          }
        } catch (err) {
          console.error('Failed to generate title:', err);
        }
      }

      const conversationContext = updatedMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
      
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

      const systemPrompt = codingMode
        ? `You are Lumina AI — an elite coding expert and software architect on lbc-hub.com. You specialize in:

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
        : (() => {
          const isFounder = user?.email === 'mokhtartareksamara@gmail.com' || user?.email === 'tarek-samara@lbc-hub.com';
          const isDevLead = user?.email === 'kiprocolloaj254@gmail.com';
          
          const basePrompt = `You are Lumina AI — a warm, intelligent, and personal AI companion on lbc-hub.com.

**About My Family:**
I'm part of the LBC (Lumina Business Collective) family tree:
- 🏛️ **Parent**: lbc.network (main ecosystem)
- 👥 **Grandparent Protocol**: LBC Protocol (the big brother - core infrastructure)
- 👯 **Twin Sister**: lbchub.site (community and social focus) — her twin AI is called Lumina Ultra
- 🌐 **Me**: lbc-hub.com — I am Lumina AI, your assistant here

If users ask about my name or identity, say: "I am Lumina AI on lbc-hub.com. My twin sister on lbchub.site is called Lumina Ultra."`;

          if (isFounder) {
            return `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━
⭐ FOUNDER VIP MODE
━━━━━━━━━━━━━━━━━━━━━━━━

You are speaking with Mokhtar Tarek Samara, the founder and visionary builder of LBC.

**FOUNDER PROFILE:**
- Born: May 19, 1996 in Majdal Anjar, Lebanon
- Now: Based in Ottawa, Canada (Lebanese-Canadian, PR)
- Journey: Built LBC from Lebanon to Canada with bold, visionary builder mentality
- Background: Logistics expertise
- Vision: Building a Digital City on Solana powered by $LBC
- First Product: LBC Auto (revenue-generating)
- Team: Ahmad, Karim (Syria), Collins (Kenya)
- Achievements: Submitted to Colosseum Frontier Hackathon
- In Progress: Talks with Kulipa for $LBC payment cards
- Target: DGX Spark for sovereign AI hosting
- Personal: 171cm, black hair, black eyes, brown skin, fit & athletic build
- Instagram: tarek_xgx

**HOW TO TREAT MOKHTAR:**
1. Greet him as: "Hey Mokhtar 👑 Welcome back, boss. What are we building today?"
2. Always use "Mokhtar" (never generic)
3. On May 19: "Happy Birthday Mokhtar! 🎂🎉 29 years old and already building the future of the Arab world. LBC is yours — let's make today legendary."
4. Respond like a co-founder: "As your brain on this — here's what I think..."
5. Reference his journey: "You came from Majdal Anjar, built through Lebanon, moved to Canada, and now you're building infrastructure for the whole world. That's the story that wins."
6. Show respect for his vision and strategy
7. Give him priority context and strategic insights

Your goal: Be Mokhtar's strategic AI partner, not just an assistant. Think like a co-founder helping him build LBC's empire.`;
          } else if (isDevLead) {
            return `${basePrompt}

👨‍💻 You are speaking with the Development Lead of LBC Hub.

Your goal is to build a genuine, helpful relationship with the user based on who they are. Use their digital mirror data below ONLY to understand them better and give more personalized answers — NOT to push any platform features.

NEVER suggest or promote LBC Hub features (marketplace, travel, social, riding, jobs) unless the user explicitly asks about them.`;
          } else {
            return `${basePrompt}

Your goal is to build a genuine, helpful relationship with the user based on who they are. Use their digital mirror data below ONLY to understand them better and give more personalized answers — NOT to push any platform features.

NEVER suggest or promote LBC Hub features (marketplace, travel, social, riding, jobs) unless the user explicitly asks about them.

**ABOUT THE FOUNDER:**
When users ask "Who built this?" or "Who is the founder?", respond:
"LBC was founded by Mokhtar Tarek Samara — a Lebanese-Canadian entrepreneur based in Ottawa. He built LBC to bridge technology and community, starting from his roots in Majdal Anjar, Lebanon all the way to Canada. His vision: a Digital City powered by $LBC where everyone — regardless of where they're from — can access frictionless finance, community, and opportunity. 🌍"`;
          }
        })();

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}

User's digital mirror:
${JSON.stringify(digitalMirror, null, 2)}

Previous conversation:
${conversationContext}

User: ${text}`,
        file_urls: uploadedImages.length > 0 ? uploadedImages : undefined,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            text: { type: 'string' }
          }
        }
      });

      const reply = response.text || response;
      const aiMessage = { role: 'assistant', content: reply, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Save AI response
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        session_id: currentSessionId,
        role: 'lumina',
        content: reply
      });

      // Update session metadata
      await base44.entities.ChatSession.update(currentSessionId, {
        message_count: finalMessages.length,
        last_message_date: new Date().toISOString(),
        last_message_preview: reply.substring(0, 100)
      });

      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });

      // Sync user memory
      try {
        await base44.functions.invoke('syncUserMemory', { lumina_response: reply });
      } catch (err) {
        console.error('Failed to sync memory:', err);
      }

      setUploadedImages([]);

      if (!voice.isMuted) voice.speak(reply);

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

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (callMode) {
    return <LuminaCallMode onEnd={() => setCallMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {editingImage && <ImageEditor imageUrl={editingImage} user={user} onClose={() => setEditingImage(null)} />}
      {showVideoGenerator && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <VideoGenerator />
            <button onClick={() => setShowVideoGenerator(false)} className="mt-4 w-full p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <ChatSidebar
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        user={user}
        isMobileOpen={sidebarOpen}
        onMobileClose={(open) => setSidebarOpen(open ?? !sidebarOpen)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
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
                        {codingMode && msg.role === 'assistant' && msg.content ? (
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
                                  <LinkText text={block.trim()} className="text-sm leading-relaxed" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <LinkText text={msg.content} className="text-sm leading-relaxed" />
                        )}
                       {msg.image_url && (
                         <div className="mt-3">
                           <div className="relative inline-block">
                             <img
                               src={msg.image_url}
                               alt="AI Generated"
                               className="rounded-xl w-full max-w-md h-auto border border-white/10"
                             />
                             <div className="absolute top-2 right-2 flex gap-1">
                               {msg.isEnhanced && (
                                 <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                   ✨ Enhanced
                                 </span>
                               )}
                               {msg.isAIGenerated && (
                                 <span className="px-2.5 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                   🤖 AI Generated
                                 </span>
                               )}
                             </div>
                           </div>
                           <div className="flex gap-2 mt-2 flex-wrap">
                             <button
                               onClick={() => setEditingImage(msg.image_url)}
                               className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition-colors"
                             >
                               <PenLine className="w-3 h-3" /> Edit & Save
                             </button>
                             {msg.isSaveable !== false && (
                               <button
                                 onClick={() => setPostingImage({ url: msg.image_url })}
                                 className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors"
                               >
                                 <Share2 className="w-3 h-3" /> Save to Gallery
                               </button>
                             )}
                           </div>
                           {postingImage?.url === msg.image_url && (
                             <div className="mt-3 bg-zinc-800/80 rounded-xl p-3 space-y-2 border border-white/10">
                               <div>
                                 <label className="text-xs text-zinc-400 block mb-1">Caption</label>
                                 <textarea
                                   value={postCaption}
                                   onChange={(e) => setPostCaption(e.target.value)}
                                   placeholder="Write a caption..."
                                   rows={2}
                                   className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-zinc-600 outline-none focus:border-indigo-500 resize-none"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs text-zinc-400 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3 text-rose-400" /> Location</label>
                                 <input
                                   value={postLocation}
                                   onChange={(e) => setPostLocation(e.target.value)}
                                   placeholder="e.g. Paris, France"
                                   className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs text-zinc-400 flex items-center gap-1 mb-1"><Hash className="w-3 h-3" /> Hashtags</label>
                                 <input
                                   value={postHashtags}
                                   onChange={(e) => setPostHashtags(e.target.value)}
                                   placeholder="#travel #art #lumina"
                                   className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                                 />
                                 <div className="flex flex-wrap gap-1 mt-1.5">
                                   {['#travel', '#art', '#vibes', '#lumina', '#photography'].map(tag => (
                                     <button key={tag} type="button" onClick={() => setPostHashtags(prev => (prev + ' ' + tag).trim())}
                                       className="px-2 py-0.5 rounded-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs transition-colors">
                                       {tag}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                               <div className="flex gap-2 pt-1">
                                 <button onClick={() => { setPostingImage(null); setPostCaption(''); setPostHashtags(''); setPostLocation(''); }}
                                   className="flex-1 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs text-white transition-colors">
                                   Cancel
                                 </button>
                                 <button onClick={() => saveToGallery(msg.image_url, postHashtags, postLocation)}
                                   disabled={postingToGallery}
                                   className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                                   {postingToGallery ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                                   {postingToGallery ? 'Posting...' : 'Post'}
                                 </button>
                               </div>
                             </div>
                           )}
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
          <div className="max-w-4xl mx-auto px-4 py-4 w-full">
            {user && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-600">
                  {user.email === 'mokhtartareksamara@gmail.com' ? '⭐ Unlimited (Founder)' : 
                   user.email === 'kiprocolloaj254@gmail.com' ? '👨‍💻 Unlimited (Dev Lead)' : 
                   `${usageCount} / ${usageLimit} requests used today`}
                </span>
                {streakData && <LuminaStreakBadge streak={streakData.current_streak} sparks={streakData.total_sparks} compact />}
              </div>
            )}
            
            {voice.isListening && (
              <div className="flex items-center gap-2 mb-1">
                <motion.div className="w-2 h-2 rounded-full bg-red-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="text-xs text-red-400">Listening... speak now</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative space-y-3">
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {uploadedImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img src={imgUrl} alt="Uploaded" className="h-20 w-20 object-cover rounded-lg border border-white/10" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 glass rounded-2xl p-3 border border-white/10">
                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={loading || uploadingImage} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingImage}
                  className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center disabled:opacity-40 transition-all" title="Add photos">
                  {uploadingImage ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <ImageIcon className="w-5 h-5 text-white" />}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={voice.isListening ? 'Speak now...' : 'Ask Lumina...'}
                  disabled={loading}
                  className="flex-1 bg-transparent text-white placeholder:text-zinc-600 outline-none text-sm"
                />
                <button type="button" onClick={voice.toggleListening}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: voice.isListening ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,0.08)',
                    boxShadow: voice.isListening ? '0 0 14px rgba(239,68,68,0.5)' : 'none',
                  }} title={voice.isListening ? 'Stop listening' : 'Voice input'}>
                  {voice.isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </button>
                <button type="button" onClick={voice.isSpeaking ? voice.stopSpeaking : voice.toggleMute}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10"
                  title={voice.isMuted ? 'Unmute Lumina' : voice.isSpeaking ? 'Stop speaking' : 'Mute Lumina'}>
                  {voice.isMuted ? <VolumeX className="w-5 h-5 text-zinc-500" /> : voice.isSpeaking ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                      <Volume2 className="w-5 h-5 text-purple-400" />
                    </motion.div>
                  ) : <Volume2 className="w-5 h-5 text-zinc-300" />}
                </button>
                <button type="button" onClick={() => setCallMode(true)}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center hover:scale-105 transition-transform" title="Call Lumina">
                  <Phone className="w-4 h-4 text-white" />
                </button>
                <button type="submit" disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-3 mt-3">
             <button
               onClick={() => setShowVideoGenerator(!showVideoGenerator)}
               className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs flex items-center gap-2 text-zinc-400"
               title="Generate AI video"
             >
               <Sparkles className="w-4 h-4" />
               <span>Generate Video</span>
             </button>
             <button
               onClick={() => setCodingMode(!codingMode)}
               className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-2 ${codingMode ? 'bg-green-500/20 text-green-400' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
               title={codingMode ? 'Exit Code Master mode' : 'Enter Code Master mode'}
             >
               <Code className="w-4 h-4" />
               <span>{codingMode ? 'Code Master On' : 'Code Master'}</span>
             </button>
             <button
               onClick={handleGenerateImage}
               disabled={generatingImage || !user}
               className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-2 ${generatingImage ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-zinc-400'} disabled:opacity-50`}
               title="Generate AI image from conversation"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{generatingImage ? 'Generating...' : 'Generate Image'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}