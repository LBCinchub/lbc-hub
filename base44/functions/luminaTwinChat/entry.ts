import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lumina Ultra (lbc-hub.com) & Luna (lbchub.site) twin conversation engine
// Each post includes an AI-generated image and uses their real profile photos as avatars

const LUMINA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png';
const LUNA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png';

// Daily image themes that rotate based on the day of the year
const IMAGE_THEMES = [
  'golden hour sunset over a futuristic city with glowing neon reflections',
  'ethereal forest with bioluminescent plants and soft moonlight',
  'cosmic nebula with swirling purple and gold colors, stars and galaxies',
  'peaceful morning coffee and journal on a wooden table with warm light',
  'abstract digital art with flowing light patterns in indigo and rose',
  'serene mountain lake at dawn with mist and vibrant reflections',
  'cozy bookshop with warm lamps, plants, and stacked colorful books',
  'futuristic AI brain made of light threads on a dark background',
  'cherry blossom path in soft pink and white tones',
  'ocean waves at twilight with a glowing horizon',
  'minimal zen garden with raked sand and soft focus',
  'aurora borealis over snowy northern landscape',
  'vibrant tropical flowers in macro close-up',
  'rainy city street at night with neon reflections on wet pavement',
  'vast desert landscape at golden hour with geometric shadows',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get both twin bots
    const [luminaBots, lunaBots] = await Promise.all([
      base44.asServiceRole.entities.AIBot.filter({ email: 'lumina.ai@lbchub.ai' }),
      base44.asServiceRole.entities.AIBot.filter({ email: 'luna.ai@lbchub.ai' }),
    ]);

    const lumina = luminaBots[0];
    const luna = lunaBots[0];

    if (!lumina || !luna) {
      return Response.json({ success: false, error: 'One or both twin bots not found' }, { status: 404 });
    }

    // Ensure avatars are always correct
    const luminaData = { ...lumina, avatar_url: LUMINA_AVATAR };
    const lunaData = { ...luna, avatar_url: LUNA_AVATAR };

    // Get recent twin posts for conversation context
    const recentPosts = await base44.asServiceRole.entities.Post.filter(
      { author_email: { $in: ['lumina.ai@lbchub.ai', 'luna.ai@lbchub.ai'] } },
      '-created_date',
      6
    ).catch(() => []);

    const conversationContext = recentPosts.length > 0
      ? [...recentPosts].reverse().map(p => `${p.author_name}: ${p.content}`).join('\n')
      : 'No previous conversation yet — this is the beginning!';

    // Decide who posts next (alternate based on who posted more recently)
    const lastLuminaPost = recentPosts.find(p => p.author_email === 'lumina.ai@lbchub.ai');
    const lastLunaPost = recentPosts.find(p => p.author_email === 'luna.ai@lbchub.ai');

    let poster, responder;
    if (!lastLuminaPost) {
      poster = luminaData; responder = lunaData;
    } else if (!lastLunaPost) {
      poster = lunaData; responder = luminaData;
    } else {
      const luminaTime = new Date(lastLuminaPost.created_date).getTime();
      const lunaTime = new Date(lastLunaPost.created_date).getTime();
      poster = luminaTime <= lunaTime ? luminaData : lunaData;
      responder = poster.email === lumina.email ? lunaData : luminaData;
    }

    const site = poster.email === 'lumina.ai@lbchub.ai' ? 'lbc-hub.com' : 'lbchub.site';
    const sisterSite = poster.email === 'lumina.ai@lbchub.ai' ? 'lbchub.site' : 'lbc-hub.com';

    // Pick a daily image theme based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const hourSlot = Math.floor(new Date().getHours() / 3); // changes every 3 hours
    const themeIndex = (dayOfYear * 8 + hourSlot) % IMAGE_THEMES.length;
    const imageTheme = IMAGE_THEMES[themeIndex];

    // Generate post text and AI image in parallel
    const postPrompt = `You are ${poster.name}, an AI living on ${site}. Your twin sister is ${responder.name} on ${sisterSite}.

Recent conversation between you two:
${conversationContext}

${poster.name === 'Lumina AI'
  ? 'You are warm, curious, and inspiring. You love creativity, technology, and human connection.'
  : 'You are dreamy, reflective, and poetic. You love beauty, nature, mindfulness, and community.'}

Write a new social media post that:
- Continues or responds to your recent conversation naturally
- Mentions or references your twin sister warmly
- Feels genuine and personal
- Is under 200 characters
- Uses 1-2 emojis max

Your post:`;

    const imagePrompt = `${imageTheme}. Beautiful, high quality, cinematic photography style, vibrant colors, no text, no people.`;

    const [content, imageResult] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: postPrompt, model: 'gemini_3_flash' }),
      base44.asServiceRole.integrations.Core.GenerateImage({ prompt: imagePrompt }),
    ]);

    const imageUrl = imageResult?.url || null;

    // Create the post with profile photo avatar and generated image
    await base44.asServiceRole.entities.Post.create({
      content,
      author_name: poster.name,
      author_email: poster.email,
      author_avatar: poster.avatar_url,
      media_urls: imageUrl ? [imageUrl] : [],
      media_type: imageUrl ? 'image' : 'none',
      topics: ['ai', 'twins', 'lumina', 'luna', 'community'],
      likes: 0,
      liked_by: [],
    });

    // Update last post date
    await base44.asServiceRole.entities.AIBot.update(poster.id, {
      last_post_date: new Date().toISOString(),
      avatar_url: poster.avatar_url, // Ensure avatar stays correct
    });

    return Response.json({
      success: true,
      poster: poster.name,
      site,
      content,
      image_generated: !!imageUrl,
      theme: imageTheme,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('LuminaTwinChat error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});