import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Save, Calendar, MapPin, ChevronDown, ChevronUp, Check, Copy, Globe, Lock, Users, Plus, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function TripPlannerModal({ travelData, onClose }) {
  const navigate = useNavigate();
  const [numDays, setNumDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [tripName, setTripName] = useState(`${travelData.destination_name} Trip`);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedDay, setExpandedDay] = useState(0);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    
    // Auto-load suggestions after itinerary is generated
    loadSuggestions();
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Suggest 8-10 popular local activities, dining spots, and must-see landmarks for ${travelData.destination_name}. 
      Trip duration: ${numDays} days. 
      Focus on: authentic local experiences, highly-rated restaurants, iconic landmarks, hidden gems, and practical tips.
      Return varied suggestions (mix of food, culture, nature, nightlife).`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', description: 'dining, landmark, activity, nightlife, shopping' },
                description: { type: 'string' },
                location: { type: 'string' },
                estimated_time: { type: 'string', description: 'e.g. "1-2 hours"' },
                best_time: { type: 'string', description: 'e.g. "Morning", "Evening", "Sunset"' }
              }
            }
          }
        }
      }
    });

    setSuggestions(response?.suggestions || []);
    setSuggestionsLoading(false);
  };

  const addToItinerary = (suggestion, dayIndex) => {
    const updatedItinerary = [...itinerary];
    const newActivity = {
      time: suggestion.best_time || 'Flexible',
      activity: suggestion.name,
      location: suggestion.location,
      tip: `${suggestion.description} (${suggestion.estimated_time})`
    };
    updatedItinerary[dayIndex].activities.push(newActivity);
    setItinerary(updatedItinerary);
  };

  const handleSave = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    // Sanitize days to ensure activities are valid objects
    const sanitizedDays = itinerary.map(day => ({
      ...day,
      activities: (day.activities || []).filter(a => a && typeof a === 'object' && !Array.isArray(a)),
    }));

    const record = await base44.entities.TripItinerary.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      user_avatar: user.avatar_url || '',
      trip_name: tripName,
      destination: travelData.destination_name,
      num_days: numDays,
      start_date: startDate || undefined,
      is_public: isPublic,
      days: sanitizedDays,
    });
    setSavedId(record.id);
    setSaving(false);
    setSaved(true);
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

          {/* AI Suggestions Panel */}
          <AnimatePresence>
            {itinerary && showSuggestions && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-indigo-500/30 rounded-xl bg-indigo-500/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-indigo-500/20">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-semibold text-sm">AI Suggestions</h3>
                  </div>
                  <button onClick={() => setShowSuggestions(false)} className="text-xs text-zinc-500 hover:text-white">Hide</button>
                </div>
                <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  ) : (
                    suggestions?.map((sug, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-white truncate">{sug.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 flex-shrink-0">{sug.type}</span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">{sug.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                            {sug.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{sug.location}</span>}
                            {sug.estimated_time && <span>⏱ {sug.estimated_time}</span>}
                          </div>
                        </div>
                        <div className="relative group/add">
                          <button
                            onClick={() => {
                              const daySelect = document.getElementById(`day-select-${idx}`);
                              daySelect?.classList.toggle('hidden');
                            }}
                            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 transition-colors flex-shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <div id={`day-select-${idx}`} className="hidden absolute right-0 top-8 z-10 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                            {itinerary.map((day, dIdx) => (
                              <button
                                key={dIdx}
                                onClick={() => {
                                  addToItinerary(sug, dIdx);
                                  document.getElementById(`day-select-${idx}`)?.classList.add('hidden');
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
                              >
                                Add to Day {day.day_number}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
          <div className="p-5 border-t border-white/10 space-y-3">
            {/* Visibility toggle */}
            {!saved && (
              <button
                onClick={() => setIsPublic(p => !p)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-sm ${isPublic ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-white/10 bg-white/5 text-zinc-400'}`}
              >
                <span className="flex items-center gap-2">
                  {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isPublic ? 'Public — visible in community feed & shareable' : 'Private — only you can see this'}
                </span>
                <div className={`w-8 h-4 rounded-full transition-colors ${isPublic ? 'bg-indigo-500' : 'bg-zinc-600'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${isPublic ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </button>
            )}

            {!saved ? (
              <Button onClick={handleSave} disabled={saving} className="w-full h-11 btn-primary">
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4 mr-2" />Save Itinerary</>}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>Saved! {isPublic ? 'Posted to community feed.' : ''}</span>
                </div>
                {savedId && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`${createPageUrl('Social')}?shareTrip=${encodeURIComponent(savedId)}&tripName=${encodeURIComponent(tripName)}&dest=${encodeURIComponent(travelData.destination_name)}&days=${numDays}`);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-sm transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Share to Social
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${createPageUrl('SharedTrip')}?id=${savedId}`;
                        navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}