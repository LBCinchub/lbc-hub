import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, LogOut, Twitter, Linkedin, Facebook, Instagram, Video, MessageCircle, Github, Loader2, Check, Trash2, AlertCircle, ExternalLink, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ManualAccountConnect from '@/components/social/ManualAccountConnect';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PLATFORMS = [
  { 
    id: 'twitter', 
    name: 'Twitter/X', 
    icon: Twitter, 
    color: 'from-blue-400 to-blue-600',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    description: 'Post tweets directly from LBC Hub',
    enabled: false
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: Linkedin, 
    color: 'from-blue-600 to-blue-800',
    scopes: ['w_member_social', 'r_liteprofile'],
    description: 'Share posts and articles on LinkedIn',
    enabled: false
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    icon: Facebook, 
    color: 'from-blue-500 to-blue-700',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    description: 'Share updates on your Facebook page',
    enabled: false
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: Instagram, 
    color: 'from-pink-500 to-purple-600',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    description: 'Post content to your Instagram feed',
    enabled: false
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: Video, 
    color: 'from-black to-gray-800',
    scopes: ['user.info.basic', 'video.create'],
    description: 'Share videos on TikTok',
    enabled: false
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: Video, 
    color: 'from-red-600 to-red-800',
    scopes: ['youtube.upload', 'youtube.readonly'],
    description: 'Upload videos to YouTube',
    enabled: false
  },
  { 
    id: 'discord', 
    name: 'Discord', 
    icon: MessageCircle, 
    color: 'from-indigo-600 to-indigo-800',
    scopes: ['identify', 'guilds'],
    description: 'Post announcements in your Discord server',
    enabled: false
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    icon: Github, 
    color: 'from-gray-700 to-gray-900',
    scopes: ['repo', 'gist'],
    description: 'Share updates on GitHub',
    enabled: false
  },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [showManualConnect, setShowManualConnect] = useState(null);
  const queryClient = useQueryClient();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(user);

  React.useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch((error) => {
        console.error('Failed to load user:', error.message);
      });
  }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ['socialAccounts', user?.email],
    queryFn: () => base44.entities.SocialAccount.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId) => base44.entities.SocialAccount.delete(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts', user?.email] });
    },
  });

  const handleManualConnect = async (platformId, credentials) => {
    try {
      const result = await base44.functions.invoke('connectSocialManual', {
        platform: platformId,
        username: credentials.username,
        password: credentials.password,
        accessToken: credentials.accessToken
      });

      if (result.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['socialAccounts', user?.email] });
        setShowManualConnect(null);
        alert(`Successfully connected ${PLATFORMS.find(p => p.id === platformId)?.name}!`);
      } else {
        alert(result.data?.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Manual connection failed:', error);
      alert(`Failed to connect: ${error.message}`);
    }
  };

  const getConnectedAccount = (platformId) => {
    return accounts.find(a => a.platform === platformId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-zinc-400">Manage your account and connected social media</p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 sm:p-8 mb-6"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-white" />
            </div>
            Profile
          </h2>

          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">
                {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-lg font-semibold">{user.full_name || user.email}</p>
              <p className="text-sm text-zinc-400">{user.email}</p>
            </div>
          </div>

          <Button
            onClick={() => base44.auth.logout()}
            variant="outline"
            className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-6 sm:p-8 mb-6"
        >
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Push Notifications
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Get notified instantly for likes, comments, and messages — even when LBC Hub isn't open
          </p>

          {!pushSupported ? (
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-lg text-sm text-zinc-400">
              <BellOff className="w-5 h-5 flex-shrink-0" />
              Push notifications aren't supported in this browser.
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pushSubscribed ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                  {pushSubscribed ? <Bell className="w-5 h-5 text-emerald-400" /> : <BellOff className="w-5 h-5 text-zinc-400" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{pushSubscribed ? 'Notifications enabled' : 'Notifications disabled'}</p>
                  <p className="text-xs text-zinc-500">{pushSubscribed ? 'You\'ll get real-time alerts on this device' : 'Turn on to get real-time alerts on this device'}</p>
                </div>
              </div>
              <Button
                onClick={() => pushSubscribed ? pushUnsubscribe() : pushSubscribe()}
                disabled={pushLoading}
                className={pushSubscribed ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
              >
                {pushLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : pushSubscribed ? 'Turn Off' : 'Turn On'}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Connected Accounts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-indigo-400" />
            Connected Accounts
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Connect your social media accounts to auto-post content from LBC Hub
          </p>

          <div className="space-y-4">
            {PLATFORMS.map(platform => {
              const Icon = platform.icon;
              const connected = getConnectedAccount(platform.id);
              const isConnecting = connecting === platform.id;

              return (
                <motion.div
                  key={platform.id}
                  layout
                  className="border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`bg-gradient-to-br ${platform.color} p-3 rounded-lg text-white flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{platform.name}</p>
                      <p className="text-xs text-zinc-400 mb-1">{platform.description}</p>
                      {connected ? (
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Connected as @{connected.account_name || connected.platform_user_id}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500">Not connected</p>
                      )}
                    </div>
                  </div>

                  {connected ? (
                    <button
                      onClick={() => deleteAccountMutation.mutate(connected.id)}
                      disabled={deleteAccountMutation.isPending}
                      className="ml-4 p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex-shrink-0"
                      title="Disconnect account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : !platform.enabled ? (
                    <span className="ml-4 px-4 py-2 text-sm text-zinc-500">Coming Soon</span>
                  ) : (
                    <button
                      onClick={() => setShowManualConnect(platform)}
                      className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex-shrink-0"
                    >
                      Connect
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* OAuth Info */}
          <div className="mt-6 p-4 bg-blue-950/30 border border-blue-500/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">OAuth Authorization</p>
              <p>When you click "Connect", you'll be securely redirected to the platform to authorize LBC Hub. Your tokens are encrypted and never shared.</p>
            </div>
          </div>
        </motion.div>

        {/* Cross-Posting Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 glass rounded-2xl p-6 sm:p-8"
        >
          <h3 className="font-semibold mb-3">How Cross-Posting Works</h3>
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
            <li>Connect your Twitter/X and LinkedIn accounts above</li>
            <li>When creating a post on LBC Hub, you'll see toggles for each platform</li>
            <li>Select which platforms to share to before posting</li>
            <li>Your content will automatically post to selected platforms</li>
          </ol>
        </motion.div>

        {/* Manual Connection Modal */}
        {showManualConnect && (
          <ManualAccountConnect
            platform={showManualConnect}
            onConnect={(credentials) => handleManualConnect(showManualConnect.id, credentials)}
            onClose={() => setShowManualConnect(null)}
          />
        )}
      </div>
    </div>
  );
}