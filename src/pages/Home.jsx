import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Users, ShoppingBag, Car, Plane, ArrowRight, 
  Sparkles, MessageCircle, Video, Globe 
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Social Hub',
    description: 'Connect, share, and engage with a vibrant community through posts, live streams, and real-time chat.',
    page: 'Social',
    gradient: 'from-pink-500 to-rose-600',
    bgGlow: 'bg-pink-500/20'
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace',
    description: 'Discover curated products, services, and exclusive branded goods from trusted sellers.',
    page: 'Marketplace',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'bg-amber-500/20'
  },
  {
    icon: Car,
    title: 'Riding',
    description: 'Request rides seamlessly. Coming soon to revolutionize your transportation experience.',
    page: 'Riding',
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500/20'
  },
  {
    icon: Plane,
    title: 'Travel',
    description: 'Plan your perfect trip with personalized recommendations and instant booking options.',
    page: 'Travel',
    gradient: 'from-indigo-500 to-violet-600',
    bgGlow: 'bg-indigo-500/20'
  }
];

const highlights = [
  { icon: Sparkles, label: 'AI-Powered' },
  { icon: MessageCircle, label: 'Real-time Chat' },
  { icon: Video, label: 'Live Streaming' },
  { icon: Globe, label: 'Global Community' }
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-zinc-300">Welcome to the future of connection</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
              One Hub.
              <br />
              <span className="gradient-text">Endless Possibilities.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Connect socially, shop smartly, travel effortlessly, and ride conveniently—all in one unified platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                to={createPageUrl('Social')}
                className="btn-primary px-8 py-4 rounded-full text-lg font-semibold flex items-center gap-2"
              >
                Explore Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to={createPageUrl('Marketplace')}
                className="px-8 py-4 rounded-full border border-white/20 hover:bg-white/5 transition-colors text-lg font-medium"
              >
                Browse Marketplace
              </Link>
            </div>

            {/* Highlight Pills */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300"
                >
                  <item.icon className="w-4 h-4 text-indigo-400" />
                  {item.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-zinc-600 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-zinc-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Four powerful platforms, one seamless experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link to={createPageUrl(feature.page)}>
                  <div className="group relative glass rounded-3xl p-8 card-hover overflow-hidden h-full">
                    {/* Glow Effect */}
                    <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                        {feature.title}
                        <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </h3>
                      
                      <p className="text-zinc-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative glass rounded-3xl p-12 text-center overflow-hidden glow"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-pink-600/20" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Join the Hub?
              </h2>
              <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
                Start exploring all the features LBC Hub has to offer. Your all-in-one destination awaits.
              </p>
              <Link 
                to={createPageUrl('Social')}
                className="btn-primary px-8 py-4 rounded-full text-lg font-semibold inline-flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}