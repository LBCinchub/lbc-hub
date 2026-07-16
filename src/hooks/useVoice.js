import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Shared voice hook — SpeechRecognition + SpeechSynthesis
 */
export function useVoice({ onTranscript, onFinalTranscript, onSpeakEnd, continuous = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef(null);
  const autoSendTimer = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const voicesRef = useRef([]);

  // Load voices on mount and when they change
  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    // Ensure voices are loaded
    if (voicesRef.current.length === 0) {
      voicesRef.current = window.speechSynthesis.getVoices();
    }
    
    window.speechSynthesis.cancel();

    const getPreferredVoice = (voices) => {
      const preferred = [
        'Google UK English Female',
        'Microsoft Aria Online',
        'Microsoft Zira',
        'Samantha',
        'Karen',
        'Moira',
        'Tessa',
      ];
      for (const name of preferred) {
        const voice = voices.find(v => v.name.includes(name));
        if (voice) return voice;
      }
      // Fallback: any English female voice
      let voice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Female') || v.name.includes('female'))
      );
      if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
      return voice || null;
    };

    const speakSentences = (voices) => {
      const sentences = text.length > 200
        ? (text.match(/[^.!?]+[.!?]+/g) || [text])
        : [text];
      let sentenceIndex = 0;

      const speakNext = () => {
        if (sentenceIndex >= sentences.length) {
          setIsSpeaking(false);
          onSpeakEnd?.();
          return;
        }

        const sentence = sentences[sentenceIndex].trim();
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = 'en-US';
        utterance.rate = 0.88;
        utterance.pitch = 1.15;
        utterance.volume = 1.0;

        const voice = getPreferredVoice(voices);
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          sentenceIndex++;
          setTimeout(speakNext, 200);
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    };

    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakSentences(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
        speakSentences(voicesRef.current);
      };
    }
  }, [isMuted, onSpeakEnd]);

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