import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Phone, Mail, ArrowRight, ArrowLeft, CheckCircle, Loader2,
  Send, Users, Car, Clock, DollarSign, Gift, MessageCircle, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// LBC Auto — hardcoded for v1 (single-shop). Extend to a lookup table for multi-shop later.
const SHOP_APP_ID = "69b0bd497bfce90f18df6cdd";
const SHOP_EMAIL = "mokhtartareksamara@gmail.com";
const SHOP_NAME = "LBC Auto";
const FN_BASE = `https://base44.app/api/apps/${SHOP_APP_ID}/functions`;

async function callShopFn(name, payload) {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const roStatusColors = {
  waiting: "bg-zinc-500/20 text-zinc-300",
  in_progress: "bg-amber-500/20 text-amber-400",
  waiting_for_parts: "bg-orange-500/20 text-orange-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  delivered: "bg-teal-500/20 text-teal-400",
};

const roStatusLabels = {
  waiting: "Waiting",
  in_progress: "In Progress",
  waiting_for_parts: "Waiting for Parts",
  completed: "Completed",
  delivered: "Delivered",
};

function StatCard({ icon: Icon, label, value, tone = "text-white" }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-teal-400" />
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-bold truncate ${tone}`}>{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function TrackVehiclePanel() {
  const [step, setStep] = useState("phone"); // phone | choose | dashboard | notfound
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [data, setData] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  useEffect(() => {
    if (threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  const loadCustomerData = async (cust) => {
    setCustomer(cust);
    const res = await callShopFn("customerData", { customer_id: cust.id, shop_email: SHOP_EMAIL });
    setData(res);
    setStep("dashboard");
  };

  const findVehicle = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 7) { setError("Enter your full phone number."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await callShopFn("customerLogin", { shop_email: SHOP_EMAIL, phone: cleaned });
      if (result?.success && result?.customer) {
        await loadCustomerData(result.customer);
      } else if (result?.multiple && result?.profiles?.length > 0) {
        setProfiles(result.profiles);
        setStep("choose");
      } else {
        setStep("notfound");
      }
    } catch (e) {
      setError("Error: " + (e?.message || String(e)));
    }
    setLoading(false);
  };

  const selectProfile = async (profileId) => {
    setLoading(true);
    setError("");
    try {
      const cleaned = phone.replace(/\D/g, "");
      const result = await callShopFn("customerLogin", { shop_email: SHOP_EMAIL, phone: cleaned, customer_id: profileId });
      if (result?.success && result?.customer) {
        await loadCustomerData(result.customer);
      } else {
        setError("Couldn't load that profile. Try again.");
        setStep("phone");
      }
    } catch (e) {
      setError("Error: " + (e?.message || String(e)));
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !customer) return;
    setSending(true);
    try {
      await callShopFn("customerSendMessage", {
        shop_owner_email: SHOP_EMAIL,
        customer_id: customer.id,
        customer_phone: customer.phone,
        customer_name: customer.full_name,
        sender: "customer",
        message: newMessage.trim(),
        sent_at: new Date().toISOString(),
      });
      setData(d => ({ ...d, messages: [...(d.messages || []), { sender: "customer", message: newMessage.trim(), sent_at: new Date().toISOString() }] }));
      setNewMessage("");
    } catch (e) {
      // no-op, keep it simple
    }
    setSending(false);
  };

  const reset = () => {
    setStep("phone"); setPhone(""); setError(""); setProfiles([]); setCustomer(null); setData(null);
  };

  const latestOrder = data?.orders?.[0];

  return (
    <div className="glass rounded-2xl border border-teal-500/20 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Track My Vehicle</h2>
      </div>
      <p className="text-zinc-400 text-sm mb-6">Check your repair status, invoices & messages — no app download needed.</p>

      <AnimatePresence mode="wait">
        {step === "phone" && (
          <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Label className="text-zinc-300">Your Phone Number</Label>
            <Input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && findVehicle()}
              placeholder="6135551234"
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12"
              autoFocus
            />
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <Button onClick={findVehicle} disabled={loading} className="w-full btn-primary rounded-xl h-12 font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Checking…" : "Find My Car"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
            <p className="text-zinc-500 text-xs">Use the same number you gave the shop.</p>
          </motion.div>
        )}

        {step === "choose" && (
          <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <button onClick={reset} className="flex items-center gap-1 text-sm text-teal-400 mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
            <div className="flex items-center gap-2 text-zinc-300 text-sm mb-2">
              <Users className="w-4 h-4 text-teal-400" /> This number is saved under a few names — which one is you?
            </div>
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => selectProfile(p.id)}
                disabled={loading}
                className="w-full text-left bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-teal-500/40 transition-colors flex items-center justify-between disabled:opacity-50"
              >
                <span className="font-semibold text-white">{p.full_name || "Unnamed"}</span>
                <span className="text-xs text-zinc-500">{p.email || ""}</span>
              </button>
            ))}
            {error && <p className="text-rose-400 text-sm">{error}</p>}
          </motion.div>
        )}

        {step === "notfound" && (
          <motion.div key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
            <p className="text-zinc-300 mb-1">We couldn't find that number on file.</p>
            <p className="text-zinc-500 text-sm mb-4">Double-check it, or reach the shop directly using the contact card →</p>
            <Button onClick={reset} variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl">Try Again</Button>
          </motion.div>
        )}

        {step === "dashboard" && customer && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">{customer.full_name}</span>
              </div>
              <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300">Switch profile</button>
            </div>

            {latestOrder ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Latest Repair Order</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roStatusColors[latestOrder.status] || "bg-zinc-500/20 text-zinc-300"}`}>
                    {roStatusLabels[latestOrder.status] || latestOrder.status}
                  </span>
                </div>
                <p className="text-white font-medium">{latestOrder.vehicle_info || "Vehicle"}</p>
                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{latestOrder.description || "—"}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-zinc-400 text-sm">No active repair orders right now.</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Car} label="Vehicles on file" value={data?.vehicles?.length || 0} />
              <StatCard icon={DollarSign} label="Open balance" value={
                "$" + (data?.invoices || []).reduce((s, i) => s + (i.balance_due || 0), 0).toFixed(2)
              } />
            </div>

            {data?.offers?.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">Active Offer</span>
                </div>
                <p className="text-white text-sm">{data.offers[0].title}</p>
              </div>
            )}

            {/* Message thread */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-white">Messages with the shop</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1">
                {(data?.messages || []).length === 0 && <p className="text-zinc-500 text-xs">No messages yet — say hi!</p>}
                {(data?.messages || []).map((m, i) => (
                  <div key={i} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "customer" ? "bg-teal-600 text-white" : "bg-white/10 text-zinc-200"}`}>
                      {m.message}
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="btn-primary rounded-xl px-4">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickContactCard() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceBooking.create(data),
    onSuccess: () => setDone(true),
  });

  const submit = () => {
    if (!form.name || !form.email) return;
    mutation.mutate({ service_category: 'lbc-auto', ...form });
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Contact The Shop</h2>
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
  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold tracking-wider mb-4">
            LIVE
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{SHOP_NAME}</h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Full auto shop management — repair orders, estimates, invoices & AI diagnostics. Track your vehicle's status right here, no download needed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <TrackVehiclePanel />
          <QuickContactCard />
        </div>
      </div>
    </div>
  );
}
