import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Shared voice hook — SpeechRecognition + SpeechSynthesis
 */
export function useVoice({ onTranscript, onFinalTranscript, continuous = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef(null);
  const autoSendTimer = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = continuous;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const combined = (final || interim).trim();
      if (combined) {
        setLiveTranscript(combined);
        onTranscript?.(combined);
      }
      if (final.trim()) {
        clearTimeout(autoSendTimer.current);
        autoSendTimer.current = setTimeout(() => {
          onFinalTranscript?.(final.trim());
          setLiveTranscript('');
        }, 1500);
      }
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => {
      if (continuous) {
        try { rec.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    return () => {
      clearTimeout(autoSendTimer.current);
      try { rec.stop(); } catch {}
    };
  }, [continuous]);

  const startListening = useCallback(async () => {
    if (!supported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    clearTimeout(autoSendTimer.current);
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setLiveTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text) => {
    if (!text || isMuted || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;

    // Pick best female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = ['Samantha', 'Google UK English Female', 'Microsoft Zira'];
    let chosen = null;
    for (const name of preferred) {
      chosen = voices.find(v => v.name.includes(name));
      if (chosen) break;
    }
    if (!chosen) chosen = voices.find(v => v.lang.startsWith('en') && /female|woman|girl/i.test(v.name));
    if (chosen) utterance.voice = chosen;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => {
      if (!m) window.speechSynthesis.cancel();
      return !m;
    });
  }, []);

  return {
    supported,
    isListening,
    isSpeaking,
    isMuted,
    liveTranscript,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    toggleMute,
  };
}