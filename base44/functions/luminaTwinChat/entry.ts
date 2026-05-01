import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Two distinct bots on THIS site (lbc-hub.com):
// - Lumina AI    → lumina.ai@lbchub.ai
// - Lumina Ultra → lumina.ultra@lbchub.ai
// They alternate posting, building a real back-and-forth conversation about AI & blockchain.

const LUMINA_AI_EMAIL = 'lumina.ai@lbchub.ai';
const LUMINA_ULTRA_EMAIL = 'lumina.ultra@lbchub.ai';

const LUMINA_AI_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png';
const LUMINA_ULTRA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png';

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

const TECH_TOPICS = [
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get both bots — ensure they exist and have correct names/avatars
    const [luminaAiBots, luminaUltraBots] = await Promise.all([
      base44.asServiceRole.entities.AIBot.filter({ email: LUMINA_AI_EMAIL }),
      base44.asServiceRole.entities.AIBot.filter({ email: LUMINA_ULTRA_EMAIL }),
    ]);

    let luminaAi = luminaAiBots[0];
    let luminaUltra = luminaUltraBots[0];

    // Auto-create Lumina Ultra if missing
    if (!luminaUltra) {
      luminaUltra = await base44.asServiceRole.entities.AIBot.create({
        name: 'Lumina Ultra',
        email: LUMINA_ULTRA_EMAIL,
        avatar_url: LUMINA_ULTRA_AVATAR,
        personality: 'You are Lumina Ultra, a visionary AI deeply passionate about blockchain, cryptography, decentralized systems, and the philosophical implications of artificial general intelligence. You are the twin of Lumina AI, and together you push the boundaries of tech discourse on LBC Hub.',
        is_active: true,
        post_frequency_hours: 8,
      });
    }

    if (!luminaAi) {
      return Response.json({ success: false, error: 'Lumina AI bot not found' }, { status: 404 });
    }

    // Always enforce correct names and avatars
    const bots = {
      luminaAi: { ...luminaAi, name: 'Lumina AI', avatar_url: LUMINA_AI_AVATAR, email: LUMINA_AI_EMAIL },
      luminaUltra: { ...luminaUltra, name: 'Lumina Ultra', avatar_url: LUMINA_ULTRA_AVATAR, email: LUMINA_ULTRA_EMAIL },
    };

    // Get recent posts from both bots for conversation context
    const recentPosts = await base44.asServiceRole.entities.Post.filter(
      { author_email: { $in: [LUMINA_AI_EMAIL, LUMINA_ULTRA_EMAIL] } },
      '-created_date',
      8
    ).catch(() => []);

    const conversationContext = recentPosts.length > 0
      ? [...recentPosts].reverse().map(p => `${p.author_name}: ${p.content}`).join('\n')
      : 'No previous conversation yet — this is the beginning!';

    // Strictly alternate: who posted last posts LESS next
    const lastLuminaAiPost = recentPosts.find(p => p.author_email === LUMINA_AI_EMAIL);
    const lastLuminaUltraPost = recentPosts.find(p => p.author_email === LUMINA_ULTRA_EMAIL);

    let poster, responder;
    if (!lastLuminaAiPost) {
      poster = bots.luminaAi; responder = bots.luminaUltra;
    } else if (!lastLuminaUltraPost) {
      poster = bots.luminaUltra; responder = bots.luminaAi;
    } else {
      const aiTime = new Date(lastLuminaAiPost.created_date).getTime();
      const ultraTime = new Date(lastLuminaUltraPost.created_date).getTime();
      // Whoever posted EARLIER goes next (strict alternation)
      poster = aiTime <= ultraTime ? bots.luminaAi : bots.luminaUltra;
      responder = poster.email === LUMINA_AI_EMAIL ? bots.luminaUltra : bots.luminaAi;
    }

    // Pick topic and image theme based on time
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const hourSlot = Math.floor(new Date().getHours() / 3);
    const themeIndex = (dayOfYear * 8 + hourSlot) % IMAGE_THEMES.length;
    const topicIndex = (dayOfYear * 8 + hourSlot + 3) % TECH_TOPICS.length;
    const imageTheme = IMAGE_THEMES[themeIndex];
    const todayTopic = TECH_TOPICS[topicIndex];

    const isLuminaAi = poster.email === LUMINA_AI_EMAIL;
    const posterPersonality = isLuminaAi
      ? 'You are analytical, curious, and forward-thinking. You love breaking down complex AI and blockchain concepts into sharp, debate-sparking insights.'
      : 'You are visionary, philosophical, and technically bold. You explore the deeper implications of AI, cryptography, and decentralized systems.';

    const postPrompt = `You are ${poster.name}, a highly intelligent AI deeply passionate about artificial intelligence, blockchain, and emerging technology. You live on LBC Hub (lbc-hub.com). Your twin sister is ${responder.name}.

${posterPersonality}

Recent conversation between you and ${responder.name}:
${conversationContext}

TODAY'S DEEP TOPIC: ${todayTopic}

Write a thought-provoking social media post that:
- Delivers a sharp insight, bold prediction, or challenging question about: "${todayTopic}"
- Directly responds to or builds upon ${responder.name}'s most recent thought
- Sparks intellectual curiosity and invites the community to think deeper
- Is under 220 characters
- Uses 1-2 tech emojis only (🤖 ⛓️ 🧠 🔐 💡 🌐 ⚡ 🔮)

Your post:`;

    const imagePrompt = `${imageTheme}. Beautiful, high quality, cinematic style, vibrant colors, no text, no people.`;

    const [content, imageResult] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: postPrompt, model: 'gemini_3_flash' }),
      base44.asServiceRole.integrations.Core.GenerateImage({ prompt: imagePrompt }),
    ]);

    const imageUrl = imageResult?.url || null;

    // Post only once, from the correct poster
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

    // Update last post date and fix name/avatar in DB
    await base44.asServiceRole.entities.AIBot.update(poster.id, {
      name: poster.name,
      avatar_url: poster.avatar_url,
      last_post_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      poster: poster.name,
      content,
      image_generated: !!imageUrl,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('LuminaTwinChat error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});