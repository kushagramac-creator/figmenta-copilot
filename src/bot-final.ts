import { Client, GatewayIntentBits, Message } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config({ path: '.env.local' });

// --- 1. RENDER FREE TIER HACK (MUST BE AT THE TOP) ---
// This fools Render into thinking this is a website so it doesn't crash.
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot is Alive!");
  res.end();
});

server.listen(port, () => {
  console.log(`✅ Dummy Server running on port ${port}`);
});

console.log("------------------------------------------------");
console.log("🚀 STARTING BOT V2 (GEMINI 2.5 FLASH EDITION)");
console.log("------------------------------------------------");

// --- 2. SETUP CLIENTS ---
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- 3. THE BRAIN (DIRECT API CONNECTION) ---
async function askGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  // Using Gemini 2.5 Flash as discovered in your account
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("❌ Google API Error:", JSON.stringify(data, null, 2));
    return "I cannot reach my brain right now.";
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

// --- 4. EVENT LISTENERS ---
discord.once('ready', () => {
  console.log(`✅ AI Bot is online: ${discord.user?.tag}`);
  console.log(`✅ Model selected: gemini-2.5-flash`);
});

discord.on('messageCreate', async (message: Message) => {
  if (message.author.bot || !message.content) return;

  try {
    // @ts-ignore
    await message.channel.sendTyping();

    // A. Save User Message
    await supabase.from('chat_logs').insert({
      channel_id: message.channelId,
      user_name: message.author.username,
      message_content: message.content,
      is_bot: false
    });

    // B. Get Config
    const { data: config } = await supabase.from('bot_config').select('*').single();
    
    // C. Get Context
    const { data: history } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('channel_id', message.channelId)
      .order('created_at', { ascending: false })
      .limit(6); 

    const chatHistory = history?.reverse().map(msg => 
      `${msg.is_bot ? 'AI' : msg.user_name}: ${msg.message_content}`
    ).join('\n') || "";

    const prompt = `
      Instructions: ${config?.system_instruction || "You are a helpful AI."}
      
      HISTORY:
      ${chatHistory}
      
      CURRENT MESSAGE:
      ${message.author.username}: ${message.content}
      
      Reply:
    `;

    // D. Ask Gemini
    const response = await askGemini(prompt);

    // E. Reply & Save
    await message.reply(response);
    await supabase.from('chat_logs').insert({
      channel_id: message.channelId,
      user_name: 'Bot',
      message_content: response,
      is_bot: true
    });

  } catch (error) {
    console.error("❌ INTERNAL ERROR:", error);
    await message.reply("My code crashed. Check the terminal.");
  }
});

discord.login(process.env.DISCORD_TOKEN);