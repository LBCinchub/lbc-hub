import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to LBC Hub
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using LBC Hub — including the social feed, marketplace, services,
              rides, travel planning, and the Lumina AI assistant — you agree to these Terms. If you do not
              agree, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Your Account</h2>
            <p>
              You're responsible for the accuracy of the information you provide and for activity that
              happens under your account. Let us know immediately at{' '}
              <a href="mailto:lbchubteam@gmail.com" className="text-teal-400 hover:underline">lbchubteam@gmail.com</a>{' '}
              if you believe your account has been compromised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Marketplace & Services</h2>
            <p>
              LBC Hub connects buyers and sellers, and customers with independent service providers
              (including LBC Auto shops). LBC Hub is a platform facilitator — individual listings, service
              quality, and fulfillment are the responsibility of the seller or service provider, not LBC Hub
              itself, except where LBC Hub explicitly acts as the merchant of record.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Rides & Travel</h2>
            <p>
              Ride requests and travel itineraries are provided to help you plan and coordinate — drivers,
              accommodations, and third-party providers are independent parties. Always verify details
              directly with the provider before travel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Payments & the $LBC Token</h2>
            <p>
              Where payments are processed via Solana or the $LBC token, you are responsible for the
              accuracy of wallet addresses and transactions you submit. Blockchain transactions are
              irreversible once confirmed on-chain — LBC Hub cannot reverse a completed on-chain transfer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Acceptable Use</h2>
            <p>
              Don't use LBC Hub to post illegal content, harass other users, misrepresent listings, or
              attempt to circumvent platform safety and moderation features (including Lumina AI
              moderation). We may suspend or remove accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Disclaimers</h2>
            <p>
              LBC Hub is provided "as is." We work hard to keep it running smoothly but don't guarantee
              uninterrupted availability, and we aren't liable for losses arising from third-party sellers,
              service providers, drivers, or blockchain network issues outside our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8. Changes to These Terms</h2>
            <p>
              We may update these Terms as LBC Hub evolves. Continued use of the platform after an update
              means you accept the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">9. Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a href="mailto:lbchubteam@gmail.com" className="text-teal-400 hover:underline">lbchubteam@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
