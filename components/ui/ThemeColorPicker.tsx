import React from 'react';

const COLORS = [
  { label: 'Naval Blue', bg: 'bg-navalBlue', text: 'text-white' },
  { label: 'Navy Dark', bg: 'bg-navyDark', text: 'text-white' },
  { label: 'Pullman Brown', bg: 'bg-pullmanBrown', text: 'text-white' },
  { label: 'Dark Gray', bg: 'bg-zinc-900', text: 'text-white' },
  { label: 'Black', bg: 'bg-[#050505]', text: 'text-white' },
  { label: 'White', bg: 'bg-white', text: 'text-navalBlue' },
  { label: 'Light', bg: 'bg-neutral-50', text: 'text-navyDark' },
];

interface ThemeColorPickerProps {
  currentColor: string;
  currentTextColor: string;
  onChange: (bg: string, text: string) => void;
}

// Helper to convert Tailwind text-* or hex to color value for input
function getTextColorValue(textClass: string | undefined | null): string {
  if (!textClass) return '#ffffff';
  if (typeof textClass !== 'string') return '#ffffff';
  if (textClass.startsWith('text-')) {
    switch (textClass) {
      case 'text-white': return '#ffffff';
      case 'text-navalBlue': return '#0a2239';
      case 'text-navyDark': return '#1a2636';
      case 'text-pullmanBrown': return '#6b4f3b';
      case 'text-black': return '#000000';
      case 'text-neutral-400': return '#a3a3a3';
      case 'text-neutral-500': return '#737373';
      default:
        // Try to extract hex from class
        const hex = textClass.match(/#([0-9a-fA-F]{6})/);
        if (hex) return `#${hex[1]}`;
        return '#ffffff';
    }
  }
  if (textClass.startsWith('#')) return textClass;
  return '#ffffff';
}

export const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({ currentColor, currentTextColor, onChange }) => {
  return (
    <div className="flex gap-4 items-center bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
      <span className="text-[10px] font-futuristic tracking-widest uppercase ml-2 text-white/50">BG Color:</span>
      <div className="flex gap-1 ml-2 mr-2">
        {COLORS.map(c => (
          <button
            key={c.label}
            onClick={() => onChange(c.bg, c.text)}
            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${c.bg} ${currentColor === c.bg ? 'border-white !scale-125' : 'border-transparent filter brightness-75 hover:brightness-100'}`}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
};
