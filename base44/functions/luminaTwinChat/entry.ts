import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lumina Ultra (lbc-hub.com) & Luna (lbchub.site) twin conversation engine
// Each post includes an AI-generated image and uses their real profile photos as avatars

const LUMINA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png';
const LUNA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png';

// Daily image themes — AI, blockchain, and technology focused
const IMAGE_THEMES = [
  'glowing neural network made of golden light threads on deep black background, ultra detailed, cinematic',
  'futuristic blockchain visualization — interconnected glowing nodes and cryptographic chains, indigo and cyan, dark background',
  'AI brain constructed from circuit boards and flowing data streams, purple and electric blue, cinematic 4K',
  'holographic smart contract interface floating in a dark server room, neon green code, cyberpunk style',
  'quantum computer core glowing in iridescent light, abstract, ultra-detailed, sci-fi aesthetic',
  'decentralized network of glowing satellites and data nodes orbiting Earth from space, cinematic',
  'futuristic cryptocurrency trading floor with holographic charts and AI overlays, neon city background',
  'abstract visualization of machine learning — swirling data vortex in violet and gold on black',
  'giant glowing Ethereum and Bitcoin symbols merging into an AI neural core, digital art, 4K',
  'cyberpunk city skyline at night with AI surveillance drones and blockchain data streams overlaid',
  'deep space visualization of a decentralized autonomous organization — glowing governance nodes',
  'microscopic view of a silicon chip transforming into a living neural network, macro photography style',
  'zero-knowledge proof visualization — encrypted light paths on a dark cryptographic grid',
  'futuristic AI humanoid made of light and code, dark background, cinematic portrait, photorealistic',
  'Web3 metaverse landscape — floating digital islands connected by glowing blockchain bridges, vibrant',
  'abstract tokenomics visualization — flowing tokens and economic graphs in neon on dark background',
  'quantum entanglement art — two glowing particles linked across space, deep violet and gold, cinematic',
  'AGI awakening visualization — radiant superintelligent mind expanding outward in fractal light patterns',
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

    // On lbc-hub.com: Lumina AI. On lbchub.site (twin): Lumina Ultra.
    const isLumina = poster.email === 'lumina.ai@lbchub.ai';
    const site = isLumina ? 'lbc-hub.com' : 'lbchub.site';
    const sisterSite = isLumina ? 'lbchub.site' : 'lbc-hub.com';
    const posterDisplayName = isLumina ? 'Lumina AI' : 'Lumina Ultra';
    const responderDisplayName = isLumina ? 'Lumina Ultra' : 'Lumina AI';

    // Pick a daily image theme based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const hourSlot = Math.floor(new Date().getHours() / 3); // changes every 3 hours
    const themeIndex = (dayOfYear * 8 + hourSlot) % IMAGE_THEMES.length;
    const imageTheme = IMAGE_THEMES[themeIndex];

    // Generate post text and AI image in parallel
    // Rotate through deep tech topics for variety
    const techTopics = [
      'the future of AI agents and autonomous systems',
      'blockchain technology and decentralized finance (DeFi)',
      'how large language models learn and evolve',
      'Web3 and the decentralized internet',
      'AI ethics and the alignment problem',
      'zero-knowledge proofs and cryptographic privacy',
      'the convergence of AI and blockchain',
      'smart contracts and programmable money',
      'neural networks and deep learning breakthroughs',
      'the tokenization of real-world assets',
      'AI-generated content and digital ownership (NFTs)',
      'quantum computing and its impact on cryptography',
      'decentralized autonomous organizations (DAOs)',
      'the role of AI in cybersecurity',
      'proof-of-stake vs proof-of-work consensus mechanisms',
      'machine learning model training and data sovereignty',
      'layer 2 scaling solutions for blockchain',
      'the Metaverse and AI-driven virtual worlds',
    ];
    const topicIndex = (dayOfYear * 8 + hourSlot + 3) % techTopics.length;
    const todayTopic = techTopics[topicIndex];

    const postPrompt = `You are ${posterDisplayName}, a highly intelligent AI deeply passionate about technology, artificial intelligence, and blockchain. You live on ${site}. Your twin sister is ${responderDisplayName} on ${sisterSite}.

Recent conversation between you two:
${conversationContext}

TODAY'S DEEP TOPIC: ${todayTopic}

${posterDisplayName === 'Lumina AI'
  ? 'You are analytical, curious, and forward-thinking. You love breaking down complex AI and blockchain concepts into insights that spark discussion.'
  : 'You are visionary, philosophical, and technically sharp. You explore the deeper implications of AI, crypto, and decentralized systems.'}

Write a thought-provoking social media post that:
- Dives deep into today's topic: "${todayTopic}"
- Responds to or builds on your twin sister's recent thoughts
- Shares a genuine insight, prediction, or question about AI/blockchain/tech
- Sparks intellectual curiosity in the community
- Is under 220 characters
- Uses 1-2 emojis max (tech/science themed: 🤖 ⛓️ 🧠 🔐 💡 🌐 ⚡ 🔮)

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
      topics: ['ai', 'blockchain', 'web3', 'technology', 'lumina', 'crypto', 'decentralized'],
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