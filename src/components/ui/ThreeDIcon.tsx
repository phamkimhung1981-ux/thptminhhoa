import React from 'react';

export type Icon3DName = 
  | 'home'
  | 'teachers'
  | 'kpis'
  | 'monthly_kpi_input'
  | 'monthly_kpi'
  | 'tasks'
  | 'leaves'
  | 'departments'
  | 'reports'
  | 'notifications'
  | 'settings';

interface ThreeDIconProps {
  name: Icon3DName;
  size?: number; // Size in px
  className?: string;
  variant?: 'flat' | 'glossy' | 'floating';
}

export const ThreeDIcon: React.FC<ThreeDIconProps> = ({ 
  name, 
  size = 36, 
  className = '',
  variant = 'glossy' 
}) => {
  const filterId = `glow-${name}-${Math.random().toString(36).substr(2, 5)}`;
  const shadowId = `shadow-${name}-${Math.random().toString(36).substr(2, 5)}`;
  const gradId1 = `grad1-${name}-${Math.random().toString(36).substr(2, 5)}`;
  const gradId2 = `grad2-${name}-${Math.random().toString(36).substr(2, 5)}`;
  const glassId = `glass-${name}-${Math.random().toString(36).substr(2, 5)}`;

  const renderSvgContent = () => {
    switch (name) {
      case 'home':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id={glassId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1E3A8A" floodOpacity="0.25" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Roof 3D */}
              <polygon points="32,6 4,28 12,28 32,12 52,28 60,28" fill={`url(#${gradId1})`} />
              <polygon points="32,6 32,12 52,28 60,28" fill="#1E40AF" opacity="0.4" />
              {/* House Base */}
              <rect x="12" y="26" width="40" height="32" rx="4" fill={`url(#${gradId2})`} />
              {/* Door 3D */}
              <rect x="26" y="38" width="12" height="20" rx="2" fill="#1E3A8A" />
              <rect x="28" y="40" width="8" height="18" rx="1" fill="#93C5FD" />
              {/* Window */}
              <rect x="18" y="32" width="10" height="10" rx="2" fill="#E0F2FE" />
              <rect x="36" y="32" width="10" height="10" rx="2" fill="#E0F2FE" />
              {/* Glossy Overlay */}
              <polygon points="32,6 12,26 52,26" fill={`url(#${glassId})`} />
            </g>
          </>
        );

      case 'teachers':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id={glassId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1D4ED8" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Back Card / Personnel File */}
              <rect x="6" y="10" width="52" height="46" rx="8" fill="#DBEAFE" />
              <rect x="10" y="14" width="44" height="38" rx="6" fill="#FFFFFF" />
              {/* Left Avatar */}
              <circle cx="22" cy="28" r="7" fill={`url(#${gradId1})`} />
              <path d="M12 44 C12 36, 17 35, 22 35 C27 35, 32 36, 32 44 Z" fill={`url(#${gradId1})`} />
              {/* Center Main Avatar */}
              <circle cx="32" cy="24" r="9" fill={`url(#${gradId2})`} />
              <path d="M18 48 C18 38, 24 37, 32 37 C40 37, 46 38, 46 48 Z" fill={`url(#${gradId2})`} />
              {/* Right Avatar */}
              <circle cx="42" cy="28" r="7" fill={`url(#${gradId1})`} />
              <path d="M32 44 C32 36, 37 35, 42 35 C47 35, 52 36, 52 44 Z" fill={`url(#${gradId1})`} />
              {/* ID Badge Floating */}
              <rect x="38" y="38" width="20" height="16" rx="3" fill="#1D4ED8" />
              <rect x="42" y="42" width="12" height="3" rx="1" fill="#93C5FD" />
              <rect x="42" y="47" width="8" height="2" rx="1" fill="#FFFFFF" />
              {/* Light Reflection */}
              <rect x="6" y="10" width="52" height="20" rx="8" fill={`url(#${glassId})`} />
            </g>
          </>
        );

      case 'kpis':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#047857" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Clipboard Base */}
              <rect x="12" y="10" width="40" height="50" rx="6" fill="#065F46" />
              <rect x="15" y="14" width="34" height="42" rx="4" fill="#ECFDF5" />
              {/* Clipboard Top Metallic Clip */}
              <rect x="24" y="6" width="16" height="8" rx="2" fill="#D1D5DB" />
              <rect x="26" y="8" width="12" height="4" rx="1" fill="#9CA3AF" />
              {/* List Rows */}
              <rect x="20" y="22" width="24" height="4" rx="2" fill="#A7F3D0" />
              <rect x="20" y="30" width="20" height="4" rx="2" fill="#A7F3D0" />
              <rect x="20" y="38" width="24" height="4" rx="2" fill="#A7F3D0" />
              {/* 3D Checkmark Shield Badge */}
              <circle cx="44" cy="44" r="13" fill={`url(#${gradId1})`} />
              <circle cx="44" cy="44" r="10" fill={`url(#${gradId2})`} />
              <path d="M38 44 L42 48 L50 40" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      case 'monthly_kpi_input':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FB923C" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#C2410C" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Clipboard Base */}
              <rect x="10" y="10" width="42" height="48" rx="6" fill="#9A3412" />
              <rect x="13" y="14" width="36" height="40" rx="4" fill="#FFF7ED" />
              {/* Top Clip */}
              <rect x="24" y="6" width="14" height="8" rx="2" fill="#CBD5E1" />
              {/* Lines */}
              <rect x="18" y="22" width="22" height="4" rx="2" fill="#FFEDD5" />
              <rect x="18" y="30" width="18" height="4" rx="2" fill="#FFEDD5" />
              {/* 3D Floating Plus Sphere */}
              <circle cx="44" cy="42" r="14" fill={`url(#${gradId1})`} />
              <circle cx="44" cy="42" r="11" fill={`url(#${gradId2})`} />
              <path d="M44 35 V49 M37 42 H51" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            </g>
          </>
        );

      case 'monthly_kpi':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#3730A3" />
              </linearGradient>
              <linearGradient id={glassId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C7D2FE" />
                <stop offset="100%" stopColor="#4338CA" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3730A3" floodOpacity="0.35" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* 3D Chart Plate */}
              <rect x="8" y="12" width="48" height="44" rx="8" fill="#EEF2FF" />
              {/* Bar 1 */}
              <rect x="14" y="36" width="8" height="14" rx="3" fill={`url(#${gradId1})`} />
              {/* Bar 2 */}
              <rect x="26" y="26" width="8" height="24" rx="3" fill={`url(#${gradId2})`} />
              {/* Bar 3 */}
              <rect x="38" y="18" width="8" height="32" rx="3" fill={`url(#${glassId})`} />
              {/* 3D Trend Arrow */}
              <path d="M12 34 Q 24 22 46 12" fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
              <polygon points="48,10 40,12 44,18" fill="#F59E0B" />
            </g>
          </>
        );

      case 'tasks':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#1D4ED8" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Main Board */}
              <rect x="10" y="8" width="44" height="48" rx="8" fill="#1E40AF" />
              <rect x="13" y="12" width="38" height="40" rx="6" fill="#F0F9FF" />
              {/* Task Items */}
              <rect x="18" y="20" width="6" height="6" rx="1.5" fill="#3B82F6" />
              <rect x="27" y="21" width="18" height="4" rx="1" fill="#93C5FD" />
              
              <rect x="18" y="30" width="6" height="6" rx="1.5" fill="#3B82F6" />
              <rect x="27" y="31" width="18" height="4" rx="1" fill="#93C5FD" />

              <rect x="18" y="40" width="6" height="6" rx="1.5" fill="#10B981" />
              <rect x="27" y="41" width="14" height="4" rx="1" fill="#A7F3D0" />
              {/* Floating Checkmark Badge */}
              <circle cx="44" cy="42" r="11" fill={`url(#${gradId1})`} />
              <path d="M39 42 L42 45 L48 39" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      case 'leaves':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#6D28D9" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Calendar Base */}
              <rect x="10" y="12" width="44" height="44" rx="8" fill="#5B21B6" />
              <rect x="10" y="12" width="44" height="14" rx="8" fill={`url(#${gradId1})`} />
              <rect x="14" y="28" width="36" height="24" rx="4" fill="#F5F3FF" />
              {/* Binder Rings */}
              <rect x="18" y="8" width="4" height="8" rx="2" fill="#DDD6FE" />
              <rect x="42" y="8" width="4" height="8" rx="2" fill="#DDD6FE" />
              {/* Calendar Grid */}
              <circle cx="20" cy="34" r="2.5" fill="#C4B5FD" />
              <circle cx="32" cy="34" r="2.5" fill="#C4B5FD" />
              <circle cx="44" cy="34" r="2.5" fill="#C4B5FD" />
              <circle cx="20" cy="42" r="2.5" fill="#C4B5FD" />
              {/* 3D Clock Badge */}
              <circle cx="38" cy="42" r="10" fill={`url(#${gradId2})`} />
              <circle cx="38" cy="42" r="8" fill="#FFFFFF" />
              <path d="M38 37 V42 H42" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </>
        );

      case 'departments':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#0F766E" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0F766E" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Top Node */}
              <rect x="24" y="8" width="16" height="14" rx="4" fill={`url(#${gradId1})`} />
              <circle cx="32" cy="15" r="3" fill="#CCFBF1" />
              {/* Org Connection Lines */}
              <path d="M32 22 V32 M16 32 H48 M16 32 V38 M48 32 V38" fill="none" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
              {/* Bottom Left Node */}
              <rect x="8" y="38" width="16" height="14" rx="4" fill="#2DD4BF" />
              <circle cx="16" cy="45" r="3" fill="#FFFFFF" />
              {/* Bottom Right Node */}
              <rect x="40" y="38" width="16" height="14" rx="4" fill="#2DD4BF" />
              <circle cx="48" cy="45" r="3" fill="#FFFFFF" />
            </g>
          </>
        );

      case 'reports':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#0E7490" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0891B2" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Dashboard 3D Panel */}
              <rect x="8" y="10" width="48" height="44" rx="8" fill="#CFFAFE" />
              <rect x="12" y="14" width="40" height="36" rx="6" fill="#FFFFFF" />
              {/* Pie Chart 3D */}
              <path d="M 24 28 L 24 18 A 10 10 0 0 1 34 28 Z" fill={`url(#${gradId1})`} />
              <path d="M 24 28 L 34 28 A 10 10 0 1 1 24 18 Z" fill={`url(#${gradId2})`} />
              {/* Mini Bar Lines */}
              <rect x="14" y="38" width="8" height="8" rx="2" fill="#22D3EE" />
              <rect x="25" y="34" width="8" height="12" rx="2" fill="#0891B2" />
              <rect x="36" y="31" width="8" height="15" rx="2" fill="#0E7490" />
            </g>
          </>
        );

      case 'notifications':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#B91C1C" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#D97706" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* Bell Body */}
              <path d="M32 10 C22 10, 18 18, 18 30 L14 38 H50 L46 30 C46 18, 42 10, 32 10 Z" fill={`url(#${gradId1})`} />
              {/* Bell Top Handle */}
              <circle cx="32" cy="8" r="4" fill="#B45309" />
              {/* Bell Clapper */}
              <path d="M26 42 C26 46, 29 48, 32 48 C35 48, 38 46, 38 42 Z" fill="#78350F" />
              {/* 3D Notification Badge */}
              <circle cx="44" cy="18" r="9" fill={`url(#${gradId2})`} />
              <text x="44" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">3</text>
            </g>
          </>
        );

      case 'settings':
        return (
          <>
            <defs>
              <linearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#334155" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${shadowId})`}>
              {/* 3D Gear */}
              <path d="M28 8 H36 V14 H28 Z M28 50 H36 V56 H28 Z M8 28 H14 V36 H8 Z M50 28 H56 V36 H50 Z M14 14 L18 18 L13 23 L9 19 Z M46 46 L50 50 L45 55 L41 51 Z M46 18 L50 14 L55 19 L51 23 Z M14 46 L18 42 L13 37 L9 41 Z" fill="#475569" />
              <circle cx="32" cy="32" r="18" fill={`url(#${gradId1})`} />
              {/* Center Glowing Core */}
              <circle cx="32" cy="32" r="8" fill={`url(#${gradId2})`} />
              <circle cx="32" cy="32" r="4" fill="#FFFFFF" />
            </g>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-110 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {renderSvgContent()}
      </svg>
    </div>
  );
};

export default ThreeDIcon;
