import React from 'react';
import { X } from 'lucide-react';

export const TOPICS = [
  'Technology', 'Sports', 'Music', 'Art', 'Travel',
  'Food', 'Business', 'Health', 'Gaming', 'News',
  'Fashion', 'Science', 'Finance', 'Entertainment', 'Other'
];

export default function TopicSelector({ selected, onChange, max = 3 }) {
  const toggle = (topic) => {
    if (selected.includes(topic)) {
      onChange(selected.filter(t => t !== topic));
    } else if (selected.length < max) {
      onChange([...selected, topic]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {TOPICS.map(topic => {
        const active = selected.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            onClick={() => toggle(topic)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              active
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {active && <X className="w-3 h-3 inline mr-1" />}
            #{topic}
          </button>
        );
      })}
      {selected.length >= max && (
        <span className="text-xs text-zinc-500 self-center">Max {max} topics</span>
      )}
    </div>
  );
}