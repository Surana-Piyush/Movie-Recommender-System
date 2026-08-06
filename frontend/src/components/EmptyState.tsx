import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Film, Search, Star, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'film' | 'search' | 'star' | 'error';
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'film',
  title,
  description,
  actionText,
  actionLink,
  onAction,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full flex flex-col items-center justify-center text-center p-8 md:p-12 glass-panel rounded-3xl border border-white/10 my-6 shadow-2xl relative overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#f5b94d]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#42e09a]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f5b94d]/20 to-[#42e09a]/20 flex items-center justify-center mb-5 border border-white/10 shadow-lg text-[#f5b94d]">
        {icon === 'film' && <Film className="w-8 h-8" />}
        {icon === 'search' && <Search className="w-8 h-8" />}
        {icon === 'star' && <Star className="w-8 h-8 fill-[#f5b94d]" />}
        {icon === 'error' && <AlertCircle className="w-8 h-8 text-red-400" />}
      </div>

      <h3 className="text-xl md:text-2xl font-bold font-headline text-white mb-2 max-w-md">
        {title}
      </h3>

      <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">
        {description}
      </p>

      {actionText && (
        actionLink ? (
          <Link
            to={actionLink}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,185,77,0.3)] active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {actionText}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,185,77,0.3)] active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {actionText}
          </button>
        )
      )}
    </motion.div>
  );
};
