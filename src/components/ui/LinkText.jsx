import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s\)\]\>,'"]+)/g;

export default function LinkText({ text, className = '' }) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-indigo-400 underline underline-offset-2 hover:text-indigo-300 cursor-pointer break-all font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}