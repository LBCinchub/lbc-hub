import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export default function CallManager({ user }) {
  const [incomingCall, setIncomingCall] = useState(null); // { from_email, from_name, call_type, session_id }
  const [activeCall, setActiveCall] = useState(null);     // { peer_email, peer_name, call_type, session_id, role }
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pc = useRef(null);
  const localStream = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pollingRef = useRef(null);
  const processedSignals = useRef(new Set());

  const cleanup = useCallback(async () => {
    clearInterval(pollingRef.current);
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    processedSignals.current.clear();
    setActiveCall(null);
    setIncomingCall(null);
    setMuted(false);
    setCamOff(false);
  }, []);

  const sendSignal = useCallback(async (type, payload, sessionId, toEmail, callType) => {
    await base44.entities.CallSignal.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_email: toEmail,
      type,
      call_type: callType,
      payload: payload ? JSON.stringify(payload) : '',
      session_id: sessionId,
    });
  }, [user]);

  const setupPC = useCallback((sessionId, peerEmail, callType) => {
    const peerConn = new RTCPeerConnection(ICE_SERVERS);
    pc.current = peerConn;

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => peerConn.addTrack(track, localStream.current));
    }

    peerConn.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    peerConn.onicecandidate = async (e) => {
      if (e.candidate) {
        await sendSignal('ice-candidate', e.candidate, sessionId, peerEmail, callType);
      }
    };

    return peerConn;
  }, [sendSignal]);

  // Poll for incoming signals
  useEffect(() => {
    if (!user?.email) return;

    const poll = async () => {
      const signals = await base44.entities.CallSignal.filter({ to_email: user.email }, '-created_date', 20).catch(() => []);

      for (const sig of signals) {
        if (processedSignals.current.has(sig.id)) continue;
        processedSignals.current.add(sig.id);

        // Incoming call request
        if (sig.type === 'call-request' && !activeCall && !incomingCall) {
          setIncomingCall({
            from_email: sig.from_email,
            from_name: sig.from_name,
            call_type: sig.call_type,
            session_id: sig.session_id,
          });
        }

        // Offer (we are callee)
        if (sig.type === 'offer' && pc.current) {
          const offer = JSON.parse(sig.payload);
          await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          await sendSignal('answer', answer, sig.session_id, sig.from_email, sig.call_type);
        }

        // Answer (we are caller)
        if (sig.type === 'answer' && pc.current) {
          const answer = JSON.parse(sig.payload);
          if (pc.current.signalingState === 'have-local-offer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
          }
        }

        // ICE candidate
        if (sig.type === 'ice-candidate' && pc.current) {
          const candidate = JSON.parse(sig.payload);
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }

        // Hangup
        if (sig.type === 'hangup') {
          cleanup();
        }
      }
    };

    pollingRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollingRef.current);
  }, [user?.email, activeCall, incomingCall, cleanup, sendSignal]);

  // Attach local stream to video element
  useEffect(() => {
    if (activeCall && localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [activeCall]);

  // Exposed: start a call from FloatingDM
  useEffect(() => {
    window.__startCall = async (peerEmail, peerName, callType) => {
      const sessionId = `${user.email}-${peerEmail}-${Date.now()}`;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      }).catch(() => null);

      localStream.current = stream;

      await sendSignal('call-request', null, sessionId, peerEmail, callType);

      const peerConn = setupPC(sessionId, peerEmail, callType);

      const offer = await peerConn.createOffer();
      await peerConn.setLocalDescription(offer);
      await sendSignal('offer', offer, sessionId, peerEmail, callType);

      setActiveCall({ peer_email: peerEmail, peer_name: peerName, call_type: callType, session_id: sessionId, role: 'caller' });
    };

    return () => { window.__startCall = null; };
  }, [user, sendSignal, setupPC]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from_email, from_name, call_type, session_id } = incomingCall;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: call_type === 'video',
    }).catch(() => null);

    localStream.current = stream;
    setupPC(session_id, from_email, call_type);

    setActiveCall({ peer_email: from_email, peer_name: from_name, call_type, session_id, role: 'callee' });
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await sendSignal('hangup', null, incomingCall.session_id, incomingCall.from_email, incomingCall.call_type);
    }
    setIncomingCall(null);
  };

  const hangUp = async () => {
    if (activeCall) {
      await sendSignal('hangup', null, activeCall.session_id, activeCall.peer_email, activeCall.call_type);
    }
    cleanup();
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => { t.enabled = muted; });
      setMuted(m => !m);
    }
  };

  const toggleCam = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(t => { t.enabled = camOff; });
      setCamOff(c => !c);
    }
  };

  return (
    <AnimatePresence>
      {/* Incoming call notification */}
      {incomingCall && !activeCall && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl"
          style={{ background: 'rgba(13,13,20,0.97)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)', minWidth: 280 }}
        >
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{incomingCall.from_name}</p>
            <p className="text-zinc-400 text-xs animate-pulse">{incomingCall.call_type === 'video' ? '📹 Incoming video call…' : '📞 Incoming call…'}</p>
          </div>
          <button onClick={rejectCall} className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center">
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
          <button onClick={acceptCall} className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </button>
        </motion.div>
      )}

      {/* Active call UI */}
      {activeCall && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
        >
          <div className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col items-center"
            style={{ background: 'rgba(13,13,20,0.98)', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>

            {/* Remote video / avatar */}
            {activeCall.call_type === 'video' ? (
              <div className="w-full rounded-2xl bg-zinc-900 overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-xl">
                {activeCall.peer_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}

            <p className="text-white font-semibold text-lg mb-1">{activeCall.peer_name || activeCall.peer_email}</p>
            <p className="text-emerald-400 text-sm mb-6">Connected</p>

            {/* Local video pip */}
            {activeCall.call_type === 'video' && (
              <div className="absolute top-4 right-4 w-28 rounded-xl overflow-hidden bg-zinc-800" style={{ aspectRatio: '4/3' }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ display: camOff ? 'none' : 'block' }} />
                {camOff && <div className="w-full h-full flex items-center justify-center"><VideoOff className="w-5 h-5 text-zinc-500" /></div>}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {activeCall.call_type === 'video' && (
                <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button onClick={hangUp} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}