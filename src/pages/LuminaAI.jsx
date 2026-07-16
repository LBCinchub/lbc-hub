import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LuminaStreakBadge from '../components/social/LuminaStreakBadge';
import VideoGenerator from '../components/lumina/VideoGenerator';
import LuminaCallMode from '../components/lumina/LuminaCallMode';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, Mic, MicOff, Volume2, VolumeX, Phone, Image as ImageIcon, X, PenLine, MapPin, Hash, Share2, Code, Copy, Check, Download } from 'lucide-react';
import ImageEditor from '../components/social/ImageEditor';
import MessageActionBar from '../components/lumina/MessageActionBar';
import LinkText from '../components/ui/LinkText';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useVoice } from '@/hooks/useVoice';

// ── constants ──────────────────────────────────────────────────────────────
const LUMINA_AVATAR = 'https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=80&h=80&fit=crop&crop=face';
const PERSISTENT_SESSION_LABEL = '__lumina_persistent__';
// Privileged accounts with no daily usage limits
const PRIVILEGED_EMAILS = new Set([
  'mokhtartareksamara@gmail.com',
  'kiprocolloaj254@gmail.com',
]);

export default function LuminaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit] = useState(30);
  const [sessionId, setSessionId] = useState(null);
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
  const [initializing, setInitializing] = useState(true);

  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const fileInputRef = useRef(null);

  const voice = useVoice({
    onTranscript: (t) => setInput(t),
    onFinalTranscript: (t) => { setInput(''); handleSend(t); },
    continuous: false,
  });

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // ── Load streak + usage ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    base44.entities.LuminaStreak.filter({ user_email: user.email }).then(records => {
      if (records.length > 0) {
        const s = records[0];
        if (s.last_active_date !== today) {
          const ns = s.last_active_date === yesterday ? (s.current_streak || 0) + 1 : 1;
          base44.entities.LuminaStreak.update(s.id, {
            current_streak: ns,
            longest_streak: Math.max(ns, s.longest_streak || 0),
            total_sparks: (s.total_sparks || 0) + 10,
            last_active_date: today
          }).then(setStreakData);
        } else setStreakData(s);
      } else {
        base44.entities.LuminaStreak.create({ user_email: user.email, current_streak: 1, longest_streak: 1, total_sparks: 10, last_active_date: today }).then(setStreakData);
      }
    });

    base44.entities.AIUsage.filter({ user_email: user.email }).then(records => {
      if (records.length > 0) {
        const u = records[0];
        const isNewDay = new Date(u.last_reset).toDateString() !== new Date().toDateString();
        if (isNewDay) {
          base44.entities.AIUsage.update(u.id, { count: 0, last_reset: new Date().toISOString() });
          setUsageCount(0);
        } else setUsageCount(u.count);
      } else {
        base44.entities.AIUsage.create({ user_email: user.email, count: 0, last_reset: new Date().toISOString() });
      }
    });
  }, [user]);

  // ── Load / create the ONE persistent session ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const initSession = async () => {
      setInitializing(true);
      try {
        // Look for the single persistent session
        const sessions = await base44.entities.ChatSession.filter({ user_id: user.email, title: PERSISTENT_SESSION_LABEL });

        let sid;
        if (sessions.length > 0) {
          // Use existing persistent session
          sid = sessions[0].id;
        } else {
          // First time — create the single persistent session
          const created = await base44.entities.ChatSession.create({
            user_id: user.email,
            title: PERSISTENT_SESSION_LABEL,
            message_count: 0
          });
          sid = created.id;
        }
        setSessionId(sid);

        // Load all messages for this session (full history, no limit)
        const msgs = await base44.entities.ChatMessage.filter(
          { user_id: user.email, session_id: sid },
          'created_date',
          500
        );

        if (msgs.length > 0) {
          setMessages(msgs.map(m => ({
            role: m.role === 'lumina' ? 'assistant' : m.role,
            content: m.content,
            id: m.id,
            image_url: m.image_url,
            images: m.images
          })));
        } else {
          // First ever message — greeting with memory context
          const memories = await base44.entities.UserMemory.filter({ user_id: user.email }).catch(() => []);
          const mem = memories[0] || null;
          const firstName = (user.full_name || '').split(' ')[0] || 'there';
          let greeting;
          if (mem && (mem.key_facts?.length > 0 || mem.conversation_summary)) {
            const ref = mem.past_requests?.[mem.past_requests.length - 1];
            greeting = ref
              ? `Hey ${firstName}! 👋 Welcome back — last time you were asking about "${ref}". I remember everything. What can I help you with today?`
              : `Hey ${firstName}! Great to have you back 👋 ${mem.conversation_summary || ''} What are we working on today?`;
          } else {
            greeting = `Hey ${firstName}! I'm Lumina ✨ Your personal AI on LBC Hub. This is our shared space — I'll remember everything we talk about here. What's on your mind?`;
          }
          setMessages([{ role: 'assistant', content: greeting, id: 'greeting' }]);
        }
      } catch (err) {
        console.error('Failed to init session:', err);
        setMessages([{ role: 'assistant', content: "Hey! I'm Lumina ✨ What can I help you with today?", id: 'greeting' }]);
      }
      setInitializing(false);
    };

    initSession();
  }, [user]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    try {
      const urls = [];
      for (const file of files) {
        const r = await base44.integrations.Core.UploadFile({ file });
        urls.push(r.file_url);
      }
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const removeImage = (i) => setUploadedImages(prev => prev.filter((_, idx) => idx !== i));

  // ── Image generation ──────────────────────────────────────────────────────
  const handleGenerateImage = async () => {
    if (generatingImage || !user) return;
    const isPrivileged = PRIVILEGED_EMAILS.has(user?.email);
    const isPremium = user?.premium === true;
    if (!isPrivileged && !isPremium && usageCount >= usageLimit) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Daily limit reached (${usageLimit}/day). Upgrade to Premium for unlimited access!`, id: Date.now() + '_lim' }]);
      return;
    }
    const context = messages.slice(-5).map(m => m.content).join(' ') || 'creative artistic image';
    const hasUploaded = uploadedImages.length > 0;
    setGeneratingImage(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '🎨 Generating image...', isImageLoading: true, id: 'imgload' }]);
    try {
      let prompt;
      if (hasUploaded) {
        prompt = await base44.integrations.Core.InvokeLLM({ prompt: `Create an image enhancement prompt maintaining the exact same angle and composition. User request: "${context}". Make it 200-300 words, cinematic, professional.`, file_urls: uploadedImages, model: 'gemini_3_flash' });
      } else {
        prompt = await base44.integrations.Core.InvokeLLM({ prompt: `Create a detailed 250-word image generation prompt for: "${context}". Include camera angles, lighting, mood, textures, professional photography terminology.`, model: 'gemini_3_flash' });
      }
      const imageUrl = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: hasUploaded ? uploadedImages : undefined });
      setMessages(prev => prev.map(m => m.isImageLoading ? { ...m, content: hasUploaded ? '✨ Here\'s your enhanced image!' : '✨ Here\'s your generated image!', image_url: imageUrl?.url || imageUrl, isImageLoading: false, id: Date.now() + '_img' } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.isImageLoading ? { ...m, content: '⚠️ Image generation failed. Try again.', isImageLoading: false } : m));
    }
    setGeneratingImage(false);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    if (!user) {
      setMessages(prev => [...prev, 
        { role: "user", content: text, id: Date.now().toString() },
        { role: "assistant", content: "Hey! 👋 I'd love to chat — but you'll need to sign in first so I can remember our conversation. Tap **Get Started** in the top right to create your free LBC Hub account!", id: Date.now() + "_auth" }
      ]);
      setInput('');
      return;
    }
    if (!sessionId) return;

    const isPrivileged = PRIVILEGED_EMAILS.has(user?.email);
    const isPremium = user?.premium === true;
    if (!isPrivileged && !isPremium && usageCount >= usageLimit) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Daily limit reached (${usageLimit}/day). Upgrade to Premium for unlimited access!`, id: Date.now() + '_lim' }]);
      return;
    }

    const userMsg = { role: 'user', content: text, id: Date.now().toString(), images: uploadedImages.length ? [...uploadedImages] : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setUploadedImages([]);
    setLoading(true);

    try {
      // Save user message
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        session_id: sessionId,
        role: 'user',
        content: text,
        images: uploadedImages.length ? uploadedImages : undefined
      });

      // Get AI reply
      const conversationHistory = messages.slice(-20).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const systemPrompt = codingMode
        ? `You are Lumina, an expert coding AI on LBC Hub. Provide precise, well-formatted code with explanations. Use markdown code blocks. Be concise and technical.`
        : `You are Lumina, the personal AI of LBC Hub — a living digital city on Solana. You're warm, sharp, and genuinely helpful. You know about: LBC Marketplace, Rides, Social feed, Travel, Jobs, and the $LBC token. You remember everything from our conversation history. Be conversational, not robotic. Keep replies focused and clear.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        response_type: 'text',
        model: 'gpt-4o',
        system_prompt: systemPrompt,
        conversation_history: conversationHistory,
        file_urls: uploadedImages.length ? uploadedImages : undefined
      });

      const reply = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.choices?.[0]?.message?.content || aiResponse?.content || "I'm here! What can I help you with?");

      // Save AI reply
      await base44.entities.ChatMessage.create({
        user_id: user.email,
        session_id: sessionId,
        role: 'assistant',
        content: reply
      });

      // Update session message count
      await base44.entities.ChatSession.update(sessionId, { message_count: (messages.length + 2) }).catch(() => {});

      // Sync memory in background
      base44.functions.invoke('syncUserMemory', { lumina_response: reply }).catch(() => {});

      setMessages(prev => [...prev, { role: 'assistant', content: reply, id: Date.now() + '_l' }]);
      if (!voice.isMuted) voice.speak(reply);

      // Update usage
      base44.entities.AIUsage.filter({ user_email: user.email }).then(records => {
        if (records.length > 0) base44.entities.AIUsage.update(records[0].id, { count: (records[0].count || 0) + 1 });
      });
      setUsageCount(prev => prev + 1);

    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, something went wrong. Try again!', id: 'err' }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderContent = (content, msgIdx) => {
    if (!content) return null;
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockIdx = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<p key={`t-${blockIdx}`} className="whitespace-pre-wrap leading-relaxed"><LinkText text={content.slice(lastIndex, match.index)} /></p>);
      }
      const lang = match[1] || 'code';
      const code = match[2].trim();
      const uniqueIdx = `${msgIdx}-${blockIdx}`;
      parts.push(
        <div key={`c-${blockIdx}`} className="my-3 rounded-xl overflow-hidden border border-white/10">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-white/10">
            <span className="text-xs font-mono text-zinc-400">{lang}</span>
            <button onClick={() => copyCode(code, uniqueIdx)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors">
              {copiedIndex === uniqueIdx ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
            </button>
          </div>
          <pre className="bg-zinc-900 p-4 overflow-x-auto text-sm font-mono text-zinc-200 leading-relaxed"><code>{code}</code></pre>
        </div>
      );
      lastIndex = match.index + match[0].length;
      blockIdx++;
    }

    if (lastIndex < content.length) {
      parts.push(<p key={`t-end`} className="whitespace-pre-wrap leading-relaxed"><LinkText text={content.slice(lastIndex)} /></p>);
    }

    return parts.length ? parts : <p className="whitespace-pre-wrap leading-relaxed"><LinkText text={content} /></p>;
  };

  // ── Call mode ─────────────────────────────────────────────────────────────
  if (callMode) return <LuminaCallMode onEnd={() => setCallMode(false)} />;

  const isPrivilegedUser = PRIVILEGED_EMAILS.has(user?.email);
  const isPremium = user?.premium === true;
  const hasUnlimitedAccess = isPrivilegedUser || isPremium;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-950" ref={topRef}>

      {/* ── Header ── */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm">
        <div className="relative">
          <img src={LUMINA_AVATAR} alt="Lumina" className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/50" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-zinc-950" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-white text-lg leading-tight">Lumina</h1>
          <p className="text-xs text-zinc-500">
            {voice.isSpeaking ? '🔊 Speaking...' : voice.isListening ? '🎤 Listening...' : 'Your personal AI · Remembers everything'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streakData && <LuminaStreakBadge streakData={streakData} />}
          {!hasUnlimitedAccess && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-zinc-400">{usageCount}/{usageLimit}</span>
            </div>
          )}
          <button
            onClick={() => setCodingMode(!codingMode)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${codingMode ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Code className="w-3 h-3" />{codingMode ? 'Code On' : 'Code'}
          </button>
          <button
            onClick={() => setShowVideoGenerator(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
          >
            🎬 Video
          </button>
          <button
            onClick={() => setCallMode(true)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-purple-600/20 flex items-center justify-center transition-colors group"
          >
            <Phone className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {initializing ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <img src={LUMINA_AVATAR} alt="Lumina" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1 ring-1 ring-purple-500/30" />
                )}
                <div className={`max-w-[75%] sm:max-w-[65%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {/* Images attached to message */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {msg.images.map((url, i) => <img key={i} src={url} alt="uploaded" className="w-24 h-24 rounded-xl object-cover" />)}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm'
                      : 'bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.isImageLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        <span className="text-zinc-400 text-sm">Generating image…</span>
                      </div>
                    ) : msg.image_url ? (
                      <div className="space-y-3">
                        <p>{msg.content}</p>
                        <div className="relative group">
                          <img src={msg.image_url} alt="Generated" className="rounded-xl max-w-full" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <a href={msg.image_url} download className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                              <Download className="w-4 h-4 text-white" />
                            </a>
                            <button onClick={() => setPostingImage(msg.image_url)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                              <Share2 className="w-4 h-4 text-white" />
                            </button>
                            <button onClick={() => setEditingImage(msg.image_url)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                              <PenLine className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      renderContent(msg.content, idx)
                    )}
                  </div>
                  {msg.role === 'assistant' && !msg.isImageLoading && (
                    <MessageActionBar message={msg} />
                  )}
                </div>
                {msg.role === 'user' && user && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-medium">
                      {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <img src={LUMINA_AVATAR} alt="Lumina" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1 ring-1 ring-purple-500/30" />
                <div className="bg-zinc-900 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        {/* Uploaded image previews */}
        {uploadedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedImages.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="upload" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Listening indicator */}
        {voice.isListening && (
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-2 h-2 rounded-full bg-red-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            <span className="text-xs text-red-400">Listening…</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Upload image */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50">
            {uploadingImage ? <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /> : <ImageIcon className="w-4 h-4 text-zinc-400" />}
          </button>

          {/* Text input */}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={voice.isListening ? 'Speak now…' : codingMode ? 'Ask Lumina to code something…' : 'Message Lumina…'}
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors max-h-32"
            style={{ lineHeight: '1.5' }}
          />

          {/* Generate image */}
          <button onClick={handleGenerateImage} disabled={generatingImage}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-purple-600/20 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50" title="Generate image">
            {generatingImage ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-zinc-400" />}
          </button>

          {/* Mic */}
          <button onClick={voice.toggleListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${voice.isListening ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 hover:bg-white/10'}`}>
            {voice.isListening ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-zinc-400" />}
          </button>

          {/* Mute TTS */}
          <button onClick={voice.toggleMute}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
            {voice.isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
          </button>

          {/* Send */}
          <button onClick={() => handleSend()} disabled={!input.trim() || loading || !sessionId}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ── Post to Gallery modal ── */}
      <AnimatePresence>
        {postingImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPostingImage(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-white text-lg">Share to Gallery</h3>
              <img src={postingImage} alt="To post" className="rounded-xl w-full max-h-48 object-cover" />
              <input value={postCaption} onChange={e => setPostCaption(e.target.value)} placeholder="Caption…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50" />
              <input value={postHashtags} onChange={e => setPostHashtags(e.target.value)} placeholder="#hashtags"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50" />
              <input value={postLocation} onChange={e => setPostLocation(e.target.value)} placeholder="Location (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50" />
              <div className="flex gap-3">
                <button onClick={() => setPostingImage(null)} className="flex-1 py-2 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 text-sm">Cancel</button>
                <button
                  disabled={postingToGallery}
                  onClick={async () => {
                    if (!user || !postingImage) return;
                    setPostingToGallery(true);
                    try {
                      await base44.entities.Post.create({
                        author_id: user.email, author_name: user.full_name, author_avatar: user.avatar_url,
                        content: postCaption, images: [postingImage],
                        hashtags: postHashtags.split(' ').filter(h => h.startsWith('#')),
                        location: postLocation || undefined,
                        post_type: 'gallery', likes: 0, comments_count: 0
                      });
                      setPostingImage(null); setPostCaption(''); setPostHashtags(''); setPostLocation('');
                    } catch (err) { console.error('Post error:', err); }
                    setPostingToGallery(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-medium disabled:opacity-50">
                  {postingToGallery ? 'Posting…' : 'Share'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image editor ── */}
      {editingImage && (
        <ImageEditor imageUrl={editingImage} onClose={() => setEditingImage(null)}
          onSave={(editedUrl) => { setUploadedImages([editedUrl]); setEditingImage(null); }} />
      )}

      {/* ── Video generator ── */}
      {showVideoGenerator && <VideoGenerator onClose={() => setShowVideoGenerator(false)} />}
    </div>
  );
}
