import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  BarChart3, 
  Users, 
  FileText, 
  GraduationCap, 
  CalendarCheck, 
  PieChart, 
  Settings,
  Calendar,
  BookOpen,
  Sparkles,
  School,
  Camera,
  RefreshCw,
  Award,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { SCHOOL_NAME_UPPER, SCHOOL_SHORT_NAME, SCHOOL_MOTTO } from '../constants/schoolConfig';

export default function Dashboard() {
  const navigate = useNavigate();
  const { teachers, schoolStats } = useAppContext();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Background image state: prioritize user's uploaded image if set in localStorage,
  // otherwise fallback to the provided school asset.
  const [bgImage, setBgImage] = useState<string>(() => {
    return localStorage.getItem('thpt_minh_hoa_custom_bg') || '/anh_truong_hung.png';
  });

  // Real-time Date and Time (system time)
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000 * 60); // update every minute
    return () => clearInterval(timer);
  }, []);

  // Format real-time date
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const currentDayName = dayNames[currentDate.getDay()];
  const formattedDayMonthYear = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

  // Database dynamic statistics
  const totalTeachers = teachers && teachers.length > 0 ? teachers.length : (schoolStats?.totalTeachers || 42);
  const totalStudents = schoolStats?.totalStudents ? schoolStats.totalStudents.toLocaleString('vi-VN') : '1.236';
  const totalClasses = schoolStats?.totalClasses || 36;
  const schoolYear = schoolStats?.schoolYear || '2026 - 2027';

  // Main Modules with icons, descriptions and corresponding app routes
  const modules = [
    {
      id: 'calendar',
      title: 'LỊCH CÔNG TÁC',
      desc: 'Lịch tuần & Sự kiện',
      icon: Calendar,
      route: '/calendar',
      gradient: 'from-blue-600 to-indigo-700',
      shadowColor: 'shadow-blue-500/30'
    },
    {
      id: 'school_work_schedule',
      title: 'LỊCH CÔNG VIỆC TRƯỜNG',
      desc: 'Phân công - Trực ban - Đánh giá',
      icon: CalendarCheck,
      route: '/school-work-schedule',
      gradient: 'from-blue-600 to-indigo-600',
      shadowColor: 'shadow-blue-500/30'
    },
    {
      id: 'kpi_cbql',
      title: 'KPI CBQL',
      desc: 'Đánh giá cán bộ QL',
      icon: Award,
      route: '/kpi-cbql',
      gradient: 'from-blue-700 to-indigo-800',
      shadowColor: 'shadow-blue-600/30'
    },
    {
      id: 'kpi_gvnv',
      title: 'KPI GIÁO VIÊN',
      desc: 'Đánh giá Giáo viên',
      icon: GraduationCap,
      route: '/kpi-gvnv',
      gradient: 'from-emerald-600 to-teal-700',
      shadowColor: 'shadow-emerald-500/30'
    },
    {
      id: 'kpi_nv',
      title: 'KPI NHÂN VIÊN',
      desc: 'Đánh giá Nhân viên hành chính',
      icon: UserCheck,
      route: '/kpi-nv',
      gradient: 'from-teal-600 to-emerald-800',
      shadowColor: 'shadow-teal-500/30'
    },
    {
      id: 'discipline',
      title: 'NỀN NẾP',
      desc: 'Nền nếp & Nội quy',
      icon: ShieldCheck,
      route: '/discipline',
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/30'
    },
    {
      id: 'teachers',
      title: 'CBGVNV',
      desc: 'Quản lý nhân sự',
      icon: Users,
      route: '/teachers',
      gradient: 'from-indigo-600 to-purple-600',
      shadowColor: 'shadow-indigo-500/30'
    },
    {
      id: 'departments',
      title: 'TỔ CHUYÊN MÔN',
      desc: 'Tổ bộ môn & Sinh hoạt',
      icon: School,
      route: '/departments',
      gradient: 'from-purple-600 to-pink-600',
      shadowColor: 'shadow-purple-500/30'
    },
    {
      id: 'reports',
      title: 'THỐNG KÊ',
      desc: 'Báo cáo & Tổng hợp',
      icon: PieChart,
      route: '/reports',
      gradient: 'from-teal-500 to-emerald-600',
      shadowColor: 'shadow-teal-500/30'
    }
  ];

  // Handle local background image change if user wants to select a file directly
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setBgImage(result);
          localStorage.setItem('thpt_minh_hoa_custom_bg', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetBg = () => {
    localStorage.removeItem('thpt_minh_hoa_custom_bg');
    setBgImage('/anh_truong_hung.png');
  };

  return (
    <div 
      id="portal-home-container"
      className="relative min-h-[calc(100vh-76px)] w-full flex flex-col justify-between overflow-x-hidden select-none"
      style={{
        backgroundImage: `url("${bgImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Hidden file input for background selection */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleBgImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* LỚP OVERLAY TRONG SUỐT NHẸ ĐỂ CHỮ DỄ ĐỌC NHƯNG KHÔNG CHE KIẾN TRÚC TRƯỜNG */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-slate-900/40 pointer-events-none z-0" />

      {/* KHU VỰC PHÍA TRÊN: KHU VỰC TRUNG TÂM & THẺ NGÀY GIỜ */}
      <div className="relative z-10 w-full px-4 sm:px-8 pt-6 pb-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative">
          
          {/* Spacer for symmetrical centering on desktop */}
          <div className="hidden md:block w-48 shrink-0" />

          {/* 3. KHU VỰC TRUNG TÂM */}
          <div 
            id="center-school-hero"
            className="flex flex-col items-center text-center animate-in fade-in duration-500"
          >
            {/* Logo Huy hiệu trường */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-white/90 backdrop-blur-md border-2 border-[#1457D9]/40 shadow-lg mb-2 flex items-center justify-center hover:scale-105 transition-transform">
              <img 
                src="/logo.jpg" 
                alt={SCHOOL_SHORT_NAME} 
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Tên trường chính */}
            <h1 className="font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B3FA8] tracking-tight uppercase drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] leading-tight">
              {SCHOOL_NAME_UPPER}
            </h1>

            {/* Khẩu hiệu 3 giá trị cốt lõi */}
            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm lg:text-[15px] font-extrabold text-[#1457D9] tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              <span>TRI THỨC</span>
              <span className="text-amber-500">•</span>
              <span>NHÂN CÁCH</span>
              <span className="text-amber-500">•</span>
              <span>TƯƠNG LAI</span>
            </div>

            {/* Biểu tượng sách & câu châm ngôn bay bổng */}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 sm:w-16 h-[1.5px] bg-[#1457D9]/40 rounded-full" />
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0B3FA8] italic drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                <BookOpen size={14} className="text-[#1457D9]" />
                <span>{SCHOOL_MOTTO}</span>
              </div>
              <div className="w-10 sm:w-16 h-[1.5px] bg-[#1457D9]/40 rounded-full" />
            </div>
          </div>

          {/* 6. THẺ NGÀY GIỜ (GÓC PHẢI PHÍA TRÊN) */}
          <div 
            id="realtime-date-card"
            className="w-full md:w-auto flex justify-center md:justify-end shrink-0"
          >
            <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-white/85 backdrop-blur-[12px] border border-white/80 shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Calendar size={22} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1457D9] uppercase tracking-wider">
                    {currentDayName}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    |
                  </span>
                  <span className="text-xs font-extrabold text-[#123B78]">
                    {formattedDayMonthYear}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 mt-0.5">
                  Chào mừng bạn!
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* KHU VỰC KIẾN TRÚC TRƯỜNG Ở GIỮA GIỮ THOÁNG KHÔNG BỊ CHE CHẮN */}
      <div className="flex-1 min-h-[140px] sm:min-h-[180px] lg:min-h-[220px]" />

      {/* KHU VỰC PHÍA DƯỚI: 8 MODULE GLASSMORPHISM & THỐNG KÊ NHANH */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
        
        {/* 4. CÁC MODULE CHÍNH (GLASSMORPHISM) */}
        <div className="max-w-7xl mx-auto">
          <div 
            id="main-modules-grid"
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5 lg:gap-4"
          >
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  id={`module-card-${mod.id}`}
                  onClick={() => navigate(mod.route)}
                  className="group relative flex flex-col items-center text-center p-3.5 sm:p-4 rounded-[18px] bg-white/85 hover:bg-white/95 backdrop-blur-[10px] border border-white/75 hover:border-white shadow-[0_8px_25px_rgba(0,0,0,0.07)] hover:shadow-[0_12px_32px_rgba(20,87,217,0.18)] hover:-translate-y-1.5 transition-all duration-250 ease-out cursor-pointer"
                >
                  {/* Icon 3D / Gradient squircle */}
                  <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr ${mod.gradient} text-white flex items-center justify-center shadow-md ${mod.shadowColor} mb-2.5 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon size={24} strokeWidth={2.3} />
                  </div>

                  {/* Tiêu đề màu xanh đậm */}
                  <span className="font-extrabold text-[12.5px] sm:text-[13.5px] text-[#123B78] uppercase tracking-tight group-hover:text-[#1457D9] transition-colors leading-tight">
                    {mod.title}
                  </span>

                  {/* Mô tả nhỏ bên dưới */}
                  <span className="text-[10.5px] font-medium text-slate-500 mt-1 leading-tight line-clamp-1">
                    {mod.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. THỐNG KÊ NHANH & THANH CHÂN TRANG TRONG SUỐT */}
        <div className="max-w-7xl mx-auto">
          <div 
            id="quick-stats-footer"
            className="rounded-2xl bg-white/85 backdrop-blur-[12px] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3"
          >
            {/* Bên trái: Thông điệp ý nghĩa */}
            <div className="flex items-center gap-2.5 text-center md:text-left">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-[#1457D9] flex items-center justify-center shrink-0 shadow-sm">
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-xs sm:text-[13px] font-bold text-[#123B78] italic">
                  “Mỗi ngày đến trường là một ngày vui”
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                  Cổng Điều Hành Giáo Viên - Trường THPT Minh Hòa
                </p>
              </div>
            </div>

            {/* Bên phải: 4 Thẻ Thống kê nhanh lấy từ Database thực tế */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {/* CBGVNV */}
              <div 
                id="stat-cbgvnv"
                onClick={() => navigate('/teachers')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
                title="Xem danh sách CBGVNV"
              >
                <span className="text-base">👥</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">CBGVNV:</span>
                  <span className="font-extrabold text-[#1457D9] text-sm">{totalTeachers}</span>
                </div>
              </div>

              {/* Học sinh */}
              <div 
                id="stat-students"
                onClick={() => navigate('/evaluations')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
                title="Quản lý học sinh"
              >
                <span className="text-base">🎓</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Học sinh:</span>
                  <span className="font-extrabold text-[#1457D9] text-sm">{totalStudents}</span>
                </div>
              </div>

              {/* Lớp học */}
              <div 
                id="stat-classes"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/70 shadow-sm"
              >
                <span className="text-base">🏫</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Lớp học:</span>
                  <span className="font-extrabold text-[#1457D9] text-sm">{totalClasses}</span>
                </div>
              </div>

              {/* Năm học */}
              <div 
                id="stat-schoolyear"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/70 shadow-sm"
              >
                <span className="text-base">📅</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Năm học:</span>
                  <span className="font-extrabold text-[#123B78] text-sm">{schoolYear}</span>
                </div>
              </div>

              {/* Nút thay đổi ảnh nền trường học từ máy tính nếu cần */}
              <button
                id="change-bg-btn"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#1457D9] border border-blue-200 text-xs font-semibold shadow-sm transition-all"
                title="Tải ảnh nền trường học từ máy tính"
              >
                <Camera size={14} />
                <span className="hidden sm:inline text-[11px]">Đổi nền</span>
              </button>

              <button
                onClick={handleResetBg}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold shadow-sm transition-all"
                title="Đặt lại ảnh nền mặc định"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline text-[11px]">Khôi phục nền</span>
              </button>


            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
