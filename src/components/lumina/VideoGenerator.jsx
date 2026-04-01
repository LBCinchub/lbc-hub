import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Download, Share2, Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Enter a video idea');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    
    try {
      const response = await base44.functions.invoke('generateVideo', { prompt });
      setVideo(response.data);
      setIsPlaying(true);
      // Auto-play the video
      startAutoPlay(response.data);
    } catch (err) {
      setError(err.message || 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  const startAutoPlay = (videoData) => {
    let currentIndex = 0;
    const playInterval = setInterval(() => {
      if (currentIndex < videoData.frames.length - 1) {
        currentIndex++;
        setCurrentFrameIndex(currentIndex);
      } else {
        clearInterval(playInterval);
        setIsPlaying(false);
      }
    }, videoData.frames[currentIndex]?.duration * 1000 || 3000);
    
    return () => clearInterval(playInterval);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && video) {
      startAutoPlay(video);
    }
  };

  const handleFrameClick = (index) => {
    setCurrentFrameIndex(index);
    setIsPlaying(false);
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
      <div>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" /> AI Video Generator
        </h3>
        <p className="text-slate-400 text-sm">Describe your video. Claude Sonnet creates a script with AI-generated scenes.</p>
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
            
            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <div className="aspect-video w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-black relative">
                {video.frames && video.frames[currentFrameIndex] && (
                  <img 
                    src={video.frames[currentFrameIndex].url} 
                    alt="Video frame"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white fill-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    )}
                  </button>
                </div>

                {/* Frame Counter */}
                <div className="absolute bottom-2 right-2 bg-black/60 px-3 py-1 rounded-full text-white text-xs">
                  {currentFrameIndex + 1} / {video.frames.length}
                </div>
              </div>

              {/* Scene Frames Thumbnail Strip */}
              {video.frames && video.frames.length > 0 && (
                <div className="bg-slate-900 p-2 flex gap-2 overflow-x-auto">
                  {video.frames.map((frame, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFrameClick(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        currentFrameIndex === idx ? 'border-purple-500' : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <img src={frame.url} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Video Controls */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Play
                    </>
                  )}
                </button>
                
                <div className="flex-1"></div>
                
                <button
                  onClick={() => setVolume(!volume)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {volume ? (
                    <Volume2 className="w-4 h-4 text-white" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

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
                setCurrentFrameIndex(0);
                setIsPlaying(false);
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