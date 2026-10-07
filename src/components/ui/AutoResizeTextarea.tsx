import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { cn } from '../../lib/utils';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  className,
  minHeight = 56,
  placeholder,
  disabled = false,
  style,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.max(minHeight, el.scrollHeight);
    el.style.height = `${nextHeight}px`;
  };

  useLayoutEffect(() => {
    resize();
  }, [value, minHeight]);

  useEffect(() => {
    const handleWindowResize = () => resize();
    window.addEventListener('resize', handleWindowResize);
    // Extra timeout resize for font/CSS load
    const timer = setTimeout(resize, 100);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(timer);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    resize();
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onInput={resize}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        "w-full block bg-transparent outline-none transition-all",
        "whitespace-pre-wrap break-words",
        "overflow-hidden resize-none",
        className
      )}
      style={{
        boxSizing: 'border-box',
        overflow: 'hidden',
        resize: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        minHeight: `${minHeight}px`,
        ...style
      }}
      {...props}
    />
  );
};

export default AutoResizeTextarea;
