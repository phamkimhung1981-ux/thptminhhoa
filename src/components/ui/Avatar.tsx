import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  editable?: boolean;
  onEdit?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-2xl',
};

const badgeSizeClasses = {
  xs: 'p-0.5 -bottom-0.5 -right-0.5',
  sm: 'p-0.5 -bottom-0.5 -right-0.5',
  md: 'p-1 -bottom-0.5 -right-0.5',
  lg: 'p-1.5 bottom-0 right-0',
  xl: 'p-1.5 bottom-0 right-0',
  '2xl': 'p-2 bottom-1 right-1',
};

// Deterministic pastel/pleasant background based on name
function getInitialsColor(name: string = ''): string {
  const colors = [
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-purple-600 text-white',
    'bg-teal-600 text-white',
    'bg-sky-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string = ''): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  src,
  name = '',
  alt = 'Avatar',
  size = 'md',
  className,
  editable = false,
  onEdit,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const showImage = src && !hasError;
  const initials = getInitials(name);
  const colorClass = getInitialsColor(name);

  return (
    <div className={cn("relative inline-block select-none", className)}>
      <div
        onClick={editable ? onEdit : undefined}
        className={cn(
          "rounded-full flex items-center justify-center font-bold overflow-hidden transition-all duration-200 shadow-sm border border-slate-200/80",
          sizeClasses[size],
          !showImage && colorClass,
          editable && "cursor-pointer group hover:ring-2 hover:ring-blue-500 hover:ring-offset-2"
        )}
        title={editable ? "Nhấp để cập nhật ảnh đại diện" : name}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="leading-none">{initials}</span>
        )}

        {editable && (
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="w-1/2 h-1/2 text-white drop-shadow" />
          </div>
        )}
      </div>

      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className={cn(
            "absolute rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors border-2 border-white flex items-center justify-center",
            badgeSizeClasses[size]
          )}
          title="Đổi ảnh đại diện"
        >
          <Camera className={size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </div>
  );
}
