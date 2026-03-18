import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Twitter, Facebook, Linkedin, Music, Instagram, Settings } from 'lucide-react';

const PLATFORM_ICONS = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Music,
};

const PLATFORM_COLORS = {
  twitter: 'from-blue-400 to-blue-600',
  facebook: 'from-blue-500 to-blue-700',
  instagram: 'from-pink-500 to-purple-600',
  linkedin: 'from-blue-600 to-blue-800',
  tiktok: 'from-black to-gray-800',
};

export default function CrossPostSelector({ user, selectedPlatforms, onToggle, onManageAccounts }) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['socialAccounts', user?.email],
    queryFn: () => base44.entities.SocialAccount.filter({ user_email: user.email }),
    enabled: !!user,
  });

  if (accounts.length === 0) {
    return (
      <div className="border border-dashed border-zinc-600 rounded-lg p-3 flex items-center justify-between">
        <p className="text-xs text-zinc-400">No connected accounts</p>
        <button
          onClick={onManageAccounts}
          className="px-2 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          Connect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-400">Cross-post to:</label>
        <button
          onClick={onManageAccounts}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Manage accounts"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map(account => {
          const Icon = PLATFORM_ICONS[account.platform];
          const isSelected = selectedPlatforms?.includes(account.platform);
          return (
            <button
              key={account.id}
              onClick={() => onToggle(account.platform)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className={`bg-gradient-to-br ${PLATFORM_COLORS[account.platform]} p-1 rounded text-white`}>
                <Icon className="w-3 h-3" />
              </div>
              <span className="text-xs font-medium">{account.account_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}