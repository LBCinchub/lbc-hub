import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CommunityTrips() {
  const { data: trips = [] } = useQuery({
    queryKey: ['publicTrips'],
    queryFn: () => base44.entities.TripItinerary.filter({ is_public: true }, '-created_date', 12),
  });

  if (trips.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-3 mb-5">
        <Users className="w-5 h-5 text-indigo-400" />
        <h2 className="text-2xl font-bold">Community Trips</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/20">{trips.length} shared</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip, i) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`${createPageUrl('SharedTrip')}?id=${trip.id}`}
              className="group glass rounded-2xl p-5 flex flex-col gap-4 hover:border-indigo-500/40 transition-all border border-white/5 block"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={trip.user_avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                    {trip.user_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{trip.user_name || 'Traveler'}</p>
                  <p className="text-xs text-zinc-500">shared a trip</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white truncate mb-1">{trip.trip_name}</h3>
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" />{trip.destination}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400" />{trip.num_days} days</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-indigo-400 group-hover:gap-2 transition-all font-medium">
                View itinerary <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}