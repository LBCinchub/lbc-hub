import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Users } from 'lucide-react';

export default function MemberSearch({ onSelectMember, onViewProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchMembers = async () => {
      setLoading(true);
      try {
        // Fetch all users
        const allUsers = await base44.entities.User.list();
        
        const query = searchQuery.toLowerCase();
        const filtered = allUsers.filter(user =>
          user.full_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        ).slice(0, 8);
        
        setResults(filtered);
        setShowResults(true);
      } catch (error) {
        console.error('Failed to search members:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchMembers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectMember = (member) => {
    onViewProfile?.({
      email: member.email,
      full_name: member.full_name || member.email,
      avatar_url: member.avatar_url,
    });
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="glass rounded-2xl p-4 relative">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-indigo-400" />
        <h3 className="font-semibold text-sm">Find Members</h3>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400">
                No members found
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {results.map(member => (
                  <button
                    key={member.email}
                    onClick={() => handleSelectMember(member)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {member.full_name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {member.full_name || member.email}
                      </p>
                      {member.full_name && (
                        <p className="text-[10px] text-zinc-500 truncate">{member.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}