import React from 'react';

export default function RichText({ text, onHashtagClick, onLinkClick }) {
  if (!text) return null;

  // Parse text for hashtags, mentions, and URLs
  const parseText = (content) => {
    const parts = [];
    let lastIndex = 0;

    // Regex patterns
    const hashtagRegex = /#(\w+)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /@(\w+)/g;

    // Combine all patterns
    const combinedRegex = /(#\w+|https?:\/\/[^\s]+|@\w+)/g;

    let match;
    while ((match = combinedRegex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      const matchedText = match[0];
      
      if (matchedText.startsWith('#')) {
        parts.push({
          type: 'hashtag',
          content: matchedText,
          tag: matchedText.slice(1),
        });
      } else if (matchedText.startsWith('http')) {
        parts.push({
          type: 'link',
          content: matchedText,
          url: matchedText,
        });
      } else if (matchedText.startsWith('@')) {
        parts.push({
          type: 'mention',
          content: matchedText,
          username: matchedText.slice(1),
        });
      }

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return parts;
  };

  const parts = parseText(text);

  return (
    <span className="leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'hashtag') {
          return (
            <button
              key={index}
              onClick={() => onHashtagClick?.(part.tag)}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer hover:underline"
            >
              {part.content}
            </button>
          );
        }
        
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick?.(part.url);
              }}
              className="text-blue-400 hover:text-blue-300 underline transition-colors cursor-pointer"
            >
              {part.content}
            </a>
          );
        }
        
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className="text-purple-400 font-medium"
            >
              {part.content}
            </span>
          );
        }
        
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}