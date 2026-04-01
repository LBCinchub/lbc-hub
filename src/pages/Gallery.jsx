import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Share2, Filter, ImageIcon, Loader2, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Gallery() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [reposting, setReposting] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadPosts(u.email);
    }).catch(() => setLoading(false));
  }, []);

  const loadPosts = async (email) => {
    setLoading(true);
    const all = await base44.entities.Post.filter({ author_email: email, media_type: 'image' }, '-created_date');
    setPosts(all);
    setLoading(false);
  };

  const allTopics = ['all', ...new Set(posts.flatMap(p => p.topics || []))];

  const filtered = selectedTopic === 'all'
    ? posts
    : posts.filter(p => (p.topics || []).includes(selectedTopic));

  const handleDelete = async (post) => {
    if (!confirm('Delete this post?')) return;
    setDeleting(post.id);
    await base44.entities.Post.delete(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setDeleting(null);
    if (lightbox?.id === post.id) setLightbox(null);
  };

  const handleReShare = async (post) => {
    setReposting(post.id);
    await base44.entities.Post.create({
      content: post.content,
      media_urls: post.media_urls,
      media_type: 'image',
      author_name: post.author_name,
      author_email: post.author_email,
      author_avatar: post.author_avatar,
      topics: post.topics,
    });
    setReposting(null);
    alert('✅ Re-shared to your feed!');
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        <p>Please sign in to view your gallery.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-indigo-400" />
          My Gallery
        </h1>
        <p className="text-zinc-400 mt-1">Your history of AI-generated art</p>
      </div>

      {/* Topic Filter */}
      {allTopics.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <Filter className="w-4 h-4 text-zinc-500" />
          {allTopics.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedTopic === topic
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {topic === 'all' ? 'All' : `#${topic}`}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
          <ImageIcon className="w-12 h-12 opacity-30" />
          <p>No images found. Generate some art with Lumina AI!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(post => (
            <div key={post.id} className="group relative rounded-xl overflow-hidden bg-zinc-900 aspect-square cursor-pointer"
              onClick={() => setLightbox(post)}>
              <img
                src={post.media_urls?.[0]}
                alt="AI Art"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex flex-wrap gap-1">
                  {(post.topics || []).map(t => (
                    <span key={t} className="text-xs bg-indigo-600/70 text-white px-1.5 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
                <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleReShare(post)}
                    disabled={reposting === post.id}
                    className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    title="Re-share"
                  >
                    {reposting === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    disabled={deleting === post.id}
                    className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <img src={lightbox.media_urls?.[0]} alt="AI Art" className="w-full max-h-[60vh] object-contain" />
            <div className="p-4 space-y-3">
              {lightbox.content && <p className="text-zinc-300 text-sm">{lightbox.content}</p>}
              <div className="flex flex-wrap gap-1">
                {(lightbox.topics || []).map(t => (
                  <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                ))}
              </div>
              <p className="text-xs text-zinc-500">{new Date(lightbox.created_date).toLocaleDateString()}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleReShare(lightbox)}
                  disabled={reposting === lightbox.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {reposting === lightbox.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  Re-share
                </button>
                <button
                  onClick={() => handleDelete(lightbox)}
                  disabled={deleting === lightbox.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleting === lightbox.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}