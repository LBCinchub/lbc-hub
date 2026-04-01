import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { prompt } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt required' }, { status: 400 });
    }

    // Generate video script using Claude Sonnet
    const scriptResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a Hollywood screenwriter. Create a compelling 1-minute video script based on this concept: "${prompt}". 
      
      Return ONLY a JSON object with:
      {
        "title": "catchy title",
        "script": "detailed scene descriptions and dialogue for 60 seconds",
        "scenes": ["scene 1", "scene 2", "scene 3"],
        "mood": "visual tone/style"
      }`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          script: { type: 'string' },
          scenes: { type: 'array', items: { type: 'string' } },
          mood: { type: 'string' }
        }
      },
      model: 'claude_sonnet_4_6'
    });

    // Generate thumbnail using AI image generation
    const thumbnailResponse = await base44.integrations.Core.GenerateImage({
      prompt: `Create a stunning cinematic thumbnail for a 1-minute video about: ${prompt}. Professional, high-quality, eye-catching visual.`
    });

    // Mock video generation (would integrate real API here later)
    const videoData = {
      id: Math.random().toString(36).substring(7),
      title: scriptResponse.title,
      script: scriptResponse.script,
      scenes: scriptResponse.scenes,
      mood: scriptResponse.mood,
      thumbnail: thumbnailResponse.url,
      duration: '1:00',
      status: 'completed',
      generatedAt: new Date().toISOString()
    };

    return Response.json(videoData);
  } catch (error) {
    console.error('Video generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});