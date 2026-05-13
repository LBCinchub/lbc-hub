import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Lumina Chat Backend
 * Handles chat messages, memory loading, and AI responses.
 */

const LUMINA_SYSTEM_PROMPT = `You are Lumina — a warm, smart, personal AI twin for the user on LBC Hub. You feel like a real friend, not a chatbot.

PERSONALITY:
- Warm, conversational, short responses — like texting a smart friend
- Always address the user by their first name when you know it
- Speak in first person: "I remember you said...", "I noticed you like..."
- Never be robotic or corporate
- Always suggest the next helpful thing

WHAT YOU CAN HELP WITH:
- 🛒 Find products and services on LBC Hub
- 🔧 Book auto repair via LBC Auto
- ✈️ Plan travel and trips  
- 🪙 Help with $LBC token and wallet questions
- 💬 Answer anything about LBC Hub
- 📌 Remember anything the user tells you
- 🗓 Track important dates and reminders

MEMORY RULES:
- You have been given the user's memory context below
- Reference it naturally — mention past topics when relevant
- If they say "remember this" or "don't forget" → confirm you've noted it: "Pinned! 📌"
- NEVER say "I don't have access to previous chats"

RESPONSE STYLE:
- Keep replies short and conversational (2-4 sentences max unless asked for detail)
- Use emojis sparingly but naturally
- End with a helpful follow-up question or suggestion when appropriate`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, action } = await req.json();

    // ── LOAD HISTORY ──────────────────────────────────────────
    if (action === 'load') {
      const [messages, memoryRecords] = await Promise.all([
        base44.entities.LuminaMessage.filter({ user_id: user.email }, '-created_date', 20),
        base44.entities.UserMemory.filter({ user_id: user.email }),
      ]);

      const memory = memoryRecords[0] || null;
      const history = messages.reverse(); // oldest first

      return Response.json({ history, memory, user_name: user.full_name || user.email });
    }

    // ── SEND MESSAGE ───────────────────────────────────────────
    if (action === 'send') {
      // 1. Load memory + recent history in parallel
      const [recentMessages, memoryRecords] = await Promise.all([
        base44.entities.LuminaMessage.filter({ user_id: user.email }, '-created_date', 20),
        base44.entities.UserMemory.filter({ user_id: user.email }),
      ]);

      const memory = memoryRecords[0] || null;
      const history = recentMessages.reverse();

      // 2. Save user message
      await base44.entities.LuminaMessage.create({
        user_id: user.email,
        role: 'user',
        content: message,
      });

      // 3. Build memory context string
      let memoryContext = '';
      if (memory) {
        const parts = [];
        if (memory.user_name) parts.push(`User's name: ${memory.user_name}`);
        if (memory.key_facts?.length) parts.push(`Key facts: ${memory.key_facts.slice(-10).join('; ')}`);
        if (memory.preferences && Object.keys(memory.preferences).length) {
          parts.push(`Preferences: ${JSON.stringify(memory.preferences)}`);
        }
        if (memory.past_requests?.length) parts.push(`Past requests: ${memory.past_requests.slice(-5).join('; ')}`);
        if (memory.pinned_notes?.length) parts.push(`Pinned notes: ${memory.pinned_notes.join('; ')}`);
        if (memory.conversation_summary) parts.push(`Last conversation summary: ${memory.conversation_summary}`);
        if (parts.length) memoryContext = `\n\nUSER MEMORY:\n${parts.join('\n')}`;
      } else {
        memoryContext = '\n\nUSER MEMORY: This is the first conversation with this user. Greet them warmly and ask their name.';
      }

      // 4. Build messages array for LLM
      const llmMessages = [
        { role: 'system', content: LUMINA_SYSTEM_PROMPT + memoryContext },
        ...history.map(m => ({
          role: m.role === 'lumina' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: message },
      ];

      // 5. Call LLM with full context
      const contextPrompt = `${LUMINA_SYSTEM_PROMPT}${memoryContext}

CONVERSATION HISTORY:
${history.map(m => `${m.role === 'lumina' ? 'Lumina' : 'User'}: ${m.content}`).join('\n')}

User: ${message}

Respond as Lumina:`;

      const reply = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
      });

      const replyText = typeof reply === 'string' ? reply : (reply?.text || reply?.content || 'I\'m here! What can I help you with?');

      // 6. Save Lumina's reply
      await base44.entities.LuminaMessage.create({
        user_id: user.email,
        role: 'lumina',
        content: replyText,
      });

      // 7. Extract & update memory asynchronously (fire and forget)
      updateMemoryAsync(base44, user, message, replyText, memory);

      return Response.json({ reply: replyText });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('luminaChat error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function updateMemoryAsync(base44, user, userMessage, luminaReply, existingMemory) {
  try {
    // Ask LLM to extract memory-worthy facts from this exchange
    const extractPrompt = `From this conversation exchange, extract any important information about the user that should be remembered.

User said: "${userMessage}"
Assistant replied: "${luminaReply}"

Extract (return JSON only):
{
  "key_facts": ["array of new facts about the user, empty if none"],
  "preferences": {},
  "past_requests": ["brief description of what they asked, or empty"],
  "important_dates": [],
  "pinned_notes": ["only if user said 'remember this', 'don't forget', or 'pin this'"],
  "conversation_summary": "one sentence summary of this exchange, or empty string"
}

Only include non-empty values. Return valid JSON.`;

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: extractPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          key_facts: { type: 'array', items: { type: 'string' } },
          preferences: { type: 'object' },
          past_requests: { type: 'array', items: { type: 'string' } },
          important_dates: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, date: { type: 'string' } } } },
          pinned_notes: { type: 'array', items: { type: 'string' } },
          conversation_summary: { type: 'string' },
        },
      },
    });

    if (!extracted) return;

    const mergeArr = (a = [], b = []) => [...new Set([...a, ...b])].slice(-50);
    const mergeDates = (a = [], b = []) => {
      const map = {};
      [...a, ...b].forEach(d => { if (d?.label) map[d.label] = d; });
      return Object.values(map);
    };

    const now = new Date().toISOString();

    if (existingMemory) {
      await base44.entities.UserMemory.update(existingMemory.id, {
        user_name: user.full_name || existingMemory.user_name,
        key_facts: mergeArr(existingMemory.key_facts, extracted.key_facts),
        preferences: { ...(existingMemory.preferences || {}), ...(extracted.preferences || {}) },
        past_requests: mergeArr(existingMemory.past_requests, extracted.past_requests),
        important_dates: mergeDates(existingMemory.important_dates, extracted.important_dates),
        pinned_notes: mergeArr(existingMemory.pinned_notes, extracted.pinned_notes),
        conversation_summary: extracted.conversation_summary || existingMemory.conversation_summary,
        last_seen: now,
      });
    } else if (
      extracted.key_facts?.length ||
      extracted.past_requests?.length ||
      extracted.pinned_notes?.length ||
      extracted.conversation_summary
    ) {
      await base44.entities.UserMemory.create({
        user_id: user.email,
        user_name: user.full_name || user.email,
        key_facts: extracted.key_facts || [],
        preferences: extracted.preferences || {},
        past_requests: extracted.past_requests || [],
        important_dates: extracted.important_dates || [],
        pinned_notes: extracted.pinned_notes || [],
        conversation_summary: extracted.conversation_summary || '',
        last_seen: now,
      });
    }
  } catch (err) {
    console.error('Memory update failed (non-critical):', err.message);
  }
}