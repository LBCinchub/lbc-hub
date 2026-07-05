import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to LBC Hub
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Who We Are</h2>
            <p>
              LBC Hub ("we", "us", "our") is a community, marketplace, travel, and rides platform operated
              by LBC Network Inc. This policy explains what information we collect across LBC Hub's
              features — social feed, marketplace, services, rides, travel planning, and the Lumina AI
              assistant — and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details you provide: name, email address, profile information.</li>
              <li>Content you create: posts, messages, listings, service bookings, trip plans, reviews.</li>
              <li>Transaction data: marketplace purchases/sales, service bookings, and (where applicable) wallet addresses used for Solana-based payments.</li>
              <li>Usage data: pages visited, features used, and interactions with the Lumina AI assistant, used to improve the product.</li>
              <li>Device and log data collected automatically for security and performance monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. How We Use Information</h2>
            <p>
              We use your information to operate and improve LBC Hub, process marketplace and service
              transactions, facilitate rides and travel bookings, personalize your feed and Lumina AI
              interactions, communicate important updates, and keep the platform safe (fraud and abuse
              prevention, dispute resolution).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Sharing of Information</h2>
            <p>
              We do not sell your personal information. We share information only: with other users as a
              natural result of platform features (e.g. your name being visible to a seller when you book a
              service), with service providers who help us run the platform (hosting, payments, email), and
              when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Blockchain & Payments</h2>
            <p>
              Where LBC Hub supports Solana-based payments or the $LBC token, transaction records on the
              blockchain are public and permanent by design — this is separate from, and not controlled by,
              LBC Hub's own data retention practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Your Choices</h2>
            <p>
              You can access, update, or request deletion of your account information at any time by
              contacting us at{' '}
              <a href="mailto:lbchubteam@gmail.com" className="text-teal-400 hover:underline">lbchubteam@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Contact</h2>
            <p>
              Questions about this policy? Email{' '}
              <a href="mailto:lbchubteam@gmail.com" className="text-teal-400 hover:underline">lbchubteam@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
