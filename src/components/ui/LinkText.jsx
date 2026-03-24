import React from 'react';

export default function LinkText({ text, className = '' }) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s\)\]\>,]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 underline hover:text-indigo-200 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}