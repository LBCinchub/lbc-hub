import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firstMessage } = await req.json();

    if (!firstMessage) {
      return Response.json({ error: 'firstMessage required' }, { status: 400 });
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a short 4-6 word title for a chat conversation based on this first user message. The title should be clear and specific. Return ONLY the title, nothing else.\n\nFirst message: "${firstMessage}"`,
      model: 'gpt_5_mini'
    });

    return Response.json({ title: response.trim() });
  } catch (error) {
    console.error('❌ Generate title error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});