import { SystemModule, User, Role } from '../types';

/**
 * Checks if a user has administrative privileges (Admin or School Board / BGH)
 */
export function isAdminUser(user?: User | null): boolean {
  if (!user) return false;
  if (user.id === 'admin' || user.username === 'admin') return true;
  const role = user.role;
  return role === 'admin' || role === 'ADMIN' || role === 'BGH';
}

/**
 * Default System Modules for Trường THPT Sơn Lương
 */
export const DEFAULT_SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'calendar',
    title: 'LỊCH CÔNG TÁC',
    desc: 'Lịch tuần & Sự kiện nhà trường',
    icon: 'Calendar',
    route: '/calendar',
    gradient: 'from-blue-600 to-indigo-700',
    shadowColor: 'shadow-blue-500/30',
    order: 1,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'school_work_schedule',
    title: 'LỊCH CÔNG VIỆC TRƯỜNG',
    desc: 'Phân công - Trực ban - Đánh giá tiến độ',
    icon: 'CalendarCheck',
    route: '/school-work-schedule',
    gradient: 'from-blue-600 to-indigo-600',
    shadowColor: 'shadow-blue-500/30',
    order: 2,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'kpi_cbql',
    title: 'KPI CBQL',
    desc: 'Đánh giá Cán bộ quản lý (Hiệu trưởng, Phó Hiệu trưởng, Tổ trưởng)',
    icon: 'Award',
    route: '/kpi-cbql',
    gradient: 'from-blue-700 to-indigo-800',
    shadowColor: 'shadow-blue-600/30',
    order: 3,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'kpi_gvnv',
    title: 'KPI GIÁO VIÊN',
    desc: 'Đánh giá hiệu quả công việc Giáo viên (chuẩn 100 điểm)',
    icon: 'GraduationCap',
    route: '/kpi-gvnv',
    gradient: 'from-emerald-600 to-teal-700',
    shadowColor: 'shadow-emerald-500/30',
    order: 4,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'kpi_nv',
    title: 'KPI NHÂN VIÊN',
    desc: 'Đánh giá Nhân viên hành chính (Kế toán, Văn thư, Y tế, Thư viện...)',
    icon: 'UserCheck',
    route: '/kpi-nv',
    gradient: 'from-teal-600 to-emerald-800',
    shadowColor: 'shadow-teal-500/30',
    order: 5,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'youth_discipline',
    title: 'ĐOÀN TN – NỀN NẾP HS',
    desc: 'Theo dõi, chấm điểm thi đua và quản lý vi phạm nền nếp học sinh',
    icon: 'ShieldAlert',
    route: '/youth-discipline',
    gradient: 'from-blue-600 to-indigo-700',
    shadowColor: 'shadow-blue-500/30',
    order: 6,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'discipline',
    title: 'NỀN NẾP CBGVNV',
    desc: 'Nền nếp & Nội quy cán bộ giáo viên nhân viên',
    icon: 'ShieldCheck',
    route: '/discipline',
    gradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/30',
    order: 7,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'homeroom',
    title: 'CÔNG TÁC CHỦ NHIỆM',
    desc: 'Sổ chủ nhiệm & Quản lý lớp học',
    icon: 'BookOpen',
    route: '/homeroom',
    gradient: 'from-cyan-600 to-blue-700',
    shadowColor: 'shadow-cyan-500/30',
    order: 8,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: false
  },
  {
    id: 'teachers',
    title: 'CBGVNV',
    desc: 'Quản lý hồ sơ nhân sự, cán bộ giáo viên',
    icon: 'Users',
    route: '/teachers',
    gradient: 'from-indigo-600 to-purple-600',
    shadowColor: 'shadow-indigo-500/30',
    order: 8,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'departments',
    title: 'TỔ CHUYÊN MÔN',
    desc: 'Tổ bộ môn & Lịch sinh hoạt tổ',
    icon: 'School',
    route: '/departments',
    gradient: 'from-purple-600 to-pink-600',
    shadowColor: 'shadow-purple-500/30',
    order: 9,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU', 'GIAO_VIEN'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  },
  {
    id: 'reports',
    title: 'THỐNG KÊ',
    desc: 'Báo cáo tổng hợp, xuất dữ liệu',
    icon: 'PieChart',
    route: '/reports',
    gradient: 'from-teal-500 to-emerald-600',
    shadowColor: 'shadow-teal-500/30',
    order: 10,
    enabled: true,
    allowedRoles: ['admin', 'ADMIN', 'BGH', 'TTCM', 'GIAO_VU', 'NHAN_SU'],
    showOnHome: true,
    showOnSidebar: true,
    isSystem: true
  }
];
