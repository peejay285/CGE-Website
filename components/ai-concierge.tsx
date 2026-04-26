"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  from: "user" | "bot";
  text: string;
}

const QUICK_ACTIONS = ["Lounge", "Esports", "Market", "Community", "Prices"];

const INITIAL_MESSAGE: Message = {
  from: "bot",
  text: "Hey! 👋 I'm the CGE Assistant. Ask me about Esports tournaments nationwide, the Marketplace, the Community, or the Lounge (first branch on Bonny Island).",
};

export function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { from: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: data.response },
      ]);
    } catch {
      // Fallback to local responses if API fails
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: getLocalResponse(text.trim()) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all cursor-pointer",
          open
            ? "bg-surface border border-border text-text-muted hover:text-text"
            : "bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:scale-110"
        )}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 rounded-xl border border-border bg-surface shadow-2xl animate-fadeIn overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-cyan/10 to-transparent border-b border-border">
            <p className="text-sm font-semibold">CGE Assistant</p>
            <p className="text-[10px] text-text-muted">Powered by AI</p>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed",
                  msg.from === "bot"
                    ? "self-start bg-surface-alt text-text"
                    : "self-end bg-cyan/15 text-text"
                )}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-surface-alt px-3 py-2 rounded-lg">
                <span className="text-xs text-text-muted animate-pulse">
                  Typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-border flex gap-1.5 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                className="px-2.5 py-1 text-[10px] font-medium rounded-full border border-border text-text-muted hover:text-cyan hover:border-cyan/30 transition-colors cursor-pointer"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="px-3 py-2 border-t border-border flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-surface-alt border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-cyan/15 text-cyan hover:bg-cyan/25 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Fallback local responses when API is unavailable
function getLocalResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.match(/price|cost|how much|rate/))
    return "💰 Pricing:\n• Main Lounge (PS4): FC 26 ₦3,000/hr, Other games ₦2,000/hr\n• VIP Lounge (PS5): Single ₦5,000/hr, Both consoles ₦10,000/hr\n• VR Zone: ₦2,000 per 15min session\n• Drinks: ₦500 each";

  if (lower.match(/book|reservation|session/))
    return "🎮 To book a session, head to the Lounge page! Select your zone (Main, VIP, or VR), pick a game, choose your time, and pay with Paystack or at the venue.";

  if (lower.match(/tournament|compete|esport/))
    return "🏆 Check our Esports page for upcoming tournaments! We run FC 26, Tekken 8, COD, and MK1 competitions with cash prizes up to ₦80,000.";

  if (lower.match(/event|party|birthday/))
    return "🎉 Visit our Events page for upcoming happenings! We host game nights, VR demos, and birthday packages starting at ₦15,000.";

  if (lower.match(/hour|open|close|time/))
    return "🕐 Lounge Hours:\n• Mon – Sat: 10 AM – 9 PM\n• Sunday: 1 PM – 9 PM\nOnline platform available 24/7!";

  if (lower.match(/where|location|address|direction/))
    return "📍 Find us at: 1 IT William Street, Akiama, Bonny Island. Message us on WhatsApp for directions!";

  if (lower.match(/vr|virtual reality/))
    return "🥽 Our VR Zone offers immersive experiences at ₦2,000 per 15-minute session. Try Beat Saber, VR Boxing, Racing, and more!";

  if (lower.match(/market|buy|sell|gear/))
    return "🛒 Browse our Marketplace to buy and sell gaming gear — controllers, games, accessories, and more. Create an account to list your items!";

  if (lower.match(/community|join|connect/))
    return "👥 Join our Community page to connect with fellow gamers! Share updates, find training partners, and stay in the loop.";

  return "I can help with:\n• 💰 Pricing info\n• 🎮 Booking a session\n• 🏆 Esports & tournaments\n• 🎉 Events\n• 🕐 Opening hours\n• 📍 Location\n• 🥽 VR experiences\n• 🛒 Marketplace\n• 👥 Community\n\nWhat would you like to know?";
}
