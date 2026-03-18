import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Twitter, Linkedin, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PLATFORM_ICONS = {
  twitter: Twitter,
  linkedin: Linkedin,
};

const PLATFORM_COLORS = {
  twitter: 'from-blue-400 to-blue-600',
  linkedin: 'from-blue-600 to-blue-800',
};

const PLATFORM_NAMES = {
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
};

export default function CrossPostSelector({ user, selectedPlatforms, onToggle, onManageAccounts }) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['socialAccounts', user?.email],
    queryFn: () => base44.entities.SocialAccount.filter({ user_email: user.email }),
    enabled: !!user,
  });

  if (accounts.length === 0) {
    return (
      <div className="border border-dashed border-zinc-600 rounded-lg p-3 flex items-center justify-between bg-zinc-800/30">
        <p className="text-xs text-zinc-400">No connected social accounts</p>
        <Link
          to={createPageUrl('Settings')}
          className="px-2 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          Connect
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-400">Cross-post to:</label>
        <Link
          to={createPageUrl('Settings')}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Manage accounts"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
        </Link>
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
              title={`Share to ${PLATFORM_NAMES[account.platform]}`}
            >
              {Icon && (
                <div className={`bg-gradient-to-br ${PLATFORM_COLORS[account.platform]} p-1 rounded text-white`}>
                  <Icon className="w-3 h-3" />
                </div>
              )}
              <span className="text-xs font-medium hidden sm:inline">{PLATFORM_NAMES[account.platform]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}