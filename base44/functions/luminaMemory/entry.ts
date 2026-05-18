import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Lumina Memory Manager
 * Handles reading and updating UserMemory records for the AI twin system.
 * 
 * Actions:
 *   get    — fetch (or create) the memory record for the current user
 *   update — merge new memory data into the user's record
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    if (action === 'get') {
      // Load or initialise memory record
      const records = await base44.entities.UserMemory.filter({ user_id: user.email });

      if (records.length === 0) {
        // First time — return empty shell so Lumina knows it's a fresh start
        return Response.json({
          memory: null,
          is_new_user: true,
          user_name: user.full_name || user.email,
        });
      }

      return Response.json({
        memory: records[0],
        is_new_user: false,
        user_name: records[0].user_name || user.full_name || user.email,
      });
    }

    if (action === 'update') {
      const records = await base44.entities.UserMemory.filter({ user_id: user.email });
      const now = new Date().toISOString();

      if (records.length === 0) {
        // Create brand-new record
        const created = await base44.entities.UserMemory.create({
          user_id: user.email,
          user_name: user.full_name || user.email,
          key_facts: data.key_facts || [],
          preferences: data.preferences || {},
          past_requests: data.past_requests || [],
          important_dates: data.important_dates || [],
          pinned_notes: data.pinned_notes || [],
          conversation_summary: data.conversation_summary || '',
          last_seen: now,
        });
        return Response.json({ success: true, memory: created });
      }

      const existing = records[0];

      // Merge arrays — deduplicate by exact and normalized match
      const mergeArray = (existing = [], incoming = []) => {
        const filteredNew = incoming.filter(newItem => {
          const normalized = newItem.toLowerCase().trim();
          return !existing.some(e => e.toLowerCase().trim() === normalized);
        });
        return [...existing, ...filteredNew].slice(-50);
      };

      // Merge important_dates by label
      const mergeDates = (existing = [], incoming = []) => {
        const map = {};
        [...existing, ...incoming].forEach(d => { if (d.label) map[d.label] = d; });
        return Object.values(map);
      };

      const updated = await base44.entities.UserMemory.update(existing.id, {
        user_name: user.full_name || existing.user_name,
        key_facts: mergeArray(existing.key_facts, data.key_facts),
        preferences: { ...(existing.preferences || {}), ...(data.preferences || {}) },
        past_requests: mergeArray(existing.past_requests, data.past_requests),
        important_dates: mergeDates(existing.important_dates, data.important_dates),
        pinned_notes: mergeArray(existing.pinned_notes, data.pinned_notes),
        conversation_summary: data.conversation_summary || existing.conversation_summary,
        last_seen: now,
      });

      return Response.json({ success: true, memory: updated });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('luminaMemory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});