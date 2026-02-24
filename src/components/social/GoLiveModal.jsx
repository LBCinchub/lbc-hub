import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Video, VideoOff, Mic, MicOff, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function GoLiveModal({ open, onClose, onStartLive }) {
  const [streaming, setStreaming] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [viewers] = useState(Math.floor(Math.random() * 50) + 1);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    };
  }, [open]);

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

            {/* Controls */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-400'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-3 rounded-full transition-colors ${camOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-400'}`}
                >
                  <Video className="w-5 h-5" />
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