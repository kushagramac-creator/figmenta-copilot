"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Bot, Terminal, Loader2, MessageSquare, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  // Fetch Data (Config + Chat Logs)
  async function fetchData() {
    // 1. Get Config
    const { data: config } = await supabase.from("bot_config").select("*").single();
    if (config) {
      setSystemInstruction(config.system_instruction);
    }

    // 2. Get Chat Logs (Newest first)
    const { data: chatLogs } = await supabase
      .from("chat_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
      
    if (chatLogs) {
      setLogs(chatLogs);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // Auto-refresh logs every 5 seconds (Live View)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("bot_config")
      .update({ system_instruction: systemInstruction })
      .eq("id", 1);
    alert("Brain Updated!");
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-gray-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Controls */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 border-b border-gray-800 pb-6">
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <Bot className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Figmenta Admin</h1>
              <p className="text-gray-400">Control Panel</p>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Bot Personality</h2>
            </div>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full h-40 bg-black border border-gray-700 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {saving ? "Saving..." : "Update Brain"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Logs */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 h-[600px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Live Conversations</h2>
            </div>
            <RefreshCw className="w-4 h-4 text-gray-500 animate-spin-slow" />
          </div>
          
          <div className="overflow-y-auto space-y-3 pr-2 flex-1 custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className={`p-3 rounded-lg text-sm ${log.is_bot ? 'bg-blue-900/20 ml-8 border border-blue-900/50' : 'bg-gray-800 mr-8'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold ${log.is_bot ? 'text-blue-400' : 'text-green-400'}`}>
                    {log.user_name}
                  </span>
                  <span className="text-xs text-gray-600">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-300">{log.message_content}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}