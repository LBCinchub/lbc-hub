import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Menu, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatSidebar({ currentSessionId, onNewChat, onSelectSession, user, isMobileOpen, onMobileClose }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['chatSessions', user?.email],
    queryFn: () => base44.entities.ChatSession.filter({ user_id: user.email }),
    enabled: !!user?.email,
    staleTime: 5000,
  });

  const groupSessions = (sessions) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      previous7: [],
      older: []
    };

    sessions.forEach(session => {
      const date = new Date(session.last_message_date || session.created_date);
      const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (sessionDate.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session);
      } else if (sessionDate > sevenDaysAgo) {
        groups.previous7.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const groups = groupSessions(sessions);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await base44.entities.ChatSession.delete(sessionId);
      // Also delete messages in this session
      const messages = await base44.entities.ChatMessage.filter({ session_id: sessionId });
      for (const msg of messages) {
        await base44.entities.ChatMessage.delete(msg.id);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;
    return (
      <div key={label} className="mb-4">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {label}
        </div>
        <div className="space-y-1">
          {items.map(session => (
            <div
              key={session.id}
              onClick={() => {
                onSelectSession(session.id);
                onMobileClose?.();
              }}
              className={`relative group px-3 py-2 rounded-lg cursor-pointer transition-all ${
                currentSessionId === session.id
                  ? 'bg-purple-600/30 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="truncate text-sm font-medium">{session.title || 'Untitled'}</div>
              <div className="text-xs text-zinc-500 truncate">
                {formatDistanceToNow(new Date(session.last_message_date || session.created_date), { addSuffix: false })}
              </div>
              {session.last_message_preview && (
                <div className="text-xs text-zinc-600 truncate mt-0.5">{session.last_message_preview}</div>
              )}
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-600/20 transition-opacity"
                title="Delete session"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-16 bottom-0 md:inset-y-0 left-0 z-[60] w-64 bg-zinc-950 border-r border-white/5 flex flex-col transform transition-transform duration-200 md:transform-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-white/5">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors text-sm justify-center"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => onMobileClose?.(false)}
            className="md:hidden p-2 rounded hover:bg-white/10 flex-shrink-0 relative z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          {groups.today.length > 0 && renderGroup('Today', groups.today)}
          {groups.yesterday.length > 0 && renderGroup('Yesterday', groups.yesterday)}
          {groups.previous7.length > 0 && renderGroup('Previous 7 Days', groups.previous7)}
          {groups.older.length > 0 && renderGroup('Older', groups.older)}

          {sessions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-sm text-zinc-500">No conversations yet.</div>
              <div className="text-xs text-zinc-600 mt-2">Start a new chat to begin!</div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile menu toggle */}
      {!isMobileOpen && (
        <button
          onClick={() => onMobileClose?.(true)}
          className="md:hidden fixed bottom-4 left-4 z-40 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
          title="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}