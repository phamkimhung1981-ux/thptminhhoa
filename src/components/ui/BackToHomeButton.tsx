import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useUnsavedChanges } from '../../store/UnsavedChangesContext';

interface BackToHomeButtonProps {
  className?: string;
  variant?: 'primary' | 'header' | 'subtle' | 'compact';
  customLabel?: string;
  onClick?: () => void;
}

export default function BackToHomeButton({
  className = '',
  variant = 'primary',
  customLabel,
  onClick
}: BackToHomeButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmIfUnsaved } = useUnsavedChanges();

  // If already at home dashboard, we don't need to show it unless specified
  const isHome = location.pathname === '/';

  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onClick) {
      onClick();
      return;
    }

    // Use confirmation dialog if there are unsaved changes
    confirmIfUnsaved(() => {
      navigate('/');
    });
  };

  if (isHome && variant === 'primary') {
    return null;
  }

  // Variant Styles
  let variantStyles = 'bg-white hover:bg-blue-50 text-[#1457D9] hover:text-[#0B3FA8] border border-blue-200 hover:border-[#1457D9] shadow-xs hover:shadow-md';
  
  if (variant === 'header') {
    variantStyles = 'bg-blue-50/80 hover:bg-[#1457D9] text-[#1457D9] hover:text-white border border-blue-200/80 hover:border-[#1457D9] shadow-2xs hover:shadow-sm';
  } else if (variant === 'subtle') {
    variantStyles = 'bg-slate-100/90 hover:bg-white text-[#123B78] hover:text-[#1457D9] border border-slate-200 hover:border-blue-300 shadow-2xs';
  } else if (variant === 'compact') {
    variantStyles = 'bg-white hover:bg-blue-50 text-[#1457D9] border border-blue-200 px-2.5 py-1.5 text-xs';
  }

  return (
    <button
      type="button"
      id="btn-back-to-home"
      onClick={handleClick}
      title="Quay lại Giao diện chính / Dashboard Trường THPT Minh Hòa"
      className={`group inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-[13px] font-black rounded-xl transition-all duration-200 cursor-pointer active:scale-95 select-none shrink-0 ${variantStyles} ${className}`}
    >
      {/* ARROW LEFT */}
      <ArrowLeft 
        size={15} 
        className="transition-transform duration-200 group-hover:-translate-x-1 shrink-0" 
      />

      {/* HOME ICON */}
      <Home 
        size={16} 
        className="shrink-0 text-amber-500 group-hover:scale-110 transition-transform duration-200" 
      />

      {/* TEXT DISPLAY: ← 🏠 QUAY LẠI GIAO DIỆN CHÍNH */}
      <span className="uppercase tracking-wide font-extrabold whitespace-nowrap">
        {customLabel || (
          <>
            <span className="hidden sm:inline">QUAY LẠI GIAO DIỆN CHÍNH</span>
            <span className="sm:hidden">GIAO DIỆN CHÍNH</span>
          </>
        )}
      </span>
    </button>
  );
}
