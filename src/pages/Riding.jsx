import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Car, Bell, Sparkles, MapPin, Clock, Shield, ArrowRight, Check } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MapPin, title: 'Smart Routes', description: 'AI-optimized routing for faster travel' },
  { icon: Clock, title: 'Real-time Tracking', description: 'Know exactly when your ride arrives' },
  { icon: Shield, title: 'Safe & Secure', description: 'Verified drivers and in-app safety' },
];

export default function Riding() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setEmail(u.email || '');
    }).catch(() => {});
  }, []);

  const notifyMutation = useMutation({
    mutationFn: (data) => base44.entities.RideNotification.create(data),
    onSuccess: () => setSubmitted(true)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    notifyMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 flex items-center">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div 
          className="relative glass rounded-3xl p-8 md:p-16 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-teal-500/20 rounded-full blur-[80px]" />

          <div className="relative z-10">
            {/* Coming Soon Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Coming Soon</span>
            </motion.div>

            {/* Main Content */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Your Ride,
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    On Demand.
                  </span>
                </motion.h1>

                <motion.p 
                  className="text-xl text-zinc-400 mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  We're building something revolutionary. Request rides seamlessly, track in real-time, and travel smarter with LBC Riding.
                </motion.p>

                {/* Notification Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {submitted ? (
                    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-400">You're on the list!</p>
                        <p className="text-sm text-zinc-400">We'll notify you when riding launches.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
                          required
                        />
                      </div>
                      <Button 
                        type="submit"
                        disabled={notifyMutation.isPending}
                        className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl"
                      >
                        {notifyMutation.isPending ? 'Joining...' : 'Notify Me'}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </form>
                  )}
                </motion.div>
              </div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative hidden md:block"
              >
                <div className="relative w-full aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl" />
                  <div className="absolute inset-8 glass rounded-full flex items-center justify-center">
                    <Car className="w-32 h-32 text-emerald-400" />
                  </div>
                  
                  {/* Floating Features */}
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      className="absolute glass rounded-xl p-3 flex items-center gap-3"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      style={{
                        top: index === 0 ? '10%' : index === 1 ? '50%' : '80%',
                        [index % 2 === 0 ? 'right' : 'left']: '-20%',
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="pr-2">
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-zinc-500">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Mobile Features */}
            <div className="grid grid-cols-3 gap-4 mt-12 md:hidden">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium">{feature.title}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}