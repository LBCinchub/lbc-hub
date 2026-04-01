import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Download, Share2, X } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function VideoGenerator({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Enter a video idea');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await base44.functions.invoke('generateVideo', { prompt });
      setVideo(response.data);
    } catch (err) {
      setError(err.message || 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!video) return;
    
    try {
      await base44.entities.Post.create({
        content: `🎬 AI Video: ${video.title}\n\n${video.script}`,
        author_name: 'You',
        author_email: 'user@app.local',
        media_urls: [video.thumbnail],
        media_type: 'video',
        topics: ['video', 'ai-generated']
      });
      alert('Video saved to gallery!');
    } catch (err) {
      setError('Failed to save video');
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> AI Video Generator
          </h3>
          <p className="text-slate-400 text-sm">Describe your video. Claude Sonnet creates a script with AI-generated scenes.</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-3 opacity-50">
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-300 text-sm font-medium whitespace-nowrap">
          Coming Soon
        </div>
        <Input
          placeholder="e.g., 'A cinematic journey through Tokyo neon streets at night'..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
          disabled={true}
        />
        
        <Button
          onClick={handleGenerate}
          disabled={true}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Generate Video
            </>
          )}
        </Button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {video && (
        <div className="space-y-4 mt-6 border-t border-slate-700 pt-6">
          <div>
            <h4 className="text-white font-semibold mb-3">{video.title}</h4>
            
            {/* Real Video Player */}
            {video.frames && video.frames.length > 0 && (
              <VideoPlayer frames={video.frames} autoPlay={true} />
            )}

            {/* Script and Details */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold block mb-1">Script</label>
                <p className="text-slate-300 text-sm leading-relaxed">{video.script}</p>
              </div>
              <div>
                <label className="text-slate-300 text-xs font-semibold block mb-1">Mood</label>
                <p className="text-slate-400 text-sm">{video.mood}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSaveToGallery}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" /> Save to Gallery
            </Button>
            <Button
              onClick={() => {
                setVideo(null);
                setPrompt('');
              }}
              variant="ghost"
              className="flex-1"
            >
              Generate Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}