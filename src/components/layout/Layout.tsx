import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BackToHomeButton from '../ui/BackToHomeButton';

function getModuleTitle(pathname: string): string {
  if (pathname === '/') return 'Giao diện chính / Dashboard';
  if (pathname.startsWith('/kpi-cbql')) return 'KPI Cán bộ Quản lý (Đánh giá CBQL / TTCM / BGH)';
  if (pathname.startsWith('/kpi-gvnv')) return 'KPI Giáo viên (Tự đánh giá & TTCM, BGH đánh giá)';
  if (pathname.startsWith('/kpi-nv') || pathname.startsWith('/kpi-nhan-vien') || pathname.startsWith('/kpi-staff')) return 'KPI Nhân viên (Tổ Văn phòng)';
  if (pathname.startsWith('/kpi-catalog') || pathname.startsWith('/kpi') || pathname.startsWith('/monthly-kpi')) return 'Danh mục & Bảng điểm KPI';
  if (pathname.startsWith('/discipline') || pathname.startsWith('/nen-nep')) return 'Nền nếp & Vi phạm học sinh (Điểm cộng/trừ)';
  if (pathname.startsWith('/homeroom') || pathname.startsWith('/cong-tac-chu-nhiem') || pathname.startsWith('/chu-nhiem')) return 'Công tác Chủ nhiệm & Quản lý Lớp';
  if (pathname.startsWith('/school-work-schedule') || pathname.startsWith('/lich-cong-viec') || pathname.startsWith('/work-schedule')) return 'Lịch công việc Trường';
  if (pathname.startsWith('/department-schedule') || pathname.startsWith('/department-schedules') || pathname.startsWith('/lich-giao-viec-to') || pathname.startsWith('/lich-to-chuyen-mon')) return 'Lịch giao việc Tổ Chuyên môn';
  if (pathname.startsWith('/leaves')) return 'Quản lý Nghỉ phép';
  if (pathname.startsWith('/teachers')) return 'Quản lý CBGVNV & Phân công';
  if (pathname.startsWith('/departments')) return 'Tổ Chuyên môn';
  if (pathname.startsWith('/documents') || pathname.startsWith('/van-ban')) return 'Quản lý Văn bản & Hồ sơ';
  if (pathname.startsWith('/reports')) return 'Thống kê - Báo cáo & Thi đua';
  if (pathname.startsWith('/calendar')) return 'Lịch công tác trường';
  if (pathname.startsWith('/analytics')) return 'Phân tích dữ liệu giáo dục';
  if (pathname.startsWith('/settings')) return 'Hệ thống & Cài đặt';
  if (pathname.startsWith('/notifications')) return 'Thông báo hệ thống';
  return 'Giao diện chức năng';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const currentModuleTitle = getModuleTitle(location.pathname);

  return (
    <div className="app-layout font-sans text-[#123B78]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} hideOnDesktop={false} />
      
      <div className="main-content flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <Header onMenuClick={() => setSidebarOpen(true)} isDashboard={isDashboard} />
        
        {/* THANH ĐIỀU HƯỚNG DÙNG CHUNG: QUAY LẠI GIAO DIỆN CHÍNH CHO TẤT CẢ CÁC MODULE */}
        {!isDashboard && (
          <div 
            id="layout-universal-back-bar"
            className="sticky top-0 z-30 bg-gradient-to-r from-blue-50/95 via-indigo-50/90 to-white/95 backdrop-blur-md border-b border-blue-200/80 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 shadow-[0_2px_10px_-3px_rgba(20,87,217,0.08)] transition-all shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* NÚT QUAY LẠI GIAO DIỆN CHÍNH DÙNG CHUNG */}
              <BackToHomeButton />
              
              {/* BREADCRUMB MODULE HIỆN TẠI */}
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 border-l border-blue-200 pl-3 truncate">
                <span className="text-slate-400">Giao diện chính</span>
                <span className="text-slate-300">/</span>
                <span className="font-extrabold text-[#1457D9] truncate">
                  {currentModuleTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-blue-200/80 rounded-full text-[11px] font-bold text-[#1457D9] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden sm:inline">Trường THPT Minh Hòa</span>
                <span className="sm:hidden">THPT Minh Hòa</span>
              </span>
            </div>
          </div>
        )}

        <main className={`flex-1 relative z-0 focus:outline-none custom-scrollbar ${isDashboard ? 'p-0 overflow-x-hidden' : 'pb-8'}`}>
          {children}
          
          {/* Footer for non-dashboard pages */}
          {!isDashboard && (
            <footer className="w-full px-4 sm:px-6 lg:px-8 py-6 mt-8 border-t border-[#123B78]/10 text-center relative z-10">
              <div className="flex flex-col items-center justify-center space-y-2">
                <h3 className="font-bold text-[#123B78] uppercase drop-shadow-sm">Trường THPT Minh Hòa</h3>
                <p className="text-sm font-medium text-[#123B78] flex items-center justify-center gap-2">
                  <span className="text-[#3B82F6]">📍</span> Xã Minh Hòa, tỉnh Phú Thọ
                </p>
                <div className="w-16 h-0.5 bg-[#3B82F6]/30 my-2 rounded-full"></div>
                <p className="text-xs font-medium text-[#123B78]/80 italic mt-1">Kiến tạo tương lai từ hôm nay</p>
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
