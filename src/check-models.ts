import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  // We check the standard list
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  console.log("🔍 Checking what models your key can access...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("\n✅ SUCCESS! Google says you can use these:");
      console.log("---------------------------------------------");
      // Filter only for models that can actually chat
      const chatModels = data.models.filter((m: any) => 
        m.supportedGenerationMethods.includes("generateContent")
      );
      
      if (chatModels.length === 0) {
        console.log("⚠️ No chat models found. This usually means the API Key is invalid or restricted.");
      }

      chatModels.forEach((m: any) => {
         console.log(`Name: ${m.name}`); // We need this exact string
      });
      console.log("---------------------------------------------");
    } else {
      console.log("❌ Google Error:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("❌ Network error:", e);
  }
}

listModels();