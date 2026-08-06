import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number; // 1 to 5
  maxStars?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRatingChange?: (newRating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  size = 'md',
  onRatingChange,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= currentDisplayRating;

        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRatingChange && onRatingChange(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            className={`transition-all duration-150 ${
              interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
            }`}
          >
            <Star
              className={`${starSizes[size]} ${
                isFilled
                  ? 'fill-[#f5b94d] text-[#f5b94d] drop-shadow-[0_0_8px_rgba(245,185,77,0.4)]'
                  : 'fill-transparent text-gray-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
