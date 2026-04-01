import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Download, Share2 } from 'lucide-react';

export default function VideoGenerator() {
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
        media_type: 'image',
        topics: ['video', 'ai-generated']
      });
      alert('Saved to gallery!');
    } catch (err) {
      setError('Failed to save video');
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
      <div>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" /> AI Video Generator
        </h3>
        <p className="text-slate-400 text-sm">Describe your video idea. Claude Sonnet will create a script + AI thumbnail.</p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="e.g., 'A cinematic journey through Tokyo neon streets at night'..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
          disabled={loading}
        />
        
        <Button
          onClick={handleGenerate}
          disabled={loading}
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
            <img 
              src={video.thumbnail} 
              alt="Video thumbnail"
              className="w-full h-48 object-cover rounded-lg mb-3"
            />
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-300 text-sm leading-relaxed">{video.script}</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveToGallery}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" /> Save to Gallery
            </Button>
            <Button
              onClick={() => setVideo(null)}
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