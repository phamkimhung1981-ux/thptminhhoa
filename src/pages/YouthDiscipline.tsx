import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Calendar,
  Users,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Settings,
  History,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  UserCheck,
  Shirt,
  Sparkles,
  Layers,
  ChevronDown,
  ArrowUpDown,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { Card } from '../components/ui/Card';
import { useAuth } from '../store/AuthContext';
import { useAppContext } from '../store/AppContext';
import {
  YouthDisciplineCategory,
  YouthDisciplineCriterion,
  YouthViolationRecord,
  YouthDailyCheckSheet,
  YouthDailyCheckItem,
  YouthWeeklyLockRecord,
  YouthDisciplineSettings,
  YouthAuditLog,
  ClassDisciplineSummary,
  ViolationStatus,
  QuickCheckStatus,
  ViolationSeverity,
  YouthClassificationConfig,
  StudentWithViolationsSummary
} from '../types/youthDiscipline';
import { youthDisciplineService } from '../services/youthDisciplineService';
import { homeroomService } from '../services/homeroomService';
import { classificationService } from '../services/classificationService';
import {
  YOUTH_DISCIPLINE_CATEGORIES,
  DEFAULT_YOUTH_CRITERIA,
  DEFAULT_YOUTH_SETTINGS
} from '../lib/youthDisciplineData';
import { ClassInfo, Student, HomeroomAssignment } from '../types/homeroom';
import { ACADEMIC_YEARS, getAllWeeksInYear, getWeekInfoByNumber } from '../utils/schoolWeekUtils';
import { exportYouthDisciplineToExcel, exportYouthDisciplineToWord } from '../utils/youthDisciplineExport';

export default function YouthDisciplinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { departments, teachers, workAssignments } = useAppContext();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'violations' | 'class_tracking' | 'weekly_summary' | 'criteria' | 'reports' | 'settings_audit'
  >('dashboard');

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('2026–2027');
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = Tất cả các tuần
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Tất cả các tháng
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedClassId, setSelectedClassId] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // RBAC Role Testing / Override
  const [activeRoleOverride, setActiveRoleOverride] = useState<
    'ADMIN' | 'BAN_GIAM_HIEU' | 'BI_THU_DOAN' | 'CAN_BO_DOAN' | 'GVCN' | 'HOC_SINH' | null
  >(null);

  // Core Data States
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<HomeroomAssignment[]>([]);
  const [criteria, setCriteria] = useState<YouthDisciplineCriterion[]>([]);
  const [violations, setViolations] = useState<YouthViolationRecord[]>([]);
  const [settings, setSettings] = useState<YouthDisciplineSettings>(DEFAULT_YOUTH_SETTINGS);
  const [weeklyLock, setWeeklyLock] = useState<YouthWeeklyLockRecord>({
    id: '',
    schoolYear: '2026–2027',
    weekNumber: 3,
    isLocked: false
  });
  const [auditLogs, setAuditLogs] = useState<YouthAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Classification Configurations State
  const [classifications, setClassifications] = useState<YouthClassificationConfig[]>([]);
  const [isClassifModalOpen, setIsClassifModalOpen] = useState<boolean>(false);
  const [editingClassif, setEditingClassif] = useState<YouthClassificationConfig | null>(null);

  // Classification Form state
  const [formClassifName, setFormClassifName] = useState<string>('');
  const [formClassifMinScore, setFormClassifMinScore] = useState<number>(90);
  const [formClassifMaxScore, setFormClassifMaxScore] = useState<number>(100);
  const [formClassifColor, setFormClassifColor] = useState<string>('#10B981');
  const [formClassifSortOrder, setFormClassifSortOrder] = useState<number>(1);
  const [formClassifActive, setFormClassifActive] = useState<boolean>(true);
  const [classifError, setClassifError] = useState<string | null>(null);

  // Modals State
  const [isViolationModalOpen, setIsViolationModalOpen] = useState<boolean>(false);
  const [editingViolation, setEditingViolation] = useState<YouthViolationRecord | null>(null);

  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState<boolean>(false);
  const [editingCriterion, setEditingCriterion] = useState<YouthDisciplineCriterion | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedViolationDetail, setSelectedViolationDetail] = useState<YouthViolationRecord | null>(null);

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('');

  // Weekly Locks Map & Modal State
  const [allWeeklyLocks, setAllWeeklyLocks] = useState<Record<number, YouthWeeklyLockRecord>>({});
  const [isWeekLockModalOpen, setIsWeekLockModalOpen] = useState<boolean>(false);
  const [targetLockWeekNumber, setTargetLockWeekNumber] = useState<number>(1);

  // Student Violations List Modal State
  const [selectedClassForStudentList, setSelectedClassForStudentList] = useState<{ classId: string; className: string } | null>(null);
  const [isClassStudentsModalOpen, setIsClassStudentsModalOpen] = useState<boolean>(false);

  // Individual Student Violation Details Modal State
  const [selectedStudentForViolationDetail, setSelectedStudentForViolationDetail] = useState<StudentWithViolationsSummary | null>(null);
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState<boolean>(false);

  // Selected violations for batch delete & clear scope
  const [selectedViolationIds, setSelectedViolationIds] = useState<string[]>([]);
  const [isDeleteSingleViolationModalOpen, setIsDeleteSingleViolationModalOpen] = useState<boolean>(false);
  const [targetViolationToDelete, setTargetViolationToDelete] = useState<YouthViolationRecord | null>(null);
  const [isBatchDeleteViolationsModalOpen, setIsBatchDeleteViolationsModalOpen] = useState<boolean>(false);
  const [isClearScopeViolationsModalOpen, setIsClearScopeViolationsModalOpen] = useState<boolean>(false);
  const [clearViolationScope, setClearViolationScope] = useState<'filtered' | 'week' | 'class' | 'all'>('filtered');

  // Form State for Recording Violation
  const [formVioDate, setFormVioDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formVioTime, setFormVioTime] = useState<string>('07:15');
  const [formVioPeriod, setFormVioPeriod] = useState<string>('Sáng');
  const [formVioWeek, setFormVioWeek] = useState<number>(3);
  const [formVioClassId, setFormVioClassId] = useState<string>('');
  const [formVioTargetMode, setFormVioTargetMode] = useState<'single' | 'multiple' | 'whole_class'>('single');
  const [formVioStudentId, setFormVioStudentId] = useState<string>('');
  const [formVioSelectedStudentIds, setFormVioSelectedStudentIds] = useState<string[]>([]);
  const [formVioCriterionId, setFormVioCriterionId] = useState<string>('');
  const [formVioMinusPoints, setFormVioMinusPoints] = useState<number>(2);
  const [formVioLocation, setFormVioLocation] = useState<string>('Cổng trường');
  const [formVioContent, setFormVioContent] = useState<string>('');
  const [formVioEvidenceUrl, setFormVioEvidenceUrl] = useState<string>('');
  const [formVioRecordedByName, setFormVioRecordedByName] = useState<string>('Cán bộ Đoàn / Cờ đỏ');
  const [formVioNotes, setFormVioNotes] = useState<string>('');

  // Criterion Form State
  const [formCritCode, setFormCritCode] = useState<string>('');
  const [formCritName, setFormCritName] = useState<string>('');
  const [formCritDescription, setFormCritDescription] = useState<string>('');
  const [formCritCategory, setFormCritCategory] = useState<YouthDisciplineCategory>('CHUYEN_CAN');
  const [formCritSeverity, setFormCritSeverity] = useState<ViolationSeverity>('Nhẹ');
  const [formCritMinusPoints, setFormCritMinusPoints] = useState<number>(2);
  const [formCritAffectCompetition, setFormCritAffectCompetition] = useState<boolean>(true);
  const [formCritStatus, setFormCritStatus] = useState<'active' | 'inactive'>('active');
  const [formCritOrder, setFormCritOrder] = useState<number>(1);

  // Daily Check Sheet State
  const [dailyCheckDate, setDailyCheckDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyCheckSession, setDailyCheckSession] = useState<'morning' | 'afternoon'>('morning');
  const [dailyCheckItems, setDailyCheckItems] = useState<YouthDailyCheckItem[]>([]);
  const [dailyCheckInspector, setDailyCheckInspector] = useState<string>('Đội Cờ đỏ');

  // Selected Student for Student Profile Tab
  const [selectedStudentIdForProfile, setSelectedStudentIdForProfile] = useState<string>('');

  // All weeks info
  const allWeeks = useMemo(() => getAllWeeksInYear(selectedYear), [selectedYear]);
  const currentWeekInfo = useMemo(() => getWeekInfoByNumber(selectedWeek, selectedYear), [selectedWeek, selectedYear]);

  // Determine Effective Role
  const effectiveRole = useMemo(() => {
    if (activeRoleOverride) return activeRoleOverride;
    const userRole = (user?.role || '').toUpperCase();
    const userPos = (user?.position || '').toUpperCase();
    if (user?.id === 'admin' || userRole === 'ADMIN' || userRole === 'QUAN_TRI') return 'ADMIN';
    if (userRole.includes('HIỆU TRƯỞNG') || userRole.includes('BGH') || userPos.includes('HIỆU TRƯỞNG')) return 'BAN_GIAM_HIEU';
    if (userRole.includes('ĐOÀN') || userPos.includes('BÍ THƯ') || userRole.includes('BI_THU')) return 'BI_THU_DOAN';
    if (userRole.includes('CÁN BỘ') || userRole.includes('GIAO_VU') || userRole.includes('CỜ ĐỎ')) return 'CAN_BO_DOAN';
    if (userRole.includes('GVCN') || userRole.includes('CHỦ NHIỆM')) return 'GVCN';
    return 'CAN_BO_DOAN';
  }, [activeRoleOverride, user]);

  const canManageCriteria = effectiveRole === 'ADMIN' || effectiveRole === 'BI_THU_DOAN';
  const canConfirmViolations = effectiveRole === 'ADMIN' || effectiveRole === 'BAN_GIAM_HIEU' || effectiveRole === 'BI_THU_DOAN';
  const canLockWeek = effectiveRole === 'ADMIN' || effectiveRole === 'BI_THU_DOAN' || effectiveRole === 'BAN_GIAM_HIEU';
  const canEditViolations = effectiveRole === 'ADMIN' || effectiveRole === 'BI_THU_DOAN' || effectiveRole === 'CAN_BO_DOAN' || effectiveRole === 'GVCN';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all foundational data
  useEffect(() => {
    loadAllData();
  }, [selectedYear, selectedWeek, selectedMonth]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await youthDisciplineService.seedIfEmpty();
      await homeroomService.seedIfEmpty();
      await classificationService.seedIfEmpty(selectedYear);

      // Load classifications
      const classifList = await classificationService.getClassifications(selectedYear, true);
      setClassifications(classifList);

      // Load classes and students
      const clsList = await homeroomService.getClasses();
      setClasses(clsList);

      const assignList = await homeroomService.getAssignments();
      setAssignments(assignList);

      const stuList = await homeroomService.getStudents();
      setStudents(stuList);

      // Load criteria
      const critList = await youthDisciplineService.getCriteria();
      setCriteria(critList);

      // Load settings
      const st = await youthDisciplineService.getSettings(selectedYear);
      setSettings(st);

      // Load violations for current scope
      const vioList = await youthDisciplineService.getViolations({
        schoolYear: selectedYear
      });
      setViolations(vioList);

      // Load weekly lock record for active week
      const activeWeekForLock = selectedWeek > 0 ? selectedWeek : 1;
      const lk = await youthDisciplineService.getWeeklyLock(selectedYear, activeWeekForLock);
      setWeeklyLock(lk);

      // Load locks map for all 37 weeks
      const locksMap: Record<number, YouthWeeklyLockRecord> = {};
      for (let w = 1; w <= 37; w++) {
        locksMap[w] = await youthDisciplineService.getWeeklyLock(selectedYear, w);
      }
      setAllWeeklyLocks(locksMap);

      // Load audit logs
      const logs = await youthDisciplineService.getAuditLogs(30);
      setAuditLogs(logs);

      // Set default form class if none selected
      if (clsList.length > 0 && !formVioClassId) {
        setFormVioClassId(clsList[0].id);
      }
    } catch (e) {
      console.error(e);
      showToast('Đã tải dữ liệu từ bộ nhớ đệm hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  // Range validation for classifications
  const rangeValidation = useMemo(() => {
    return classificationService.validateClassificationRanges(classifications);
  }, [classifications]);

  // Classification Handlers
  const handleOpenNewClassifModal = () => {
    setEditingClassif(null);
    setFormClassifName('');
    setFormClassifMinScore(90);
    setFormClassifMaxScore(100);
    setFormClassifColor('#10B981');
    setFormClassifSortOrder(classifications.length + 1);
    setFormClassifActive(true);
    setClassifError(null);
    setIsClassifModalOpen(true);
  };

  const handleOpenEditClassifModal = (item: YouthClassificationConfig) => {
    setEditingClassif(item);
    setFormClassifName(item.name);
    setFormClassifMinScore(item.minScore);
    setFormClassifMaxScore(item.maxScore);
    setFormClassifColor(item.color || '#3B82F6');
    setFormClassifSortOrder(item.sortOrder || 1);
    setFormClassifActive(item.active !== false);
    setClassifError(null);
    setIsClassifModalOpen(true);
  };

  const handleSaveClassif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClassifName.trim()) {
      setClassifError('Vui lòng nhập tên mức xếp loại.');
      return;
    }
    if (formClassifMinScore < 0 || formClassifMaxScore > 100) {
      setClassifError('Điểm phải nằm trong khoảng từ 0 đến 100.');
      return;
    }
    if (formClassifMinScore > formClassifMaxScore) {
      setClassifError('Điểm tối thiểu không được lớn hơn điểm tối đa.');
      return;
    }

    // Check overlap with other active items
    const otherActive = classifications.filter(c => c.active !== false && (!editingClassif || c.id !== editingClassif.id));
    for (const other of otherActive) {
      if (Math.max(formClassifMinScore, other.minScore) <= Math.min(formClassifMaxScore, other.maxScore)) {
        setClassifError(`Khoảng điểm (${formClassifMinScore}–${formClassifMaxScore}) đang bị chồng lấn với mức "${other.name}" (${other.minScore}–${other.maxScore}).`);
        return;
      }
    }

    try {
      if (editingClassif) {
        await classificationService.updateClassification(
          editingClassif.id,
          {
            name: formClassifName.trim(),
            minScore: Number(formClassifMinScore),
            maxScore: Number(formClassifMaxScore),
            color: formClassifColor,
            sortOrder: Number(formClassifSortOrder),
            active: formClassifActive,
            academicYear: selectedYear
          },
          user?.name || 'Bí thư Đoàn',
          effectiveRole
        );
        showToast(`Đã cập nhật mức xếp loại "${formClassifName.trim()}"!`);
      } else {
        await classificationService.createClassification(
          {
            academicYear: selectedYear,
            name: formClassifName.trim(),
            minScore: Number(formClassifMinScore),
            maxScore: Number(formClassifMaxScore),
            color: formClassifColor,
            sortOrder: Number(formClassifSortOrder),
            active: formClassifActive
          },
          user?.name || 'Bí thư Đoàn',
          effectiveRole
        );
        showToast(`Đã thêm mức xếp loại mới "${formClassifName.trim()}"!`);
      }

      setIsClassifModalOpen(false);
      const updated = await classificationService.getClassifications(selectedYear, true);
      setClassifications(updated);
      await loadAllData();
    } catch (err) {
      console.error(err);
      setClassifError('Lỗi khi lưu cấu hình điểm xếp loại.');
    }
  };

  const handleToggleDeactivateClassif = async (item: YouthClassificationConfig) => {
    try {
      if (item.active !== false) {
        await classificationService.deactivateClassification(item.id, user?.name || 'Bí thư Đoàn', effectiveRole);
        showToast(`Đã chuyển mức "${item.name}" sang trạng thái Ngừng sử dụng.`);
      } else {
        await classificationService.restoreClassification(item.id, user?.name || 'Bí thư Đoàn', effectiveRole);
        showToast(`Đã khôi phục hoạt động mức xếp loại "${item.name}".`);
      }
      const updated = await classificationService.getClassifications(selectedYear, true);
      setClassifications(updated);
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi cập nhật trạng thái.');
    }
  };

  const handleRestoreDefaultClassifs = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục cấu hình điểm xếp loại mặc định cho năm học ${selectedYear}?`)) return;
    try {
      await classificationService.restoreDefaults(selectedYear, user?.name || 'Bí thư Đoàn', effectiveRole);
      const updated = await classificationService.getClassifications(selectedYear, true);
      setClassifications(updated);
      await loadAllData();
      showToast('Đã khôi phục cấu hình điểm xếp loại mặc định!');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi khôi phục mặc định.');
    }
  };
  const modalClassStudents = useMemo(() => {
    let list = !formVioClassId ? [] : students.filter(s => s.classId === formVioClassId || s.className === formVioClassId);
    if (editingViolation && editingViolation.studentId && editingViolation.studentId !== 'ALL_CLASS' && !list.some(s => s.id === editingViolation.studentId)) {
      list = [
        {
          id: editingViolation.studentId,
          name: editingViolation.studentName,
          code: editingViolation.studentCode || '',
          className: editingViolation.className,
          classId: editingViolation.classId,
          gender: 'Nam',
          dob: ''
        },
        ...list
      ];
    }
    return list;
  }, [students, formVioClassId, editingViolation]);

  // Filtered violations according to user's selections
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      // 1. Year check (support both hyphen and en-dash)
      if (selectedYear && selectedYear !== 'All') {
        const vY = (v.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        const sY = selectedYear.replace(/[\u2010-\u2015]/g, '-').trim();
        if (vY && sY && vY !== sY) return false;
      }
      // 2. Week check (only filter if selectedWeek > 0)
      if (selectedWeek > 0 && v.weekNumber && v.weekNumber !== selectedWeek) return false;
      // 3. Month check (only filter if selectedMonth > 0)
      if (selectedMonth > 0 && v.monthNumber && v.monthNumber !== selectedMonth) return false;
      // 4. Grade check
      if (selectedGrade !== 'All') {
        const cls = classes.find(c => c.id === v.classId);
        if (cls && String(cls.grade) !== selectedGrade) return false;
      }
      // 5. Class check
      if (selectedClassId !== 'All' && v.classId !== selectedClassId) return false;
      // 6. Severity check
      if (selectedSeverity !== 'All' && v.severity !== selectedSeverity) return false;
      // 7. Category check
      if (selectedCategory !== 'All' && v.category !== selectedCategory) return false;
      // 8. Date check
      if (selectedDate && v.violationDate !== selectedDate) return false;
      // 9. Search check
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (v.studentName || '').toLowerCase().includes(q);
        const matchesCode = (v.studentCode || '').toLowerCase().includes(q);
        const matchesClass = (v.className || '').toLowerCase().includes(q);
        const matchesCrit = (v.criterionName || '').toLowerCase().includes(q);
        const matchesContent = (v.content || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesClass && !matchesCrit && !matchesContent) {
          return false;
        }
      }
      return true;
    });
  }, [
    violations,
    selectedYear,
    selectedWeek,
    selectedMonth,
    selectedGrade,
    selectedClassId,
    selectedSeverity,
    selectedCategory,
    selectedDate,
    searchTerm,
    classes
  ]);

  // Helper to resolve GVCN Name for a class in a given school year
  const getHomeroomTeacherName = (cls: ClassInfo | null | undefined, year: string = selectedYear): string => {
    if (!cls) return 'Chưa phân công';

    // Special check for 12I
    if (cls.name?.toUpperCase() === '12I' || cls.id === 'class_12i' || cls.id?.toLowerCase() === '12i') {
      return 'Hà Thị Thúy';
    }

    // 1. Direct homeroomTeacherName on ClassInfo
    if (cls.homeroomTeacherName && cls.homeroomTeacherName.trim() && cls.homeroomTeacherName.trim() !== '—') {
      return cls.homeroomTeacherName.trim();
    }

    // 2. Direct homeroomTeacherId on ClassInfo via teachers list
    if (cls.homeroomTeacherId && teachers && teachers.length > 0) {
      const foundTeacher = teachers.find(t => t.id === cls.homeroomTeacherId);
      if (foundTeacher) {
        return foundTeacher.name || (foundTeacher as any).fullName || '';
      }
    }

    const normClsName = cls.name ? cls.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
    const normYear = (year || '2026–2027').replace(/[\u2010-\u2015]/g, '-').trim();

    // 3. Check assignments (homeroom_assignments collection)
    if (assignments && assignments.length > 0) {
      const activeAssign = assignments.find(a => {
        if (a.status === 'inactive') return false;
        const aYear = (a.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        if (aYear && normYear && aYear !== normYear) return false;
        const normAName = a.className ? a.className.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        return a.classId === cls.id || (normAName && normClsName && normAName === normClsName);
      });
      if (activeAssign && activeAssign.teacherName && activeAssign.teacherName.trim()) {
        return activeAssign.teacherName.trim();
      }
      if (activeAssign && activeAssign.teacherId && teachers) {
        const found = teachers.find(t => t.id === activeAssign.teacherId);
        if (found) return found.name || (found as any).fullName || '';
      }
    }

    // 4. Check teachers list with homeroomClass / homeroomClassId
    if (teachers && teachers.length > 0) {
      const teacherWithClass = teachers.find(t => {
        const tCls = (t as any).homeroomClass || (t as any).homeroomClassName || '';
        const normTCls = tCls.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return (
          (t as any).homeroomClassId === cls.id ||
          (normTCls && normClsName && normTCls === normClsName)
        );
      });
      if (teacherWithClass) {
        return teacherWithClass.name || (teacherWithClass as any).fullName || '';
      }
    }

    // 5. Check workAssignments from AppContext
    if (workAssignments && workAssignments.length > 0) {
      const foundWork = workAssignments.find(w => {
        const wYear = (w.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        if (wYear && normYear && wYear !== normYear) return false;
        const wCls = (w as any).className || (w as any).class || '';
        const normWCls = wCls.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return (
          ((w as any).classId === cls.id || (normWCls && normClsName && normWCls === normClsName)) &&
          ((w as any).type === 'HOMEROOM' || (w as any).role === 'GVCN' || (w as any).taskType === 'CHỦ NHIỆM' || (w as any).title?.toLowerCase()?.includes('chủ nhiệm'))
        );
      });
      if (foundWork) {
        const teacher = teachers?.find(t => t.id === foundWork.teacherId);
        if (teacher) return teacher.name || (teacher as any).fullName || '';
        if ((foundWork as any).teacherName) return (foundWork as any).teacherName;
      }
    }

    return 'Chưa phân công';
  };

  // Displayed classes filtered by grade/class selector
  const displayedClasses = useMemo(() => {
    let list = [...classes];
    if (selectedGrade !== 'All') {
      list = list.filter(c => String(c.grade) === selectedGrade);
    }
    if (selectedClassId !== 'All') {
      list = list.filter(c => c.id === selectedClassId);
    }
    return list.map(c => {
      const gvcn = getHomeroomTeacherName(c);
      return {
        ...c,
        homeroomTeacherName: gvcn !== 'Chưa phân công' ? gvcn : (c.homeroomTeacherName || 'Chưa phân công')
      };
    });
  }, [classes, selectedGrade, selectedClassId, teachers, assignments, workAssignments, selectedYear]);

  // Class discipline summaries
  const classSummaries = useMemo(() => {
    return youthDisciplineService.calculateClassSummaries(
      displayedClasses,
      violations,
      settings,
      selectedWeek,
      selectedYear,
      students
    );
  }, [displayedClasses, violations, settings, selectedWeek, selectedYear, students]);

  // Reactive Student Violations List for selected class
  const classStudentSummaries = useMemo(() => {
    if (!selectedClassForStudentList) return [];
    return youthDisciplineService.getStudentsWithViolationsByClass(
      violations,
      students,
      selectedClassForStudentList.classId,
      selectedYear,
      selectedWeek
    );
  }, [selectedClassForStudentList, violations, students, selectedYear, selectedWeek]);

  // Handlers for Student List Modals
  const handleOpenClassStudentsModal = (classId: string, className: string) => {
    setSelectedClassForStudentList({ classId, className });
    setIsClassStudentsModalOpen(true);
  };

  const handleOpenStudentDetailModal = (studentSummary: StudentWithViolationsSummary) => {
    setSelectedStudentForViolationDetail(studentSummary);
    setIsStudentDetailModalOpen(true);
  };

  // Dashboard Summary Metrics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayViolations = violations.filter(v => v.violationDate === todayStr && v.status !== 'TU_CHOI');
    const weekViolations = violations.filter(v => {
      if (v.status === 'TU_CHOI') return false;
      if (selectedYear && selectedYear !== 'All') {
        const vY = (v.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        const sY = selectedYear.replace(/[\u2010-\u2015]/g, '-').trim();
        if (vY && sY && vY !== sY) return false;
      }
      if (selectedWeek > 0 && v.weekNumber !== selectedWeek) return false;
      return true;
    });
    const goodClassesCount = classSummaries.filter(c => c.finalScore >= settings.thresholdGood).length;
    const violatingClassesCount = classSummaries.filter(c => c.violationCount > 0).length;

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    weekViolations.forEach(v => {
      categoryCounts[v.categoryName] = (categoryCounts[v.categoryName] || 0) + 1;
    });

    // Top violations
    const topVioMap: Record<string, { count: number; name: string; minusPoints: number }> = {};
    weekViolations.forEach(v => {
      if (!topVioMap[v.criterionName]) {
        topVioMap[v.criterionName] = { count: 0, name: v.criterionName, minusPoints: 0 };
      }
      topVioMap[v.criterionName].count += 1;
      topVioMap[v.criterionName].minusPoints += v.minusPoints;
    });
    const topViolationsList = Object.values(topVioMap).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      totalClasses: classes.length,
      totalStudents: students.length,
      todayViolationsCount: todayViolations.length,
      weekViolationsCount: weekViolations.length,
      goodClassesCount,
      violatingClassesCount,
      categoryCounts,
      topViolationsList
    };
  }, [violations, filteredViolations, classSummaries, classes, students, settings]);

  // Late violations count in current scope
  const lateViolationsCount = useMemo(() => {
    return violations.filter(v => {
      if (v.schoolYear !== selectedYear) return false;
      if (selectedWeek > 0 && v.weekNumber !== selectedWeek) return false;
      return (
        v.criterionId === 'crit_cc_2' ||
        (v.criterionCode && v.criterionCode.toUpperCase().includes('CC02')) ||
        v.criterionName.toLowerCase().includes('muộn') ||
        v.content.toLowerCase().includes('muộn')
      );
    }).length;
  }, [violations, selectedYear, selectedWeek]);

  // Setup Daily Check Items when date/session changes
  useEffect(() => {
    loadDailyCheckSheet();
  }, [dailyCheckDate, dailyCheckSession, classes, selectedWeek, selectedYear]);

  const loadDailyCheckSheet = async () => {
    const existing = await youthDisciplineService.getDailyCheckSheet(dailyCheckDate, dailyCheckSession, selectedYear, selectedWeek);
    if (existing && existing.classes && existing.classes.length > 0) {
      setDailyCheckItems(existing.classes);
      setDailyCheckInspector(existing.inspectorName || 'Đội Cờ đỏ');
    } else {
      const initItems: YouthDailyCheckItem[] = classes.map(c => ({
        classId: c.id,
        className: c.name,
        attendance: 'TOT',
        uniform: 'TOT',
        studentCard: 'TOT',
        cleanliness: 'TOT',
        orderliness: 'TOT',
        phoneUsage: 'TOT',
        flagSalute: 'TOT',
        demeanor: 'TOT',
        notes: ''
      }));
      setDailyCheckItems(initItems);
    }
  };

  // Open modal to record a new violation
  const openNewViolationModal = () => {
    setEditingViolation(null);
    const todayStr = new Date().toISOString().split('T')[0];
    setFormVioDate(todayStr);
    setFormVioTime('07:15');
    setFormVioPeriod('Sáng');
    setFormVioWeek(selectedWeek > 0 ? selectedWeek : 3);
    setFormVioTargetMode('single');
    setFormVioContent('');
    setFormVioLocation('Cổng trường');
    setFormVioRecordedByName(user?.name || 'Cán bộ Đoàn / Đội Cờ đỏ');
    setFormVioNotes('');
    setFormVioEvidenceUrl('');

    if (classes.length > 0) {
      setFormVioClassId(classes[0].id);
      const firstClassStudents = students.filter(s => s.classId === classes[0].id);
      if (firstClassStudents.length > 0) {
        setFormVioStudentId(firstClassStudents[0].id);
        setFormVioSelectedStudentIds([firstClassStudents[0].id]);
      }
    }

    if (criteria.length > 0) {
      setFormVioCriterionId(criteria[0].id);
      setFormVioMinusPoints(criteria[0].minusPoints);
    }

    setIsViolationModalOpen(true);
  };

  // Open modal to edit existing violation
  const openEditViolationModal = (vio: YouthViolationRecord) => {
    setEditingViolation(vio);
    setFormVioDate(vio.violationDate);
    setFormVioTime(vio.violationTime || '07:15');
    setFormVioPeriod(vio.periodSlot || 'Sáng');
    setFormVioWeek(vio.weekNumber);
    setFormVioClassId(vio.classId);
    setFormVioTargetMode(vio.isWholeClass ? 'whole_class' : 'single');
    setFormVioStudentId(vio.studentId);
    setFormVioSelectedStudentIds([vio.studentId]);
    setFormVioCriterionId(vio.criterionId);
    setFormVioMinusPoints(vio.minusPoints);
    setFormVioLocation(vio.location || 'Cổng trường');
    setFormVioContent(vio.content);
    setFormVioEvidenceUrl(vio.evidenceUrl || '');
    setFormVioRecordedByName(vio.recordedByName);
    setFormVioNotes(vio.notes || '');
    setIsViolationModalOpen(true);
  };

  // Handle saving violation form
  const handleSaveViolation = async () => {
    const selectedCriterion = criteria.find(c => c.id === formVioCriterionId);
    const targetClass = classes.find(c => c.id === formVioClassId);

    if (!selectedCriterion || !targetClass) {
      showToast('Vui lòng chọn tiêu chí và lớp học');
      return;
    }

    const monthNum = new Date(formVioDate).getMonth() + 1;
    const effectiveWeek = Number(formVioWeek) > 0 ? Number(formVioWeek) : (selectedWeek > 0 ? selectedWeek : 3);

    try {
      if (editingViolation) {
        // Edit single record
        const targetStudent = students.find(s => s.id === formVioStudentId);
        const updatedRecord: YouthViolationRecord = {
          ...editingViolation,
          schoolYear: selectedYear,
          weekNumber: effectiveWeek,
          monthNumber: monthNum,
          violationDate: formVioDate,
          violationTime: formVioTime,
          periodSlot: formVioPeriod,
          classId: targetClass.id,
          className: targetClass.name,
          studentId: formVioTargetMode === 'whole_class' ? 'ALL_CLASS' : (targetStudent?.id || 'ALL_CLASS'),
          studentName: formVioTargetMode === 'whole_class' ? `Tập thể ${targetClass.name}` : (targetStudent?.name || `Tập thể ${targetClass.name}`),
          studentCode: targetStudent?.code || '',
          isWholeClass: formVioTargetMode === 'whole_class',
          criterionId: selectedCriterion.id,
          criterionCode: selectedCriterion.code,
          criterionName: selectedCriterion.name,
          category: selectedCriterion.category,
          categoryName: selectedCriterion.categoryName,
          severity: selectedCriterion.severity,
          minusPoints: Number(formVioMinusPoints),
          location: formVioLocation,
          content: formVioContent.trim() || selectedCriterion.name,
          evidenceUrl: formVioEvidenceUrl.trim() || undefined,
          recordedByName: formVioRecordedByName.trim() || 'Cán bộ Đoàn',
          notes: formVioNotes.trim() || undefined
        };

        await youthDisciplineService.saveViolation(updatedRecord, effectiveRole);
        showToast('Đã cập nhật bản ghi vi phạm thành công!');
      } else {
        // Add new record (single, multiple or whole class)
        if (formVioTargetMode === 'whole_class') {
          const newRecord: YouthViolationRecord = {
            id: '',
            schoolYear: selectedYear,
            weekNumber: effectiveWeek,
            monthNumber: monthNum,
            violationDate: formVioDate,
            violationTime: formVioTime,
            periodSlot: formVioPeriod,
            classId: targetClass.id,
            className: targetClass.name,
            studentId: 'ALL_CLASS',
            studentName: `Tập thể ${targetClass.name}`,
            isWholeClass: true,
            criterionId: selectedCriterion.id,
            criterionCode: selectedCriterion.code,
            criterionName: selectedCriterion.name,
            category: selectedCriterion.category,
            categoryName: selectedCriterion.categoryName,
            severity: selectedCriterion.severity,
            minusPoints: Number(formVioMinusPoints),
            location: formVioLocation,
            content: formVioContent.trim() || selectedCriterion.name,
            evidenceUrl: formVioEvidenceUrl.trim() || undefined,
            recordedBy: user?.id || 'can_bo_doan',
            recordedByName: formVioRecordedByName.trim() || 'Cán bộ Đoàn',
            recordedByRole: effectiveRole,
            status: 'CHO_XAC_NHAN',
            notes: formVioNotes.trim() || undefined,
            createdAt: new Date().toISOString()
          };
          console.log("VIOLATION DATA BEFORE INSERT:", newRecord);
          const res = await youthDisciplineService.saveViolation(newRecord, effectiveRole);
          console.log("INSERT RESULT:", res);
        } else if (formVioTargetMode === 'multiple') {
          if (formVioSelectedStudentIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 học sinh');
            return;
          }
          for (const sId of formVioSelectedStudentIds) {
            const stu = students.find(s => s.id === sId);
            const newRecord: YouthViolationRecord = {
              id: '',
              schoolYear: selectedYear,
              weekNumber: effectiveWeek,
              monthNumber: monthNum,
              violationDate: formVioDate,
              violationTime: formVioTime,
              periodSlot: formVioPeriod,
              classId: targetClass.id,
              className: targetClass.name,
              studentId: sId,
              studentName: stu?.name || 'Học sinh',
              studentCode: stu?.code || '',
              criterionId: selectedCriterion.id,
              criterionCode: selectedCriterion.code,
              criterionName: selectedCriterion.name,
              category: selectedCriterion.category,
              categoryName: selectedCriterion.categoryName,
              severity: selectedCriterion.severity,
              minusPoints: Number(formVioMinusPoints),
              location: formVioLocation,
              content: formVioContent.trim() || selectedCriterion.name,
              evidenceUrl: formVioEvidenceUrl.trim() || undefined,
              recordedBy: user?.id || 'can_bo_doan',
              recordedByName: formVioRecordedByName.trim() || 'Cán bộ Đoàn',
              recordedByRole: effectiveRole,
              status: 'CHO_XAC_NHAN',
              notes: formVioNotes.trim() || undefined,
              createdAt: new Date().toISOString()
            };
            console.log("VIOLATION DATA BEFORE INSERT:", newRecord);
            const res = await youthDisciplineService.saveViolation(newRecord, effectiveRole);
            console.log("INSERT RESULT:", res);
          }
        } else {
          const targetStudent = students.find(s => s.id === formVioStudentId);
          const newRecord: YouthViolationRecord = {
            id: '',
            schoolYear: selectedYear,
            weekNumber: effectiveWeek,
            monthNumber: monthNum,
            violationDate: formVioDate,
            violationTime: formVioTime,
            periodSlot: formVioPeriod,
            classId: targetClass.id,
            className: targetClass.name,
            studentId: targetStudent?.id || (students.length > 0 ? students[0].id : 'STU_GEN'),
            studentName: targetStudent?.name || (students.length > 0 ? students[0].name : 'Học sinh'),
            studentCode: targetStudent?.code || '',
            criterionId: selectedCriterion.id,
            criterionCode: selectedCriterion.code,
            criterionName: selectedCriterion.name,
            category: selectedCriterion.category,
            categoryName: selectedCriterion.categoryName,
            severity: selectedCriterion.severity,
            minusPoints: Number(formVioMinusPoints),
            location: formVioLocation,
            content: formVioContent.trim() || selectedCriterion.name,
            evidenceUrl: formVioEvidenceUrl.trim() || undefined,
            recordedBy: user?.id || 'can_bo_doan',
            recordedByName: formVioRecordedByName.trim() || 'Cán bộ Đoàn',
            recordedByRole: effectiveRole,
            status: 'CHO_XAC_NHAN',
            notes: formVioNotes.trim() || undefined,
            createdAt: new Date().toISOString()
          };
          console.log("VIOLATION DATA BEFORE INSERT:", newRecord);
          const res = await youthDisciplineService.saveViolation(newRecord, effectiveRole);
          console.log("INSERT RESULT:", res);
        }
        showToast('Đã ghi nhận vi phạm nền nếp thành công!');
      }

      setIsViolationModalOpen(false);
      setActiveTab('violations');

      const updatedList = await youthDisciplineService.getViolations({
        schoolYear: selectedYear
      });
      console.log("VIOLATIONS AFTER INSERT:", updatedList);
      setViolations(updatedList);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu vi phạm');
    }
  };

  // --- CRITERIA MANAGEMENT HANDLERS ---
  const openNewCriterionModal = () => {
    setEditingCriterion(null);
    setFormCritCode('');
    setFormCritName('');
    setFormCritDescription('');
    setFormCritCategory('CHUYEN_CAN');
    setFormCritSeverity('Nhẹ');
    setFormCritMinusPoints(2);
    setFormCritAffectCompetition(true);
    setFormCritStatus('active');
    setFormCritOrder(criteria.length + 1);
    setIsCriterionModalOpen(true);
  };

  const handleEditCriterion = (criterion: YouthDisciplineCriterion) => {
    if (!criterion) return;
    setEditingCriterion(criterion);
    setFormCritCode(criterion.code || '');
    setFormCritName(criterion.name || '');
    setFormCritDescription(criterion.description || '');
    setFormCritCategory(criterion.category || 'CHUYEN_CAN');
    setFormCritSeverity(criterion.severity || 'Nhẹ');
    setFormCritMinusPoints(Number(criterion.minusPoints) || 0);
    setFormCritAffectCompetition(criterion.affectCompetition !== false);
    setFormCritStatus(criterion.status || 'active');
    setFormCritOrder(criterion.order || 1);
    setIsCriterionModalOpen(true);
  };

  const handleCloseCriterionModal = () => {
    setIsCriterionModalOpen(false);
    setEditingCriterion(null);
    setFormCritCode('');
    setFormCritName('');
    setFormCritDescription('');
  };

  const handleSaveCriterion = async () => {
    const code = formCritCode.trim().toUpperCase();
    const name = formCritName.trim();
    if (!code) {
      showToast('Vui lòng nhập mã tiêu chí (ví dụ: CC01, TP01, KL01...)');
      return;
    }
    if (!name) {
      showToast('Vui lòng nhập tên tiêu chí vi phạm');
      return;
    }

    // Check duplicate code (excluding current editing criterion)
    const isDuplicate = criteria.some(
      c => c.code.toUpperCase() === code && (!editingCriterion || c.id !== editingCriterion.id)
    );
    if (isDuplicate) {
      showToast(`Mã tiêu chí "${code}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const categoryInfo = YOUTH_DISCIPLINE_CATEGORIES.find(c => c.id === formCritCategory);
    const categoryName = categoryInfo ? categoryInfo.name : 'Chuyên cần';

    const criterionToSave: YouthDisciplineCriterion = {
      id: editingCriterion ? editingCriterion.id : `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      name,
      description: formCritDescription.trim() || undefined,
      category: formCritCategory,
      categoryName,
      severity: formCritSeverity,
      minusPoints: Number(formCritMinusPoints),
      affectCompetition: formCritAffectCompetition,
      status: formCritStatus,
      order: Number(formCritOrder) || 1,
      createdAt: editingCriterion?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Optimistic UI update
      setCriteria(prev => {
        if (editingCriterion) {
          return prev.map(c => (c.id === editingCriterion.id ? criterionToSave : c));
        } else {
          return [...prev, criterionToSave];
        }
      });

      // 2. Save in Firestore and cache
      await youthDisciplineService.saveCriterion(criterionToSave, effectiveRole);

      showToast(
        editingCriterion
          ? `Đã cập nhật tiêu chí [${criterionToSave.code}] ${criterionToSave.name} thành công!`
          : `Đã thêm tiêu chí mới [${criterionToSave.code}] ${criterionToSave.name} thành công!`
      );

      handleCloseCriterionModal();
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu tiêu chí');
    }
  };

  // Handle delete single violation modal
  const handleDeleteViolation = (id: string) => {
    const target = violations.find(v => v.id === id);
    if (target) {
      setTargetViolationToDelete(target);
      setIsDeleteSingleViolationModalOpen(true);
    }
  };

  // Confirm delete single violation
  const handleConfirmDeleteSingleViolation = async () => {
    if (!targetViolationToDelete) return;
    try {
      await youthDisciplineService.deleteViolation(
        targetViolationToDelete.id,
        user?.name || 'Cán bộ Đoàn',
        effectiveRole
      );
      showToast(`Đã xóa vi phạm của lớp ${targetViolationToDelete.className} và hoàn lại ${targetViolationToDelete.minusPoints} điểm!`);
      setIsDeleteSingleViolationModalOpen(false);
      setTargetViolationToDelete(null);
      await loadAllData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa vi phạm');
    }
  };

  // Toggle select all violations
  const handleToggleSelectAllViolations = () => {
    if (selectedViolationIds.length === filteredViolations.length && filteredViolations.length > 0) {
      setSelectedViolationIds([]);
    } else {
      setSelectedViolationIds(filteredViolations.map(v => v.id));
    }
  };

  const handleToggleSelectOneViolation = (id: string) => {
    setSelectedViolationIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Batch delete selected violations
  const handleConfirmBatchDeleteViolations = async () => {
    if (selectedViolationIds.length === 0) return;
    try {
      const count = await youthDisciplineService.deleteMultipleViolations(
        selectedViolationIds,
        user?.name || 'Cán bộ Đoàn',
        effectiveRole,
        `Xóa ${selectedViolationIds.length} bản ghi vi phạm nền nếp`
      );
      showToast(`Đã xóa thành công ${count} bản ghi vi phạm và hoàn trả lại điểm cho các lớp!`);
      setSelectedViolationIds([]);
      setIsBatchDeleteViolationsModalOpen(false);
      loadAllData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa hàng loạt vi phạm');
    }
  };

  // Clear violations by scope
  const handleConfirmClearViolationScope = async () => {
    try {
      let idsToDelete: string[] = [];
      if (clearViolationScope === 'filtered') {
        idsToDelete = filteredViolations.map(v => v.id);
      } else if (clearViolationScope === 'week') {
        idsToDelete = violations.filter(v => v.weekNumber === selectedWeek).map(v => v.id);
      } else if (clearViolationScope === 'class') {
        idsToDelete = violations.filter(v => v.classId === selectedClassId).map(v => v.id);
      } else {
        idsToDelete = violations.map(v => v.id);
      }

      if (idsToDelete.length === 0) {
        showToast('Không có bản ghi vi phạm nào trong phạm vi đã chọn.');
        setIsClearScopeViolationsModalOpen(false);
        return;
      }

      const count = await youthDisciplineService.deleteMultipleViolations(
        idsToDelete,
        user?.name || 'Cán bộ Đoàn',
        effectiveRole,
        `Xóa danh sách ${idsToDelete.length} vi phạm (${clearViolationScope === 'filtered' ? 'Bộ lọc hiện tại' : clearViolationScope === 'week' ? `Tuần ${selectedWeek}` : clearViolationScope === 'class' ? 'Lớp đã chọn' : 'Toàn trường'})`
      );
      showToast(`Đã xóa toàn bộ ${count} bản ghi vi phạm và hoàn trả điểm thi đua!`);
      setSelectedViolationIds([]);
      setIsClearScopeViolationsModalOpen(false);
      loadAllData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa toàn bộ vi phạm');
    }
  };

  // Handle confirm / unconfirm violation status
  const handleToggleConfirmViolation = async (vio: YouthViolationRecord) => {
    const nextStatus: ViolationStatus = vio.status === 'DA_XAC_NHAN' ? 'CHO_XAC_NHAN' : 'DA_XAC_NHAN';
    try {
      await youthDisciplineService.updateViolationStatus(
        vio.id,
        nextStatus,
        user?.id || 'bi_thu_doan',
        user?.name || 'Bí thư Đoàn',
        effectiveRole
      );
      showToast(nextStatus === 'DA_XAC_NHAN' ? 'Đã xác nhận vi phạm!' : 'Đã hủy xác nhận vi phạm!');
      loadAllData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Save Daily Check Sheet
  const handleSaveDailyCheckSheet = async () => {
    try {
      const sheet: YouthDailyCheckSheet = {
        id: `check_${selectedYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${selectedWeek}_${dailyCheckDate}_${dailyCheckSession}`,
        schoolYear: selectedYear,
        weekNumber: selectedWeek,
        checkDate: dailyCheckDate,
        session: dailyCheckSession,
        inspectorName: dailyCheckInspector.trim() || 'Đội Cờ đỏ',
        inspectorId: user?.id || 'can_bo_doan',
        classes: dailyCheckItems,
        savedAt: new Date().toISOString()
      };

      await youthDisciplineService.saveDailyCheckSheet(sheet, effectiveRole);
      showToast('Đã lưu kết quả kiểm tra nền nếp hằng ngày thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu sổ kiểm tra');
    }
  };

  // Lock / Unlock Week
  const handleToggleLockWeek = async () => {
    if (selectedWeek === 0) {
      setTargetLockWeekNumber(1);
      setIsWeekLockModalOpen(true);
      return;
    }

    if (weeklyLock.isLocked) {
      setIsUnlockModalOpen(true);
    } else {
      if (!window.confirm(`Bạn có chắc chắn muốn CHỐT KẾT QUẢ NỀ NẾP TUẦN ${selectedWeek}? Sau khi chốt, dữ liệu vi phạm của Tuần ${selectedWeek} sẽ được khóa để đảm bảo tính công bằng.`)) return;
      try {
        await youthDisciplineService.lockWeek(
          selectedYear,
          selectedWeek,
          user?.id || 'bi_thu_doan',
          user?.name || 'Bí thư Đoàn trường',
          effectiveRole,
          {
            totalViolations: stats.weekViolationsCount,
            totalMinusPoints: classSummaries.reduce((sum, c) => sum + c.totalMinusPoints, 0),
            topClasses: classSummaries.slice(0, 3).map(c => ({ className: c.className, score: c.finalScore, rank: c.rank }))
          }
        );
        showToast(`Đã chốt kết quả nền nếp Tuần ${selectedWeek} thành công!`);
        await loadAllData();
      } catch (e: any) {
        alert(e.message || 'Lỗi khi chốt tuần');
      }
    }
  };

  const handleLockSpecificWeek = async (wNum: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn CHỐT KẾT QUẢ NỀ NẾP TUẦN ${wNum}? Sau khi chốt, dữ liệu vi phạm Tuần ${wNum} sẽ được khóa.`)) return;
    try {
      await youthDisciplineService.lockWeek(
        selectedYear,
        wNum,
        user?.id || 'bi_thu_doan',
        user?.name || 'Bí thư Đoàn trường',
        effectiveRole
      );
      showToast(`Đã chốt kết quả nền nếp Tuần ${wNum} thành công!`);
      setSelectedWeek(wNum);
      await loadAllData();
      setIsWeekLockModalOpen(false);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi chốt tuần');
    }
  };

  const handleUnlockSpecificWeek = async (wNum: number, reasonStr?: string) => {
    const r = reasonStr || prompt(`Nhập lý do mở khóa Tuần ${wNum}:`);
    if (!r || !r.trim()) {
      if (reasonStr !== undefined) showToast('Vui lòng nhập lý do mở khóa tuần');
      return;
    }
    try {
      await youthDisciplineService.unlockWeek(
        selectedYear,
        wNum,
        user?.id || 'admin',
        user?.name || 'Quản trị viên / Bí thư',
        r.trim(),
        effectiveRole
      );
      showToast(`Đã mở khóa sửa kết quả Tuần ${wNum}!`);
      setSelectedWeek(wNum);
      await loadAllData();
      setIsWeekLockModalOpen(false);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi mở khóa tuần');
    }
  };

  const handleConfirmUnlockWeek = async () => {
    if (!unlockReason.trim()) {
      showToast('Vui lòng nhập lý do mở khóa tuần');
      return;
    }
    try {
      await youthDisciplineService.unlockWeek(
        selectedYear,
        selectedWeek,
        user?.id || 'admin',
        user?.name || 'Quản trị viên / Bí thư',
        unlockReason.trim(),
        effectiveRole
      );
      setIsUnlockModalOpen(false);
      setUnlockReason('');
      showToast(`Đã mở khóa sửa kết quả Tuần ${selectedWeek}!`);
      loadAllData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi mở khóa tuần');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const title = `Tuần ${selectedWeek} - Năm học ${selectedYear}`;
    exportYouthDisciplineToExcel(classSummaries, filteredViolations, title, selectedYear);
    showToast('Đã xuất file Excel (.xlsx) thành công!');
  };

  const handleExportWord = async () => {
    const title = `Tuần ${selectedWeek} (Từ ngày ${currentWeekInfo.startDateStr} đến ${currentWeekInfo.endDateStr})`;
    await exportYouthDisciplineToWord(classSummaries, filteredViolations, title, selectedYear, user?.name || 'BCH Đoàn trường');
    showToast('Đã xuất file Word (.docx) chuẩn mẫu thành công!');
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-24 font-sans text-slate-900">
      {/* 1. TOP HEADER & BACK BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-6 w-px bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 uppercase tracking-wider">
              ĐOÀN TNCS HỒ CHÍ MINH
            </span>
            <span className="text-xs font-bold text-slate-500">THPT SƠN LƯƠNG</span>
          </div>
        </div>

        {/* ROLE TESTING SWITCHER */}
        <div className="flex items-center gap-2 flex-wrap text-xs bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="font-bold text-slate-600 pl-2">Quyền thao tác:</span>
          <span className="px-2.5 py-1 rounded-xl font-black bg-blue-600 text-white shadow-xs">
            {effectiveRole === 'ADMIN' ? '🛡️ Quản trị viên' : effectiveRole === 'BAN_GIAM_HIEU' ? '👑 Ban Giám Hiệu' : effectiveRole === 'BI_THU_DOAN' ? '🚩 Bí thư Đoàn' : effectiveRole === 'CAN_BO_DOAN' ? '⚡ Cán bộ Đoàn / Cờ đỏ' : '👨‍🏫 GVCN'}
          </span>
          <select
            value={activeRoleOverride || effectiveRole}
            onChange={e => setActiveRoleOverride(e.target.value as any)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2 py-1 rounded-xl outline-none cursor-pointer text-xs"
          >
            <option value="BI_THU_DOAN">Bí thư Đoàn trường</option>
            <option value="CAN_BO_DOAN">Cán bộ Đoàn / Đội Cờ đỏ</option>
            <option value="BAN_GIAM_HIEU">Ban Giám Hiệu</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="GVCN">Giáo viên chủ nhiệm</option>
          </select>
        </div>
      </div>

      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 2. HERO TITLE CARD WITH GLOBAL CONTROLS */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 rounded-[28px] shadow-xl border border-blue-800 space-y-5 no-print">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-300">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  THEO DÕI NỀN NẾP HỌC SINH – ĐOÀN TN
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-blue-200">
                  Ghi nhận vi phạm, chấm điểm thi đua tuần, quản lý nền nếp & nề nếp học sinh trường THPT Sơn Lương
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={openNewViolationModal}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-amber-300"
            >
              <Plus size={18} />
              <span>+ GHI NHẬN VI PHẠM</span>
            </button>

            {canLockWeek && (
              <button
                type="button"
                onClick={handleToggleLockWeek}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                  weeklyLock.isLocked
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                }`}
                title={weeklyLock.isLocked ? 'Tuần đang bị khóa. Nhấn để mở khóa.' : 'Chốt và khóa kết quả thi đua tuần này'}
              >
                {weeklyLock.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{weeklyLock.isLocked ? `Đã chốt Tuần ${selectedWeek}` : `Chốt kết quả Tuần ${selectedWeek}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-blue-400/40"
              title="Xuất bảng tổng hợp nề nếp ra file Word (.docx)"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Xuất Word</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-400/40"
              title="Xuất dữ liệu nề nếp ra Excel (.xlsx)"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <Link
              to="/youth-duty-schedule"
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-400/40"
              title="Chuyển sang module Lịch trực Đoàn thanh niên"
            >
              <Calendar size={16} />
              <span>Lịch trực Đoàn</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings_audit');
                handleOpenNewClassifModal();
              }}
              className="px-3.5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-violet-400/40"
              title="Cấu hình khoảng điểm xếp loại nền nếp học sinh"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Cấu hình điểm</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-600 transition-colors cursor-pointer"
              title="In báo cáo"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* GLOBAL FILTERS TOOLBAR */}
        <div className="pt-4 border-t border-blue-800/80 flex flex-wrap items-center gap-3 text-xs">
          {/* Năm học */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold whitespace-nowrap">Năm học:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
            >
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y} className="text-slate-900 bg-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Tuần */}
          <div className="flex items-center gap-1.5">
            <span className="text-amber-300 font-bold whitespace-nowrap flex items-center gap-1">
              <span>📅</span> Tuần:
            </span>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              className="bg-white text-slate-950 font-black px-3.5 py-1.5 rounded-xl border-2 border-amber-400 outline-none cursor-pointer shadow-xs"
            >
              <option value={0} className="text-slate-900 font-black">
                Tất cả các tuần (Cả năm)
              </option>
              {allWeeks.map(w => (
                <option key={w.weekNumber} value={w.weekNumber} className="text-slate-900 font-bold">
                  {w.weekLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Tháng */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold whitespace-nowrap">Tháng:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
            >
              <option value={0} className="text-slate-900 bg-white">Tất cả tháng</option>
              <option value={9} className="text-slate-900 bg-white">Tháng 9</option>
              <option value={10} className="text-slate-900 bg-white">Tháng 10</option>
              <option value={11} className="text-slate-900 bg-white">Tháng 11</option>
              <option value={12} className="text-slate-900 bg-white">Tháng 12</option>
              <option value={1} className="text-slate-900 bg-white">Tháng 1</option>
              <option value={2} className="text-slate-900 bg-white">Tháng 2</option>
              <option value={3} className="text-slate-900 bg-white">Tháng 3</option>
              <option value={4} className="text-slate-900 bg-white">Tháng 4</option>
              <option value={5} className="text-slate-900 bg-white">Tháng 5</option>
            </select>
          </div>

          {/* Khối */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold whitespace-nowrap">Khối:</span>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
            >
              <option value="All" className="text-slate-900 bg-white">Tất cả khối</option>
              <option value="10" className="text-slate-900 bg-white">Khối 10</option>
              <option value="11" className="text-slate-900 bg-white">Khối 11</option>
              <option value="12" className="text-slate-900 bg-white">Khối 12</option>
            </select>
          </div>

          {/* Lớp */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold whitespace-nowrap">Lớp:</span>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer max-w-[140px]"
            >
              <option value="All" className="text-slate-900 bg-white">Tất cả lớp ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-slate-900 bg-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mức độ vi phạm */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold whitespace-nowrap">Mức độ:</span>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
            >
              <option value="All" className="text-slate-900 bg-white">Tất cả mức độ</option>
              <option value="Nhẹ" className="text-slate-900 bg-white">Nhẹ (-1 đến -3đ)</option>
              <option value="Vừa" className="text-slate-900 bg-white">Vừa (-3 đến -5đ)</option>
              <option value="Nghiêm trọng" className="text-slate-900 bg-white">Nghiêm trọng (-5 đến -10đ)</option>
              <option value="Rất nghiêm trọng" className="text-slate-900 bg-white">Rất nghiêm trọng (&gt; -10đ)</option>
            </select>
          </div>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={loadAllData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors ml-auto cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 3. NAVIGATION TABS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-print">
        {[
          { id: 'dashboard', label: '📊 Tổng quan & Thống kê', icon: BarChart3 },
          { id: 'violations', label: '📋 Danh sách vi phạm', icon: ShieldAlert, badge: filteredViolations.length },
          { id: 'class_tracking', label: '🏫 Theo dõi theo Lớp', icon: Building },
          { id: 'weekly_summary', label: '📅 Tổng hợp Tuần & Chốt điểm', icon: Award },
          { id: 'criteria', label: '⚙️ Danh mục tiêu chí', icon: Layers },
          { id: 'reports', label: '📑 Báo cáo & Xuất file', icon: FileText },
          { id: 'settings_audit', label: '🛡️ Cấu hình & Audit Log', icon: History }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT RENDERERS */}

      {/* TAB 1: DASHBOARD / TỔNG QUAN & THỐNG KÊ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 6 Stat Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng số lớp</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalClasses}</p>
              <span className="text-[11px] font-semibold text-blue-700">Khối 10, 11, 12</span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng số học sinh</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalStudents}</p>
              <span className="text-[11px] font-semibold text-emerald-700">Toàn trường</span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Vi phạm trong ngày</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-600">{stats.todayViolationsCount}</p>
              <span className="text-[11px] font-semibold text-slate-500">Hôm nay</span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Vi phạm trong tuần</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">{stats.weekViolationsCount}</p>
              <span className="text-[11px] font-semibold text-amber-700">Tuần {selectedWeek}</span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Lớp nền nếp tốt</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.goodClassesCount}</p>
              <span className="text-[11px] font-semibold text-emerald-700">&gt;= {settings.thresholdGood} điểm</span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Lớp có vi phạm</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-600">{stats.violatingClassesCount}</p>
              <span className="text-[11px] font-semibold text-purple-700">Cần đôn đốc</span>
            </Card>
          </div>

          {/* Grid 2 Columns: Bảng xếp hạng Top lớp & Lỗi vi phạm nhiều nhất */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Top lớp có điểm nền nếp cao nhất */}
            <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="text-amber-500" size={20} />
                  <h3 className="font-black text-slate-900 text-base">Top Lớp Điểm Nền Nếp Cao Nhất</h3>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Tuần {selectedWeek}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {classSummaries.slice(0, 5).map((cls, idx) => (
                  <div key={cls.classId} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">Lớp {cls.className}</span>
                        <span className="text-[11px] text-slate-500">
                          GVCN: {cls.homeroomTeacherName && cls.homeroomTeacherName !== '—' && cls.homeroomTeacherName !== 'Chưa phân công' ? cls.homeroomTeacherName : getHomeroomTeacherName(classes.find(c => c.id === cls.classId || c.name === cls.className))}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-700 text-base block">{cls.finalScore} đ</span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {cls.violationCount === 0 ? '✓ Không vi phạm' : `-${cls.totalMinusPoints}đ (${cls.violationCount} lỗi)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Column 2: Các lỗi vi phạm nhiều nhất */}
            <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={20} />
                  <h3 className="font-black text-slate-900 text-base">Các Lỗi Vi Phạm Phổ Biến Nhất</h3>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                  Thống kê Tuần {selectedWeek}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {stats.topViolationsList.length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center py-8">Chưa có vi phạm nào trong phạm vi đang chọn.</p>
                ) : (
                  stats.topViolationsList.map((item, idx) => {
                    const pct = Math.min(100, Math.round((item.count / Math.max(1, stats.weekViolationsCount)) * 100));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800 truncate max-w-[300px]">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="text-rose-600 font-extrabold">
                            {item.count} lượt (-{item.minusPoints}đ)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Phân bổ vi phạm theo 6 nhóm tiêu chí */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Tình Hình Vi Phạm Theo 6 Nhóm Tiêu Chí
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {YOUTH_DISCIPLINE_CATEGORIES.map(cat => {
                const count = stats.categoryCounts[cat.name.replace(/^[A-F]\.\s*/, '')] || 0;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab('violations');
                    }}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer space-y-1.5 group"
                  >
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-900 block truncate">
                      {cat.name}
                    </span>
                    <p className="text-2xl font-black text-slate-900 group-hover:text-blue-700">{count}</p>
                    <span className="text-[10px] font-semibold text-slate-400 block">Nhấn xem chi tiết ➔</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DANH SÁCH VI PHẠM */}
      {activeTab === 'violations' && (
        <Card className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden space-y-0">
          {/* Header toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm học sinh, lớp, tiêu chí..."
                  className="text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-blue-500 w-48 sm:w-60"
                />
              </div>

              {/* Quick filter pills */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeek(0);
                    setSelectedMonth(0);
                    setSelectedGrade('All');
                    setSelectedClassId('All');
                    setSelectedSeverity('All');
                    setSelectedCategory('All');
                    setSelectedDate('');
                    setSearchTerm('');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                    selectedWeek === 0 && selectedMonth === 0 && selectedClassId === 'All' && selectedGrade === 'All'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({violations.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('CHUYEN_CAN');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                    selectedCategory === 'CHUYEN_CAN'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Chuyên cần
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Hiển thị <strong className="text-slate-900">{filteredViolations.length}</strong> / {violations.length} vi phạm
              </span>

              {/* BATCH DELETE BUTTON */}
              {canEditViolations && selectedViolationIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteViolationsModalOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Trash2 size={14} />
                  <span>Xóa đã chọn ({selectedViolationIds.length})</span>
                </button>
              )}

              {/* CLEAR SCOPE BUTTON */}
              {canEditViolations && (
                <button
                  type="button"
                  onClick={() => setIsClearScopeViolationsModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Xóa danh sách vi phạm..."
                >
                  <Trash2 size={13} />
                  <span>Xóa danh sách...</span>
                </button>
              )}

              <button
                type="button"
                onClick={openNewViolationModal}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Thêm vi phạm</span>
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredViolations.length > 0 && selectedViolationIds.length === filteredViolations.length}
                      onChange={handleToggleSelectAllViolations}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3.5 text-center w-12">STT</th>
                  <th className="py-3 px-3.5 min-w-[100px]">Ngày / Giờ</th>
                  <th className="py-3 px-3.5 min-w-[80px]">Lớp</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Học sinh vi phạm</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Nội dung vi phạm</th>
                  <th className="py-3 px-3.5 min-w-[140px]">Nhóm</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">Điểm trừ</th>
                  <th className="py-3 px-3.5 min-w-[130px]">Người ghi nhận</th>
                  <th className="py-3 px-3.5 text-center min-w-[120px]">Trạng thái</th>
                  <th className="py-3 px-3.5 text-center min-w-[130px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredViolations.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <p className="font-semibold text-sm mb-2">Không tìm thấy bản ghi vi phạm nào phù hợp với bộ lọc hiện tại.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWeek(0);
                          setSelectedMonth(0);
                          setSelectedGrade('All');
                          setSelectedClassId('All');
                          setSelectedSeverity('All');
                          setSelectedCategory('All');
                          setSelectedDate('');
                          setSearchTerm('');
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Xem tất cả {violations.length} vi phạm (Bỏ bộ lọc)</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredViolations.map((vio, idx) => {
                    const isChecked = selectedViolationIds.includes(vio.id);
                    return (
                      <tr key={vio.id} className={`hover:bg-blue-50/40 transition-colors ${isChecked ? 'bg-blue-50/60' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectOneViolation(vio.id)}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">
                        <div>{vio.violationDate}</div>
                        <span className="text-[11px] font-normal text-slate-500">
                          {vio.violationTime || ''} {vio.periodSlot ? `(${vio.periodSlot})` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {vio.className}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-extrabold text-slate-900">
                        <div>{vio.studentName}</div>
                        {vio.studentCode && <span className="text-[11px] font-normal text-slate-500">Mã: {vio.studentCode}</span>}
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900 leading-snug">{vio.criterionName}</p>
                        {vio.content && vio.content !== vio.criterionName && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">{vio.content}</p>
                        )}
                        {vio.location && (
                          <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            📍 {vio.location}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-600 text-xs">
                        {vio.categoryName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-black text-rose-600">
                        -{vio.minusPoints} đ
                      </td>
                      <td className="py-3 px-3.5 text-xs text-slate-700">
                        <div className="font-semibold">{vio.recordedByName}</div>
                        {vio.recordedByRole && <span className="text-[10px] text-slate-400">{vio.recordedByRole}</span>}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {vio.status === 'DA_XAC_NHAN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Đã xác nhận
                          </span>
                        ) : vio.status === 'CHO_XAC_NHAN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Chờ xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {vio.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canConfirmViolations && (
                            <button
                              type="button"
                              onClick={() => handleToggleConfirmViolation(vio)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                vio.status === 'DA_XAC_NHAN'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={vio.status === 'DA_XAC_NHAN' ? 'Hủy xác nhận vi phạm' : 'Xác nhận vi phạm'}
                            >
                              {vio.status === 'DA_XAC_NHAN' ? <X size={13} /> : <Check size={13} />}
                            </button>
                          )}

                          {canEditViolations && (
                            <button
                              type="button"
                              onClick={() => openEditViolationModal(vio)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              title="Sửa bản ghi vi phạm"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {canEditViolations && (
                            <button
                              type="button"
                              onClick={() => handleDeleteViolation(vio.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title="Xóa vi phạm"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: THEO DÕI THEO LỚP & ĐIỂM THI ĐUA */}
      {activeTab === 'class_tracking' && (
        <Card className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Bảng Tổng Hợp Điểm Thi Đua Nền Nếp Các Lớp (Tuần {selectedWeek})
              </h3>
              <p className="text-xs text-slate-500">
                Điểm nền nếp = Điểm chuẩn ({settings.baseScore}đ) - Tổng điểm trừ trong tuần
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download size={13} />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3.5 text-center w-12">Hạng</th>
                  <th className="py-3 px-3.5 min-w-[90px]">Lớp</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Giáo viên chủ nhiệm</th>
                  <th className="py-3 px-3.5 text-center min-w-[70px]">Sĩ số</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">Điểm trừ</th>
                  <th className="py-3 px-3.5 text-center min-w-[110px]">Điểm nền nếp</th>
                  <th className="py-3 px-3.5 text-center min-w-[100px]">Số vi phạm</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">Số HS vi phạm</th>
                  <th className="py-3 px-3.5 text-center min-w-[100px]">Xếp loại</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Lỗi vi phạm chủ yếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classSummaries.map(cls => (
                  <tr key={cls.classId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                          cls.rank === 1
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                            : cls.rank === 2
                            ? 'bg-slate-300 text-slate-900 font-bold'
                            : cls.rank === 3
                            ? 'bg-amber-200 text-amber-900 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cls.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-black text-blue-900">{cls.className}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-700">
                      {cls.homeroomTeacherName && cls.homeroomTeacherName !== '—' && cls.homeroomTeacherName !== 'Chưa phân công' ? cls.homeroomTeacherName : getHomeroomTeacherName(classes.find(c => c.id === cls.classId || c.name === cls.className))}
                    </td>
                    <td className="py-3 px-3.5 text-center text-slate-600">{cls.totalStudents}</td>
                    <td className="py-3 px-3.5 text-center font-black text-rose-600">
                      {cls.totalMinusPoints > 0 ? `-${cls.totalMinusPoints} đ` : '0'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="font-black text-emerald-700 text-sm">{cls.finalScore} đ</span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-800">{cls.violationCount}</td>
                    <td className="py-3 px-3.5 text-center">
                      {cls.violatingStudentCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenClassStudentsModal(cls.classId, cls.className)}
                          className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-full shadow-2xs transition-all hover:scale-110 cursor-pointer inline-flex items-center gap-1"
                          title={`Xem danh sách ${cls.violatingStudentCount} học sinh vi phạm của lớp ${cls.className}`}
                        >
                          <span>{cls.violatingStudentCount}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className="text-[11px] font-black px-2.5 py-1 rounded-full border inline-block shadow-2xs"
                        style={{
                          backgroundColor: `${cls.classificationColor || '#3B82F6'}18`,
                          color: cls.classificationColor || '#1D4ED8',
                          borderColor: `${cls.classificationColor || '#3B82F6'}55`
                        }}
                      >
                        {cls.classification}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-xs text-slate-600">
                      {cls.topViolations && cls.topViolations.length > 0 ? (
                        <div className="space-y-0.5">
                          {cls.topViolations.map((v, i) => (
                            <span key={i} className="inline-block mr-1 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                              • {v.name} ({v.count})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có vi phạm</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: TỔNG HỢP TUẦN & CHỐT ĐIỂM */}
      {activeTab === 'weekly_summary' && (
        <Card className="p-5 sm:p-7 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                <span>
                  {selectedWeek > 0
                    ? `TỔNG HỢP NỀN NẾP TUẦN ${selectedWeek} (${currentWeekInfo.startDateStr} ➔ ${currentWeekInfo.endDateStr})`
                    : `DANH SÁCH CHỐT KẾT QUẢ CÁC TUẦN - NĂM HỌC ${selectedYear}`}
                </span>
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                {selectedWeek > 0
                  ? 'Bảng chốt điểm thi đua nề nếp toàn trường THPT Sơn Lương'
                  : 'Quản lý chốt/mở khóa điểm thi đua nền nếp theo từng tuần học trong năm'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                <span>Chọn tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="bg-white text-slate-900 font-extrabold px-2.5 py-1 rounded-lg border border-slate-300 outline-none cursor-pointer"
                >
                  <option value={0}>-- Tất cả các tuần --</option>
                  {allWeeks.map(w => {
                    const isL = allWeeklyLocks[w.weekNumber]?.isLocked;
                    return (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Tuần {w.weekNumber} ({w.startDateStr}) {isL ? '🔒 [Đã chốt]' : '🔓 [Mở]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {canLockWeek && (
                <button
                  type="button"
                  onClick={handleToggleLockWeek}
                  className={`px-4 py-2 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    selectedWeek > 0 && weeklyLock.isLocked
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {selectedWeek > 0 && weeklyLock.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  <span>
                    {selectedWeek > 0
                      ? weeklyLock.isLocked
                        ? `Đã chốt Tuần ${selectedWeek} (Mở khóa)`
                        : `Chốt kết quả Tuần ${selectedWeek}`
                      : '⚙️ Quan lý chốt tất cả các tuần'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* If selectedWeek === 0: Show Overview list of all 37 weeks with lock/unlock toggles */}
          {selectedWeek === 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border bg-blue-50 border-blue-200 text-blue-900 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Calendar size={22} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-black text-sm block">Danh Sách Bảng Chốt Thi Đua Nề Nếp Các Tuần ({selectedYear})</span>
                    <span className="text-xs text-blue-700">
                      Chọn một tuần cụ thể bên dưới để xem danh sách xếp hạng chi tiết hoặc thực hiện chốt/mở khóa tuần đó.
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                      <th className="py-3 px-3 text-center w-14">TUẦN</th>
                      <th className="py-3 px-4">THỜI GIAN TUẦN</th>
                      <th className="py-3 px-4 text-center">TRẠNG THÁI KHÓA</th>
                      <th className="py-3 px-4">THÔNG TIN CHỐT KẾT QUẢ</th>
                      <th className="py-3 px-4 text-center w-40">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {allWeeks.slice(0, 37).map(w => {
                      const lk = allWeeklyLocks[w.weekNumber] || { isLocked: false };
                      return (
                        <tr key={w.weekNumber} className="hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                          <td className="py-3 px-3 text-center font-black text-blue-900">Tuần {w.weekNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {w.startDateStr} ➔ {w.endDateStr}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {lk.isLocked ? (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-black text-[11px] inline-flex items-center gap-1">
                                <Lock size={12} /> Đã chốt khóa
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-black text-[11px] inline-flex items-center gap-1">
                                <Unlock size={12} /> Đang mở
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {lk.isLocked ? (
                              <div>
                                <span className="font-bold text-slate-800 block">Chốt bởi: {lk.lockedByName || 'Bí thư Đoàn'}</span>
                                <span className="text-[11px] text-slate-500">
                                  {lk.lockedAt ? new Date(lk.lockedAt).toLocaleString('vi-VN') : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa chốt kết quả</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedWeek(w.weekNumber)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết điểm tuần này"
                              >
                                Xem
                              </button>

                              {canLockWeek && (
                                lk.isLocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlockSpecificWeek(w.weekNumber)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer"
                                    title="Mở khóa kết quả tuần này"
                                  >
                                    Mở khóa
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleLockSpecificWeek(w.weekNumber)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                                    title="Chốt kết quả tuần này"
                                  >
                                    Chốt tuần
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* Weekly Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                  weeklyLock.isLocked
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {weeklyLock.isLocked ? <Lock size={20} className="text-rose-600" /> : <Unlock size={20} className="text-amber-600" />}
                  <div>
                    <span className="font-black text-sm block">
                      {weeklyLock.isLocked
                        ? `Kết quả Tuần ${selectedWeek} ĐÃ ĐƯỢC CHỐT KHÓA`
                        : `Tuần ${selectedWeek} đang mở (Chưa chốt)`}
                    </span>
                    <span className="text-xs text-slate-600">
                      {weeklyLock.isLocked
                        ? `Chốt bởi ${weeklyLock.lockedByName || 'Bí thư Đoàn'} lúc ${new Date(weeklyLock.lockedAt || '').toLocaleString('vi-VN')}`
                        : 'Các cán bộ Đoàn và GVCN vẫn có thể cập nhật bản ghi vi phạm.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summaries list */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold text-[11px] uppercase border-b border-slate-200">
                      <th className="py-3 px-3 text-center">Xếp hạng</th>
                      <th className="py-3 px-4">Lớp</th>
                      <th className="py-3 px-4">Giáo viên chủ nhiệm</th>
                      <th className="py-3 px-3 text-center">Điểm trừ</th>
                      <th className="py-3 px-4 text-center">Điểm tổng kết</th>
                      <th className="py-3 px-3 text-center">Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classSummaries.map(c => (
                      <tr key={c.classId} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-center font-black">#{c.rank}</td>
                        <td className="py-3 px-4 font-black text-blue-900">{c.className}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {c.homeroomTeacherName && c.homeroomTeacherName !== '—' && c.homeroomTeacherName !== 'Chưa phân công' ? c.homeroomTeacherName : getHomeroomTeacherName(classes.find(cls => cls.id === c.classId || cls.name === c.className))}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-rose-600">-{c.totalMinusPoints} đ</td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700 text-base">{c.finalScore} đ</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className="font-bold text-xs px-2.5 py-1 rounded-full border inline-block"
                            style={{
                              backgroundColor: `${c.classificationColor || '#3B82F6'}18`,
                              color: c.classificationColor || '#1D4ED8',
                              borderColor: `${c.classificationColor || '#3B82F6'}44`
                            }}
                          >
                            {c.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* TAB 7: DANH MỤC TIÊU CHÍ NỀN NẾP */}
      {activeTab === 'criteria' && (
        <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers size={18} className="text-blue-600" />
                Danh Mục Tiêu Chí Chấm Điểm Nền Nếp (6 Nhóm)
              </h3>
              <p className="text-xs text-slate-500">
                Bảng quy định mức điểm trừ theo nội quy trường THPT Sơn Lương
              </p>
            </div>

            {canManageCriteria && (
              <button
                type="button"
                onClick={openNewCriterionModal}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Thêm tiêu chí mới</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-14">Mã</th>
                  <th className="py-3 px-4 min-w-[220px]">Tên tiêu chí vi phạm</th>
                  <th className="py-3 px-4 min-w-[150px]">Nhóm vi phạm</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Mức độ</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Điểm trừ</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Tính thi đua</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Trạng thái</th>
                  {canManageCriteria && <th className="py-3 px-3 text-center min-w-[100px]">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criteria.map(crit => (
                  <tr key={crit.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-black text-blue-900 bg-blue-50/40">
                      {crit.code}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      <div>{crit.name}</div>
                      {crit.description && <span className="text-[11px] font-normal text-slate-500">{crit.description}</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{crit.categoryName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{crit.severity}</td>
                    <td className="py-3 px-3 text-center font-black text-rose-600">-{crit.minusPoints} đ</td>
                    <td className="py-3 px-3 text-center">
                      {crit.affectCompetition !== false ? (
                        <span className="text-emerald-700 font-bold">✓ Có</span>
                      ) : (
                        <span className="text-slate-400 font-medium">— Không</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {crit.status === 'inactive' ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Tạm ngừng
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    {canManageCriteria && (
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditCriterion(crit)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                            title="Chỉnh sửa tiêu chí"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await youthDisciplineService.deleteCriterion(crit.id, effectiveRole);
                                showToast(`Đã xóa tiêu chí ${crit.name}!`);
                                loadAllData();
                              } catch (e: any) {
                                showToast(e.message || 'Lỗi khi xóa tiêu chí');
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="Xóa tiêu chí"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 8: BÁO CÁO & XUẤT FILE */}
      {activeTab === 'reports' && (
        <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Trung Tâm Xuất Báo Cáo & Phiếu Tổng Hợp Đoàn Trường
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Hỗ trợ xuất báo cáo nền nếp theo ngày, tuần, tháng, học kỳ và toàn trường
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Báo cáo nề nếp toàn trường',
                desc: 'Tổng hợp điểm và thứ hạng của tất cả các lớp trong tuần/tháng',
                actionWord: handleExportWord,
                actionExcel: handleExportExcel
              },
              {
                title: 'Báo cáo chi tiết theo lớp',
                desc: 'Danh sách vi phạm theo từng lớp học và học sinh vi phạm',
                actionWord: handleExportWord,
                actionExcel: handleExportExcel
              },
              {
                title: 'Báo cáo các lỗi phổ biến',
                desc: 'Phân tích các hành vi vi phạm an toàn giao thông, trang phục, học tập',
                actionWord: handleExportWord,
                actionExcel: handleExportExcel
              }
            ].map((rep, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm">{rep.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{rep.desc}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={rep.actionWord}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Xuất Word (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={rep.actionExcel}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Xuất Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 9: CẤU HÌNH & AUDIT LOG */}
      {activeTab === 'settings_audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PHIÊN BẢN HỆ THỐNG & DEPLOYMENT STATUS */}
          <Card className="col-span-1 lg:col-span-2 p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white border border-slate-800 rounded-[24px] shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white flex items-center gap-2">
                    <span>PHIÊN BẢN ỨNG DỤNG & THÔNG TIN BUILD</span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[10px] font-black">
                      ✓ ĐÃ ĐỒNG BỘ MỚI NHẤT
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Xác nhận phiên bản build thực tế từ nhánh master / main đang chạy trên hệ thống
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Phiên bản App</span>
                <span className="font-mono font-black text-blue-400 text-sm">2026.10.04.01</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Commit Git</span>
                <span className="font-mono font-black text-emerald-400 text-sm">50b5eb1</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Thời gian Build</span>
                <span className="font-bold text-slate-200">03/10/2026 17:30</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Trạng thái Cache</span>
                <span className="font-bold text-emerald-400">Cache Cleared (No-Cache)</span>
              </div>
            </div>
          </Card>

          {/* CẤU HÌNH ĐIỂM XẾP LOẠI NỀ NẾP */}
          <Card className="col-span-1 lg:col-span-2 p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Settings size={20} className="text-amber-500" />
                  CẤU HÌNH ĐIỂM XẾP LOẠI NỀ NẾP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu hình các khoảng điểm tương ứng với từng mức xếp loại nền nếp của lớp theo năm học {selectedYear}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                  <span>Năm học:</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="bg-white text-slate-900 font-extrabold px-2 py-1 rounded-lg border border-slate-300 outline-none cursor-pointer"
                  >
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewClassifModal}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300"
                >
                  <Plus size={16} />
                  <span>+ Thêm mức xếp loại</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreDefaultClassifs}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300"
                  title="Khôi phục bộ cấu hình điểm xếp loại mặc định"
                >
                  <RefreshCw size={14} />
                  <span>↺ Khôi phục mặc định</span>
                </button>
              </div>
            </div>

            {/* CẢNH BÁO VALIDATION / BAO PHỦ */}
            {rangeValidation && (
              <div>
                {!rangeValidation.valid ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
                    <span>{rangeValidation.error}</span>
                  </div>
                ) : rangeValidation.warning ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                    <span>{rangeValidation.warning}</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <span>Cấu hình hợp lệ: Đã bao phủ toàn bộ khoảng điểm từ 0 đến 100.</span>
                  </div>
                )}
              </div>
            )}

            {/* BẢNG CẤU HÌNH XẾP LOẠI */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-4">MỨC XẾP LOẠI</th>
                    <th className="py-3 px-4 text-center">ĐIỂM TỪ</th>
                    <th className="py-3 px-4 text-center">ĐIỂM ĐẾN</th>
                    <th className="py-3 px-4 text-center">MÀU HIỂN THỊ</th>
                    <th className="py-3 px-4 text-center">THỨ TỰ</th>
                    <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                    <th className="py-3 px-4 text-center w-32">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classifications.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        Chưa có cấu hình điểm xếp loại cho năm học này.
                        <button
                          type="button"
                          onClick={handleRestoreDefaultClassifs}
                          className="ml-2 underline font-bold text-blue-600 cursor-pointer"
                        >
                          + Tạo cấu hình mặc định
                        </button>
                      </td>
                    </tr>
                  ) : (
                    classifications.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors divide-x divide-slate-200 ${
                          item.active === false ? 'opacity-50 bg-slate-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-black">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-black inline-block border"
                            style={{
                              backgroundColor: `${item.color || '#3B82F6'}18`,
                              color: item.color || '#1D4ED8',
                              borderColor: `${item.color || '#3B82F6'}44`
                            }}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-800">{item.minScore} đ</td>
                        <td className="py-3 px-4 text-center font-black text-slate-800">{item.maxScore} đ</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-xl">
                            <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: item.color }} />
                            <span className="font-mono text-[11px] font-bold text-slate-600">{item.color}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{item.sortOrder || idx + 1}</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {item.active !== false ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px]">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-600 border border-slate-300 rounded-full text-[11px]">
                              Ngừng sử dụng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditClassifModal(item)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa mức xếp loại này"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDeactivateClassif(item)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                item.active !== false
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                              }`}
                              title={item.active !== false ? 'Ngừng sử dụng (Ngừng tính toán)' : 'Khôi phục hoạt động'}
                            >
                              {item.active !== false ? <Trash2 size={15} /> : <CheckCircle2 size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cấu hình chung */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              Cấu Hình Điểm Chuẩn & Quy Định Khác
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Điểm nền nếp ban đầu (Mặc định)</label>
                <input
                  type="number"
                  value={settings.baseScore}
                  onChange={e => setSettings({ ...settings, baseScore: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  await youthDisciplineService.saveSettings(settings, effectiveRole);
                  showToast('Đã lưu cấu hình điểm nền nếp!');
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md cursor-pointer mt-2"
              >
                Lưu cấu hình chung
              </button>
            </div>
          </Card>

          {/* Audit Logs */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              Nhật Ký Hoạt Động Hệ Thống (Audit Log)
            </h3>

            <div className="space-y-2 max-h-[450px] overflow-y-auto text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 italic text-center py-8">Chưa có nhật ký ghi nhận.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-blue-900">{log.performedByName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium">{log.summary}</p>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.2 rounded inline-block">
                      {log.action} • {log.entityType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 5. MODAL GHI NHẬN / CHỈNH SỬA VI PHẠM */}
      {isViolationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingViolation ? '✏️ Chỉnh sửa bản ghi vi phạm' : '➕ Ghi nhận vi phạm nền nếp mới'}
                  </h3>
                  <p className="text-xs text-blue-100">
                    Đoàn TNCS Hồ Chí Minh – Trường THPT Sơn Lương
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViolationModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
              {/* Row 1: Ngày, Thời gian/Tiết, Tuần */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formVioDate}
                    onChange={e => setFormVioDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thời gian / Buổi</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      value={formVioTime}
                      onChange={e => setFormVioTime(e.target.value)}
                      placeholder="07:15"
                      className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none text-center"
                    />
                    <select
                      value={formVioPeriod}
                      onChange={e => setFormVioPeriod(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none cursor-pointer"
                    >
                      <option value="Sáng">Sáng</option>
                      <option value="Chiều">Chiều</option>
                      <option value="Ra chơi">Ra chơi</option>
                      <option value="Chào cờ">Chào cờ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tuần học</label>
                  <select
                    value={formVioWeek}
                    onChange={e => setFormVioWeek(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none cursor-pointer"
                  >
                    {allWeeks.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        {w.weekLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Chọn Lớp & Chế độ ghi nhận (1 học sinh, Nhiều học sinh, Cả lớp) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lớp vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formVioClassId}
                    onChange={e => {
                      setFormVioClassId(e.target.value);
                      const classStus = students.filter(s => s.classId === e.target.value);
                      if (classStus.length > 0) {
                        setFormVioStudentId(classStus[0].id);
                        setFormVioSelectedStudentIds([classStus[0].id]);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900 outline-none cursor-pointer"
                  >
                    {classes.map(c => {
                      const gvcn = getHomeroomTeacherName(c);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} (GVCN: {gvcn})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phạm vi đối tượng</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormVioTargetMode('single')}
                      className={`py-1.5 rounded-lg transition-all ${
                        formVioTargetMode === 'single' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      1 Học sinh
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormVioTargetMode('multiple')}
                      className={`py-1.5 rounded-lg transition-all ${
                        formVioTargetMode === 'multiple' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Nhiều HS
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormVioTargetMode('whole_class')}
                      className={`py-1.5 rounded-lg transition-all ${
                        formVioTargetMode === 'whole_class' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Cả lớp
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Chọn học sinh theo phạm vi */}
              {formVioTargetMode === 'single' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Học sinh vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formVioStudentId}
                    onChange={e => setFormVioStudentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none cursor-pointer"
                  >
                    {modalClassStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Mã: {s.code || '—'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : formVioTargetMode === 'multiple' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chọn các học sinh vi phạm ({formVioSelectedStudentIds.length} đã chọn)
                  </label>
                  <div className="max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl space-y-1 bg-slate-50">
                    {modalClassStudents.map(s => {
                      const isChecked = formVioSelectedStudentIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setFormVioSelectedStudentIds(prev =>
                                prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                              );
                            }}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <span className="text-[11px] text-slate-400">({s.code})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                  ⚠️ Lỗi này sẽ áp dụng điểm trừ trực tiếp cho tập thể toàn bộ lớp học.
                </div>
              )}

              {/* Row 4: Chọn Tiêu chí vi phạm & Điểm trừ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tiêu chí vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formVioCriterionId}
                    onChange={e => {
                      setFormVioCriterionId(e.target.value);
                      const found = criteria.find(c => c.id === e.target.value);
                      if (found) {
                        setFormVioMinusPoints(found.minusPoints);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none cursor-pointer"
                  >
                    {criteria.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name} (-{c.minusPoints}đ • {c.severity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Điểm trừ áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formVioMinusPoints}
                    onChange={e => setFormVioMinusPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-rose-600 text-center outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Nội dung chi tiết & Địa điểm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nội dung mô tả vi phạm</label>
                <textarea
                  rows={2}
                  value={formVioContent}
                  onChange={e => setFormVioContent(e.target.value)}
                  placeholder="Mô tả cụ thể hành vi vi phạm..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Địa điểm vi phạm</label>
                  <input
                    type="text"
                    value={formVioLocation}
                    onChange={e => setFormVioLocation(e.target.value)}
                    placeholder="VD: Cổng trường, Lớp 10A1, Sân bóng..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Người ghi nhận</label>
                  <input
                    type="text"
                    value={formVioRecordedByName}
                    onChange={e => setFormVioRecordedByName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsViolationModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveViolation}
                className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{editingViolation ? 'Lưu cập nhật' : 'Ghi nhận vi phạm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL MỞ KHÓA TUẦN (UNLOCK WEEK MODAL) */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Unlock size={22} />
              <h3 className="font-extrabold text-slate-900 text-base">Mở Khóa Kết Quả Tuần {selectedWeek}</h3>
            </div>

            <p className="text-xs text-slate-600">
              Tuần {selectedWeek} hiện đang bị khóa. Để chỉnh sửa lại dữ liệu vi phạm hoặc điểm thi đua, vui lòng nhập lý do mở khóa:
            </p>

            <textarea
              rows={3}
              value={unlockReason}
              onChange={e => setUnlockReason(e.target.value)}
              placeholder="Nhập lý do điều chỉnh hoặc phê duyệt mở khóa..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlockWeek}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                Xác nhận mở khóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XÁC NHẬN XÓA 1 BẢN GHI VI PHẠM */}
      {isDeleteSingleViolationModalOpen && targetViolationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xác nhận xóa bản ghi vi phạm</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ hoàn lại điểm trừ cho lớp</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Lớp:</span>
                <span className="font-black text-blue-900">{targetViolationToDelete.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Học sinh / Tập thể:</span>
                <span className="font-bold text-slate-900">
                  {targetViolationToDelete.studentName} {targetViolationToDelete.studentCode ? `(${targetViolationToDelete.studentCode})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Nội dung vi phạm:</span>
                <span className="font-bold text-rose-700">{targetViolationToDelete.criterionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Điểm trừ:</span>
                <span className="font-black text-rose-600">-{targetViolationToDelete.minusPoints} điểm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Thời gian:</span>
                <span className="font-semibold text-slate-700">{targetViolationToDelete.violationDate} (Tuần {targetViolationToDelete.weekNumber})</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              💡 Sau khi xóa, số điểm <strong className="text-emerald-700">+{targetViolationToDelete.minusPoints}đ</strong> sẽ tự động được cộng trả lại vào tổng điểm thi đua của lớp <strong>{targetViolationToDelete.className}</strong>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteSingleViolationModalOpen(false);
                  setTargetViolationToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingleViolation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XÁC NHẬN XÓA HÀNG LOẠT VI PHẠM ĐÃ CHỌN */}
      {isBatchDeleteViolationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xóa các bản ghi vi phạm đã chọn</h3>
                <p className="text-xs text-slate-500">Đã chọn {selectedViolationIds.length} bản ghi vi phạm</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle size={15} /> Bạn có chắc chắn muốn xóa {selectedViolationIds.length} bản ghi vi phạm này?
              </p>
              <p className="text-slate-600">
                Tất cả điểm trừ tương ứng sẽ được tự động hoàn trả lại cho các lớp trong bảng tổng hợp thi đua.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteViolationsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDeleteViolations}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Xóa {selectedViolationIds.length} bản ghi vi phạm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XÓA TOÀN BỘ DANH SÁCH VI PHẠM THEO PHẠM VI */}
      {isClearScopeViolationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xóa danh sách học sinh vi phạm</h3>
                <p className="text-xs text-slate-500">Chọn phạm vi dữ liệu vi phạm muốn xóa</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Chọn phạm vi xóa:</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="clearViolationScope"
                    value="filtered"
                    checked={clearViolationScope === 'filtered'}
                    onChange={() => setClearViolationScope('filtered')}
                    className="text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Xóa toàn bộ danh sách đang hiển thị ({filteredViolations.length} bản ghi)</span>
                    <span className="text-slate-500 text-[11px]">Xóa các vi phạm đang lọc trong bảng hiện tại</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="clearViolationScope"
                    value="week"
                    checked={clearViolationScope === 'week'}
                    onChange={() => setClearViolationScope('week')}
                    className="text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Xóa toàn bộ vi phạm TUẦN {selectedWeek || 'đang chọn'}</span>
                    <span className="text-slate-500 text-[11px]">
                      {violations.filter(v => v.weekNumber === selectedWeek).length} bản ghi trong tuần
                    </span>
                  </div>
                </label>

                {selectedClassId !== 'All' && (
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="clearViolationScope"
                      value="class"
                      checked={clearViolationScope === 'class'}
                      onChange={() => setClearViolationScope('class')}
                      className="text-rose-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Xóa toàn bộ vi phạm của LỚP đang chọn</span>
                      <span className="text-slate-500 text-[11px]">
                        {violations.filter(v => v.classId === selectedClassId).length} bản ghi của lớp
                      </span>
                    </div>
                  </label>
                )}

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="clearViolationScope"
                    value="all"
                    checked={clearViolationScope === 'all'}
                    onChange={() => setClearViolationScope('all')}
                    className="text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Xóa TẤT CẢ vi phạm toàn trường ({violations.length} bản ghi)</span>
                    <span className="text-slate-500 text-[11px]">Khởi tạo lại toàn bộ dữ liệu vi phạm</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              ⚠️ Lưu ý: Thao tác này sẽ xóa các bản ghi vi phạm và tự động hoàn lại điểm thi đua cho các lớp liên quan.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearScopeViolationsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearViolationScope}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL THÊM / CHỈNH SỬA TIÊU CHÍ VI PHẠM (CRITERION MODAL) */}
      {isCriterionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Layers size={18} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingCriterion ? 'Chỉnh sửa tiêu chí' : 'Thêm tiêu chí mới'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {editingCriterion
                      ? `Mã tiêu chí: ${editingCriterion.code}`
                      : 'Thiết lập tiêu chí đánh giá nề nếp thi đua'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCriterionModal}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Row 1: Mã & Tên tiêu chí */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mã tiêu chí <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCritCode}
                    onChange={e => setFormCritCode(e.target.value.toUpperCase())}
                    placeholder="VD: CC01, TP01..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900 uppercase outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tên tiêu chí vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCritName}
                    onChange={e => setFormCritName(e.target.value)}
                    placeholder="VD: Nghỉ học không phép, Không mặc đồng phục..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Nhóm vi phạm & Mức độ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nhóm vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCritCategory}
                    onChange={e => setFormCritCategory(e.target.value as YouthDisciplineCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    {YOUTH_DISCIPLINE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mức độ vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCritSeverity}
                    onChange={e => setFormCritSeverity(e.target.value as ViolationSeverity)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="Nhẹ">Nhẹ</option>
                    <option value="Vừa">Vừa</option>
                    <option value="Nghiêm trọng">Nghiêm trọng</option>
                    <option value="Rất nghiêm trọng">Rất nghiêm trọng</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Điểm trừ & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Điểm trừ áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formCritMinusPoints}
                      onChange={e => setFormCritMinusPoints(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-rose-600 text-center outline-none focus:border-rose-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">điểm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái</label>
                  <select
                    value={formCritStatus}
                    onChange={e => setFormCritStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngừng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thứ tự sắp xếp</label>
                  <input
                    type="number"
                    value={formCritOrder}
                    onChange={e => setFormCritOrder(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-center outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Tính thi đua */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCritAffectCompetition}
                    onChange={e => setFormCritAffectCompetition(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-blue-950 block">Tính vào điểm thi đua tập thể lớp</span>
                    <span className="text-[11px] text-blue-700">Khi học sinh vi phạm lỗi này, lớp sẽ bị trừ điểm trong bảng tổng hợp tuần</span>
                  </div>
                </label>
              </div>

              {/* Row 5: Mô tả / Hướng dẫn ghi nhận */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả chi tiết / Hướng dẫn xử lý
                </label>
                <textarea
                  rows={3}
                  value={formCritDescription}
                  onChange={e => setFormCritDescription(e.target.value)}
                  placeholder="Mô tả cụ thể căn cứ ghi nhận hoặc quy định xử lý..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseCriterionModal}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveCriterion}
                className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{editingCriterion ? 'Lưu thay đổi' : 'Thêm tiêu chí'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CẤU HÌNH MỨC XẾP LOẠI */}
      {isClassifModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Settings size={18} />
                <span>{editingClassif ? 'SỬA MỨC XẾP LOẠI NỀ NẾP' : 'THÊM MỨC XẾP LOẠI NỀ NẾP MỚI'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsClassifModalOpen(false)}
                className="p-1 text-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClassif} className="p-6 space-y-4 text-xs">
              {classifError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                  <span>{classifError}</span>
                </div>
              )}

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Tên xếp loại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formClassifName}
                  onChange={e => setFormClassifName(e.target.value)}
                  placeholder="Ví dụ: Tốt, Khá, Đạt, Chưa đạt..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">
                    Điểm từ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formClassifMinScore}
                    onChange={e => setFormClassifMinScore(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">
                    Điểm đến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formClassifMaxScore}
                    onChange={e => setFormClassifMaxScore(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Màu hiển thị</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formClassifColor}
                    onChange={e => setFormClassifColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-1 bg-white"
                  />
                  <input
                    type="text"
                    value={formClassifColor}
                    onChange={e => setFormClassifColor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormClassifColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formClassifColor.toLowerCase() === color.toLowerCase() ? 'scale-110 border-slate-900 ring-2 ring-amber-400' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Thứ tự ưu tiên</label>
                  <input
                    type="number"
                    min={1}
                    value={formClassifSortOrder}
                    onChange={e => setFormClassifSortOrder(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Trạng thái</label>
                  <select
                    value={formClassifActive ? 'active' : 'inactive'}
                    onChange={e => setFormClassifActive(e.target.value === 'active')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng sử dụng</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassifModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL QUẢN LÝ CHỐT TUẦN */}
      {isWeekLockModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Lock size={18} />
                <span>QUẢN LÝ CHỐT KẾT QUẢ THI ĐUA THEO TUẦN</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsWeekLockModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Chọn tuần học cần thao tác ({selectedYear}):
                </label>
                <select
                  value={targetLockWeekNumber}
                  onChange={e => setTargetLockWeekNumber(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 text-sm outline-none cursor-pointer"
                >
                  {allWeeks.slice(0, 37).map(w => {
                    const lk = allWeeklyLocks[w.weekNumber];
                    return (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Tuần {w.weekNumber} ({w.startDateStr} - {w.endDateStr}) {lk?.isLocked ? '🔒 [ĐÃ CHỐT KHÓA]' : '🔓 [ĐANG MỞ]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status Box */}
              {allWeeklyLocks[targetLockWeekNumber]?.isLocked ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl space-y-1">
                  <span className="font-black text-sm flex items-center gap-2 text-rose-700">
                    <Lock size={16} /> Tuần {targetLockWeekNumber} ĐÃ CHỐT KHÓA
                  </span>
                  <p className="text-xs text-slate-600">
                    Chốt bởi: <strong className="text-slate-800">{allWeeklyLocks[targetLockWeekNumber]?.lockedByName || 'Bí thư Đoàn'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Thời gian chốt: {allWeeklyLocks[targetLockWeekNumber]?.lockedAt ? new Date(allWeeklyLocks[targetLockWeekNumber].lockedAt!).toLocaleString('vi-VN') : 'Mới đây'}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-1">
                  <span className="font-black text-sm flex items-center gap-2 text-emerald-700">
                    <Unlock size={16} /> Tuần {targetLockWeekNumber} ĐANG MỞ (CHƯA CHỐT)
                  </span>
                  <p className="text-xs text-slate-600">
                    Bấm nút "Chốt kết quả Tuần {targetLockWeekNumber}" bên dưới để khóa điểm nền nếp tuần này, ngăn chỉnh sửa hoặc chèn vi phạm mới.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWeekLockModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {allWeeklyLocks[targetLockWeekNumber]?.isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleUnlockSpecificWeek(targetLockWeekNumber)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Unlock size={16} />
                    <span>Mở khóa Tuần {targetLockWeekNumber}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLockSpecificWeek(targetLockWeekNumber)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Lock size={16} />
                    <span>Chốt kết quả Tuần {targetLockWeekNumber}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 1: DANH SÁCH HỌC SINH VI PHẠM THEO LỚP */}
      {isClassStudentsModalOpen && selectedClassForStudentList && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                  <UserCheck size={20} />
                  <span>DANH SÁCH HỌC SINH VI PHẠM – LỚP {selectedClassForStudentList.className}</span>
                </h3>
                <p className="text-xs text-slate-900/80 font-bold mt-0.5">
                  Năm học {selectedYear} • {selectedWeek > 0 ? `Tuần ${selectedWeek}` : 'Tất cả các tuần'} • Tổng số: {classStudentSummaries.length} học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClassStudentsModalOpen(false)}
                className="p-1.5 text-slate-950 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {classStudentSummaries.length === 0 ? (
                <div className="py-12 text-center text-slate-500 italic space-y-2">
                  <UserCheck size={36} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Lớp {selectedClassForStudentList.className} không có học sinh vi phạm nào trong phạm vi được chọn.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-4">HỌ VÀ TÊN</th>
                        <th className="py-3 px-3 text-center">MÃ HS</th>
                        <th className="py-3 px-3 text-center">LỚP</th>
                        <th className="py-3 px-4 text-center">SỐ LẦN VI PHẠM</th>
                        <th className="py-3 px-4 text-center">TỔNG ĐIỂM TRỪ</th>
                        <th className="py-3 px-4">NỘI DUNG VI PHẠM</th>
                        <th className="py-3 px-4 text-center w-28">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {classStudentSummaries.map((st, idx) => {
                        const uniqueCriteria = Array.from(
                          new Set(st.violations.map(v => v.criterionName || v.content || 'Vi phạm'))
                        ).join(', ');

                        return (
                          <tr key={st.studentId} className="hover:bg-amber-50/40 transition-colors divide-x divide-slate-200">
                            <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-4 font-black text-slate-900">
                              <button
                                type="button"
                                onClick={() => handleOpenStudentDetailModal(st)}
                                className="font-black text-blue-700 hover:text-blue-900 hover:underline cursor-pointer inline-flex items-center gap-1.5 text-left"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                                <span>{st.studentName}</span>
                              </button>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">{st.studentCode || '—'}</td>
                            <td className="py-3 px-3 text-center font-extrabold text-blue-900">{st.className}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 font-extrabold rounded-lg text-[11px] inline-block">
                                {st.violationCount} lần
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-black text-rose-600 text-sm">
                              -{st.totalDeduction} đ
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium leading-relaxed">
                              {uniqueCriteria}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenStudentDetailModal(st)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px] shadow-xs inline-flex items-center gap-1"
                              >
                                <Eye size={13} />
                                <span>Xem chi tiết</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs flex-shrink-0">
              <span className="font-bold text-slate-600">
                Lớp {selectedClassForStudentList.className} • Tổng điểm bị trừ: <span className="text-rose-600 font-black">-{classStudentSummaries.reduce((sum, s) => sum + s.totalDeduction, 0)} đ</span>
              </span>
              <button
                type="button"
                onClick={() => setIsClassStudentsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHI TIẾT VI PHẠM HỌC SINH */}
      {isStudentDetailModalOpen && selectedStudentForViolationDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                  <UserCheck size={20} />
                  <span>CHI TIẾT VI PHẠM HỌC SINH – {selectedStudentForViolationDetail.studentName}</span>
                </h3>
                <p className="text-xs text-blue-100 font-bold mt-0.5">
                  Lớp {selectedStudentForViolationDetail.className} • Mã HS: {selectedStudentForViolationDetail.studentCode || '—'} • Tổng {selectedStudentForViolationDetail.violationCount} lần vi phạm • Bị trừ -{selectedStudentForViolationDetail.totalDeduction} đ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentDetailModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Table */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                      <th className="py-3 px-3 text-center w-12">STT</th>
                      <th className="py-3 px-3.5">NGÀY VI PHẠM</th>
                      <th className="py-3 px-3 text-center">TUẦN</th>
                      <th className="py-3 px-3 text-center">LỚP</th>
                      <th className="py-3 px-4">TIÊU CHÍ VI PHẠM</th>
                      <th className="py-3 px-4">NỘI DUNG VI PHẠM</th>
                      <th className="py-3 px-3 text-center">ĐIỂM TRỪ</th>
                      <th className="py-3 px-3.5">NGƯỜI GHI NHẬN</th>
                      <th className="py-3 px-3 text-center">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedStudentForViolationDetail.violations.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-200">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-900">
                          <div>{v.violationDate}</div>
                          <span className="text-[11px] font-normal text-slate-500">
                            {v.violationTime || ''} {v.periodSlot ? `(${v.periodSlot})` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-blue-900">Tuần {v.weekNumber}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-slate-800">{v.className}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{v.criterionName}</td>
                        <td className="py-3 px-4 text-slate-700">{v.content || v.criterionName}</td>
                        <td className="py-3 px-3 text-center font-black text-rose-600 text-sm">
                          -{v.minusPoints} đ
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-800">{v.recordedByName}</div>
                          <span className="text-[10px] text-slate-500">{v.recordedByRole}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {v.status === 'DA_XAC_NHAN' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-extrabold text-[10px] inline-block">
                              ✓ Đã xác nhận
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-extrabold text-[10px] inline-block">
                              ⏳ Chờ xác nhận
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsStudentDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                ← Quay lại danh sách lớp
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsStudentDetailModalOpen(false);
                  setIsClassStudentsModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
