import { Client, GatewayIntentBits, Message } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log("------------------------------------------------");
console.log("🚀 STARTING BOT V2 (GEMINI 2.5 FLASH EDITION)");
console.log("------------------------------------------------");

// 1. Setup Clients
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

// 2. The Direct "Brain" Function
async function askGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  // FIX: Using the model we confirmed exists in your account
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

discord.once('ready', () => {
  console.log(`✅ AI Bot is online: ${discord.user?.tag}`);
  console.log(`✅ Model selected: gemini-2.5-flash`);
});

discord.on('messageCreate', async (message: Message) => {
  if (message.author.bot || !message.content) return;

  try {
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