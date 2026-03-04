import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, ChevronDown, ChevronUp, Clock, Sparkles, ArrowLeft, Share2, Copy, Users, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SharedTrip() {
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get('id');
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    setShowShareMenu(false);
  };

  const handleShareToSocial = () => {
    navigate(`${createPageUrl('Social')}?shareTrip=${encodeURIComponent(tripId)}&tripName=${encodeURIComponent(trip.trip_name)}&dest=${encodeURIComponent(trip.destination)}&days=${trip.num_days}`);
  };

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    base44.entities.TripItinerary.filter({ id: tripId }).then(results => {
      setTrip(results?.[0] || null);
      setLoading(false);
    });
  }, [tripId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Sparkles className="w-12 h-12 text-zinc-600" />
      <h2 className="text-2xl font-bold">Trip not found</h2>
      <Link to={createPageUrl('Travel')} className="text-indigo-400 hover:text-indigo-300">← Back to Travel</Link>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl('Travel')} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Travel
          </Link>

          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(s => !s)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-10 z-10 w-48 rounded-xl bg-zinc-900 border border-white/10 shadow-xl overflow-hidden"
                >
                  <button
                    onClick={handleShareToSocial}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    Share to Social
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 transition-colors border-t border-white/5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Trip Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={trip.user_avatar} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                {trip.user_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{trip.user_name || 'Traveler'}</p>
              <p className="text-xs text-zinc-500">shared this itinerary</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">{trip.trip_name}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-400" />{trip.destination}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-400" />{trip.num_days} days</span>
            {trip.start_date && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" />
                Starting {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </motion.div>

        {/* Days */}
        <div className="space-y-3">
          {trip.days?.map((day, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="border border-white/10 rounded-xl overflow-hidden glass">
              <button
                onClick={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {day.day_number}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Day {day.day_number}</p>
                    <p className="text-xs text-indigo-300">{day.theme}</p>
                  </div>
                </div>
                {expandedDay === idx ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              <AnimatePresence>
                {expandedDay === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 space-y-3 border-t border-white/5">
                      {day.activities?.map((act, aIdx) => (
                        <div key={aIdx} className="flex gap-3">
                          <span className="text-xs text-indigo-400 whitespace-nowrap font-medium min-w-[56px] text-right mt-0.5">{act.time}</span>
                          <div className="pb-3 flex-1">
                            <p className="text-sm font-semibold text-white">{act.activity}</p>
                            {act.location && <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{act.location}</p>}
                            {act.tip && <p className="text-xs text-amber-300/80 mt-1 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-500/20">💡 {act.tip}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}