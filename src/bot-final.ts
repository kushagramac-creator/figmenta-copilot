import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

// --- LOGGER ---
const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${msg}`),
  error: (msg: string, err?: any) => console.error(`[${new Date().toISOString()}] ❌ ERROR: ${msg}`, err || ''),
  chat: (user: string, msg: string) => console.log(`[${new Date().toISOString()}] 💬 CHAT: [${user}] ${msg}`)
};

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log.error("Supabase Credentials Missing in Render Environment!");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DISCORD SETUP ---
const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

discord.once('clientReady', async () => {
  log.success(`AI Bot is online as: ${discord.user?.tag}`);
  log.info(`Model selected: gemini-2.0-flash-exp (Verified)`);
});

discord.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  log.chat(message.author.username, message.content);

  try {
    // 1. Get Personality
    let systemInstruction = "You are a helpful AI.";
    const { data: configData } = await supabase.from('bot_config').select('system_instruction').limit(1).single();
    if (configData?.system_instruction) systemInstruction = configData.system_instruction;

    // 2. Log User Message
    await supabase.from('chat_logs').insert([{
      channel_id: message.channelId, user_name: message.author.username, message_content: message.content, is_bot: false
    }]);

    // 3. CALL GEMINI (Using the VERIFIED model from your logs)
    const apiKey = process.env.GEMINI_API_KEY;
    // We are using the exact ID found in your diagnostic logs:
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `System: ${systemInstruction}\nUser: ${message.content}` }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
        log.error(`GOOGLE REFUSED: Status ${response.status}`);
        log.error(`GOOGLE SAYS:`, JSON.stringify(data, null, 2));
        await message.reply(`My brain returned an error: ${response.status}`);
        return;
    }

    let reply = "I cannot reach my brain right now.";
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      reply = data.candidates[0].content.parts[0].text;
    }

    await message.reply(reply);
    
    // 4. Log Bot Reply
    await supabase.from('chat_logs').insert([{
      channel_id: message.channelId, user_name: "Figmenta Copilot", message_content: reply, is_bot: true
    }]);

  } catch (error) {
    log.error("CRITICAL CRASH", error);
    await message.reply("I crashed. Check logs.");
  }
});

const server = http.createServer((req, res) => { res.writeHead(200); res.end('Bot Running'); });
server.listen(10000);
discord.login(process.env.DISCORD_TOKEN);