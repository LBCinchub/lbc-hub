import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function VideoPlayer({ frames, autoPlay = true }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(true);
  const [progress, setProgress] = useState(0);
  const imagesRef = useRef({});
  const loadedRef = useRef(0);

  const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);

  // Preload all images
  useEffect(() => {
    let loaded = 0;
    frames.forEach((frame, idx) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        loadedRef.current = loaded;
      };
      img.src = frame.url;
      imagesRef.current[idx] = img;
    });
  }, [frames]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let startTime = Date.now() - currentTime * 1000;

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(elapsed);

      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      // Find current frame
      let accumulatedTime = 0;
      let currentFrameIdx = 0;
      for (let i = 0; i < frames.length; i++) {
        if (elapsed < accumulatedTime + frames[i].duration) {
          currentFrameIdx = i;
          break;
        }
        accumulatedTime += frames[i].duration;
      }

      const currentFrame = frames[currentFrameIdx];
      const nextFrame = frames[currentFrameIdx + 1];
      const timeInFrame = elapsed - accumulatedTime;
      const frameProgress = timeInFrame / currentFrame.duration;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw current frame
      const currentImg = imagesRef.current[currentFrameIdx];
      if (currentImg && currentImg.complete) {
        const scale = Math.min(canvas.width / currentImg.width, canvas.height / currentImg.height);
        const x = (canvas.width - currentImg.width * scale) / 2;
        const y = (canvas.height - currentImg.height * scale) / 2;

        ctx.globalAlpha = 1;
        ctx.drawImage(currentImg, x, y, currentImg.width * scale, currentImg.height * scale);
      }

      // Fade to next frame
      if (nextFrame && frameProgress > 0.7) {
        const nextImg = imagesRef.current[currentFrameIdx + 1];
        if (nextImg && nextImg.complete) {
          const scale = Math.min(canvas.width / nextImg.width, canvas.height / nextImg.height);
          const x = (canvas.width - nextImg.width * scale) / 2;
          const y = (canvas.height - nextImg.height * scale) / 2;

          const fadeProgress = (frameProgress - 0.7) / 0.3;
          ctx.globalAlpha = fadeProgress;
          ctx.drawImage(nextImg, x, y, nextImg.width * scale, nextImg.height * scale);
        }
      }

      ctx.globalAlpha = 1;
      setProgress((elapsed / totalDuration) * 100);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frames, currentTime, totalDuration]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * totalDuration;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-3">
      {/* Canvas Video */}
      <div className="bg-black rounded-lg overflow-hidden aspect-video w-full">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Controls */}
      <div className="bg-slate-800 rounded-lg px-4 py-3 space-y-2">
        {/* Progress Bar */}
        <div
          onClick={handleProgressClick}
          className="w-full h-1 bg-slate-700 rounded-full cursor-pointer hover:h-2 transition-all group"
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all group-hover:shadow-lg"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3">
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

          <span className="text-xs text-slate-400">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>

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

        {/* Loading indicator */}
        {loadedRef.current < frames.length && (
          <div className="text-xs text-slate-400 text-center">
            Loading: {loadedRef.current} / {frames.length} frames
          </div>
        )}
      </div>
    </div>
  );
}