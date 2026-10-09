import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import TaskEvaluationModal from "../components/evaluations/TaskEvaluationModal";
import TaskEvaluationsHistory from "../components/evaluations/TaskEvaluationsHistory";
import TaskProgressModal from "../components/tasks/TaskProgressModal";
import TaskImportModal from "../components/tasks/TaskImportModal";
import TaskWeeklyCalendarView from "../components/tasks/TaskWeeklyCalendarView";
import { Card } from '../components/ui/Card';
import { 
  Search, Plus, Calendar as CalendarIcon, Download, Printer, 
  CheckCircle, AlertCircle, Edit, Trash2, Eye, Play, Check, 
  MoreVertical, LayoutList, Users, Calculator, FlaskConical, 
  BookOpen, Briefcase, Building2, UserCheck, ChevronRight,
  ArrowRight, ShieldCheck, CheckSquare, Sparkles, AlertTriangle, Clock,
  ChevronLeft, FileText, FileSpreadsheet, Paperclip, ExternalLink,
  Flame, Flag, RotateCcw
} from 'lucide-react';
import { 
  WorkAssignment, 
  Teacher, 
  TaskEvaluation, 
  Department, 
  ExecutionResult, 
  WorkAssignmentStatus,
  WorkAssignmentPriority 
} from '../types';
import { cn } from '../lib/utils';
import { safeFormatLocale, safeParseDate } from '../utils/dateUtils';
import BackButton from '../components/ui/BackButton';
import { 
  SchoolWeekInfo, 
  ACADEMIC_YEARS,
  getWeekInfoByNumber,
  getAllWeeksInYear,
  getCurrentSchoolWeekInfo,
  getEffectiveTaskStatus, 
  isTaskInWeek,
  isTaskOverdue
} from '../utils/schoolWeekUtils';
import { exportWeeklyTasksToWord } from '../utils/taskExportWord';
import { exportWeeklyTasksToExcel } from '../utils/taskExportExcel';

const WEEKS_LABEL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Cả tuần', 'Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];

export interface DepartmentConfig {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  groupToken: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  subjects: string[];
  color: {
    border: string;
    bg: string;
    badge: string;
    text: string;
    activeTab: string;
    light: string;
    ring: string;
  };
}

export const PRESET_DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'd_toan_cong_nghe',
    slug: 'toan-cong-nghe',
    name: 'Tổ Toán - Công Nghệ',
    shortName: 'Toán - Công Nghệ',
    groupToken: 'GROUP_TOAN_CONG_NGHE',
    icon: Calculator,
    description: 'Chuyên môn bộ môn Toán và Công nghệ',
    subjects: ['Toán', 'Công nghệ'],
    color: {
      border: 'border-blue-200',
      bg: 'bg-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'text-blue-700',
      activeTab: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
      light: 'bg-blue-50/70',
      ring: 'focus:ring-blue-500 focus:border-blue-500'
    }
  },
  {
    id: 'd_van_su_dia_gdkt',
    slug: 'van-su-dia-gdkt',
    name: 'Tổ Văn - Sử - Địa- GDKT',
    shortName: 'Văn - Sử - Địa- GDKT',
    groupToken: 'GROUP_VAN_SU_DIA_GDKT',
    icon: BookOpen,
    description: 'Chuyên môn bộ môn Ngữ văn, Lịch sử, Địa lý, GDKT&PL và Nghệ thuật',
    subjects: ['Ngữ văn', 'Văn', 'Lịch sử', 'Sử', 'Địa lý', 'Địa lí', 'GDKT&PL', 'GDKT', 'Âm nhạc', 'Mỹ thuật', 'Mĩ thuật', 'GDCD'],
    color: {
      border: 'border-amber-200',
      bg: 'bg-amber-600',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'text-amber-800',
      activeTab: 'bg-amber-600 text-white shadow-md shadow-amber-500/20',
      light: 'bg-amber-50/70',
      ring: 'focus:ring-amber-500 focus:border-amber-500'
    }
  },
  {
    id: 'd_ly_hoa_sinh',
    slug: 'ly-hoa-sinh',
    name: 'Tổ Lý - Hóa- Sinh',
    shortName: 'Lý - Hóa- Sinh',
    groupToken: 'GROUP_LY_HOA_SINH',
    icon: FlaskConical,
    description: 'Chuyên môn bộ môn Vật lý, Hóa học và Sinh học',
    subjects: ['Vật lý', 'Vật lí', 'Hóa học', 'Hóa', 'Sinh học', 'Sinh'],
    color: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      light: 'bg-emerald-50/70',
      ring: 'focus:ring-emerald-500 focus:border-emerald-500'
    }
  },
  {
    id: 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan',
    slug: 'ngoai-ngu-tin-hoc-gdtc-gdqpan',
    name: 'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN',
    shortName: 'Ngoại ngữ - Tin học– GDTC- GDQP&AN',
    groupToken: 'GROUP_NGOAI_NGU_TIN_HOC_GDTC_GDQPAN',
    icon: Building2,
    description: 'Chuyên môn bộ môn Ngoại ngữ (Tiếng Anh), Tin học, GDTC (Thể dục) và GDQP&AN',
    subjects: ['Tiếng Anh', 'Ngoại ngữ', 'Tin học', 'Tin', 'Thể dục', 'GDTC', 'GDQP&AN', 'GDQP-AN', 'Quốc phòng'],
    color: {
      border: 'border-teal-200',
      bg: 'bg-teal-600',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      text: 'text-teal-700',
      activeTab: 'bg-teal-600 text-white shadow-md shadow-teal-500/20',
      light: 'bg-teal-50/70',
      ring: 'focus:ring-teal-500 focus:border-teal-500'
    }
  },
  {
    id: 'd_van_phong',
    slug: 'van-phong',
    name: 'Tổ Văn phòng',
    shortName: 'Văn phòng',
    groupToken: 'GROUP_VAN_PHONG',
    icon: Briefcase,
    description: 'Bộ phận Văn thư, Kế toán, Thủ quỹ, Y tế, Thư viện, Thiết bị, CNTT và Bảo vệ',
    subjects: ['Văn thư', 'Kế toán', 'Thủ quỹ', 'Y tế', 'Thư viện', 'Thiết bị', 'Hành chính', 'CNTT', 'Bảo vệ'],
    color: {
      border: 'border-purple-200',
      bg: 'bg-purple-600',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      text: 'text-purple-700',
      activeTab: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
      light: 'bg-purple-50/70',
      ring: 'focus:ring-purple-500 focus:border-purple-500'
    }
  }
];

export default function Tasks() {
  const { deptSlug: urlDeptSlug } = useParams<{ deptSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { 
    workAssignments, 
    teachers, 
    departments, 
    addWorkAssignment, 
    updateWorkAssignment, 
    deleteWorkAssignment,
    importWorkAssignments,
    seedOrResetSchoolTasks
  } = useAppContext();
  const { user } = useAuth();
  
  // Selected department tab: 'all' | 'toan-ly-tin-cn' | 'hoa-ly-sinh-gdqpan-nn' | 'van-su-dia-gdkt-pl-an' | 'van-phong'
  const [activeTab, setActiveTab] = useState<string>('all');
  const [mainView, setMainView] = useState<'list' | 'history'>('list');
  const [viewLayout, setViewLayout] = useState<'table' | 'calendar'>('table');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Năm học đang chọn (lưu trữ và phục hồi khi F5)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return searchParams.get('year') || localStorage.getItem('task_selected_year') || '2026–2027';
  });

  // Tuần đang chọn (1..45, mặc định tuần hiện tại khi mở module)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    const fromParam = searchParams.get('week');
    if (fromParam) {
      const n = parseInt(fromParam, 10);
      if (!isNaN(n) && n >= 1 && n <= 45) return n;
    }
    const fromStorage = localStorage.getItem('task_selected_week');
    if (fromStorage) {
      const n = parseInt(fromStorage, 10);
      if (!isNaN(n) && n >= 1 && n <= 45) return n;
    }
    const yr = searchParams.get('year') || localStorage.getItem('task_selected_year') || '2026–2027';
    return getCurrentSchoolWeekInfo(new Date(), yr).weekNumber;
  });

  // Thông tin chi tiết của tuần đang chọn (Tự động tính ngày Thứ 2 đến Chủ nhật)
  const currentWeek = useMemo(() => {
    return getWeekInfoByNumber(selectedWeekNumber, selectedYear);
  }, [selectedWeekNumber, selectedYear]);

  // Toàn bộ 45 tuần trong năm học đang chọn
  const allWeeks = useMemo(() => {
    return getAllWeeksInYear(selectedYear);
  }, [selectedYear]);

  const handleWeekChange = (newWeekNum: number) => {
    setSelectedWeekNumber(newWeekNum);
    localStorage.setItem('task_selected_week', String(newWeekNum));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('week', String(newWeekNum));
    nextParams.set('year', selectedYear);
    navigate({ search: nextParams.toString() }, { replace: true });
  };

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    localStorage.setItem('task_selected_year', newYear);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('year', newYear);
    nextParams.set('week', String(selectedWeekNumber));
    navigate({ search: nextParams.toString() }, { replace: true });
  };

  // Filters (Yêu cầu 9)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState<WorkAssignment | null>(null);
  const [evaluatingAssignment, setEvaluatingAssignment] = useState<WorkAssignment | null>(null);
  const [evaluatingAssigneeId, setEvaluatingAssigneeId] = useState<string | undefined>(undefined);
  const [progressAssignment, setProgressAssignment] = useState<WorkAssignment | null>(null);

  // Form Data (Yêu cầu 10)
  const [formData, setFormData] = useState<Partial<WorkAssignment>>({
    departmentId: 'global',
    academic_year: '2026–2027',
    academicYear: '2026–2027',
    week_number: 1,
    weekNumber: 1,
    weekLabel: 'Tuần 01',
    workDate: '',
    deadline: '',
    priority: 'Trung bình',
    status: 'Chưa thực hiện',
    assigneeIds: [],
    assigneeId: '', 
    requirements: '',
    note: '',
    evidenceUrl: '',
    evidenceName: '',
    completedAssigneeIds: [],
    overdueAssigneeIds: [],
    incompleteAssigneeIds: []
  });

  const [showCrossDeptTeachers, setShowCrossDeptTeachers] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Horizontal Scroll & Sticky Scrollbar Refs for Task Table
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(1400);
  const isSyncingScroll = React.useRef<boolean>(false);

  // Sync tab with URL
  useEffect(() => {
    const slug = urlDeptSlug || searchParams.get('dept');
    if (slug) {
      const matched = PRESET_DEPARTMENTS.find(d => 
        d.slug === slug || 
        d.id === slug || 
        (slug.includes('toan') && d.slug === 'toan-ly-tin-cn') ||
        (slug.includes('hoa') && d.slug === 'hoa-ly-sinh-gdqpan-nn') ||
        (slug.includes('van-su') && d.slug === 'van-su-dia-gdkt-pl-an') ||
        (slug.includes('phong') && d.slug === 'van-phong')
      );
      if (matched) {
        setActiveTab(matched.slug);
      }
    }
  }, [urlDeptSlug, searchParams]);

  // Permissions: BGH xem toàn bộ công việc và toàn bộ trạng thái (Yêu cầu 12)
  const isAdmin = user?.role === 'BGH' || (user?.role || '').includes('HIỆU TRƯỞNG') || (user?.role || '').includes('HT') || (user?.role || '').includes('PHT');
  const isHead = (user?.role || '').includes('TTCM') || (user?.position || '').toLowerCase().includes('tổ trưởng');
  const canManageTasks = isAdmin || isHead;

  // --- HELPER FUNCTIONS ---
  function findDeptConfig(deptIdOrNameOrSlug?: string): DepartmentConfig | undefined {
    if (!deptIdOrNameOrSlug) return undefined;
    const lower = deptIdOrNameOrSlug.toLowerCase();
    return PRESET_DEPARTMENTS.find(d => 
      d.id === deptIdOrNameOrSlug ||
      d.slug === deptIdOrNameOrSlug ||
      d.name.toLowerCase() === lower ||
      ((lower.includes('toán') || lower.includes('toan') || lower.includes('lý') || lower.includes('tin') || lower.includes('cn')) && d.slug === 'toan-ly-tin-cn') ||
      ((lower.includes('hóa') || lower.includes('hoa') || lower.includes('sinh') || lower.includes('gdqpan') || lower.includes('nn')) && d.slug === 'hoa-ly-sinh-gdqpan-nn') ||
      ((lower.includes('văn') || lower.includes('van') || lower.includes('sử') || lower.includes('su') || lower.includes('địa') || lower.includes('dia') || lower.includes('gdkt')) && d.slug === 'van-su-dia-gdkt-pl-an') ||
      ((lower.includes('văn phòng') || lower.includes('van phong') || lower.includes('hành chính') || lower.includes('phòng')) && d.slug === 'van-phong')
    );
  }

  function isTeacherInDept(teacher: Teacher, deptConfig: DepartmentConfig): boolean {
    if (teacher.departmentId === deptConfig.id) return true;
    const actualDept = departments.find(d => d.id === teacher.departmentId);
    if (actualDept && findDeptConfig(actualDept.name)?.slug === deptConfig.slug) return true;
    if (teacher.departmentName && findDeptConfig(teacher.departmentName)?.slug === deptConfig.slug) return true;
    if (teacher.subject) {
      const s = teacher.subject.toLowerCase();
      return deptConfig.subjects.some(sub => s.includes(sub.toLowerCase()));
    }
    return false;
  }

  function isDeptSpecificTask(wa: WorkAssignment): boolean {
    if (wa.scope === 'department') return true;
    if (wa.scope === 'school') return false;

    if (wa.departmentId && wa.departmentId !== 'global' && wa.departmentId !== 'all') {
      return true;
    }

    if (wa.assigneeIds && PRESET_DEPARTMENTS.some(d => wa.assigneeIds?.includes(d.groupToken))) {
      return true;
    }

    return false;
  }

  function isSchoolWideTask(wa: WorkAssignment): boolean {
    return !isDeptSpecificTask(wa);
  }

  function getAssignmentDepartmentName(wa: WorkAssignment): string {
    if (isSchoolWideTask(wa)) return 'Chung toàn trường';
    for (const d of PRESET_DEPARTMENTS) {
      if (isAssignmentInDept(wa, d)) {
        return d.shortName;
      }
    }
    const deptObj = departments.find(d => d.id === wa.departmentId);
    return deptObj ? deptObj.name : 'Chung toàn trường';
  }

  function isAssignmentInDept(wa: WorkAssignment, deptConfig: DepartmentConfig): boolean {
    if (wa.departmentId && wa.departmentId !== 'global' && wa.departmentId !== 'all') {
      if (wa.departmentId === deptConfig.id) return true;
      const deptObj = departments.find(d => d.id === wa.departmentId);
      if (deptObj && findDeptConfig(deptObj.name)?.slug === deptConfig.slug) return true;
      
      const otherDept = PRESET_DEPARTMENTS.find(d => d.id === wa.departmentId);
      if (otherDept && otherDept.slug !== deptConfig.slug) {
        return false;
      }
    }

    if (wa.departmentId === deptConfig.id) return true;
    const deptObj = departments.find(d => d.id === wa.departmentId);
    if (deptObj && findDeptConfig(deptObj.name)?.slug === deptConfig.slug) return true;

    if (wa.assigneeIds?.includes(deptConfig.groupToken)) return true;

    if (isDeptSpecificTask(wa)) {
      const assignedIds = wa.assigneeIds && wa.assigneeIds.length > 0 ? wa.assigneeIds : (wa.assigneeId ? [wa.assigneeId] : []);
      const hasMember = assignedIds.some(aid => {
        const t = teachers.find(teach => teach.id === aid);
        return t && isTeacherInDept(t, deptConfig);
      });
      if (hasMember) return true;

      if (wa.content.toLowerCase().includes(deptConfig.shortName.toLowerCase())) return true;
    }

    return false;
  }

  function getResolvedAssigneeTeachers(assignment: WorkAssignment): Teacher[] {
    const ids = assignment.assigneeIds && assignment.assigneeIds.length > 0 
      ? assignment.assigneeIds 
      : (assignment.assigneeId ? [assignment.assigneeId] : []);
    
    if (ids.length === 0) return [];
    
    if (ids.includes('GROUP_ALL')) {
      return teachers;
    }
    if (ids.includes('GROUP_GVCN')) {
      return teachers.filter(t => t.isHomeroom || (t.position || '').toLowerCase().includes('gvcn') || (t.position || '').toLowerCase().includes('chủ nhiệm'));
    }
    
    for (const dept of PRESET_DEPARTMENTS) {
      if (ids.includes(dept.groupToken)) {
        return teachers.filter(t => isTeacherInDept(t, dept));
      }
    }
    
    return teachers.filter(t => ids.includes(t.id));
  }

  function isUserAnAssignee(assignment: WorkAssignment, userId?: string): boolean {
    if (!userId) return false;
    if (assignment.assigneeIds && assignment.assigneeIds.includes(userId)) return true;
    if (assignment.assigneeId === userId) return true;
    const assignedTeachers = getResolvedAssigneeTeachers(assignment);
    return assignedTeachers.some(t => t.id === userId);
  }

  function canEvaluateTask(assignment: WorkAssignment): boolean {
    return Boolean(isAdmin || isHead || user?.id === assignment.evaluatorId || user?.id === assignment.createdBy);
  }

  function getTeacherNames(assignment: WorkAssignment): string {
    const ids = assignment.assigneeIds && assignment.assigneeIds.length > 0 
      ? assignment.assigneeIds 
      : (assignment.assigneeId ? [assignment.assigneeId] : []);
    
    if (ids.length === 0) return 'Toàn trường';
    
    const names = ids.map(id => {
      if (id === 'GROUP_ALL') return 'Toàn thể CBGVNV';
      if (id === 'GROUP_GVCN') return 'GVCN';
      const deptConf = PRESET_DEPARTMENTS.find(d => d.groupToken === id);
      if (deptConf) return `Toàn bộ ${deptConf.shortName}`;
      const t = teachers.find(teach => teach.id === id);
      return t ? t.name : 'CBGVNV';
    });

    return names.join(', ');
  }

  function getTeacherName(id?: string): string {
    if (!id) return '';
    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return '';
    return teacher.name;
  }

  function getEvaluatedAssignees(assignment: WorkAssignment): { id: string; name: string; result: ExecutionResult }[] {
    const list: { id: string; name: string; result: ExecutionResult }[] = [];
    const results = assignment.assigneeResults || {};

    Object.entries(results).forEach(([tId, res]) => {
      if (res === 'Hoàn thành tốt' || res === 'Quá hạn (Chậm muộn)') {
        const t = teachers.find(teach => teach.id === tId);
        list.push({
          id: tId,
          name: t ? t.name : (getTeacherName(tId) || 'CBGVNV'),
          result: res
        });
      }
    });

    if (list.length === 0 && assignment.evaluations) {
      Object.entries(assignment.evaluations).forEach(([tId, ev]) => {
        const rawRes = ev?.result as string | undefined;
        let mappedRes: ExecutionResult | null = null;
        if (rawRes === 'Hoàn thành tốt' || rawRes === 'Hoàn thành') {
          mappedRes = 'Hoàn thành tốt';
        } else if (rawRes === 'Quá hạn (Chậm muộn)' || rawRes === 'Chậm/muộn') {
          mappedRes = 'Quá hạn (Chậm muộn)';
        }

        if (mappedRes) {
          const t = teachers.find(teach => teach.id === tId);
          list.push({
            id: tId,
            name: t ? t.name : (getTeacherName(tId) || 'CBGVNV'),
            result: mappedRes
          });
        }
      });
    }

    return list;
  }

  function getTaskResultText(assignment: WorkAssignment): string {
    if (assignment.resultSummary) {
      return assignment.resultSummary;
    }
    const evaluated = getEvaluatedAssignees(assignment);
    if (evaluated.length > 0) {
      return evaluated.map(e => `${e.name}: ${e.result}`).join('; ');
    }
    if (assignment.evaluationResult) {
      return assignment.evaluationResult;
    }
    return '';
  }

  // Active department config
  const activeDeptConfig = useMemo(() => {
    if (activeTab === 'all') return null;
    return PRESET_DEPARTMENTS.find(d => d.slug === activeTab) || null;
  }, [activeTab]);

  // Teachers in active department
  const activeDeptTeachers = useMemo(() => {
    if (!activeDeptConfig) return [];
    return teachers.filter(t => isTeacherInDept(t, activeDeptConfig));
  }, [activeDeptConfig, teachers]);

  // 1. Visible assignments based on role & department tab
  const visibleAssignments = useMemo(() => {
    let list = workAssignments;
    
    // Ban Giám hiệu được xem toàn bộ công việc và toàn bộ trạng thái (Yêu cầu 12)
    if (!isAdmin) {
      if (isHead) {
        list = list.filter(wa => 
          isSchoolWideTask(wa) ||
          wa.evaluatorId === user?.id ||
          wa.createdBy === user?.id ||
          wa.assigneeId === user?.id || 
          (wa.assigneeIds && wa.assigneeIds.includes(user?.id || '')) ||
          (activeDeptConfig && isAssignmentInDept(wa, activeDeptConfig))
        );
      } else {
        const userTeacher = teachers.find(t => t.id === user?.id);
        const userDept = userTeacher ? PRESET_DEPARTMENTS.find(d => isTeacherInDept(userTeacher, d)) : null;

        list = list.filter(wa => 
          isSchoolWideTask(wa) ||
          wa.assigneeId === user?.id || 
          (wa.assigneeIds && wa.assigneeIds.includes(user?.id || '')) ||
          wa.assigneeIds?.includes('GROUP_ALL') ||
          (userTeacher?.isHomeroom && wa.assigneeIds?.includes('GROUP_GVCN')) ||
          (userDept && wa.assigneeIds?.includes(userDept.groupToken))
        );
      }
    }

    // Filter strictly by active department tab if one is chosen
    if (activeDeptConfig) {
      list = list.filter(wa => isAssignmentInDept(wa, activeDeptConfig));
    }

    return list;
  }, [workAssignments, isAdmin, isHead, user, activeDeptConfig, teachers]);

  // 2. CHỈ HIỂN THỊ CÔNG VIỆC THUỘC TUẦN ĐANG ĐƯỢC CHỌN (Yêu cầu 5)
  const currentWeekAssignments = useMemo(() => {
    return visibleAssignments.filter(wa => isTaskInWeek(wa, currentWeek, selectedYear));
  }, [visibleAssignments, currentWeek, selectedYear]);

  // 3. Filtered assignments based on user's active filters and search (Yêu cầu 9)
  const filteredAssignments = useMemo(() => {
    return currentWeekAssignments.filter(wa => {
      // Tìm kiếm theo nội dung công việc hoặc tên người thực hiện
      const matchSearch = 
        wa.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (wa.requirements || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wa.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wa.resultSummary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTeacherNames(wa).toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lọc theo Tổ/Đơn vị
      let matchDept = true;
      if (filterDepartment !== 'all') {
        if (filterDepartment === 'school') {
          matchDept = isSchoolWideTask(wa);
        } else {
          const deptConf = PRESET_DEPARTMENTS.find(d => d.slug === filterDepartment || d.id === filterDepartment);
          if (deptConf) {
            matchDept = isAssignmentInDept(wa, deptConf);
          }
        }
      }

      // Lọc theo Người được giao
      let matchAssignee = true;
      if (filterAssignee) {
        matchAssignee = isUserAnAssignee(wa, filterAssignee);
      }

      // Lọc theo Trạng thái (Yêu cầu 6, 7: tự động tính Quá hạn)
      let matchStatus = true;
      if (filterStatus) {
        const effective = getEffectiveTaskStatus(wa);
        matchStatus = effective === filterStatus;
      }

      // Lọc theo Mức độ ưu tiên
      let matchPriority = true;
      if (filterPriority) {
        matchPriority = (wa.priority || 'Trung bình') === filterPriority;
      }

      return matchSearch && matchDept && matchAssignee && matchStatus && matchPriority;
    });
  }, [currentWeekAssignments, searchTerm, filterDepartment, filterAssignee, filterStatus, filterPriority]);

  // 4. CÁC Ô THỐNG KÊ TỰ ĐỘNG TÍNH THEO TUẦN ĐANG CHỌN (Yêu cầu 8)
  const weekStats = useMemo(() => {
    const total = currentWeekAssignments.length;
    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    currentWeekAssignments.forEach(wa => {
      const status = getEffectiveTaskStatus(wa);
      if (status === 'Quá hạn') {
        overdue += 1;
      } else if (status === 'Hoàn thành' || status === 'Hoàn thành tốt') {
        completed += 1;
      } else if (status === 'Đang thực hiện' || status === 'Chậm tiến độ') {
        inProgress += 1;
      } else {
        notStarted += 1;
      }
    });

    return {
      total,
      notStarted,
      inProgress,
      completed,
      overdue
    };
  }, [currentWeekAssignments]);

  // Xuất Excel tuần đang chọn (Yêu cầu 3 & 13)
  const handleExportExcel = () => {
    exportWeeklyTasksToExcel({
      weekNumber: currentWeek.weekNumber,
      startDateStr: currentWeek.startDateStr,
      endDateStr: currentWeek.endDateStr,
      scopeTitle: activeDeptConfig ? activeDeptConfig.name : 'TOÀN TRƯỜNG',
      tasks: filteredAssignments,
      teachers,
      getTeacherNames,
      getDepartmentName: getAssignmentDepartmentName,
      getEffectiveStatus: getEffectiveTaskStatus,
      getResultText: getTaskResultText
    });
  };

  // Xuất Word tuần đang chọn (Yêu cầu 3 & 13)
  const handleExportWord = async () => {
    try {
      await exportWeeklyTasksToWord({
        weekNumber: currentWeek.weekNumber,
        startDateStr: currentWeek.startDateStr,
        endDateStr: currentWeek.endDateStr,
        scopeTitle: activeDeptConfig ? activeDeptConfig.name : 'TOÀN TRƯỜNG',
        tasks: filteredAssignments,
        teachers,
        getTeacherNames,
        getDepartmentName: getAssignmentDepartmentName,
        getEffectiveStatus: getEffectiveTaskStatus,
        getResultText: getTaskResultText
      });
    } catch (e) {
      console.error('Lỗi khi xuất Word:', e);
      alert('Có lỗi khi tạo tệp Word.');
    }
  };

  // Mở modal Giao việc mới (Yêu cầu 10)
  const openCreateModal = () => {
    setEditingAssignment(null);
    setShowCrossDeptTeachers(false);

    let defaultDeptId = activeDeptConfig ? activeDeptConfig.id : 'global';
    let defaultEvaluator = user?.id || '';

    if (activeDeptConfig) {
      const head = teachers.find(t => 
        isTeacherInDept(t, activeDeptConfig) && 
        ((t.role || '').includes('TTCM') || (t.position || '').toLowerCase().includes('tổ trưởng'))
      );
      if (head) defaultEvaluator = head.id;
    }

    setFormData({
      departmentId: defaultDeptId,
      scope: defaultDeptId === 'global' ? 'school' : 'department',
      academic_year: selectedYear,
      academicYear: selectedYear,
      week_number: currentWeek.weekNumber,
      weekNumber: currentWeek.weekNumber,
      weekLabel: currentWeek.weekLabel,
      workDate: currentWeek.startDateIso,
      deadline: currentWeek.endDateIso,
      priority: 'Trung bình',
      status: 'Chưa thực hiện',
      assigneeIds: [],
      assigneeId: '',
      requirements: '',
      note: '',
      evidenceUrl: '',
      evidenceName: '',
      evaluatorId: defaultEvaluator
    });
    setIsModalOpen(true);
  };

  const openEditModal = (assignment: WorkAssignment) => {
    setEditingAssignment(assignment);
    setActiveMenu(null);
    setShowCrossDeptTeachers(false);
    const assignedYear = assignment.academic_year || assignment.academicYear || selectedYear;
    const assignedWeekNum = assignment.week_number ?? assignment.weekNumber ?? currentWeek.weekNumber;
    setFormData({
      departmentId: assignment.departmentId || 'global',
      scope: assignment.scope || ((assignment.departmentId && assignment.departmentId !== 'global' && assignment.departmentId !== 'all') ? 'department' : 'school'),
      academic_year: assignedYear,
      academicYear: assignedYear,
      week_number: assignedWeekNum,
      weekNumber: assignedWeekNum,
      weekLabel: assignment.weekLabel || `Tuần ${String(assignedWeekNum).padStart(2, '0')}`,
      workDate: assignment.workDate,
      deadline: assignment.deadline,
      priority: assignment.priority || 'Trung bình',
      status: assignment.status || 'Chưa thực hiện',
      content: assignment.content,
      assigneeIds: assignment.assigneeIds || (assignment.assigneeId ? [assignment.assigneeId] : []),
      requirements: assignment.requirements || '',
      note: assignment.note || '',
      evidenceUrl: assignment.evidenceUrl || '',
      evidenceName: assignment.evidenceName || '',
      evaluatorId: assignment.evaluatorId,
      completedAssigneeIds: assignment.completedAssigneeIds || [],
      overdueAssigneeIds: assignment.overdueAssigneeIds || [],
      incompleteAssigneeIds: assignment.incompleteAssigneeIds || []
    });
    setIsModalOpen(true);
  };

  // Mở modal cập nhật tiến độ (Yêu cầu 11)
  const openProgressModal = (task: WorkAssignment) => {
    setActiveMenu(null);
    setProgressAssignment(task);
    setIsProgressModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setActiveMenu(null);
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteWorkAssignment(deletingId);
      setDeletingId(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content?.trim()) {
      alert('Vui lòng nhập Nội dung công việc.');
      return;
    }
    
    if (!formData.assigneeIds || formData.assigneeIds.length === 0) {
      alert('Vui lòng chọn ít nhất một Người được giao hoặc đối tượng thực hiện.');
      return;
    }

    if (new Date(formData.deadline!) < new Date(formData.workDate!)) {
      alert('Thời hạn hoàn thành không được trước ngày giao việc.');
      return;
    }

    const fallbackAssigneeId = formData.assigneeIds[0];
    const isDeptScope = formData.departmentId && formData.departmentId !== 'global' && formData.departmentId !== 'all';
    const scope = isDeptScope ? 'department' : 'school';

    const targetAcademicYear = formData.academic_year || selectedYear;
    const targetWeekNum = formData.week_number || currentWeek.weekNumber;
    const targetWeekObj = getWeekInfoByNumber(targetWeekNum, targetAcademicYear);

    if (editingAssignment) {
      updateWorkAssignment(editingAssignment.id, {
        ...formData,
        departmentId: formData.departmentId || 'global',
        scope,
        academic_year: targetAcademicYear,
        academicYear: targetAcademicYear,
        week_number: targetWeekNum,
        weekNumber: targetWeekNum,
        weekLabel: targetWeekObj.weekLabel,
        assigneeId: fallbackAssigneeId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addWorkAssignment({
        id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        departmentId: formData.departmentId || 'global',
        scope,
        academic_year: targetAcademicYear,
        academicYear: targetAcademicYear,
        week_number: targetWeekNum,
        weekNumber: targetWeekNum,
        weekLabel: targetWeekObj.weekLabel,
        workDate: formData.workDate || targetWeekObj.startDateIso,
        deadline: formData.deadline || targetWeekObj.endDateIso,
        content: formData.content!.trim(),
        priority: formData.priority || 'Trung bình',
        requirements: formData.requirements?.trim() || '',
        note: formData.note?.trim() || '',
        evidenceUrl: formData.evidenceUrl?.trim() || '',
        evidenceName: formData.evidenceName?.trim() || '',
        assigneeIds: formData.assigneeIds,
        assigneeId: fallbackAssigneeId,
        evaluatorId: formData.evaluatorId || user?.id || 'system',
        status: formData.status! as any,
        progress: formData.status === 'Hoàn thành' || formData.status === 'Hoàn thành tốt' ? 100 : 0,
        createdBy: user?.id || 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsModalOpen(false);
  };

  const toggleAssignee = (id: string) => {
    const currentIds = formData.assigneeIds || [];
    if (currentIds.includes(id)) {
      setFormData({ ...formData, assigneeIds: currentIds.filter(x => x !== id) });
    } else {
      setFormData({ ...formData, assigneeIds: [...currentIds, id] });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn file dung lượng dưới 5MB.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      evidenceName: file.name
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        evidenceUrl: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const formDeptConfig = useMemo(() => {
    if (!formData.departmentId || formData.departmentId === 'global') return null;
    return PRESET_DEPARTMENTS.find(d => d.id === formData.departmentId) || null;
  }, [formData.departmentId]);

  const formDeptTeachers = useMemo(() => {
    if (!formDeptConfig) return teachers;
    return teachers.filter(t => isTeacherInDept(t, formDeptConfig));
  }, [formDeptConfig, teachers]);

  const otherDeptTeachers = useMemo(() => {
    if (!formDeptConfig) return [];
    return teachers.filter(t => !isTeacherInDept(t, formDeptConfig));
  }, [formDeptConfig, teachers]);

  // Render Status Badge with Colors (Yêu cầu 6, 7)
  const renderStatusBadge = (status: WorkAssignmentStatus, progress?: number) => {
    switch (status) {
      case 'Hoàn thành tốt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
            <span className="text-amber-500">⭐</span>
            Hoàn thành tốt
          </span>
        );
      case 'Hoàn thành':
      case 'Đã hoàn thành':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Hoàn thành
          </span>
        );
      case 'Đang thực hiện':
        return (
          <div className="inline-flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Đang thực hiện {progress !== undefined ? `(${progress}%)` : ''}
            </span>
            {progress !== undefined && progress > 0 && (
              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden mt-0.5">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        );
      case 'Chậm tiến độ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Chậm tiến độ
          </span>
        );
      case 'Quá hạn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs whitespace-nowrap">
            <AlertTriangle size={12} className="text-rose-600 shrink-0" />
            Quá hạn
          </span>
        );
      case 'Chưa thực hiện':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Chưa thực hiện
          </span>
        );
    }
  };

  // Render Priority Badge
  const renderPriorityBadge = (priority?: WorkAssignmentPriority) => {
    switch (priority) {
      case 'Khẩn cấp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <Flame size={11} className="text-rose-600" />
            Khẩn cấp
          </span>
        );
      case 'Cao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <Flag size={11} className="text-orange-600" />
            Cao
          </span>
        );
      case 'Thấp':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Thấp
          </span>
        );
      case 'Trung bình':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Trung bình
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1550px] mx-auto space-y-5 pb-16 font-sans">
      <div className="flex items-center no-print">
        <BackButton />
      </div>

      {/* HEADER BANNER */}
      <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-[22px] border border-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <LayoutList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 uppercase tracking-wide">
                Bảng Giao Việc Theo Tuần
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                THPT Minh Hòa
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Theo dõi phân công công việc theo tuần học, kiểm soát tiến độ, hạn hoàn thành và tự động nhận diện quá hạn
            </p>
          </div>
        </div>

        {/* Action button header */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {canManageTasks && (
            <button 
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="mr-1.5 h-4 w-4 stroke-[3]" />
              + Giao việc
            </button>
          )}
          <button
            type="button"
            onClick={() => setMainView(mainView === 'history' ? 'list' : 'history')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer",
              mainView === 'history'
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <CheckSquare size={16} />
            <span>{mainView === 'history' ? 'Về Bảng tuần' : 'Lịch sử đánh giá'}</span>
          </button>
        </div>
      </div>

      {mainView === 'history' ? (
        <TaskEvaluationsHistory />
      ) : (
        <div className="space-y-5">
          {/* THANH ĐIỀU KHIỂN CHỌN TUẦN & XUẤT BÁO CÁO (Yêu cầu 1, 2, 3, 5, 12) */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-[22px] shadow-lg border border-blue-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print">
            {/* Nhóm điều khiển Năm học - Dropdown Tuần - Thời gian */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
              {/* Năm học: [2026–2027 ▼] */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-300 whitespace-nowrap">
                  Năm học:
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-xs transition-colors"
                >
                  {ACADEMIC_YEARS.map(yr => (
                    <option key={yr} value={yr} className="text-slate-900 bg-white font-semibold">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô SELECT/DROPDOWN CHỌN TUẦN: 📅 Tuần: [ Tuần 03 ▼ ] */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-300 whitespace-nowrap flex items-center gap-1">
                  <span>📅</span> Tuần:
                </span>
                <div className="relative">
                  <select
                    value={selectedWeekNumber}
                    onChange={(e) => handleWeekChange(Number(e.target.value))}
                    aria-label="Chọn tuần"
                    className="bg-white text-slate-900 font-black rounded-xl pl-3.5 pr-8 py-2 text-xs sm:text-sm shadow-md border-2 border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer appearance-none min-w-[130px]"
                  >
                    {allWeeks.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber} className="text-slate-900 font-bold py-1">
                        {w.weekLabel}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs">
                    ▼
                  </span>
                </div>
              </div>

              {/* Hiển thị rõ thông tin sau ô chọn tuần: TUẦN 03 | TỪ 14/09/2026 ĐẾN 20/09/2026 */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-400/10 rounded-xl border border-amber-400/30 backdrop-blur-md shadow-xs">
                <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-amber-300">
                  {currentWeek.label}
                </span>
              </div>
            </div>

            {/* Nhóm nút: [Tạo giao việc] [Tạo / Nhập lịch trường] [Xuất Excel] [Xuất Word] */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              {canManageTasks && (
                <>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Tạo giao việc mới cho tuần này"
                  >
                    <Plus size={16} className="stroke-[3]" />
                    <span>Tạo giao việc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
                    title="Tạo và nhập lịch giao việc trường từ file mẫu, Excel hoặc Word"
                  >
                    <Sparkles size={16} className="text-amber-300" />
                    <span>Lịch Giao Việc Trường</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-400/40"
                title="Xuất bảng giao việc tuần này ra Excel"
              >
                <FileSpreadsheet size={16} />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-blue-400/40"
                title="Xuất bảng giao việc tuần này ra Word (.docx)"
              >
                <FileText size={16} />
                <span>Xuất Word</span>
              </button>
            </div>
          </div>

          {/* CHUYỂN ĐỔI CHẾ ĐỘ XEM: BẢNG DANH SÁCH VS LỊCH TUẦN THEO THỨ */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 no-print">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  viewLayout === 'table'
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <LayoutList size={16} />
                <span>Bảng Giao Việc Chi Tiết</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLayout('calendar')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  viewLayout === 'calendar'
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <CalendarIcon size={16} />
                <span>Lịch Giao Việc Theo Thứ (7 Ngày)</span>
              </button>
            </div>

            {canManageTasks && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Tạo / Đồng bộ Lịch Chuẩn Trường</span>
              </button>
            )}
          </div>

          {/* CÁC Ô THỐNG KÊ THEO TUẦN ĐANG CHỌN (Yêu cầu 8) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 no-print">
            {/* TỔNG CÔNG VIỆC */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
                <CheckSquare size={22} className="text-slate-700" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Tổng công việc
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-800">
                  {weekStats.total}
                </span>
              </div>
            </div>

            {/* CHƯA THỰC HIỆN */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                <Clock size={22} className="text-slate-500" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Chưa thực hiện
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-600">
                  {weekStats.notStarted}
                </span>
              </div>
            </div>

            {/* ĐANG THỰC HIỆN */}
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs flex items-center gap-3 bg-gradient-to-br from-white to-blue-50/40">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Play size={20} className="text-blue-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider block">
                  Đang thực hiện
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-700">
                  {weekStats.inProgress}
                </span>
              </div>
            </div>

            {/* ĐÃ HOÀN THÀNH */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3 bg-gradient-to-br from-white to-emerald-50/40">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle size={22} className="text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                  Đã hoàn thành
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {weekStats.completed}
                </span>
              </div>
            </div>

            {/* QUÁ HẠN (Tự động nhận diện) */}
            <div className={cn(
              "p-4 rounded-2xl border shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1",
              weekStats.overdue > 0 
                ? "bg-rose-50/80 border-rose-200 text-rose-900" 
                : "bg-white border-slate-200 text-slate-800"
            )}>
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0",
                weekStats.overdue > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
              )}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <span className={cn(
                  "text-[11px] font-extrabold uppercase tracking-wider block",
                  weekStats.overdue > 0 ? "text-rose-600" : "text-slate-400"
                )}>
                  Quá hạn
                </span>
                <span className={cn(
                  "text-xl sm:text-2xl font-black",
                  weekStats.overdue > 0 ? "text-rose-600" : "text-slate-700"
                )}>
                  {weekStats.overdue}
                </span>
              </div>
            </div>
          </div>

          {/* BỘ LỌC CÔNG VIỆC (Yêu cầu 9) */}
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 no-print">
            {/* Lọc Tổ/Đơn vị */}
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-w-[150px]"
            >
              <option value="all">Tất cả Tổ / Đơn vị</option>
              <option value="school">Chung toàn trường</option>
              {PRESET_DEPARTMENTS.map(d => (
                <option key={d.slug} value={d.slug}>{d.shortName}</option>
              ))}
            </select>

            {/* Lọc Người được giao */}
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-w-[180px]"
            >
              <option value="">Lọc theo người được giao</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.subject ? `(${t.subject})` : ''}
                </option>
              ))}
            </select>

            {/* Lọc Trạng thái (Yêu cầu 6) */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-w-[150px]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chưa thực hiện">Chưa thực hiện</option>
              <option value="Đang thực hiện">Đang thực hiện</option>
              <option value="Chậm tiến độ">Chậm tiến độ</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Hoàn thành tốt">Hoàn thành tốt ⭐</option>
              <option value="Quá hạn">Quá hạn ⚠</option>
            </select>

            {/* Lọc Mức độ ưu tiên */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-w-[140px]"
            >
              <option value="">Mức độ ưu tiên</option>
              <option value="Khẩn cấp">Khẩn cấp 🔥</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>

            {/* Ô tìm kiếm theo nội dung hoặc tên người thực hiện (Yêu cầu 9) */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Tìm nội dung công việc, người thực hiện..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              />
            </div>

            {/* Nút In ấn */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer"
              title="In bảng giao việc"
            >
              <Printer size={18} />
            </button>
          </div>

          {/* HIỂN THỊ DỮ LIỆU: BẢNG CHI TIẾT HOẶC LỊCH THEO THỨ */}
          {viewLayout === 'calendar' ? (
            <TaskWeeklyCalendarView
              currentWeek={currentWeek}
              tasks={filteredAssignments}
              teachers={teachers}
              getTeacherNames={getTeacherNames}
              getEffectiveStatus={getEffectiveTaskStatus}
              onEditTask={openEditModal}
              onProgressTask={openProgressModal}
              onCreateTaskForDay={(isoDate) => {
                setEditingAssignment(null);
                setFormData({
                  departmentId: activeDeptConfig ? activeDeptConfig.id : 'global',
                  scope: activeDeptConfig ? 'department' : 'school',
                  academic_year: selectedYear,
                  academicYear: selectedYear,
                  week_number: currentWeek.weekNumber,
                  weekNumber: currentWeek.weekNumber,
                  weekLabel: currentWeek.weekLabel,
                  workDate: isoDate,
                  deadline: isoDate,
                  priority: 'Trung bình',
                  status: 'Chưa thực hiện',
                  assigneeIds: [],
                  requirements: '',
                  note: '',
                  evaluatorId: user?.id || ''
                });
                setIsModalOpen(true);
              }}
              isAdminOrHead={canManageTasks}
            />
          ) : (
            /* BẢNG GIAO VIỆC THEO TUẦN (Yêu cầu 4) */
            <div className="bg-white rounded-[22px] border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                    <th className="py-3 px-3 border-r border-slate-200 text-center w-12 shrink-0">STT</th>
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[260px]">Nội dung công việc</th>
                    <th className="py-3 px-3 border-r border-slate-200 min-w-[170px]">Người được giao</th>
                    <th className="py-3 px-3 border-r border-slate-200 min-w-[130px] text-center">Tổ / Đơn vị</th>
                    <th className="py-3 px-3 border-r border-slate-200 w-24 text-center">Ngày giao</th>
                    <th className="py-3 px-3 border-r border-slate-200 w-28 text-center">Hạn hoàn thành</th>
                    <th className="py-3 px-3 border-r border-slate-200 min-w-[140px] text-center">Trạng thái</th>
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[180px]">Kết quả</th>
                    <th className="py-3 px-3 text-center min-w-[110px] no-print">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 px-4 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <LayoutList size={32} className="mx-auto text-slate-400" />
                          <p className="font-bold text-slate-700 text-sm">
                            {currentWeekAssignments.length === 0
                              ? "Tuần này chưa có công việc được giao."
                              : "Không có công việc nào phù hợp với bộ lọc."}
                          </p>
                          {currentWeekAssignments.length === 0 && canManageTasks && (
                            <button
                              type="button"
                              onClick={openCreateModal}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 mt-2"
                            >
                              <Plus size={14} /> + Giao việc tuần này
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((task, index) => {
                      const effectiveStatus = getEffectiveTaskStatus(task);
                      const isPast = isTaskOverdue(task);
                      const deptName = getAssignmentDepartmentName(task);
                      const isAssignee = isUserAnAssignee(task, user?.id);
                      const canEditThisTask = canManageTasks || task.createdBy === user?.id;

                      return (
                        <tr 
                          key={task.id} 
                          className={cn(
                            "hover:bg-blue-50/40 transition-colors",
                            effectiveStatus === 'Quá hạn' && "bg-rose-50/30"
                          )}
                        >
                          {/* STT */}
                          <td className="py-3 px-3 border-r border-slate-200 text-center font-bold text-slate-600">
                            {index + 1}
                          </td>

                          {/* NỘI DUNG CÔNG VIỆC */}
                          <td className="py-3 px-4 border-r border-slate-200 align-top">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 leading-snug">
                                  {task.content}
                                </span>
                                {task.priority && renderPriorityBadge(task.priority)}
                              </div>

                              {task.requirements && (
                                <div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200/80">
                                  <span className="font-semibold text-slate-700">Yêu cầu:</span> {task.requirements}
                                </div>
                              )}

                              {task.note && (
                                <div className="text-[11px] text-slate-500 italic">
                                  <span className="font-medium">Ghi chú:</span> {task.note}
                                </div>
                              )}

                              {task.evidenceUrl && (
                                <div className="pt-1">
                                  <a
                                    href={task.evidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                                  >
                                    <Paperclip size={12} />
                                    <span>{task.evidenceName || 'Minh chứng đính kèm'}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* NGƯỜI ĐƯỢC GIAO */}
                          <td className="py-3 px-3 border-r border-slate-200 align-top">
                            <div className="space-y-1">
                              {getTeacherNames(task).split(', ').map((name, i) => (
                                <div
                                  key={i}
                                  className="text-xs font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700 truncate max-w-[170px]"
                                  title={name}
                                >
                                  {name}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* TỔ/ĐƠN VỊ */}
                          <td className="py-3 px-3 border-r border-slate-200 align-top text-center">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                              {deptName}
                            </span>
                          </td>

                          {/* NGÀY GIAO */}
                          <td className="py-3 px-3 border-r border-slate-200 align-top text-center text-xs font-medium text-slate-700">
                            {safeFormatLocale(task.workDate, 'toLocaleDateString', '—')}
                          </td>

                          {/* HẠN HOÀN THÀNH */}
                          <td className="py-3 px-3 border-r border-slate-200 align-top text-center text-xs">
                            <span className={cn(
                              "font-bold",
                              isPast ? "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" : "text-slate-700"
                            )}>
                              {safeFormatLocale(task.deadline, 'toLocaleDateString', '—')}
                            </span>
                          </td>

                          {/* TRẠNG THÁI */}
                          <td className="py-3 px-3 border-r border-slate-200 align-top text-center">
                            {renderStatusBadge(effectiveStatus, task.progress)}
                          </td>

                          {/* KẾT QUẢ */}
                          <td className="py-3 px-4 border-r border-slate-200 align-top">
                            {(() => {
                              const resultText = getTaskResultText(task);
                              if (!resultText) {
                                return <span className="text-slate-400 text-xs italic">—</span>;
                              }
                              return (
                                <div className="space-y-1 text-xs">
                                  <div className="text-slate-800 font-medium whitespace-pre-wrap break-words leading-relaxed">
                                    {resultText}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* THAO TÁC */}
                          <td className="py-3 px-3 align-top text-center no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Nút Cập nhật tiến độ & Kết quả (cho người được giao hoặc quản lý) */}
                              <button
                                type="button"
                                onClick={() => openProgressModal(task)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                title="Cập nhật trạng thái, tiến độ và kết quả thực hiện"
                              >
                                Cập nhật
                              </button>

                              {/* Nút Đánh giá (cho BGH / TTCM / Người đánh giá) */}
                              {canEvaluateTask(task) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEvaluatingAssignment(task);
                                    setIsEvalModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                  title="Đánh giá công việc / kết nối KPI"
                                >
                                  Đánh giá
                                </button>
                              )}

                              {/* Menu khác */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMenu(activeMenu === task.id ? null : task.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {activeMenu === task.id && (
                                  <div className="absolute right-0 top-6 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 z-30 w-44 text-left animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      type="button"
                                      onClick={() => openProgressModal(task)}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <CheckCircle size={14} className="text-blue-600" /> Báo cáo tiến độ
                                    </button>

                                    {canEditThisTask && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(task)}
                                          className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                        >
                                          <Edit size={14} className="text-slate-500" /> Chỉnh sửa việc
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(task.id)}
                                          className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                        >
                                          <Trash2 size={14} /> Xóa công việc
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* MODAL TẠO & NHẬP LỊCH GIAO VIỆC TRƯỜNG */}
      <TaskImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        selectedWeek={selectedWeekNumber}
        selectedYear={selectedYear}
        onImportTasks={async (newTasks) => {
          await importWorkAssignments(newTasks);
        }}
        onResetToOfficial={async () => {
          await seedOrResetSchoolTasks();
        }}
      />

      {/* CREATE / EDIT TASK MODAL (Yêu cầu 10) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  {editingAssignment ? 'Chỉnh sửa công việc giao' : '+ Giao việc mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân công nhiệm vụ cho tuần học: <strong>{currentWeek.label}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* 1. NỘI DUNG CÔNG VIỆC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nội dung công việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.content || ''}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập tên và nội dung công việc được giao..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* 2. TỔ / ĐƠN VỊ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tổ / Đơn vị thực hiện <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, departmentId: 'global', scope: 'school' })}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                      formData.departmentId === 'global' || !formData.departmentId
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <Building2 size={14} />
                    <span>Toàn trường</span>
                  </button>

                  {PRESET_DEPARTMENTS.map(dept => {
                    const isSelected = formData.departmentId === dept.id;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, departmentId: dept.id, scope: 'department' })}
                        className={cn(
                          "p-2 rounded-xl border text-xs font-bold transition-all text-center truncate cursor-pointer",
                          isSelected
                            ? cn(dept.color.bg, "text-white border-transparent shadow-xs")
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {dept.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. NGƯỜI ĐƯỢC GIAO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Người được giao (Chọn một hoặc nhiều) <span className="text-rose-500">*</span>
                </label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1 custom-scrollbar text-xs">
                  {/* Nhóm nhanh */}
                  <label className="flex items-center gap-2.5 p-1.5 rounded hover:bg-blue-50 cursor-pointer font-bold text-blue-900 border-b border-slate-200 pb-2 mb-1">
                    <input
                      type="checkbox"
                      checked={formData.assigneeIds?.includes('GROUP_ALL') || false}
                      onChange={() => toggleAssignee('GROUP_ALL')}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Toàn thể CBGVNV</span>
                  </label>

                  {formDeptConfig && (
                    <label className="flex items-center gap-2.5 p-1.5 rounded hover:bg-blue-50 cursor-pointer font-bold text-indigo-900 border-b border-slate-200 pb-2 mb-1">
                      <input
                        type="checkbox"
                        checked={formData.assigneeIds?.includes(formDeptConfig.groupToken) || false}
                        onChange={() => toggleAssignee(formDeptConfig.groupToken)}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span>Tất cả thành viên {formDeptConfig.shortName}</span>
                    </label>
                  )}

                  {/* Giáo viên trong tổ / trường */}
                  {formDeptTeachers.map(t => {
                    const isChecked = formData.assigneeIds?.includes(t.id) || false;
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors",
                          isChecked ? "bg-blue-100/70 font-semibold text-blue-950" : "hover:bg-slate-100 text-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAssignee(t.id)}
                            className="w-3.5 h-3.5 rounded text-blue-600"
                          />
                          <span>{t.name}</span>
                          {t.subject && <span className="text-[10px] text-slate-400">({t.subject})</span>}
                        </div>
                        <span className="text-[10px] text-slate-400">{t.position || t.role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. NGÀY GIAO & HẠN HOÀN THÀNH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Ngày giao <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.workDate}
                    onChange={e => setFormData({ ...formData, workDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Hạn hoàn thành <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.deadline}
                    min={formData.workDate}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* 5. MỨC ĐỘ ƯU TIÊN & TRẠNG THÁI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={formData.priority || 'Trung bình'}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as WorkAssignmentPriority })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn cấp">Khẩn cấp 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Trạng thái khởi tạo
                  </label>
                  <select
                    value={formData.status || 'Chưa thực hiện'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as WorkAssignmentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  >
                    <option value="Chưa thực hiện">Chưa thực hiện</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Hoàn thành tốt">Hoàn thành tốt ⭐</option>
                    <option value="Chậm tiến độ">Chậm tiến độ</option>
                  </select>
                </div>
              </div>

              {/* 6. NỘI DUNG YÊU CẦU */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nội dung yêu cầu chi tiết
                </label>
                <textarea
                  rows={2}
                  value={formData.requirements || ''}
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Yêu cầu cụ thể, tiêu chí đạt, mẫu sản phẩm bàn giao..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* 7. GHI CHÚ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formData.note || ''}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú thêm nếu có..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 8. FILE MINH CHỨNG NẾU CÓ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  File minh chứng / Đường dẫn đính kèm nếu có
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.evidenceUrl || ''}
                    onChange={e => setFormData({ ...formData, evidenceUrl: e.target.value })}
                    placeholder="Nhập link liên kết nếu có (https://...)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Paperclip size={13} />
                      <span>Chọn file đính kèm</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      />
                    </label>
                    {formData.evidenceName && (
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                        {formData.evidenceName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>{editingAssignment ? 'Lưu cập nhật' : 'Giao việc ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT TIẾN ĐỘ & KẾT QUẢ (Yêu cầu 11) */}
      {isProgressModalOpen && progressAssignment && (
        <TaskProgressModal
          task={progressAssignment}
          onClose={() => {
            setIsProgressModalOpen(false);
            setProgressAssignment(null);
          }}
          onSave={async (id, updates) => {
            await updateWorkAssignment(id, updates);
            setIsProgressModalOpen(false);
            setProgressAssignment(null);
          }}
        />
      )}

      {/* MODAL ĐÁNH GIÁ CÔNG VIỆC / KẾT NỐI KPI */}
      {isEvalModalOpen && evaluatingAssignment && (
        <TaskEvaluationModal 
          assignment={evaluatingAssignment} 
          initialAssigneeId={evaluatingAssigneeId}
          onClose={() => {
            setIsEvalModalOpen(false);
            setEvaluatingAssignment(null);
            setEvaluatingAssigneeId(undefined);
          }} 
          onSave={async (id, updates) => {
            await updateWorkAssignment(id, { ...updates, updatedAt: new Date().toISOString() });
            setIsEvalModalOpen(false);
            setEvaluatingAssignment(null);
            setEvaluatingAssigneeId(undefined);
          }} 
        />
      )}

      {/* MODAL XÁC NHẬN XÓA CÔNG VIỆC */}
      {deletingId && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Xóa công việc</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa công việc này? Dữ liệu sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
