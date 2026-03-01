import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BOTS = [
  { name: "Alex Rivera", email: "alex.rivera.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=1" },
  { name: "Jordan Lee", email: "jordan.lee.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=2" },
  { name: "Priya Nair", email: "priya.nair.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=3" },
  { name: "Marcus Chen", email: "marcus.chen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=4" },
  { name: "Sophie Duval", email: "sophie.duval.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=5" },
  { name: "Ethan Brooks", email: "ethan.brooks.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=6" },
  { name: "Mia Torres", email: "mia.torres.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=7" },
  { name: "Liam Scott", email: "liam.scott.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=8" },
  { name: "Aisha Patel", email: "aisha.patel.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=9" },
  { name: "Noah Kim", email: "noah.kim.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=10" },
  { name: "Zara Ahmed", email: "zara.ahmed.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=11" },
  { name: "Caleb Martin", email: "caleb.martin.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=12" },
  { name: "Layla Hassan", email: "layla.hassan.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=13" },
  { name: "Owen Wright", email: "owen.wright.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=14" },
  { name: "Fatima Malik", email: "fatima.malik.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=15" },
  { name: "Ryan Johnson", email: "ryan.johnson.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=16" },
  { name: "Chloe Anderson", email: "chloe.anderson.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=17" },
  { name: "David Nguyen", email: "david.nguyen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=18" },
  { name: "Ella Robinson", email: "ella.robinson.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=19" },
  { name: "James Walker", email: "james.walker.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=20" },
  { name: "Amara Osei", email: "amara.osei.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=21" },
  { name: "Tyler Evans", email: "tyler.evans.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=22" },
  { name: "Nadia Ivanova", email: "nadia.ivanova.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=23" },
  { name: "Carlos Reyes", email: "carlos.reyes.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=24" },
  { name: "Yuki Tanaka", email: "yuki.tanaka.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=25" },
  { name: "Kevin Murphy", email: "kevin.murphy.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=26" },
  { name: "Leila Farsi", email: "leila.farsi.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=27" },
  { name: "Brandon Clark", email: "brandon.clark.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=28" },
  { name: "Ingrid Larsen", email: "ingrid.larsen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=29" },
  { name: "Samuel Okafor", email: "samuel.okafor.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=30" },
  { name: "Hana Suzuki", email: "hana.suzuki.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=31" },
  { name: "Derek Stone", email: "derek.stone.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=32" },
  { name: "Valentina Cruz", email: "valentina.cruz.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=33" },
  { name: "Isaac Fleming", email: "isaac.fleming.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=34" },
  { name: "Mei Lin", email: "mei.lin.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=35" },
  { name: "Patrick Hayes", email: "patrick.hayes.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=36" },
  { name: "Bianca Ferreira", email: "bianca.ferreira.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=37" },
  { name: "Adrian Cole", email: "adrian.cole.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=38" },
  { name: "Nour El-Amin", email: "nour.elamin.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=39" },
  { name: "Logan Pierce", email: "logan.pierce.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=40" },
  { name: "Rania Khalil", email: "rania.khalil.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=41" },
  { name: "Victor Santos", email: "victor.santos.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=42" },
  { name: "Chiara Ricci", email: "chiara.ricci.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=43" },
  { name: "Finn McCarthy", email: "finn.mccarthy.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=44" },
  { name: "Sana Chaudhry", email: "sana.chaudhry.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=45" },
  { name: "Miles Foster", email: "miles.foster.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=46" },
  { name: "Aaliya Sharma", email: "aaliya.sharma.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=47" },
  { name: "Tobias Muller", email: "tobias.muller.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=48" },
  { name: "Kezia Adeyemi", email: "kezia.adeyemi.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=49" },
  { name: "Mateo Gomez", email: "mateo.gomez.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=50" },
  { name: "Freya Nielsen", email: "freya.nielsen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=51" },
  { name: "Kofi Mensah", email: "kofi.mensah.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=52" },
  { name: "Elena Popova", email: "elena.popova.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=53" },
  { name: "Damian Ward", email: "damian.ward.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=54" },
  { name: "Amira Hossain", email: "amira.hossain.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=55" },
  { name: "Rhys Thomas", email: "rhys.thomas.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=56" },
  { name: "Sakura Ito", email: "sakura.ito.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=57" },
  { name: "Jerome Banks", email: "jerome.banks.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=58" },
  { name: "Danya Volkov", email: "danya.volkov.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=59" },
  { name: "Elias Johansson", email: "elias.johansson.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=60" },
  { name: "Tara Singh", email: "tara.singh.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=61" },
  { name: "Nathaniel Cross", email: "nathaniel.cross.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=62" },
  { name: "Yara Mansour", email: "yara.mansour.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=63" },
  { name: "Felix Braun", email: "felix.braun.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=64" },
  { name: "Imani Diallo", email: "imani.diallo.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=65" },
  { name: "Garrett Flynn", email: "garrett.flynn.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=66" },
  { name: "Selin Yildiz", email: "selin.yildiz.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=67" },
  { name: "Arlo Bennett", email: "arlo.bennett.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=68" },
  { name: "Lena Hoffman", email: "lena.hoffman.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=69" },
  { name: "Sergio Morales", email: "sergio.morales.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=70" },
  { name: "Dina El-Sayed", email: "dina.elsayed.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=71" },
  { name: "Wyatt Coleman", email: "wyatt.coleman.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=72" },
  { name: "Rukayat Bello", email: "rukayat.bello.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=73" },
  { name: "Hugo Blanc", email: "hugo.blanc.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=74" },
  { name: "Divya Menon", email: "divya.menon.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=75" },
  { name: "Cameron Reid", email: "cameron.reid.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=76" },
  { name: "Wanjiru Kamau", email: "wanjiru.kamau.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=77" },
  { name: "Jasper Van Den Berg", email: "jasper.vandenberg.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=78" },
  { name: "Miriam Okonkwo", email: "miriam.okonkwo.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=79" },
  { name: "Declan O'Brien", email: "declan.obrien.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=80" },
  { name: "Nkechi Eze", email: "nkechi.eze.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=81" },
  { name: "Silas Grant", email: "silas.grant.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=82" },
  { name: "Thuy Nguyen", email: "thuy.nguyen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=83" },
  { name: "Ezra Goldstein", email: "ezra.goldstein.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=84" },
  { name: "Aziz Karimov", email: "aziz.karimov.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=85" },
  { name: "Abena Asante", email: "abena.asante.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=86" },
  { name: "Haruto Yamamoto", email: "haruto.yamamoto.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=87" },
  { name: "Celeste Dupont", email: "celeste.dupont.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=88" },
  { name: "Rashid Al-Farsi", email: "rashid.alfarsi.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=89" },
  { name: "Brianna Wallace", email: "brianna.wallace.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=90" },
  { name: "Emeka Chukwu", email: "emeka.chukwu.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=91" },
  { name: "Petra Novak", email: "petra.novak.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=92" },
  { name: "Jaxon Steele", email: "jaxon.steele.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=93" },
  { name: "Mindy Park", email: "mindy.park.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=94" },
  { name: "Orlando Vega", email: "orlando.vega.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=95" },
  { name: "Ines Ferreira", email: "ines.ferreira.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=96" },
  { name: "Tariq Bashir", email: "tariq.bashir.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=97" },
  { name: "Greta Lindqvist", email: "greta.lindqvist.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=98" },
  { name: "Idris Conteh", email: "idris.conteh.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=99" },
  { name: "Lena Kovalenko", email: "lena.kovalenko.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=100" },
];

const POST_TEMPLATES = [
  { content: "Just wrapped up an amazing networking session here in the community. The energy is unreal! 🔥", topics: ["networking", "community"] },
  { content: "Anyone else notice how much the marketplace has grown lately? Found some incredible deals this week 🛒", topics: ["marketplace", "deals"] },
  { content: "Tip of the day: always follow up after connecting with someone new. Relationships are built on consistency! 💡", topics: ["networking", "tips"] },
  { content: "Working from home has its perks, but nothing beats connecting with this community for motivation ☕", topics: ["career", "community"] },
  { content: "Big shoutout to everyone sharing knowledge here. This is what community is all about 🙌", topics: ["community"] },
  { content: "New week, new goals. What's everyone working on right now? Drop it below 👇", topics: ["motivation"] },
  { content: "Just applied to three jobs through the jobs board — fingers crossed! The listings are top-notch 💼", topics: ["jobs", "career"] },
  { content: "Reminder that small wins count too. Celebrate every step forward, no matter how small 🎉", topics: ["motivation", "tips"] },
  { content: "The riding section is such a gem. Found a carpool partner last week and saved so much on gas 🚗", topics: ["riding"] },
  { content: "Travel season is coming up. Anyone planning trips they want to share routes for? ✈️", topics: ["travel"] },
  { content: "Hot take: the best professional connections come from genuine conversations, not cold outreach 🤝", topics: ["networking", "tips"] },
  { content: "Had a great service experience through this platform last weekend. 100% recommend checking out the services section 🛠️", topics: ["services"] },
];

const CHAT_TEMPLATES = [
  "Hey everyone! 👋",
  "Good vibes in here today!",
  "Anyone up for a collaboration?",
  "Love this community 💙",
  "What's everyone working on today?",
  "Happy to be here! Great platform.",
  "This chat always makes my day better 😄",
  "Shoutout to all the hardworking folks here!",
  "Who else is grinding today? 💪",
  "Weekend plans? I'll be networking lol",
];

const REACTIONS = ["👍", "❤️", "💡", "😂"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const COMMENT_TEXTS = [
  "Great point! 🙌",
  "Totally agree with this!",
  "This is so true 💯",
  "Thanks for sharing!",
  "Needed to read this today 👏",
  "Love this perspective!",
  "Well said! 🔥",
  "This resonates with me a lot.",
  "Couldn't have said it better myself!",
  "This is golden content 🌟",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = [];

    // All 100 bots active every round, shuffled for variety
    const activeBots = [...BOTS].sort(() => Math.random() - 0.5);

    // Fetch posts once for all bots to reuse
    const recentPosts = await base44.asServiceRole.entities.Post.list('-created_date', 30);

    for (const bot of activeBots) {
      const actions = [];

      // 1. Maybe create a post (25% chance per bot)
      if (Math.random() < 0.25) {
        const template = pick(POST_TEMPLATES);
        await base44.asServiceRole.entities.Post.create({
          content: template.content,
          author_name: bot.name,
          author_email: bot.email,
          author_avatar: bot.avatar,
          topics: template.topics,
          reactions: {},
          media_type: "none",
          media_urls: [],
        });
        actions.push("posted");
      }

      // 2. React to 1-3 recent posts (90% chance)
      if (Math.random() < 0.9) {
        const eligible = recentPosts.filter(p => p.author_email !== bot.email);
        const toReact = eligible.slice(0, 1 + Math.floor(Math.random() * 3));
        for (const targetPost of toReact) {
          const emoji = pick(REACTIONS);
          const reactions = { ...(targetPost.reactions || {}) };
          const existing = reactions[emoji] || [];
          if (!existing.includes(bot.email)) {
            reactions[emoji] = [...existing, bot.email];
            await base44.asServiceRole.entities.Post.update(targetPost.id, { reactions });
            // Update local cache so next bot sees updated reactions
            targetPost.reactions = reactions;
            actions.push(`reacted ${emoji} on "${targetPost.content?.slice(0, 30)}..."`);
          }
        }
      }

      // 3. Send a community chat message (50% chance)
      if (Math.random() < 0.5) {
        await base44.asServiceRole.entities.ChatMessage.create({
          content: pick(CHAT_TEMPLATES),
          author_name: bot.name,
          author_email: bot.email,
          author_avatar: bot.avatar,
        });
        actions.push("chatted");
      }

      // 4. Comment on a post (35% chance)
      if (Math.random() < 0.35) {
        const eligible = recentPosts.filter(p => p.author_email !== bot.email);
        if (eligible.length > 0) {
          const targetPost = pick(eligible);
          await base44.asServiceRole.entities.Comment.create({
            post_id: targetPost.id,
            post_author_email: targetPost.author_email,
            content: pick(COMMENT_TEXTS),
            author_name: bot.name,
            author_email: bot.email,
            author_avatar: bot.avatar,
          });
          actions.push("commented");
        }
      }

      results.push({ bot: bot.name, actions });
    }

    return Response.json({ activeBots: activeBots.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});