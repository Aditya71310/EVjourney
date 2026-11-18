import { useState } from 'react';
import { CarFront, Compass, Image as ImageIcon, User as UserIcon } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackType?: 'journey' | 'vehicle' | 'avatar' | 'photo';
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackType = 'journey',
  fallbackLabel,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const Icon =
      fallbackType === 'vehicle'
        ? CarFront
        : fallbackType === 'avatar'
          ? UserIcon
          : fallbackType === 'photo'
            ? ImageIcon
            : Compass;

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-[#141417] dark:to-[#1E1E22] text-neutral-500 dark:text-[#A1A1AA] select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Icon className="w-7 h-7 opacity-60" strokeWidth={1.5} />
        {fallbackLabel && (
          <span className="mt-2 px-3 text-center text-xs font-medium opacity-75 truncate max-w-full">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
