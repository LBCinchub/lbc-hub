import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Video, VideoOff, Mic, MicOff, Users, Send, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

export default function GoLiveModal({ open, onClose, onStartLive, user }) {
  const [streaming, setStreaming] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [viewers] = useState(Math.floor(Math.random() * 50) + 1);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (open && !streaming) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => {});
    }
    return () => {
      if (streamRef.current && !streaming) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [open]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setChatInput(transcript);
      };
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleStart = () => {
    setStreaming(true);
    onStartLive?.();
  };

  const handleEnd = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
    onClose();
  };

  const toggleMic = () => {
    setMicOn(m => {
      streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !m; });
      return !m;
    });
  };

  const toggleCam = () => {
    setCamOn(c => {
      streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !c; });
      return !c;
    });
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !streaming) return;

    const message = {
      id: Date.now(),
      user: user?.full_name || user?.email || 'Anonymous',
      text: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, message]);
    setChatInput('');

    if (voiceEnabled) {
      speakMessage(message.text);
    }
  };

  const speakMessage = (text) => {
    if (!voiceEnabled || !text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in this browser');
      return;
    }
    recognitionRef.current.start();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass rounded-3xl overflow-hidden w-full max-w-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-400" />
                <h2 className="font-bold text-lg">
                  {streaming ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                      LIVE
                    </span>
                  ) : 'Go Live'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {streaming && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-sm">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <span className="text-zinc-300">{viewers}</span>
                  </div>
                )}
                {!streaming && (
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Video Preview */}
            <div className="relative aspect-video bg-zinc-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <VideoOff className="w-12 h-12 text-zinc-600" />
                </div>
              )}
              {streaming && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Live Chat */}
            {streaming && (
              <div className="border-t border-white/10 bg-zinc-900/50">
                <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-zinc-500 text-xs">Live chat will appear here</p>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className="text-xs">
                        <span className="font-semibold text-indigo-400">{msg.user}: </span>
                        <span className="text-zinc-300">{msg.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <form onSubmit={sendChatMessage} className="p-3 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      if (!voiceEnabled) window.speechSynthesis.cancel();
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Controls */}
            <div className="p-5 flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-400'}`}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-3 rounded-full transition-colors ${camOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-400'}`}
                >
                  {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>

              {streaming ? (
                <Button onClick={handleEnd} className="bg-rose-600 hover:bg-rose-700 rounded-full px-6">
                  End Stream
                </Button>
              ) : (
                <Button onClick={handleStart} className="bg-rose-600 hover:bg-rose-700 rounded-full px-6">
                  <Radio className="w-4 h-4 mr-2" />
                  Start Live
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}