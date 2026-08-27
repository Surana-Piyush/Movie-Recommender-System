import React from 'react';
import { Globe } from 'lucide-react';

export type LanguageOption = '' | 'hi' | 'en';

interface LanguageFilterProps {
  selectedLanguage: LanguageOption;
  onChange: (lang: LanguageOption) => void;
}

export const LanguageFilter: React.FC<LanguageFilterProps> = ({ selectedLanguage, onChange }) => {
  const options: { id: LanguageOption; label: string; flag: string }[] = [
    { id: '', label: 'All Languages', flag: '🌐' },
    { id: 'hi', label: 'Hindi', flag: '🇮🇳' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className="flex items-center gap-1.5 bg-[#111318] p-1 rounded-xl border border-white/10 shadow-lg">
      <div className="flex items-center gap-1 px-2 text.xs text-gray-400 font-medium">
        <Globe className="w-3.5 h-3.5 text-[#f5b94d]" />
        <span className="hidden sm:inline">Lang:</span>
      </div>
      {options.map((opt) => {
        const isActive = selectedLanguage === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] shadow-md scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{opt.flag}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
