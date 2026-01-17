import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

// --- DIAGNOSTIC LOGGER ---
const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${msg}`),
  error: (msg: string) => console.error(`[${new Date().toISOString()}] ❌ ERROR: ${msg}`),
};

const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

discord.once('clientReady', async () => {
  log.info(`DIAGNOSTIC BOT ONLINE: ${discord.user?.tag}`);
  
  // --- THE TEST: LIST AVAILABLE MODELS ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
      log.error("API KEY IS MISSING IN RENDER!");
      return;
  }

  log.info("Testing API Connection...");
  log.info(`Using Key ending in: ...${apiKey.slice(-4)}`); // Check if this matches your key

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
          log.error(`GOOGLE REFUSED LISTING: Status ${response.status}`);
          log.error(JSON.stringify(data, null, 2));
      } else {
          log.info("✅ SUCCESS! Google accepted the key. Available models:");
          // List the first 5 models
          if (data.models) {
              data.models.forEach((m: any) => log.info(`- ${m.name}`));
          } else {
              log.error("No models found in response.");
          }
      }
  } catch (err) {
      log.error(`Connection Failed: ${err}`);
  }
});

// Dummy Server
const server = http.createServer((req, res) => { res.writeHead(200); res.end('Diagnostic Mode'); });
server.listen(10000);
discord.login(process.env.DISCORD_TOKEN);