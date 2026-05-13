import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MicOff, Mic, PhoneOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LUMINA_AVATAR = 'https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=80&h=80&fit=crop&crop=face';

export default function LuminaCallMode({ onEnd }) {
  const [callState, setCallState] = useState('listening');
  const [transcript, setTranscript] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  const timerRef = useRef(null);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isBusyRef = useRef(false);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Start recognition on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error('❌ SpeechRecognition not supported');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('🎤 Started listening');
    };

    recognition.onresult = (event) => {
      if (!event.results.length) return;
      const transcript = event.results[0][0].transcript;
      console.log('📝 Transcript:', transcript);
      setLiveTranscript('');
      sendToLumina(transcript);
    };

    recognition.onerror = (event) => {
      console.error('❌ Recognition error:', event.error);
    };

    recognition.onend = () => {
      console.log('🛑 Recognition ended');
    };

    // Timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    // Start listening
    const startListeningTimer = setTimeout(() => {
      if (!micMuted) {
        recognition.start();
      }
    }, 800);

    return () => {
      clearTimeout(startListeningTimer);
      clearInterval(timerRef.current);
      recognition.stop();
    };
  }, [micMuted]);

  const sendToLumina = async (text) => {
    if (isBusyRef.current || !text.trim()) return;
    isBusyRef.current = true;
    setCallState('thinking');
    setTranscript(prev => [...prev, { role: 'user', content: text }]);

    try {
      console.log('📡 Sending to Lumina...');
      const res = await base44.functions.invoke('luminaChat', { action: 'send', message: text });
      const reply = res.data?.reply || "I'm here!";
      console.log('💬 Lumina replied:', reply);
      
      setTranscript(prev => [...prev, { role: 'lumina', content: reply }]);
      setCallState('speaking');
      speakReply(reply);
    } catch (err) {
      console.error('❌ Error calling Lumina:', err);
      setCallState('listening');
      isBusyRef.current = false;
      if (!micMuted && recognitionRef.current) {
        recognitionRef.current.start();
      }
    }
  };

  const speakReply = (text) => {
    console.log('🔊 Speaking reply...');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Zira') ||
        (v.lang.startsWith('en') && v.name.includes('Female'))
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        console.log('🔁 Looping back to listen');
        setCallState('listening');
        isBusyRef.current = false;
        if (!micMuted && recognitionRef.current) {
          recognitionRef.current.start();
        }
      };

      utterance.onerror = () => {
        console.error('❌ Speech synthesis error');
        setCallState('listening');
        isBusyRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const toggleMic = () => {
    setMicMuted(m => {
      if (!m) {
        recognitionRef.current?.stop();
      } else if (callState === 'listening' && !isBusyRef.current) {
        recognitionRef.current?.start();
      }
      return !m;
    });
  };

  const ringColor = callState === 'speaking' ? '#7c3aed' : callState === 'thinking' ? '#f59e0b' : '#22c55e';
  const statusLabel = callState === 'speaking' ? 'Lumina is speaking...' : callState === 'thinking' ? 'Lumina is thinking...' : micMuted ? 'Microphone muted' : 'Listening...';

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-zinc-950" style={{ background: 'radial-gradient(ellipse at top, #1e1040 0%, #09090b 60%)' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 pt-8 pb-4">
        <div className="text-white/40 text-sm font-mono">{formatTime(elapsed)}</div>
        <div className="text-white font-semibold">Call with Lumina</div>
        <div className="w-16" />
      </div>

      {/* Avatar + Rings */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2"
              style={{ borderColor: ringColor, width: 80 + i * 48, height: 80 + i * 48, opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0], scale: [0.9, 1.1, 1.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
            />
          ))}
          {/* Avatar */}
          <img
            src={LUMINA_AVATAR}
            alt="Lumina"
            className="w-28 h-28 rounded-full object-cover border-4"
            style={{ borderColor: ringColor, boxShadow: `0 0 40px ${ringColor}55` }}
          />
        </div>

        <div className="text-center space-y-1">
          <div className="text-white text-xl font-semibold">Lumina</div>
          <div className="text-sm flex items-center gap-2" style={{ color: ringColor }}>
            {callState === 'listening' && !micMuted && (
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>●</motion.span>
            )}
            {statusLabel}
          </div>
        </div>

        {/* Live transcript bubble */}
        {liveTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 px-4 py-2 rounded-2xl bg-white/10 text-white/80 text-sm text-center max-w-xs"
          >
            {liveTranscript}
          </motion.div>
        )}
      </div>

      {/* Transcript scroll */}
      {transcript.length > 0 && (
        <div className="w-full max-w-sm mx-auto px-4 mb-4 max-h-40 overflow-y-auto scrollbar-hide space-y-2">
          {transcript.map((t, i) => (
            <div key={i} className={`text-xs px-3 py-1.5 rounded-xl ${t.role === 'user' ? 'bg-white/10 text-white/70 text-right ml-8' : 'bg-purple-900/40 text-purple-200 text-left mr-8'}`}>
              {t.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 pb-12">
        {/* Mute mic */}
        <button
          onClick={toggleMic}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ background: micMuted ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
        >
          {micMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        {/* End call */}
        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-900/50"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}