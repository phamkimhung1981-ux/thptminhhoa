import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  LogOut, 
  ChevronDown, 
  Home, 
  CalendarDays,
  BarChart3, 
  Users, 
  FileText, 
  GraduationCap, 
  TrendingUp, 
  Settings as SettingsIcon,
  Camera,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useAppContext } from '../../store/AppContext';
import Avatar from '../ui/Avatar';
import AvatarModal from '../profile/AvatarModal';
import BackToHomeButton from '../ui/BackToHomeButton';

interface HeaderProps {
  onMenuClick: () => void;
  isDashboard?: boolean;
}

export default function Header({ onMenuClick, isDashboard }: HeaderProps) {
  const { user, logout, updateUser } = useAuth();
  const { notifications, updateTeacher } = useAppContext();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Đóng user menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead && (n.userId === user?.id || !n.userId)).length || 3;

  const handleSaveAvatar = async (newAvatarUrl: string) => {
    await updateUser({ avatar: newAvatarUrl });
    if (user?.id && user.id !== 'admin') {
      updateTeacher(user.id, { avatar: newAvatarUrl });
    }
  };

  const navMenuItems = [
    { name: 'Trang chủ', path: '/', icon: Home, matchPaths: ['/'] },
    { name: 'Lịch công tác', path: '/calendar', icon: CalendarDays, matchPaths: ['/calendar'] },
    { name: 'CBGVNV', path: '/teachers', icon: Users, matchPaths: ['/teachers'] },
    { name: 'Văn bản', path: '/documents', icon: FileText, matchPaths: ['/documents', '/van-ban'] },
    { name: 'KPI Giáo viên', path: '/kpi-gvnv', icon: GraduationCap, matchPaths: ['/kpi-gvnv'] },
    { name: 'KPI Nhân viên', path: '/kpi-nv', icon: UserCheck, matchPaths: ['/kpi-nv', '/kpi-nhan-vien', '/kpi-staff'] },
    { name: 'Thống kê', path: '/reports', icon: TrendingUp, matchPaths: ['/reports', '/analytics'] },
  ];

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'BGH': return 'Hiệu trưởng';
      case 'TTCM': return 'Tổ trưởng CM';
      case 'GIAO_VU': return 'Giáo vụ';
      case 'NHAN_SU': return 'Nhân sự';
      case 'GIAO_VIEN': return 'Giáo viên';
      default: return 'Hiệu trưởng';
    }
  };

  return (
    <>
      <header 
        id="app-main-header"
        className="main-header sticky top-0 z-[200] h-[76px] w-full bg-white/90 backdrop-blur-[12px] border-b border-white/60 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] px-4 sm:px-6 lg:px-8 transition-all duration-300 flex items-center justify-between"
      >
        {/* BÊN TRÁI: LOGO & TÊN TRƯỜNG */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="mobile-menu-btn"
            className="text-[#0B3FA8] hover:text-[#1457D9] focus:outline-none lg:hidden p-2 rounded-xl hover:bg-blue-50/80 transition-colors"
            onClick={onMenuClick}
            title="Mở menu điều hướng"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* LOGO TRƯỜNG THPT MINH HÒA */}
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-white border border-[#3B82F6]/30 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img 
                src="/logo.jpg" 
                alt="Logo THPT Minh Hòa" 
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-[#123B78] text-sm lg:text-[15px] tracking-tight uppercase leading-tight group-hover:text-[#1457D9] transition-colors">
                TRƯỜNG THPT MINH HÒA
              </span>
              <span className="text-[9.5px] lg:text-[10.5px] font-bold text-[#1457D9] tracking-wider uppercase leading-tight">
                TRI THỨC - NHÂN CÁCH - TƯƠNG LAI
              </span>
            </div>
          </div>
        </div>

        {/* MENU CHÍNH (CENTER) */}
        <nav 
          id="main-nav-bar"
          className="hidden xl:flex items-center gap-1.5 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/70 shadow-sm"
        >
          {navMenuItems.map((item) => {
            const isActive = item.matchPaths.some(p => 
              p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
            );
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                id={`nav-item-${item.path.replace('/', '') || 'home'}`}
                onClick={() => navigate(item.path)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13.5px] font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1457D9] text-white shadow-md shadow-[#1457D9]/25 scale-[1.02]'
                    : 'text-[#123B78] hover:text-[#1457D9] hover:bg-blue-50/70'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-white' : 'text-[#1457D9]'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* BÊN PHẢI: NÚT QUAY LẠI GIAO DIỆN CHÍNH (NẾU Ở MODULE CON), THÔNG BÁO, AVATAR, USER INFO */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {!isDashboard && (
            <BackToHomeButton variant="header" className="hidden lg:inline-flex" />
          )}

          {/* Thông báo */}
          <button 
            id="notifications-bell-btn"
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 text-[#1457D9] bg-white/90 border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md hover:bg-blue-50/70 hover:-translate-y-0.5 transition-all"
            title="Thông báo hệ thống"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[11px] font-extrabold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Account Menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
              id="user-profile-menu-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 bg-white/90 border border-slate-200/80 shadow-sm hover:shadow-md pl-1.5 pr-3 py-1.5 rounded-2xl transition-all hover:-translate-y-0.5 text-left"
            >
              <Avatar
                src={user?.avatar}
                name={user?.name || 'Nguyễn Văn A'}
                size="sm"
                className="ring-2 ring-blue-100"
              />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-[13.5px] font-bold text-[#123B78]">
                  {user?.name || 'Nguyễn Văn A'}
                </span>
                <span className="text-[11px] font-semibold text-[#1457D9]">
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Dropdown */}
            {isUserMenuOpen && (
              <div 
                id="user-account-dropdown"
                className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400">Đang đăng nhập với</p>
                  <p className="text-sm font-bold text-[#123B78] truncate">{user?.name || 'Nguyễn Văn A'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-[#1457D9] border border-blue-200/60">
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsAvatarModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1457D9] transition-colors"
                  >
                    <Camera size={15} className="text-slate-500" />
                    <span>Đổi ảnh đại diện</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1457D9] transition-colors"
                  >
                    <SettingsIcon size={15} className="text-slate-500" />
                    <span>Cài đặt & Hồ sơ</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={15} className="text-rose-500" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user?.avatar}
        userName={user?.name || 'Nguyễn Văn A'}
        onSave={handleSaveAvatar}
      />
    </>
  );
}
