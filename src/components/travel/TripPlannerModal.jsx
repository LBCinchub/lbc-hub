import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Save, Calendar, MapPin, ChevronDown, ChevronUp, Check, Share2, Copy, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';

export default function TripPlannerModal({ travelData, onClose }) {
  const [numDays, setNumDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [tripName, setTripName] = useState(`${travelData.destination_name} Trip`);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedDay, setExpandedDay] = useState(0);

  const generateItinerary = async () => {
    setLoading(true);
    setItinerary(null);

    const attractionsList = travelData.attractions?.map(a => a.name).join(', ') || '';
    const foodList = travelData.cuisine?.map(c => c.name).join(', ') || '';
    const gemsList = travelData.hidden_gems?.map(g => g.name).join(', ') || '';

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a detailed ${numDays}-day trip itinerary for ${travelData.destination_name}.
      
      Available attractions: ${attractionsList}
      Must-try foods: ${foodList}
      Hidden gems: ${gemsList}
      Budget range: ${travelData.budget_per_day}
      Best time context: ${travelData.best_time}
      
      Create a realistic day-by-day plan. Each day should have 4-5 activities spread throughout the day (morning, midday, afternoon, evening). Include specific locations, time slots, and practical tips. Make it feel like a real, enjoyable trip.`,
      response_json_schema: {
        type: 'object',
        properties: {
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'number' },
                theme: { type: 'string', description: 'e.g. "Culture & History", "Food & Markets"' },
                activities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      time: { type: 'string', description: 'e.g. "9:00 AM"' },
                      activity: { type: 'string' },
                      location: { type: 'string' },
                      tip: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    setItinerary(response?.days || []);
    setExpandedDay(0);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    // Sanitize days to ensure activities are valid objects
    const sanitizedDays = itinerary.map(day => ({
      ...day,
      activities: (day.activities || []).filter(a => a && typeof a === 'object' && !Array.isArray(a)),
    }));

    await base44.entities.TripItinerary.create({
      user_email: user.email,
      trip_name: tripName,
      destination: travelData.destination_name,
      num_days: numDays,
      start_date: startDate || undefined,
      days: sanitizedDays,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold">Plan Your Trip</h2>
            <p className="text-zinc-400 text-sm">{travelData.destination_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Setup form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Trip Name</label>
              <Input
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Number of Days</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNumDays(d => Math.max(1, d - 1))}
                  className="w-8 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-bold text-lg">−</button>
                <span className="flex-1 text-center font-semibold">{numDays}</span>
                <button onClick={() => setNumDays(d => Math.min(14, d + 1))}
                  className="w-8 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-bold text-lg">+</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Start Date (optional)</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>

          <Button
            onClick={generateItinerary}
            disabled={loading}
            className="w-full btn-primary h-11"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating your {numDays}-day itinerary...</>
              : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Itinerary</>}
          </Button>

          {/* Itinerary */}
          <AnimatePresence>
            {itinerary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {itinerary.map((day, idx) => (
                  <div key={idx} className="border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {day.day_number}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Day {day.day_number}</p>
                          <p className="text-xs text-indigo-300">{day.theme}</p>
                        </div>
                        {startDate && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1 ml-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(new Date(startDate).getTime() + (idx) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {expandedDay === idx ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </button>

                    <AnimatePresence>
                      {expandedDay === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {day.activities?.map((act, aIdx) => (
                              <div key={aIdx} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-indigo-400 whitespace-nowrap font-medium min-w-[56px] text-right">
                                    {act.time}
                                  </span>
                                  {aIdx < day.activities.length - 1 && (
                                    <div className="w-px flex-1 bg-white/10 mt-1" />
                                  )}
                                </div>
                                <div className="pb-3 flex-1">
                                  <p className="text-sm font-semibold text-white">{act.activity}</p>
                                  {act.location && (
                                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />{act.location}
                                    </p>
                                  )}
                                  {act.tip && (
                                    <p className="text-xs text-amber-300/80 mt-1 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-500/20">
                                      💡 {act.tip}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {itinerary && (
          <div className="p-5 border-t border-white/10">
            <Button onClick={handleSave} disabled={saving || saved} className="w-full h-11 btn-primary">
              {saved
                ? <><Check className="w-4 h-4 mr-2" />Saved to My Trips!</>
                : saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                : <><Save className="w-4 h-4 mr-2" />Save Itinerary</>}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}