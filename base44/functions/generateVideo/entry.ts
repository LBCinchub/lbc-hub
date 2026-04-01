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
        "scenes": ["scene 1 description", "scene 2 description", "scene 3 description", "scene 4 description"],
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

    // Generate thumbnail
    const thumbnailResponse = await base44.integrations.Core.GenerateImage({
      prompt: `Create a stunning cinematic thumbnail for a 1-minute video about: ${prompt}. Professional, high-quality, eye-catching visual.`
    });

    // Generate scene images (one per scene for video preview)
    const sceneFrames = [];
    if (scriptResponse.scenes && scriptResponse.scenes.length > 0) {
      for (let i = 0; i < Math.min(scriptResponse.scenes.length, 4); i++) {
        const scene = scriptResponse.scenes[i];
        const scenePrompt = `${prompt}. Scene ${i + 1}: ${scene}. Mood: ${scriptResponse.mood}. Cinematic, high quality, professional.`;
        try {
          const sceneImage = await base44.integrations.Core.GenerateImage({
            prompt: scenePrompt
          });
          sceneFrames.push({
            url: sceneImage.url,
            description: scene,
            duration: 15
          });
        } catch (e) {
          console.error(`Failed to generate scene ${i + 1}:`, e.message);
        }
      }
    }

    // If no scenes were generated, use thumbnail as fallback
    if (sceneFrames.length === 0) {
      sceneFrames.push({
        url: thumbnailResponse.url,
        description: 'Video preview',
        duration: 60
      });
    }

    // Mock video generation (would integrate real API here later)
    const videoData = {
      id: Math.random().toString(36).substring(7),
      title: scriptResponse.title,
      script: scriptResponse.script,
      scenes: scriptResponse.scenes,
      mood: scriptResponse.mood,
      thumbnail: thumbnailResponse.url,
      frames: sceneFrames,
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