import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lumina_response } = await req.json();

    // Fetch or create UserMemory
    const memories = await base44.entities.UserMemory.filter({
      user_id: user.email
    });

    let memory = memories.length > 0 ? memories[0] : null;

    // Extract new facts from Lumina response using AI
    const factsResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract any NEW factual information about the user from this Lumina response. Return as a JSON array of strings with facts learned (e.g. ["User is from Toronto", "Prefers coding in Python"]). Return empty array [] if no new facts.\n\nResponse: "${lumina_response}"`,
      response_json_schema: {
        type: 'object',
        properties: {
          facts: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const newFacts = factsResponse.facts || [];

    if (!memory) {
      // Create new memory
      memory = await base44.entities.UserMemory.create({
        user_id: user.email,
        user_name: user.full_name || 'User',
        key_facts: newFacts,
        last_seen: new Date().toISOString(),
        conversation_summary: lumina_response.substring(0, 100)
      });
    } else {
      // Update existing memory — deduplicate (exact + similar keyword overlap)
      const existingFacts = memory.key_facts || [];
      const isSimilar = (a, b) => {
        const na = a.toLowerCase().trim();
        const nb = b.toLowerCase().trim();
        if (na === nb) return true;
        // Overlap: if 60%+ of words in new fact exist in an existing fact
        const wordsA = na.split(/\s+/).filter(w => w.length > 3);
        const wordsB = nb.split(/\s+/).filter(w => w.length > 3);
        if (wordsA.length === 0) return false;
        const overlap = wordsA.filter(w => nb.includes(w)).length;
        return overlap / wordsA.length >= 0.6;
      };
      const filteredNew = newFacts.filter(newFact =>
        !existingFacts.some(ef => isSimilar(newFact, ef))
      );
      const updatedFacts = [...existingFacts, ...filteredNew];
      memory = await base44.entities.UserMemory.update(memory.id, {
        key_facts: updatedFacts,
        last_seen: new Date().toISOString(),
        conversation_summary: lumina_response.substring(0, 100)
      });
    }

    return Response.json({ success: true, memory });
  } catch (error) {
    console.error('❌ Sync memory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});