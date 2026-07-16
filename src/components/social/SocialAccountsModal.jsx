import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Twitter, Facebook, Linkedin, Music, Instagram, Loader2, Check, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'from-blue-400 to-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-700' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-800' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'from-black to-gray-800' },
];

export default function SocialAccountsModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['socialAccounts', user?.email],
    queryFn: () => base44.entities.SocialAccount.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId) => base44.entities.SocialAccount.delete(accountId),
    onError: () => { alert('Failed to remove account.'); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts', user?.email] });
    },
  });

  const handleConnect = async (platformId) => {
    setConnecting(platformId);
    // In production, this would trigger the OAuth flow via a backend function
    // For now, show instructions
    alert(`To connect ${platformId}:\n1. Click OK\n2. You'll be redirected to ${platformId.toUpperCase()} to authorize\n3. Return to complete the connection\n\nNote: OAuth setup requires backend function configuration.`);
    setConnecting(null);
  };

  const getConnectedAccount = (platformId) => {
    return accounts.find(a => a.platform === platformId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">Connected Accounts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-3">
          {PLATFORMS.map(platform => {
            const Icon = platform.icon;
            const connected = getConnectedAccount(platform.id);
            const isConnecting = connecting === platform.id;

            return (
              <div
                key={platform.id}
                className="border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${platform.color} p-2.5 rounded-lg text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{platform.name}</p>
                    {connected ? (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {connected.account_name || 'Connected'}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400">Not connected</p>
                    )}
                  </div>
                </div>

                {connected ? (
                  <button
                    onClick={() => deleteAccountMutation.mutate(connected.id)}
                    disabled={deleteAccountMutation.isPending}
                    className="p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={isConnecting}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="border-t border-white/10 p-4 sm:p-6 bg-white/5">
          <p className="text-xs text-zinc-400">
            Connected accounts will be available for cross-posting when you create new posts. You can disconnect at any time.
          </p>
        </div>
      </motion.div>
    </div>
  );
}