import React, { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  tagName?: "div" | "h1" | "h2" | "p" | "span";
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onChange,
  className = "",
  placeholder = "",
  tagName: Tag = "div",
}) => {
  const contentEditableRef = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    fontSize: "3",
  });
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  useEffect(() => {
    if (contentEditableRef.current) {
      // Init
      if (contentEditableRef.current.innerHTML !== initialValue) {
        contentEditableRef.current.innerHTML = initialValue;
      }
    }
  }, []);

  const updateActiveStyles = () => {
    const size = document.queryCommandValue("fontSize");
    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      fontSize: size || "3",
    });
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    onChange(e.currentTarget.innerHTML);
    updateActiveStyles();
  };

  const handleKeyUp = () => {
    updateActiveStyles();
  };

  const handleMouseUp = () => {
    // Small timeout to let selection settle
    setTimeout(updateActiveStyles, 10);
  };

  const execCommand = (
    command: string,
    value: string | undefined = undefined,
  ) => {
    document.execCommand(command, false, value);
    if (contentEditableRef.current) {
      onChange(contentEditableRef.current.innerHTML);
      contentEditableRef.current.focus();
      updateActiveStyles();
    }
  };

  return (
    <div className="relative group inline-block w-full">
      {/* Floating Toolbar - Visible only when focused or hovering */}
      <div
        className={`absolute -top-12 left-0 flex gap-2 bg-navalBlue/80 backdrop-blur-md px-3 py-2 rounded-lg transition-all duration-300 z-50 ${isFocused ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand("bold");
          }}
          className={`w-8 h-8 flex items-center justify-center text-white rounded font-serif font-bold text-lg transition-colors ${activeStyles.bold ? "bg-white/40" : "hover:bg-white/20"}`}
          title="Negrita"
        >
          B
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand("italic");
          }}
          className={`w-8 h-8 flex items-center justify-center text-white rounded font-serif italic text-lg transition-colors ${activeStyles.italic ? "bg-white/40" : "hover:bg-white/20"}`}
          title="Cursiva"
        >
          I
        </button>
        
        <div className="relative">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowSizeMenu(!showSizeMenu);
            }}
            className={`w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded text-xs ${
              showSizeMenu ? "bg-white/40" : ""
            }`}
            title="Tamaño de Letra"
          >
            Tx
          </button>
          
          {showSizeMenu && (
            <div className="absolute top-full left-0 mt-2 bg-navalBlue/90 backdrop-blur-md border border-white/10 rounded overflow-hidden flex flex-col min-w-[2rem] shadow-xl">
              {[1, 2, 3, 4, 5, 6, 7].map((size) => (
                <button
                  key={size}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand("fontSize", size.toString());
                    setShowSizeMenu(false);
                  }}
                  className={`px-3 py-2 text-xs hover:bg-white/20 text-center transition-colors ${
                    activeStyles.fontSize === size.toString() 
                      ? "text-white bg-white/20 font-bold" 
                      : "text-neutral-400"
                  }`}
                  title={`Tamaño ${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tag
        ref={contentEditableRef as any}
        className={`outline-none min-h-[1em] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500 cursor-text ${className}`}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onFocus={() => {
          setIsFocused(true);
          updateActiveStyles();
        }}
        onBlur={() => {
          // Small timeout to allow button clicks on toolbar to register before hiding
          setTimeout(() => setIsFocused(false), 200);
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
