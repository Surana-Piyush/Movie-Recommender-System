import React from 'react';
import { Sparkles } from 'lucide-react';

interface SkeletonGridProps {
  count?: number;
  message?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 8,
  message = 'Generating AI recommendations...',
}) => {
  return (
    <div className="w-full flex flex-col gap-6">
      {message && (
        <div className="flex items-center gap-2 text-sm text-[#f5b94d] animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold font-headline">{message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col glass-card rounded-2xl overflow-hidden border border-white/5 animate-pulse aspect-[2/3] relative"
          >
            <div className="w-full h-full bg-gradient-to-b from-gray-800/40 via-gray-800/20 to-gray-900/60" />
            <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
              <div className="h-4 bg-gray-700/50 rounded w-3/4" />
              <div className="h-3 bg-gray-800/50 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
