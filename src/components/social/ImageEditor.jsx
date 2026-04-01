import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Save, Type, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COLORS = ['#ffffff', '#000000', '#ff4444', '#ffcc00', '#44ff88', '#44aaff', '#cc44ff', '#ff8844'];

export default function ImageEditor({ imageUrl, user, onClose, onUseInPost }) {
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(32);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(80);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!imgLoaded) return;
    drawCanvas();
  }, [text, textColor, fontSize, textX, textY, imgLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (text) {
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.strokeStyle = textColor === '#ffffff' ? '#000000' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';

      const x = (textX / 100) * canvas.width;
      const y = (textY / 100) * canvas.height;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  };

  const getBlob = () => new Promise((resolve) => {
    drawCanvas();
    canvasRef.current.toBlob(resolve, 'image/png');
  });

  const handleDownload = async () => {
    const blob = await getBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePost = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const blob = await getBlob();
      const file = new File([blob], `lumina-${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Post.create({
        content: text ? `🎨 AI-generated image by Lumina AI\n\n"${text}"` : '🎨 AI-generated image by Lumina AI',
        media_urls: [file_url],
        media_type: 'image',
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_avatar: user.avatar_url,
        topics: ['ai-art', 'lumina'],
      });

      alert('✅ Posted to your gallery!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2"><Type className="w-4 h-4 text-indigo-400" /> Edit Image</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Canvas Preview */}
        <div className="p-4 relative bg-zinc-800 flex items-center justify-center">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="AI Generated"
            className="hidden"
            crossOrigin="anonymous"
            onLoad={() => setImgLoaded(true)}
          />
          <canvas
            ref={canvasRef}
            className="rounded-xl max-w-full max-h-72 object-contain"
            style={{ display: imgLoaded ? 'block' : 'none' }}
          />
          {!imgLoaded && <div className="w-full h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Text Input */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Add text to image</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something..."
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 outline-none text-sm focus:border-indigo-500"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Text color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${textColor === c ? 'border-indigo-400 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Font size: {fontSize}px</label>
            <input type="range" min="16" max="80" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-indigo-500" />
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Horizontal: {textX}%</label>
              <input type="range" min="5" max="95" value={textX} onChange={(e) => setTextX(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vertical: {textY}%</label>
              <input type="range" min="5" max="95" value={textY} onChange={(e) => setTextY(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Save to Device
            </button>
            {onUseInPost && (
              <button
                onClick={async () => {
                  const blob = await getBlob();
                  onUseInPost(blob);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Type className="w-4 h-4" /> Use in Post
              </button>
            )}
            {user && !onUseInPost && (
              <button
                onClick={handlePost}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Posting...' : 'Post to Gallery'}
              </button>
            )}
            {user && onUseInPost && (
              <button
                onClick={handlePost}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Posting...' : 'Post to Gallery'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}