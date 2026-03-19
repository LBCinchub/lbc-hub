import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SOLANA_ADDRESS = '2SYh5UjyGEVwCMTQrY5LJrGRfEAmU9MqXECRrAMsNK34';

export default function SolanaCheckout({ product, userEmail, onClose, onSuccess }) {
  const [copied, setCopied] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [solAmount, setSolAmount] = useState('Loading...');

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        const solPrice = data.solana.usd;
        const amount = (product.price / solPrice).toFixed(4);
        setSolAmount(amount);
      } catch (error) {
        setSolAmount('0.15'); // Fallback estimate
      }
    };
    fetchSolPrice();
  }, [product.price]);

  const copyAddress = () => {
    navigator.clipboard.writeText(SOLANA_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!transactionSignature.trim()) {
      alert('Please enter your transaction signature');
      return;
    }

    setVerifying(true);
    try {
      const result = await base44.functions.invoke('verifyMarketplaceSolanaPayment', {
        signature: transactionSignature,
        email: userEmail,
        productId: product.id,
        productName: product.name,
        productPrice: product.price
      });

      if (result.data.success) {
        alert('✅ Payment verified! Purchase recorded.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('❌ Payment verification failed: ' + result.data.error);
      }
    } catch (error) {
      alert('Error verifying payment: ' + error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-lg w-full p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Pay with Solana</h2>
          <p className="text-zinc-400 text-sm">Complete your purchase with SOL</p>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Product:</span>
              <span className="text-white font-semibold">{product.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Price (USD):</span>
              <span className="text-white font-semibold">${product.price}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-zinc-400 text-sm">Amount in SOL:</span>
              <span className="text-white font-semibold text-lg">~{solAmount} SOL</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Recipient Address:</label>
            <div className="flex gap-2">
              <Input
                value={SOLANA_ADDRESS}
                readOnly
                className="bg-zinc-800 border-white/10 text-white text-xs"
              />
              <Button
                onClick={copyAddress}
                variant="outline"
                size="icon"
                className="bg-zinc-800 border-white/10 hover:bg-zinc-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-yellow-400 text-sm font-semibold mb-2">⚠️ Payment Instructions:</p>
            <ol className="text-zinc-300 text-xs space-y-1 list-decimal list-inside">
              <li>Send exactly <strong>~{solAmount} SOL</strong> to the address above</li>
              <li>In the transaction memo/note, include: <strong>{userEmail}</strong></li>
              <li>After sending, paste your transaction signature below</li>
              <li>Click "Verify Payment" to complete your purchase</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Transaction Signature:</label>
            <Input
              value={transactionSignature}
              onChange={(e) => setTransactionSignature(e.target.value)}
              placeholder="Paste your transaction signature here..."
              className="bg-zinc-800 border-white/10 text-white"
            />
            <p className="text-xs text-zinc-500">
              You can find this in your wallet after sending the transaction
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-zinc-800 border-white/10 hover:bg-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
          >
            {verifying ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
            ) : (
              'Verify Payment'
            )}
          </Button>
        </div>

        <a
          href="https://phantom.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          Don't have a Solana wallet? Get Phantom <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}