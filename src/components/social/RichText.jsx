import React from 'react';

// Parse **bold** and *italic* into segments
function parseMarkdown(text) {
  const segments = [];
  const mdRegex = /(\*\*(.+?)\*\*|\*([^*]+?)\*)/g;
  let last = 0;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    if (match.index > last) segments.push({ type: 'plain', content: text.slice(last, match.index) });
    if (match[0].startsWith('**')) {
      segments.push({ type: 'bold', content: match[2] });
    } else {
      segments.push({ type: 'italic', content: match[3] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: 'plain', content: text.slice(last) });
  return segments.length > 0 ? segments : [{ type: 'plain', content: text }];
}

// Parse hashtags, mentions, and URLs within plain text
function parsePlain(content, onHashtagClick) {
  const parts = [];
  let lastIndex = 0;
  const combinedRegex = /(#\w+|https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:[^\s]*)?|@\w+)/g;
  let match;

  while ((match = combinedRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    const matchedText = match[0];
    const key = match.index;

    if (matchedText.startsWith('#')) {
      parts.push(
        <button key={key} onClick={() => onHashtagClick?.(matchedText.slice(1))}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer hover:underline">
          {matchedText}
        </button>
      );
    } else if (matchedText.startsWith('http') || /\.[a-zA-Z]{2,}/.test(matchedText)) {
      const url = matchedText.startsWith('http') ? matchedText : `https://${matchedText}`;
      parts.push(
        <a key={key} href={url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-400 hover:text-blue-300 underline transition-colors cursor-pointer">
          {matchedText}
        </a>
      );
    } else if (matchedText.startsWith('@')) {
      parts.push(<span key={key} className="text-purple-400 font-medium">{matchedText}</span>);
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex + 'end'}>{content.slice(lastIndex)}</span>);
  }

  return parts;
}

export default function RichText({ text, onHashtagClick }) {
  if (!text) return null;

  const mdSegments = parseMarkdown(text);

  return (
    <span className="leading-relaxed">
      {mdSegments.map((seg, i) => {
        if (seg.type === 'bold') {
          return <strong key={i} className="font-semibold text-white">{seg.content}</strong>;
        }
        if (seg.type === 'italic') {
          return <em key={i} className="italic">{seg.content}</em>;
        }
        // plain — parse for hashtags/links/mentions
        return <span key={i}>{parsePlain(seg.content, onHashtagClick)}</span>;
      })}
    </span>
  );
}