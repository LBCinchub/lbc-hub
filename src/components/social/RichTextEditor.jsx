import React, { useState } from 'react';
import { Bold, Italic, Link as LinkIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function RichTextEditor({ value, onChange, placeholder }) {
  const [textareaRef, setTextareaRef] = useState(null);

  const applyFormat = (before, after) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'text';
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange({ target: { value: newText } });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('Enter URL (with or without https://):');
    if (url) {
      const textarea = document.querySelector('textarea');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || 'link';
      const newText = value.substring(0, start) + selectedText + ' (' + url + ')' + value.substring(end);
      onChange({ target: { value: newText } });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-2 bg-white/5 rounded-lg border border-white/10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormat('**', '**')}
          className="text-zinc-400 hover:text-white hover:bg-white/10 h-7 px-2"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormat('_', '_')}
          className="text-zinc-400 hover:text-white hover:bg-white/10 h-7 px-2"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="text-zinc-400 hover:text-white hover:bg-white/10 h-7 px-2"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-white/5 border-white/10 resize-none text-sm sm:text-base text-white placeholder:text-zinc-500 min-h-[70px] sm:min-h-[90px] rounded-lg border p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}