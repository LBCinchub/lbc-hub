import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Pen, BarChart2, BookOpen, Megaphone,
  Wrench, Camera, Globe, Shield, ArrowRight, X,
  CheckCircle, Star, Users, Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

const services = [
  {
    icon: Monitor,
    title: 'Tech Support',
    category: 'tech-support',
    description: 'Expert help with software, hardware, and IT infrastructure issues. Fast response, lasting solutions.',
    features: ['24/7 remote support', 'Network setup & security', 'Software installation', 'Data recovery'],
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    price: 'From $49/hr'
  },
  {
    icon: Pen,
    title: 'Freelance Skills',
    category: 'freelance',
    description: 'Access top freelance talent for writing, design, development, and more—on your schedule.',
    features: ['Vetted professionals', 'Project-based pricing', 'Fast turnaround', 'Revisions included'],
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    price: 'From $25/hr'
  },
  {
    icon: BarChart2,
    title: 'Business Consultancy',
    category: 'consultancy',
    description: 'Strategic guidance to scale your business, optimize operations, and maximize growth.',
    features: ['Market research', 'Growth strategy', 'Financial planning', 'Competitor analysis'],
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    price: 'From $150/hr'
  },
  {
    icon: Megaphone,
    title: 'Digital Marketing',
    category: 'marketing',
    description: 'Data-driven campaigns across social media, SEO, paid ads, and email to grow your audience.',
    features: ['SEO optimization', 'Social media management', 'PPC campaigns', 'Email marketing'],
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    price: 'From $500/mo'
  },
  {
    icon: BookOpen,
    title: 'Education & Training',
    category: 'education',
    description: 'Upskill your team or yourself with expert-led courses, workshops, and mentorship programs.',
    features: ['1-on-1 mentorship', 'Group workshops', 'Custom curricula', 'Certification prep'],
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    price: 'From $75/session'
  },
  {
    icon: Camera,
    title: 'Creative Production',
    category: 'creative',
    description: 'Professional photo, video, and graphic design services that make your brand stand out.',
    features: ['Photography & video', 'Brand identity', 'Motion graphics', 'Content creation'],
    gradient: 'from-fuchsia-500 to-pink-600',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    price: 'From $200/day'
  },
  {
    icon: Globe,
    title: 'Web Development',
    category: 'web-dev',
    description: 'Custom websites and web apps built with modern tech—fast, responsive, and beautiful.',
    features: ['Custom design', 'E-commerce ready', 'SEO optimized', 'Ongoing maintenance'],
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    price: 'From $1,500'
  },
  {
    icon: Shield,
    title: 'Legal & Compliance',
    category: 'legal',
    description: 'Navigate contracts, compliance, and legal requirements with trusted advisors.',
    features: ['Contract review', 'Business registration', 'GDPR compliance', 'IP protection'],
    gradient: 'from-slate-500 to-zinc-600',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    price: 'From $200/hr'
  },
];

const stats = [
  { icon: Users, label: 'Active Clients', value: '2,400+' },
  { icon: Star, label: 'Avg. Rating', value: '4.9/5' },
  { icon: CheckCircle, label: 'Projects Done', value: '8,700+' },
  { icon: Zap, label: 'Response Time', value: '< 2hrs' },
];

function BookingDialog({ service, open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [done, setDone] = useState(false);

  const bookMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceBooking.create(data),
    onSuccess: () => setDone(true)
  });

  const handleSubmit = () => {
    if (!form.name || !form.email) return;
    bookMutation.mutate({ service_category: service.category, ...form });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center`}>
              <service.icon className="w-5 h-5 text-white" />
            </div>
            Book: {service.title}
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Booking Confirmed!</h3>
            <p className="text-zinc-400">We'll reach out to you at <span className="text-white">{form.email}</span> shortly.</p>
            <Button onClick={onClose} className="mt-6 btn-primary rounded-xl px-8">Done</Button>
          </motion.div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className={`rounded-xl p-4 ${service.bg} border ${service.border}`}>
              <p className="text-sm text-zinc-300">{service.description}</p>
              <p className="text-lg font-bold mt-2 gradient-text">{service.price}</p>
            </div>
            {[['name', 'Your Name'], ['email', 'Email Address']].map(([field, label]) => (
              <div key={field}>
                <Label className="text-zinc-300 mb-1 block">{label}</Label>
                <Input
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                  placeholder={label}
                />
              </div>
            ))}
            <div>
              <Label className="text-zinc-300 mb-1 block">Message (optional)</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                placeholder="Tell us about your project..."
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.email || bookMutation.isPending}
              className="w-full btn-primary rounded-xl h-12 font-semibold"
            >
              {bookMutation.isPending ? 'Booking...' : 'Book Now'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Services() {
  const [activeService, setActiveService] = useState(null);
  const [bookingService, setBookingService] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-300">Professional Services, On Demand</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Services Built for
            <span className="gradient-text"> Your Success</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            From tech support to business consultancy, connect with experts who deliver results—fast.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-12 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                <stat.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {services.map((service, index) => (
            <motion.div
              key={service.category}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
              className={`group glass rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${service.border} hover:border-opacity-60 card-hover`}
              onClick={() => setActiveService(activeService?.category === service.category ? null : service)}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{service.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-2">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">{service.price}</span>
                <span className={`text-xs font-medium bg-gradient-to-r ${service.gradient} bg-clip-text text-transparent flex items-center gap-1`}>
                  Learn More <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expanded Service Detail */}
        <AnimatePresence>
          {activeService && (
            <motion.div
              key={activeService.category}
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <div className={`glass rounded-2xl p-8 border ${activeService.border}`}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeService.gradient} flex items-center justify-center`}>
                      <activeService.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{activeService.title}</h2>
                      <p className="text-zinc-400">{activeService.price}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveService(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-zinc-300 leading-relaxed mb-4">{activeService.description}</p>
                    <Button
                      onClick={() => setBookingService(activeService)}
                      className="btn-primary rounded-xl px-8 py-3 font-semibold"
                    >
                      Book This Service
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-zinc-400">What's Included</h3>
                    <ul className="space-y-2">
                      {activeService.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-zinc-300">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${activeService.gradient} flex items-center justify-center flex-shrink-0`}>
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative glass rounded-3xl p-10 md:p-14 text-center overflow-hidden glow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-pink-600/20" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-zinc-400 max-w-xl mx-auto mb-8 text-lg">
              Tell us what you need, and we'll match you with the right expert within 2 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => setBookingService(services[0])}
                className="btn-primary rounded-full px-8 py-4 text-lg font-semibold"
              >
                Book a Service
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" className="rounded-full px-8 py-4 text-lg border-white/20 bg-transparent hover:bg-white/10">
                Talk to an Expert
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Booking Dialog */}
      {bookingService && (
        <BookingDialog
          service={bookingService}
          open={!!bookingService}
          onClose={() => setBookingService(null)}
        />
      )}
    </div>
  );
}