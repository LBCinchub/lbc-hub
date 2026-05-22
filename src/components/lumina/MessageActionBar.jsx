import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';

function extractLinks(text) {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g;
  return [...new Set((text || '').match(urlRegex) || [])];
}

export default function MessageActionBar({ content }) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(null);
  const links = extractLinks(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-300"
          title="Copy message"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setRating(r => r === 'up' ? null : 'up')}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${rating === 'up' ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          title="Good response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setRating(r => r === 'down' ? null : 'down')}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${rating === 'down' ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          title="Bad response"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        {copied && <span className="text-xs text-green-400 ml-1">Copied!</span>}
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Sources:</span>
          {links.map((link, i) => {
            let label;
            try { label = new URL(link).hostname; } catch { label = link.substring(0, 30) + '...'; }
            return (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 border border-white/10 transition-colors truncate max-w-[160px]"
              >
                🔗 {label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}