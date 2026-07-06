import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wrench, Phone, Mail, ArrowRight, CheckCircle, Car, ExternalLink, ShieldCheck, Store
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// LBC Auto — all shops run on the same app, scoped by owner email (RLS).
const SHOPS = {
  mokhtar: { email: "mokhtartareksamara@gmail.com", name: "LBC Auto", tagline: "Full auto shop management — repair orders, estimates, invoices & AI diagnostics." },
  belal: { email: "belalautoservices@gmail.com", name: "Belal Auto Services", tagline: "Trusted repairs and maintenance, powered by LBC Auto." },
  haj: { email: "hajwheels@gmail.com", name: "Haj Wheels", tagline: "Quality auto care, powered by LBC Auto." },
  aka: { email: "aka.auto.group@gmail.com", name: "AKA Auto Group", tagline: "Reliable auto service, powered by LBC Auto." },
};
const DEFAULT_SLUG = "mokhtar";

function getShopSlugFromUrl() {
  if (typeof window === "undefined") return DEFAULT_SLUG;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("shop");
  return SHOPS[slug] ? slug : DEFAULT_SLUG;
}

function ShopSwitcher({ activeSlug }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {Object.entries(SHOPS).map(([slug, shop]) => (
        <a
          key={slug}
          href={`?shop=${slug}`}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            slug === activeSlug
              ? "bg-teal-500 text-white border-teal-500"
              : "bg-white/5 text-zinc-400 border-white/10 hover:border-teal-500/40 hover:text-white"
          }`}
        >
          {shop.name}
        </a>
      ))}
    </div>
  );
}

function TrackVehiclePanel({ shopEmail, shopName }) {
  const portalUrl = `https://lbchub.tech/CustomerPortal?shop=${encodeURIComponent(shopEmail)}`;

  return (
    <div className="glass rounded-2xl border border-teal-500/20 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Track My Vehicle</h2>
      </div>
      <p className="text-zinc-400 text-sm mb-6">
        Check your repair status, invoices &amp; messages with {shopName} — one Customer Portal, no app download needed.
      </p>
      <a href={portalUrl} target="_blank" rel="noopener noreferrer">
        <Button className="w-full btn-primary rounded-xl h-12 font-semibold">
          Open My Customer Portal
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </a>
      <p className="text-zinc-500 text-xs mt-3">
        Opens {shopName}'s Customer Portal — the same portal you'd reach from a direct link, so your history and messages are always in one place.
      </p>
    </div>
  );
}

function QuickContactCard({ shopSlug, shopName }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceBooking.create(data),
    onSuccess: () => setDone(true),
  });

  const submit = () => {
    if (!form.name || !form.email) return;
    mutation.mutate({ service_category: `lbc-auto-${shopSlug}`, ...form, message: `[${shopName}] ${form.message || ""}` });
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Contact {shopName}</h2>
      </div>

      <div className="space-y-2 mb-5">
        <a href="tel:+16133141994" className="flex items-center gap-2 text-zinc-300 hover:text-teal-400 text-sm">
          <Phone className="w-4 h-4" /> +1 (613) 314-1994
        </a>
        <a href="mailto:tarek-samara@lbc-hub.com" className="flex items-center gap-2 text-zinc-300 hover:text-teal-400 text-sm">
          <Mail className="w-4 h-4" /> tarek-samara@lbc-hub.com
        </a>
        <a href="https://lbchub.tech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zinc-300 hover:text-teal-400 text-sm">
          <ExternalLink className="w-4 h-4" /> Visit full shop dashboard
        </a>
      </div>

      {done ? (
        <div className="text-center py-6">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-semibold">We got your message!</p>
          <p className="text-zinc-400 text-sm">We'll reach out at {form.email} shortly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your Name"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
          <Input
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email Address"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
          <Textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="What's going on with your vehicle?"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
          <Button onClick={submit} disabled={!form.name || !form.email || mutation.isPending} className="w-full btn-primary rounded-xl h-11 font-semibold">
            {mutation.isPending ? 'Sending…' : 'Send Message'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LbcAutoProfile() {
  const [slug, setSlug] = useState(getShopSlugFromUrl());
  const shop = SHOPS[slug] || SHOPS[DEFAULT_SLUG];

  useEffect(() => {
    const onPop = () => setSlug(getShopSlugFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Intercept switcher clicks without a full page reload
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest?.("a[href^='?shop=']");
      if (!a) return;
      e.preventDefault();
      const url = new URL(a.href);
      window.history.pushState({}, "", url);
      setSlug(getShopSlugFromUrl());
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold tracking-wider mb-4">
            LIVE
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{shop.name}</h1>
          <p className="text-zinc-400 max-w-xl mx-auto">{shop.tagline}</p>
        </motion.div>

        <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-xs mb-3">
          <Store className="w-3.5 h-3.5" /> Other LBC Auto shops
        </div>
        <ShopSwitcher activeSlug={slug} />

        <div className="grid md:grid-cols-2 gap-6">
          <TrackVehiclePanel key={shop.email} shopEmail={shop.email} shopName={shop.name} />
          <QuickContactCard shopSlug={slug} shopName={shop.name} />
        </div>
      </div>
    </div>
  );
}
