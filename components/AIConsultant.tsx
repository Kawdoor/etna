import React, { useEffect, useRef, useState } from "react";
import { GeminiService } from "../services/geminiService";
import { ChatMessage } from "../types";

const AIConsultant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Bienvenido a ETNA. Soy tu Consultor de Diseño IA. Describe tu espacio y te sugeriré la atmósfera lumínica perfecta.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsTyping(true);

    const history = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await GeminiService.getDesignAdvice(userMsg, history);

    setIsTyping(false);
    setMessages((prev) => [...prev, { role: "model", text: response || "" }]);
  };

  return (
    <section
      id="ai"
      className="py-32 px-6 relative bg-white text-black overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-1/2 h-full bg-neutral-100/50 -skew-x-12 z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div>
          <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-400 mb-4 uppercase">
            AI GENERATED SPACES
          </h3>
          <h2 className="text-5xl md:text-7xl font-extralight tracking-tight mb-8">
            VIRTUAL <br />{" "}
            <span className="italic opacity-50 text-neutral-400">
              ARCHITECT.
            </span>
          </h2>
          <p className="text-neutral-500 text-lg font-light mb-12 max-w-md">
            Our neural consultant analyzes your architectural layout to propose
            optimal window treatments.
          </p>
          <div className="w-24 h-[1px] bg-black"></div>
        </div>

        <div className="bg-white border border-black/10 p-8 shadow-2xl flex flex-col h-[600px]">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto mb-6 space-y-6 pr-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-4 text-sm font-light tracking-wide ${m.role === "user" ? "bg-black text-white" : "bg-neutral-100 text-black"}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 p-4 text-xs font-futuristic tracking-[0.2em] animate-pulse">
                  NEURAL PROCESSING...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Describe your living room lighting..."
              className="flex-1 bg-transparent border-b border-black/20 focus:border-black outline-none py-3 px-4 text-sm font-light"
            />
            <button
              onClick={handleSend}
              className="px-8 py-3 bg-black text-white font-futuristic text-[10px] tracking-widest hover:bg-neutral-800 transition-colors"
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIConsultant;
