import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useConfig } from "../context/ConfigContext";
import { GeminiService } from "../services/geminiService";
import { ChatMessage } from "../types";

const FloatingAssistant: React.FC = () => {
  const { config } = useConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Initialize empty then set effect

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const handleOpenAssistant = (event: CustomEvent) => {
      setIsOpen(true);
      if (event.detail?.initialMessage) {
        // Use a short timeout to ensure state updates before sending
        setTimeout(() => {
          handleSend(event.detail.initialMessage);
        }, 100);
      }
    };

    window.addEventListener(
      "open-ai-assistant",
      handleOpenAssistant as EventListener,
    );
    return () => {
      window.removeEventListener(
        "open-ai-assistant",
        handleOpenAssistant as EventListener,
      );
    };
  }, [messages, isTyping]); // Re-bind with latest state references if needed, or use functional state updates inside handleSend

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isTyping) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setIsTyping(true);

    const history = messages
      .filter((m, i) => !(i === 0 && m.role === "model")) // Skip initial greeting to avoid API errors
      .map((m) => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.text }],
      }));

    try {
      const response = await GeminiService.getDesignAdvice(textToSend, history);
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "model", text: response || "" }]);
    } catch (e) {
      console.error("Chat error:", e);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Error de conexión. Por favor verifica tu API Key.",
        },
      ]);
    }
  };

  if (!config.ai_active) return null;

  return (
    <div
      id="floating-assistant-container"
      ref={containerRef}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[10000] flex flex-col items-end pointer-events-none"
    >
      {/* Ventana de Chat con Transiciones Smooth */}
      <div
        className={`mb-4 md:mb-6 w-[calc(100vw-2rem)] md:w-[400px] h-[60vh] md:h-[450px] bg-white/95 backdrop-blur-2xl text-navalBlue shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col border-none origin-bottom-right transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-t-2xl rounded-b-none ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-10 pointer-events-none"
        }`}
      >
        <div className="p-6 border-b border-transparent flex justify-between items-center bg-navalBlue text-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-futuristic text-[9px] tracking-[0.4em]">
              ETNA_NEURAL_CORE v1.2
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center opacity-40 hover:opacity-100 hover:rotate-90 transition-all duration-500"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          data-lenis-prevent
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
            >
              <div
                className={`max-w-[85%] p-4 text-[13px] font-light leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-navalBlue text-white rounded-l-2xl rounded-tr-2xl"
                    : "bg-neutral-100 text-navalBlue rounded-r-2xl rounded-tl-2xl"
                }`}
              >
                {m.role === "model" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc ml-4 mb-2" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="mb-1" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1
                          className="text-lg font-bold mb-2 uppercase tracking-wider"
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-base font-bold mb-2 uppercase tracking-wide"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-sm font-bold mb-1 uppercase"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-neutral-50 p-4 rounded-2xl rounded-tl-none border border-navalBlue/5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-navalBlue/20 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-navalBlue/20 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-navalBlue/20 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-neutral-50/50 border-t border-transparent">
          <div className="relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Describa su visión arquitectónica..."
              className="w-full text-xs font-light outline-none bg-white border border-navalBlue/10 rounded-full py-4 pl-6 pr-14 focus:border-navalBlue/30 shadow-inner transition-all"
            />
            <button
              className="absolute right-2 w-10 h-10 bg-navalBlue text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
              onClick={() => handleSend()}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
          <p className="mt-4 text-[8px] text-center font-futuristic tracking-[0.2em] text-neutral-400 opacity-50 uppercase">
            Powered by Gemini 3 Flash
          </p>
        </div>
      </div>

      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-2xl overflow-hidden group pointer-events-auto ${
          isOpen
            ? "bg-pullmanBrown text-white scale-90 rotate-180"
            : "bg-navalBlue text-white hover:scale-110"
        }`}
      >
        <div
          className={`absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 -z-10 ${isOpen ? "hidden" : ""}`}
        ></div>

        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <div className="relative">
            <span className="font-futuristic text-xl tracking-tighter group-hover:text-navalBlue transition-colors duration-500">
              A
            </span>
            {/* Indicador de notificación */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
      </button>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default FloatingAssistant;
