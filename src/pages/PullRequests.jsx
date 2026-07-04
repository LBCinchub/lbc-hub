import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { GitPullRequest, ExternalLink, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PullRequests() {
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('listOpenPullRequests', {});
      setPullRequests(res.data?.pull_requests || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load pull requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-indigo-400" />
            Open Pull Requests
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Review open PRs across your GitHub repositories</p>
        </div>
        <button
          onClick={fetchPRs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-indigo-400" />
            <span className="text-2xl font-bold">{pullRequests.length}</span>
          </div>
          <span className="text-sm text-zinc-500">open pull request{pullRequests.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass rounded-xl p-6 flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-zinc-300 font-medium">Something went wrong</p>
          <p className="text-xs text-zinc-500 mt-1">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && pullRequests.length === 0 && (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <GitPullRequest className="w-12 h-12 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-300 font-medium">No open pull requests</p>
          <p className="text-xs text-zinc-500 mt-1">You're all caught up! 🎉</p>
        </div>
      )}

      {/* PR List */}
      {!loading && !error && pullRequests.length > 0 && (
        <div className="space-y-3">
          {pullRequests.map((pr) => (
            <a
              key={pr.id}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl p-4 hover:bg-white/5 transition-colors group block"
            >
              <div className="flex items-start gap-3">
                <GitPullRequest className={`w-5 h-5 mt-0.5 flex-shrink-0 ${pr.draft ? 'text-zinc-500' : 'text-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {pr.title}
                      {pr.draft && (
                        <span className="ml-2 text-xs text-zinc-500 font-normal">Draft</span>
                      )}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-indigo-400 font-medium">{pr.repo}</span>
                    <span className="text-xs text-zinc-600">#{pr.number}</span>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={pr.author_avatar} />
                        <AvatarFallback className="text-[8px] bg-zinc-700">{pr.author?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-zinc-500">{pr.author}</span>
                    </div>
                    {pr.comments > 0 && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <MessageSquare className="w-3 h-3" />
                        {pr.comments}
                      </span>
                    )}
                  </div>
                  {pr.labels.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {pr.labels.slice(0, 5).map((label) => (
                        <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}