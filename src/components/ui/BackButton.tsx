import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useUnsavedChanges } from '../../store/UnsavedChangesContext';
import BackToHomeButton from './BackToHomeButton';

interface BackButtonProps {
  fallbackPath?: string;
  onClick?: () => void;
  className?: string;
  toHomeDirectly?: boolean;
  label?: string;
}

export default function BackButton({ 
  fallbackPath = '/', 
  onClick, 
  className,
  toHomeDirectly = true,
  label
}: BackButtonProps) {
  const navigate = useNavigate();
  const { confirmIfUnsaved } = useUnsavedChanges();

  if (toHomeDirectly && !onClick) {
    return <BackToHomeButton className={className} customLabel={label} />;
  }

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    confirmIfUnsaved(() => {
      // Check if there is history to go back to within our app router session
      if (typeof window !== 'undefined' && window.history && window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate(fallbackPath);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-[13px] font-black text-[#1457D9] bg-white hover:bg-blue-50 border border-blue-200 hover:border-[#1457D9] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 shrink-0 select-none cursor-pointer active:scale-95 ${className || ''}`}
    >
      <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-[#1457D9]" />
      <Home size={16} className="text-amber-500" />
      <span className="uppercase tracking-wide font-extrabold">{label || 'QUAY LẠI GIAO DIỆN CHÍNH'}</span>
    </button>
  );
}

export { BackToHomeButton };
