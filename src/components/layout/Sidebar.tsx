import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { SCHOOL_SHORT_NAME_UPPER, SCHOOL_SLOGAN, SCHOOL_SHORT_NAME } from '../../constants/schoolConfig';
import { 
  X, 
  Home, 
  Users, 
  UserSquare2, 
  CalendarDays, 
  Calendar,
  CheckSquare, 
  Plane, 
  BarChart3, 
  Settings, 
  BookOpen, 
  GraduationCap, 
  Award,
  ShieldCheck,
  ShieldAlert,
  Layers,
  FileText,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  hideOnDesktop?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, hideOnDesktop = false }: SidebarProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Lịch công tác', href: '/calendar', icon: CalendarDays },
    { name: 'Lịch công việc trường', href: '/school-work-schedule', icon: Calendar },
    { name: 'Lịch giao việc tổ CM', href: '/department-schedule', icon: FileSpreadsheet },
    { name: 'Đoàn TN - Nền nếp HS', href: '/youth-discipline', icon: ShieldAlert },
    { name: 'Lịch trực Đoàn TN', href: '/youth-duty-schedule', icon: CalendarDays },
    { name: 'KPI Cán bộ Quản lý', href: '/kpi-cbql', icon: Award },
    { name: 'KPI Giáo viên', href: '/kpi-gvnv', icon: GraduationCap },
    { name: 'KPI Nhân viên', href: '/kpi-nv', icon: UserCheck },
    { name: 'Danh mục & Bảng điểm KPI', href: '/kpi-catalog', icon: Layers },
    { name: 'Nền nếp & Nội quy CBGV', href: '/discipline', icon: ShieldCheck },
    { name: 'Công tác chủ nhiệm', href: '/homeroom', icon: Users },
    { name: 'Quản lý CBGVNV', href: '/teachers', icon: GraduationCap },
    { name: 'Quản lý Văn bản', href: '/documents', icon: FileText },
    { name: 'Tổ chuyên môn', href: '/departments', icon: UserSquare2 },
    { name: 'Nghỉ phép', href: '/leaves', icon: Plane },
    { name: 'Thống kê - Báo cáo', href: '/reports', icon: BarChart3 },
    { name: 'Hệ thống', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-900 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside 
        className={cn(
          "sidebar border-r border-[#3B82F6]/10 flex flex-col bg-[#F4F8FF] transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none select-none font-sans",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="relative flex flex-col items-center justify-center pt-6 pb-4 px-4 shrink-0">
          <button 
            type="button"
            className="absolute top-3 right-3 lg:hidden text-[#64748B] hover:text-[#123B78] bg-white p-1.5 rounded-lg shadow-xs cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            <X size={18} />
          </button>
          
          {/* LOGO TRƯỜNG */}
          <div 
            className="w-[68px] h-[68px] bg-white rounded-full shadow-xs border border-[#3B82F6]/20 mb-2 flex items-center justify-center overflow-hidden shrink-0 mx-auto p-1"
          >
            <img 
              src="/logo.jpg" 
              alt={`Logo ${SCHOOL_SHORT_NAME}`} 
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <div className="text-center w-full">
            <h2 className="text-[#123B78] font-bold text-base uppercase mb-0.5 flex flex-col items-center justify-center w-full tracking-tight">
              {SCHOOL_SHORT_NAME_UPPER}
            </h2>
            <p className="text-[#1457D9] text-[10.5px] uppercase whitespace-nowrap text-center w-full font-bold tracking-wider">
              {SCHOOL_SLOGAN}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150 group",
                  isActive 
                    ? "bg-[#1457D9] text-white shadow-md shadow-[#1457D9]/25 translate-x-1" 
                    : "text-[#0B3FA8] hover:bg-white hover:text-[#1457D9] hover:shadow-xs"
                )}
              >
                <item.icon 
                  size={19} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "shrink-0 transition-colors duration-150",
                    isActive ? "text-white" : "text-[#1457D9]"
                  )} 
                />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-[#3B82F6]/10 shrink-0">
          <div className="text-center">
            <BookOpen className="w-6 h-6 text-[#3B82F6]/60 mx-auto mb-2" />
            <p className="text-[11.5px] text-[#0B3FA8] font-semibold leading-relaxed italic mb-2">
              “Vì một ngôi trường hạnh phúc, chất lượng và phát triển”
            </p>
            <div className="h-px w-10 bg-[#3B82F6]/30 mx-auto mb-1.5"></div>
            <p className="text-[11px] font-extrabold text-[#1457D9] uppercase tracking-wider">THPT MINH HÒA</p>
          </div>
        </div>
      </aside>
    </>
  );
}
