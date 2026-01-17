import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';

// 1. Load Environment Variables
dotenv.config();

// --- PROFESSIONAL LOGGER UTILITY ---
// This adds timestamps and emojis to make your logs easy to read on Render
const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${msg}`),
  error: (msg: string, err?: any) => console.error(`[${new Date().toISOString()}] ❌ ERROR: ${msg}`, err || ''),
  chat: (user: string, msg: string) => console.log(`[${new Date().toISOString()}] 💬 CHAT: [${user}] ${msg}`)
};

// 2. Setup Supabase (The Database) - DEBUG MODE
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ FATAL ERROR: Supabase Credentials Missing!");
  console.error("I see the following keys in Render:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1); // Stop the bot so it doesn't just crash randomly
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Setup Discord Bot
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 4. EVENT: Bot is Online
discord.once('clientReady', async () => {
  log.success(`AI Bot is online as: ${discord.user?.tag}`);
  log.info(`Model selected: gemini-1.5-flash (Stable)`);
});

// 5. EVENT: Message Received
discord.on('messageCreate', async (message) => {
  // Ignore messages from the bot itself
  if (message.author.bot) return;

  log.chat(message.author.username, message.content);

  try {
    // A. GET PERSONALITY from Database
    // We check the 'bot_config' table to see if you changed the system prompt
    let systemInstruction = "You are a helpful AI assistant for Figmenta.";
    const { data: configData } = await supabase
      .from('bot_config')
      .select('system_instruction')
      .order('id', { ascending: false }) // Get the latest rule
      .limit(1)
      .single();

    if (configData?.system_instruction) {
      systemInstruction = configData.system_instruction;
    }

    // B. SAVE USER MESSAGE to Database (for the Dashboard)
    // We do this immediately so it shows up on the website in real-time
    await supabase.from('chat_logs').insert([
      {
        channel_id: message.channelId,
        user_name: message.author.username,
        message_content: message.content,
        is_bot: false,
      }
    ]);

    // C. ASK GEMINI (The Brain)
    const apiKey = process.env.GEMINI_API_KEY;
    // SWITCHED TO 1.5-FLASH FOR STABILITY (1,500 messages/day)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `System: ${systemInstruction}\nUser: ${message.content}` }]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // D. EXTRACT ANSWER
    let reply = "I cannot reach my brain right now.";
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      reply = data.candidates[0].content.parts[0].text;
    }

    // E. REPLY TO DISCORD
    await message.reply(reply);
    log.success(`Replied to ${message.author.username}`);

    // F. SAVE BOT REPLY to Database
    await supabase.from('chat_logs').insert([
      {
        channel_id: message.channelId,
        user_name: "Figmenta Copilot",
        message_content: reply,
        is_bot: true,
      }
    ]);

  } catch (error) {
    log.error("Failed to process message", error);
    await message.reply("I encountered a critical error. Please check my logs.");
  }
});

// 6. DUMMY SERVER (Keeps Render Happy)
// Render requires a web service to listen on a port, or it kills the app.
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Figmenta Bot is Running!');
});
server.listen(10000, () => {
  log.success('Dummy Server running on port 10000');
});

// 7. LOGIN
discord.login(process.env.DISCORD_TOKEN);