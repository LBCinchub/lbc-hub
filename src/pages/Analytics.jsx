import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Heart, BarChart2 } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [totals, setTotals] = useState({ likes: 0, followers: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [posts, follows] = await Promise.all([
      base44.entities.Post.filter({ author_email: user.email }, '-created_date', 200).catch(() => []),
      base44.entities.Follow.filter({ following_email: user.email }, '-created_date', 200).catch(() => [])
    ]);

    // Build day-by-day map for last 30 days
    const days = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'MMM d');
      days[d] = { date: d, likes: 0, followers: 0 };
    }

    // Accumulate likes per day from posts created on that day
    posts.forEach(post => {
      if (!post.created_date) return;
      const d = format(parseISO(post.created_date), 'MMM d');
      if (days[d]) days[d].likes += (post.likes || 0);
    });

    // Count new followers per day
    follows.forEach(follow => {
      if (!follow.created_date) return;
      const d = format(parseISO(follow.created_date), 'MMM d');
      if (days[d]) days[d].followers += 1;
    });

    // Make followers cumulative
    let cumulative = 0;
    const data = Object.values(days).map(day => {
      cumulative += day.followers;
      return { ...day, followersTotal: cumulative };
    });

    setChartData(data);
    setTotals({
      likes: posts.reduce((sum, p) => sum + (p.likes || 0), 0),
      followers: follows.length,
      posts: posts.length
    });
    setLoading(false);
  };

  const statCards = [
    { label: 'Total Likes', value: totals.likes, icon: Heart, color: 'from-pink-500 to-rose-600' },
    { label: 'Total Followers', value: totals.followers, icon: Users, color: 'from-indigo-500 to-purple-600' },
    { label: 'Total Posts', value: totals.posts, icon: BarChart2, color: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-zinc-400 text-sm">Your engagement over the last 30 days</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">{s.label}</p>
                <p className="text-2xl font-bold text-white">{loading ? '—' : s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Likes Chart */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-6">Likes per Day</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff' }} />
                <Area type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} fill="url(#likesGrad)" name="Likes" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Follower Growth Chart */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-6">Follower Growth</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="followGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff' }} />
                <Area type="monotone" dataKey="followersTotal" stroke="#6366f1" strokeWidth={2} fill="url(#followGrad)" name="Total Followers" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}