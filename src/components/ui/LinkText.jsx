import React from 'react';

// Matches markdown links [label](url) OR plain URLs
const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const PLAIN_URL = /(https?:\/\/[^\s\)\]\>,"']+)/g;

function parseLinks(text) {
  const segments = [];
  let lastIndex = 0;

  // Combined regex: markdown first, then plain
  const combined = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s\)\]\>,"']+)/g;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      // Markdown link [label](url)
      segments.push({ type: 'link', label: match[1], href: match[2] });
    } else {
      // Plain URL
      segments.push({ type: 'link', label: match[3], href: match[3] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export default function LinkText({ text, className = '' }) {
  if (!text) return null;

  const segments = parseLinks(text);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#818cf8', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500, wordBreak: 'break-all' }}
          >
            {seg.label}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  );
}