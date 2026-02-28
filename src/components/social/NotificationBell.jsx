import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, MessageCircle, Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const iconMap = {
  like: { icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  comment: { icon: MessageCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  message: { icon: Mail, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ to_email: user.email }, '-created_date', 20),
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  const unread = notifications.filter(n => !n.read);

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = () => {
    unread.forEach(n => markReadMutation.mutate(n.id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-zinc-300" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 z-50 glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unread.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}>
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const cfg = iconMap[notif.type] || iconMap.like;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => !notif.read && markReadMutation.mutate(notif.id)}
                        className={`flex items-start gap-3 p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors ${!notif.read ? 'bg-white/5' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 leading-snug">{notif.message}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}