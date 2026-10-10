import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  PlusCircle,
  Zap,
  Star,
  Settings,
  BarChart3,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Award,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Printer,
  RefreshCw,
  Info,
  School,
  UserPlus,
  Download,
  AlertCircle,
  Trash2,
  Sparkles,
  CheckSquare,
  FileText,
  ShieldCheck,
  Megaphone,
  RotateCcw,
  ListOrdered,
  X
} from 'lucide-react';
import {
  ClassInfo,
  Student,
  ConductCategory,
  ConductCriterion,
  ConductRecord,
  ConductEvaluation,
  ConductSettings,
  HomeroomAssignment,
  SeriousViolationConfig,
  TeacherAssessment,
  EvaluationRatingConfig,
  EvaluationRatingConfigHistory,
  RatingTierItem,
  EvaluationPeriodScopeType,
  TeacherAssessmentCompletion
} from '../types/homeroom';
import { homeroomService } from '../services/homeroomService';
import { youthDisciplineService } from '../services/youthDisciplineService';
import { studentViolationService, StudentViolationSummary, MonthlyConductSummary } from '../services/studentViolationService';
import { YouthViolationRecord, YouthDisciplineCriterion } from '../types/youthDiscipline';
import {
  calculateConductScore,
  evaluateStudentConductRules,
  DEFAULT_SERIOUS_VIOLATION_CONFIGS,
  checkStudentHasSpecialWarning,
  DEFAULT_RATING_TIERS,
  getRatingBadgeStyle,
  evaluateStudent6Groups,
  isDatChuaDatCategory
} from '../lib/homeroomData';
import { exportHomeroomToExcel } from '../utils/homeroomExport';
import { exportStudentListToExcel } from '../utils/studentExcel';
import { StudentSortMode, sortStudentsByVietnameseName, getSortModeLabel } from '../utils/studentSorting';
import { useAuth } from '../store/AuthContext';
import { useAppContext } from '../store/AppContext';
import BackButton from '../components/ui/BackButton';
import { ALL_MONTH_OPTIONS, isWeekInMonth, getWeeksForMonth } from '../utils/schoolWeekUtils';

// Import Modals
import StudentProfileModal from '../components/homeroom/StudentProfileModal';
import RecordModal from '../components/homeroom/RecordModal';
import QuickRecordModal from '../components/homeroom/QuickRecordModal';
import BonusPointModal from '../components/homeroom/BonusPointModal';
import CriteriaManagerModal from '../components/homeroom/CriteriaManagerModal';
import EvaluationModal from '../components/homeroom/EvaluationModal';
import ConductSettingsModal from '../components/homeroom/ConductSettingsModal';
import HomeroomReportModal from '../components/homeroom/HomeroomReportModal';
import ClassManagerModal from '../components/homeroom/ClassManagerModal';
import StudentManagerModal from '../components/homeroom/StudentManagerModal';
import PostSaveWarningModal from '../components/homeroom/PostSaveWarningModal';
import BghApprovalTab from '../components/homeroom/BghApprovalTab';
import SeriousViolationsReportModal from '../components/homeroom/SeriousViolationsReportModal';
import ResetConductModal from '../components/homeroom/ResetConductModal';
import TeacherAssessmentModal from '../components/homeroom/TeacherAssessmentModal';
import BulkGoodAssessmentModal from '../components/homeroom/BulkGoodAssessmentModal';
import EvaluationRatingConfigModal from '../components/homeroom/EvaluationRatingConfigModal';
import ExportStudentViolationsModal from '../components/discipline/ExportStudentViolationsModal';

export default function Homeroom() {
  const { user } = useAuth();
  const isBgh = user?.role?.toUpperCase() === 'BGH' || user?.role?.toUpperCase() === 'ADMIN' || user?.username === 'admin';
  const { teachers } = useAppContext();

  // State loaded from Firestore
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<HomeroomAssignment[]>([]);
  const [categories, setCategories] = useState<ConductCategory[]>([]);
  const [criteria, setCriteria] = useState<ConductCriterion[]>([]);
  const [records, setRecords] = useState<ConductRecord[]>([]);
  const [evaluations, setEvaluations] = useState<ConductEvaluation[]>([]);

  // Youth Discipline Violations (Single Source of Truth)
  const [youthViolations, setYouthViolations] = useState<YouthViolationRecord[]>([]);

  // Student Violation Details Modal State
  const [selectedStudentForViolationsModal, setSelectedStudentForViolationsModal] = useState<{ student: Student; summary: StudentViolationSummary } | null>(null);
  const [isStudentViolationsModalOpen, setIsStudentViolationsModalOpen] = useState<boolean>(false);

  const handleViewStudentViolations = (st: Student) => {
    const summary = studentViolationService.getStudentViolationSummary(
      st,
      youthViolations,
      selectedSchoolYear,
      studentTableScope,
      studentTableScope === 'week' ? selectedWeek : undefined,
      selMonthNum
    );
    setSelectedStudentForViolationsModal({ student: st, summary });
    setIsStudentViolationsModalOpen(true);
  };

  // Record Violation Modal for Homeroom
  const [selectedStudentForNewViolation, setSelectedStudentForNewViolation] = useState<Student | null>(null);
  const [isRecordViolationModalOpen, setIsRecordViolationModalOpen] = useState<boolean>(false);
  const [youthCriteriaList, setYouthCriteriaList] = useState<YouthDisciplineCriterion[]>([]);
  const [selectedCriterionIdForNewVio, setSelectedCriterionIdForNewVio] = useState<string>('');
  const [formNewVioMinusPoints, setFormNewVioMinusPoints] = useState<number>(2);
  const [formNewVioContent, setFormNewVioContent] = useState<string>('');
  const [formNewVioDate, setFormNewVioDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [teacherAssessments, setTeacherAssessments] = useState<TeacherAssessment[]>([]);
  const [assessmentCompletions, setAssessmentCompletions] = useState<TeacherAssessmentCompletion[]>([]);
  const [showReportCompletionModal, setShowReportCompletionModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [reportingCompletion, setReportingCompletion] = useState(false);
  const [violationConfigs, setViolationConfigs] = useState<SeriousViolationConfig[]>(DEFAULT_SERIOUS_VIOLATION_CONFIGS);
  const [settings, setSettings] = useState<ConductSettings>({
    id: 'default_conduct_settings',
    schoolYear: '2026–2027',
    baseScore: 100,
    thresholds: { totMin: 90, khaMin: 70, datMin: 50 }
  });

  // Active Filters (Persisted to localStorage across F5 - Requirement 11)
  const [selectedSchoolYear, setSelectedSchoolYearState] = useState<string>(() => {
    return localStorage.getItem('homeroom_selected_school_year') || '2026–2027';
  });
  const [selectedGrade, setSelectedGradeState] = useState<string>(() => {
    return localStorage.getItem('homeroom_selected_grade') || 'all';
  });
  const [selectedClassId, setSelectedClassIdState] = useState<string>(() => {
    return localStorage.getItem('homeroom_selected_class_id') || '';
  });
  const [selectedWeek, setSelectedWeekState] = useState<number>(() => {
    const saved = localStorage.getItem('homeroom_selected_week');
    return saved ? Number(saved) : 3;
  });
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    return localStorage.getItem('homeroom_selected_month') || 'Tháng 09';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentSortMode, setStudentSortMode] = useState<StudentSortMode>('default');

  // Persistence helpers
  const setSelectedSchoolYear = (val: string) => {
    setSelectedSchoolYearState(val);
    localStorage.setItem('homeroom_selected_school_year', val);
  };
  const setSelectedGrade = (val: string) => {
    setSelectedGradeState(val);
    localStorage.setItem('homeroom_selected_grade', val);
  };
  const setSelectedClassId = (val: string) => {
    setSelectedClassIdState(val);
    localStorage.setItem('homeroom_selected_class_id', val);
  };
  const setSelectedWeek = (val: number) => {
    setSelectedWeekState(val);
    localStorage.setItem('homeroom_selected_week', String(val));
  };
  const setSelectedMonth = (val: string) => {
    setSelectedMonthState(val);
    localStorage.setItem('homeroom_selected_month', val);
  };

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'students' | 'weekly' | 'monthly' | 'ranking' | 'alerts' | 'evaluations' | 'bgh_approval'>('students');

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isQuickRecordModalOpen, setIsQuickRecordModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isCriteriaManagerOpen, setIsCriteriaManagerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isTeacherAssessmentModalOpen, setIsTeacherAssessmentModalOpen] = useState(false);
  const [isBulkGoodModalOpen, setIsBulkGoodModalOpen] = useState(false);
  const [bulkGoodInitialMode, setBulkGoodInitialMode] = useState<'all' | 'unevaluated'>('all');
  const [isRatingConfigModalOpen, setIsRatingConfigModalOpen] = useState(false);
  const [ratingConfigs, setRatingConfigs] = useState<EvaluationRatingConfig[]>([]);
  const [ratingHistory, setRatingHistory] = useState<EvaluationRatingConfigHistory[]>([]);
  const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
  const [isStudentManagerOpen, setIsStudentManagerOpen] = useState(false);
  const [studentManagerInitialTab, setStudentManagerInitialTab] = useState<'single' | 'excel' | 'list'>('excel');

  // New Conduct Warning Modal States
  const [isSeriousReportModalOpen, setIsSeriousReportModalOpen] = useState(false);
  const [isResetConductModalOpen, setIsResetConductModalOpen] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string>('');
  const [studentTableScope, setStudentTableScopeState] = useState<'week' | 'month' | 'year'>('month');
  const setStudentTableScope = (val: 'week' | 'month' | 'year') => {
    setStudentTableScopeState(val);
    localStorage.setItem('homeroom_student_table_scope', val);
  };
  const [postSaveWarningModalOpen, setPostSaveWarningModalOpen] = useState(false);
  const [postSaveWarningRecord, setPostSaveWarningRecord] = useState<ConductRecord | null>(null);
  const [postSaveWarningStudent, setPostSaveWarningStudent] = useState<Student | null>(null);

  // Selected entities for modals
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedStudentForMonthlyDetail, setSelectedStudentForMonthlyDetail] = useState<{
    student: Student;
    summary: MonthlyConductSummary;
  } | null>(null);
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<Student | null>(null);
  const [selectedStudentForAssessment, setSelectedStudentForAssessment] = useState<Student | null>(null);
  const [assessmentInitialSelectedIds, setAssessmentInitialSelectedIds] = useState<string[] | undefined>(undefined);
  const [defaultStudentForRecord, setDefaultStudentForRecord] = useState<string | undefined>(undefined);
  const [studentToDeleteFromDashboard, setStudentToDeleteFromDashboard] = useState<Student | null>(null);
  const [isDeletingFromDashboard, setIsDeletingFromDashboard] = useState(false);

  // Delete all / bulk delete students state
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllWithConductRecords, setDeleteAllWithConductRecords] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isSavingAbc, setIsSavingAbc] = useState<boolean>(false);
  const [abcSaveStatusText, setAbcSaveStatusText] = useState<string>('');
  const [isExportStudentViolationsModalOpen, setIsExportStudentViolationsModalOpen] = useState(false);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClassId, selectedSchoolYear, activeTab]);

  // Initial Firestore subscriptions
  useEffect(() => {
    homeroomService.seedIfEmpty();
    homeroomService.syncAllClassStudentCounts();

    const unsubCls = homeroomService.subscribeClasses(setClasses);
    const unsubStd = homeroomService.subscribeStudents(setStudents);
    const unsubAssign = homeroomService.subscribeAssignments(setAssignments);
    const unsubCat = homeroomService.subscribeCategories(setCategories);
    const unsubCrit = homeroomService.subscribeCriteria(setCriteria);
    const unsubRec = homeroomService.subscribeRecords(setRecords);
    const unsubEval = homeroomService.subscribeEvaluations(setEvaluations);
    const unsubTA = homeroomService.subscribeTeacherAssessments(setTeacherAssessments);
    const unsubComp = homeroomService.subscribeTeacherAssessmentCompletions(setAssessmentCompletions);
    const unsubSet = homeroomService.subscribeSettings(setSettings);
    const unsubVio = homeroomService.subscribeViolationConfigs(setViolationConfigs);
    const unsubRating = homeroomService.subscribeRatingConfigs(setRatingConfigs);
    const unsubHistory = homeroomService.subscribeRatingHistory(setRatingHistory);

    return () => {
      unsubCls();
      unsubStd();
      unsubAssign();
      unsubCat();
      unsubCrit();
      unsubRec();
      unsubEval();
      unsubTA();
      unsubComp();
      unsubSet();
      unsubVio();
      unsubRating();
      unsubHistory();
    };
  }, []);

  // Load Youth Discipline Violations (Single Source of Truth)
  const loadYouthViolations = async () => {
    try {
      const list = await youthDisciplineService.getViolations({ schoolYear: selectedSchoolYear });
      setYouthViolations(list);
    } catch (e) {
      console.warn('Error loading youth violations:', e);
    }
  };

  useEffect(() => {
    loadYouthViolations();
  }, [selectedSchoolYear]);

  // Set default class once loaded (restore from localStorage if valid)
  useEffect(() => {
    if (classes.length > 0) {
      const savedClassId = localStorage.getItem('homeroom_selected_class_id');
      if (savedClassId && classes.some(c => c.id === savedClassId)) {
        setSelectedClassIdState(savedClassId);
      } else if (!selectedClassId) {
        setSelectedClassIdState(classes[0].id);
      }
    }
  }, [classes]);

  // Derived filtered classes
  const filteredClasses = classes.filter(c => {
    if (selectedGrade !== 'all' && String(c.grade) !== selectedGrade) return false;
    return true;
  });

  // Ensure selectedClass is always strictly within filteredClasses (Requirement 5)
  const selectedClass = filteredClasses.find(c => c.id === selectedClassId) || filteredClasses[0] || null;

  // Whenever selectedGrade changes or classes change, keep selectedClassId strictly in sync with filteredClasses
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const isCurrentInFiltered = filteredClasses.some(c => c.id === selectedClassId);
      if (!isCurrentInFiltered) {
        setSelectedClassIdState(filteredClasses[0].id);
        localStorage.setItem('homeroom_selected_class_id', filteredClasses[0].id);
      }
    }
  }, [selectedGrade, classes]);

  // Robust function to verify if a student belongs to a given class (Requirement 5 & 6)
  const isStudentOfClass = (s: Student, cls: ClassInfo | null) => {
    if (!cls) return true;
    if (s.classId === cls.id) {
      if (s.className && cls.name && s.className.trim().toLowerCase() !== cls.name.trim().toLowerCase()) {
        const otherCls = classes.find(c => c.name.trim().toLowerCase() === s.className.trim().toLowerCase());
        if (otherCls && otherCls.id !== cls.id) return false;
      }
      return true;
    }
    if (s.className && cls.name && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  // Dynamic real count calculation for any class
  const getClassStudentCount = (cls: ClassInfo) => {
    return students.filter(s => isStudentOfClass(s, cls)).length;
  };

  // Derived students for selected class & search & Vietnamese given-name sort
  const rawClassStudents = students
    .filter(s => isStudentOfClass(s, selectedClass))
    .filter(s => !searchQuery || (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const classStudents = sortStudentsByVietnameseName(rawClassStudents, studentSortMode);

  const handleToggleAbcSort = async () => {
    if (isSavingAbc) return;
    if (!selectedClass) {
      alert('Vui lòng chọn lớp học trước khi xếp A–B–C.');
      return;
    }

    const nextMode: StudentSortMode = studentSortMode === 'name_asc' ? 'name_desc' : 'name_asc';
    
    // 1. Get all raw students of the selected class
    const allClassStudents = students.filter(s => isStudentOfClass(s, selectedClass));
    if (allClassStudents.length === 0) {
      setAssessmentToast('Không có học sinh nào trong lớp để xếp A–B–C.');
      setTimeout(() => setAssessmentToast(''), 3000);
      return;
    }

    try {
      setIsSavingAbc(true);
      setAbcSaveStatusText('Đang lưu...');
      
      // 2. Perform Vietnamese Alphabetical sort
      const sorted = sortStudentsByVietnameseName(allClassStudents, nextMode);

      // 3. Compute ranked student items with persistent STT and classification
      const rankedPayload = sorted.map((st, idx) => {
        const scoreInfo = classStudentScores.get(st.id);
        const classification = scoreInfo ? scoreInfo.classification : (st.xepLoaiABC || 'Tốt');
        return {
          id: st.id,
          stt: idx + 1,
          sortOrder: idx + 1,
          xepLoaiABC: classification,
          xep_loai_abc: classification
        };
      });

      // 4. Save directly to Firestore Database
      await homeroomService.saveClassAbcRanking(selectedClass.id, rankedPayload, nextMode);

      // 5. Update local state
      setStudentSortMode(nextMode);
      setAbcSaveStatusText('Đã lưu');
      setAssessmentToast(`Đã xếp và lưu kết quả A–B–C thành công.`);
      
      setTimeout(() => {
        setAbcSaveStatusText('');
      }, 3000);
    } catch (err: any) {
      console.error('Error saving ABC ranking to Firestore:', err);
      setAbcSaveStatusText('');
      setAssessmentToast('Không thể lưu kết quả A–B–C. Vui lòng thử lại.');
    } finally {
      setIsSavingAbc(false);
      setTimeout(() => {
        setAssessmentToast('');
      }, 4500);
    }
  };

  // Derived records for selected class and school year
  const classRecords = records.filter(r => 
    (!selectedClass || r.classId === selectedClass.id) &&
    (!r.schoolYear || r.schoolYear === selectedSchoolYear)
  );

  const selMonthNum = parseInt(selectedMonth.replace(/\D/g, ''), 10) || 9;

  // Exact records belonging to the selected month (Requirements 1, 3, 4, 5, 6)
  const monthClassRecords = classRecords.filter(r => {
    const rMonth = Number(r.monthNumber) || (r.recordDate ? (new Date(r.recordDate).getMonth() + 1) : null);
    return rMonth === selMonthNum;
  });

  // Week verification against selected month (Requirements 9 & 10)
  const isSelectedWeekInMonth = isWeekInMonth(selectedWeek, selMonthNum, selectedSchoolYear);
  const weeksForCurrentMonth = getWeeksForMonth(selMonthNum, selectedSchoolYear);

  const currentScopeRecordsCount = classRecords.filter(r => {
    const rMonth = Number(r.monthNumber) || (r.recordDate ? (new Date(r.recordDate).getMonth() + 1) : null);
    return Number(r.weekNumber) === Number(selectedWeek) && rMonth === selMonthNum;
  }).length;

  const isHomeroomTeacher = user?.role?.toUpperCase() === 'TEACHER' || user?.role?.toUpperCase() === 'GVCN' || isBgh;

  const handleOpenResetModal = () => {
    if (!isBgh && !isHomeroomTeacher) {
      alert('Bạn không có quyền thực hiện chức năng này. Chỉ Quản trị viên (BGH) hoặc Giáo viên chủ nhiệm mới có quyền xóa/reset kết quả nền nếp.');
      return;
    }
    setIsResetConductModalOpen(true);
  };

  const handleResetConduct = async () => {
    if (!selectedClass) return;
    const targetClassId = selectedClass.id;

    await homeroomService.clearConductData({
      schoolYear: selectedSchoolYear,
      classId: targetClassId,
      weekNumber: selectedWeek,
      monthNumber: selMonthNum,
      monthLabel: selectedMonth,
      resetTeacherAssessments: true
    });

    // Synchronize local state immediately (Requirements 6, 9, 13)
    setRecords(prev => prev.filter(r => !(
      r.classId === targetClassId &&
      (!r.schoolYear || r.schoolYear === selectedSchoolYear) &&
      Number(r.weekNumber) === Number(selectedWeek) &&
      (Number(r.monthNumber) === Number(selMonthNum) || !r.monthNumber)
    )));

    setEvaluations(prev => prev.filter(e => !(
      e.classId === targetClassId &&
      (!e.schoolYear || e.schoolYear === selectedSchoolYear) &&
      (e.period === selectedMonth || e.period === `Tuần ${String(selectedWeek).padStart(2, '0')}`)
    )));

    setTeacherAssessments(prev => prev.filter(a => !(
      a.classId === targetClassId &&
      (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
      (Number(a.monthNumber) === Number(selMonthNum) || a.month === selectedMonth)
    )));

    setResetSuccessToast('Đã xóa/reset kết quả nền nếp thành công.');
    setTimeout(() => {
      setResetSuccessToast('');
    }, 4000);
  };

  // Homeroom assignment teacher
  const currentAssignment = assignments.find(a => a.classId === selectedClass?.id && a.status === 'active');
  const homeroomTeacherName = selectedClass?.homeroomTeacherName || currentAssignment?.teacherName || 'Chưa phân công';

  // Permission check for teacher assessment (GVCN of this class or BGH)
  const isCurrentClassHomeroomTeacher = Boolean(
    user && (
      selectedClass?.homeroomTeacherId === user.id ||
      selectedClass?.homeroomTeacherName === user.name ||
      currentAssignment?.teacherId === user.id ||
      currentAssignment?.teacherName === user.name
    )
  );

  const canManageAssessment = Boolean(
    isBgh ||
    isCurrentClassHomeroomTeacher ||
    user?.role === 'GVCN' ||
    user?.role === 'TEACHER' ||
    user?.role?.toUpperCase() === 'GVCN' ||
    user?.role?.toUpperCase() === 'TEACHER' ||
    !selectedClass?.homeroomTeacherName
  );

  const handleOpenRecordViolationModalForStudent = async (st: Student) => {
    setSelectedStudentForNewViolation(st);
    try {
      const crits = await youthDisciplineService.getCriteria();
      setYouthCriteriaList(crits);
      if (crits.length > 0) {
        setSelectedCriterionIdForNewVio(crits[0].id);
        setFormNewVioMinusPoints(crits[0].minusPoints || 2);
        setFormNewVioContent(crits[0].name);
      }
    } catch (e) {
      console.warn('Error loading criteria:', e);
    }
    setFormNewVioDate(new Date().toISOString().split('T')[0]);
    setIsRecordViolationModalOpen(true);
  };

  const handleSaveNewViolationFromHomeroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNewViolation || !selectedClass) return;
    try {
      const matchedCrit = youthCriteriaList.find(c => c.id === selectedCriterionIdForNewVio);
      const newVioRecord: Partial<YouthViolationRecord> = {
        studentId: selectedStudentForNewViolation.id,
        studentName: selectedStudentForNewViolation.fullName || selectedStudentForNewViolation.name,
        studentCode: selectedStudentForNewViolation.code,
        classId: selectedClass.id,
        className: selectedClass.name,
        schoolYear: selectedSchoolYear,
        weekNumber: selectedWeek,
        monthNumber: parseInt(selectedMonth.replace(/\D/g, '')) || 9,
        criterionId: selectedCriterionIdForNewVio,
        criterionName: matchedCrit?.name || formNewVioContent || 'Vi phạm nội quy',
        category: matchedCrit?.category || 'KHAC',
        categoryName: matchedCrit?.categoryName || 'Khác',
        severity: matchedCrit?.severity || 'Nhẹ',
        content: formNewVioContent || matchedCrit?.name || '',
        minusPoints: Number(formNewVioMinusPoints) || 2,
        violationDate: formNewVioDate,
        status: 'DA_XAC_NHAN',
        recordedBy: user?.id || 'gvcn',
        recordedByName: user?.name || 'GVCN'
      };

      await youthDisciplineService.saveViolation(newVioRecord as YouthViolationRecord, user?.role || 'GVCN');
      await loadYouthViolations();
      setIsRecordViolationModalOpen(false);
      setSelectedStudentForNewViolation(null);
    } catch (err: any) {
      console.error('Lỗi khi lưu vi phạm:', err);
    }
  };

  // 1. Rating config handlers (Requirement 3, 4, 5)
  const handleSaveRatingConfig = async (
    config: EvaluationRatingConfig,
    previousTiers?: RatingTierItem[] | null,
    note?: string
  ) => {
    await homeroomService.saveRatingConfig(
      config,
      { name: user?.name || 'BGH', role: user?.role },
      previousTiers,
      note
    );
  };

  const handleRestoreDefaultRatingConfig = async (
    schoolYear: string,
    periodType: EvaluationPeriodScopeType,
    periodId: string,
    previousTiers?: RatingTierItem[]
  ) => {
    await homeroomService.restoreDefaultRatingConfig(
      schoolYear,
      periodType,
      periodId,
      { name: user?.name || 'BGH', role: user?.role },
      previousTiers
    );
  };

  // 2. Active Rating Config matching current scope and schoolYear (Requirement 10)
  const activeRatingConfig = useMemo(() => {
    const currentPeriodId = studentTableScope === 'week'
      ? `Tuần ${String(selectedWeek).padStart(2, '0')}`
      : studentTableScope === 'month'
      ? selectedMonth
      : 'all';

    // Exact scope and period match
    const exact = ratingConfigs.find(c =>
      c.school_year === selectedSchoolYear &&
      c.evaluation_period_type === studentTableScope &&
      c.evaluation_period_id === currentPeriodId &&
      c.is_active !== false
    );
    if (exact) return exact;

    // Month scope fallback if in month mode
    if (studentTableScope === 'month') {
      const monthCfg = ratingConfigs.find(c =>
        c.school_year === selectedSchoolYear &&
        c.evaluation_period_type === 'month' &&
        c.evaluation_period_id === selectedMonth &&
        c.is_active !== false
      );
      if (monthCfg) return monthCfg;
    }

    // Default for year / all
    const defaultCfg = ratingConfigs.find(c =>
      c.school_year === selectedSchoolYear &&
      c.evaluation_period_type === 'all' &&
      c.is_active !== false
    );
    if (defaultCfg) return defaultCfg;

    return null;
  }, [ratingConfigs, selectedSchoolYear, studentTableScope, selectedMonth, selectedWeek]);

  // Month-specific rating config for Month tab & Teacher Assessment
  const activeMonthRatingConfig = useMemo(() => {
    const exact = ratingConfigs.find(c =>
      c.school_year === selectedSchoolYear &&
      c.evaluation_period_type === 'month' &&
      c.evaluation_period_id === selectedMonth &&
      c.is_active !== false
    );
    if (exact) return exact;
    return ratingConfigs.find(c =>
      c.school_year === selectedSchoolYear &&
      c.evaluation_period_type === 'all' &&
      c.is_active !== false
    ) || null;
  }, [ratingConfigs, selectedSchoolYear, selectedMonth]);

  // Active tiers list (Requirement 6, 7)
  const activeRatingTiers = useMemo(() => {
    if (activeRatingConfig?.tiers && activeRatingConfig.tiers.length > 0) {
      return activeRatingConfig.tiers;
    }
    return DEFAULT_RATING_TIERS;
  }, [activeRatingConfig]);

  // Current Good tier (Requirement 8)
  const currentGoodTier = useMemo(() => {
    return activeRatingTiers.find(t => t.name.trim().toLowerCase() === 'tốt') || activeRatingTiers[0] || DEFAULT_RATING_TIERS[0];
  }, [activeRatingTiers]);

  // Class student scores & ratings dynamically evaluated from single source of truth (youthViolations via studentViolationService)
  const classStudentScores = useMemo(() => {
    const map = new Map<string, {
      totalScore: number;
      classification: string;
      badgeStyle: string;
      totalPlus: number;
      totalMinus: number;
      hasSpecialWarning: boolean;
      violationCount: number;
      violations: YouthViolationRecord[];
      monthlySummary?: MonthlyConductSummary;
    }>();

    classStudents.forEach(st => {
      const summary = studentViolationService.getStudentViolationSummary(
        st,
        youthViolations,
        selectedSchoolYear,
        studentTableScope,
        studentTableScope === 'week' ? selectedWeek : undefined,
        selMonthNum
      );

      const monthlySummary = studentTableScope === 'month'
        ? studentViolationService.getMonthlyConductSummaryForStudent(
            st,
            youthViolations,
            teacherAssessments,
            selectedSchoolYear,
            selMonthNum
          )
        : undefined;

      map.set(st.id, {
        totalScore: summary.trainingScore,
        classification: summary.classification,
        badgeStyle: summary.badgeStyle || getRatingBadgeStyle(summary.classificationColor, summary.classification),
        totalPlus: 0,
        totalMinus: summary.totalDeduction,
        hasSpecialWarning: false,
        violationCount: summary.violationCount,
        violations: summary.violations,
        monthlySummary
      });
    });

    return map;
  }, [classStudents, youthViolations, teacherAssessments, selectedSchoolYear, studentTableScope, selectedWeek, selMonthNum]);

  // Dynamic count per tier in current class view (Requirement 7)
  const classRatingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRatingTiers.forEach(t => {
      counts[t.name] = 0;
    });

    classStudents.forEach(st => {
      const info = classStudentScores.get(st.id);
      if (info) {
        const cls = info.classification;
        if (counts[cls] !== undefined) {
          counts[cls] = (counts[cls] || 0) + 1;
        } else if (cls.includes('CHƯA ĐẠT') || cls.toLowerCase().includes('chưa đạt')) {
          const matchTier = activeRatingTiers.find(t => t.name.toLowerCase().includes('chưa đạt'));
          if (matchTier) counts[matchTier.name] = (counts[matchTier.name] || 0) + 1;
          else counts['Chưa đạt'] = (counts['Chưa đạt'] || 0) + 1;
        } else if (cls.includes('ĐẠT') || cls.toLowerCase().includes('đạt')) {
          const matchTier = activeRatingTiers.find(t => t.name.toLowerCase().trim() === 'đạt');
          if (matchTier) counts[matchTier.name] = (counts[matchTier.name] || 0) + 1;
          else counts['Đạt'] = (counts['Đạt'] || 0) + 1;
        } else {
          counts[cls] = (counts[cls] || 0) + 1;
        }
      }
    });

    return counts;
  }, [classStudents, classStudentScores, activeRatingTiers]);

  // Derived teacher assessments statistics for current class & period
  const classTeacherAssessments = teacherAssessments.filter(a =>
    a.classId === selectedClass?.id &&
    (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
    (Number(a.monthNumber) === selMonthNum || a.month === selectedMonth)
  );

  const classEvaluatedCount = classStudents.filter(st =>
    classTeacherAssessments.some(a => a.studentId === st.id)
  ).length;

  const classUnevaluatedCount = Math.max(0, classStudents.length - classEvaluatedCount);

  const classGoodCount = classStudents.filter(st => {
    const a = classTeacherAssessments.find(item => item.studentId === st.id);
    return a && (a.levelRating === 'Tốt' || a.teacherProposedRating === 'Tốt');
  }).length;

  const [assessmentToast, setAssessmentToast] = useState<string>('');

  // Open modal handlers
  const handleOpenRecordForStudent = (studentId: string) => {
    setDefaultStudentForRecord(studentId);
    setIsRecordModalOpen(true);
  };

  const handleOpenProfile = (student: Student) => {
    setSelectedStudentForProfile(student);
    setIsProfileModalOpen(true);
  };

  const handleOpenEval = (student: Student) => {
    setSelectedStudentForEval(student);
    setIsEvaluationModalOpen(true);
  };

  const handleOpenTeacherAssessment = (student?: Student | null, initialIds?: string[]) => {
    setSelectedStudentForAssessment(student || null);
    setAssessmentInitialSelectedIds(initialIds);
    setIsTeacherAssessmentModalOpen(true);
  };

  const handleSaveTeacherAssessment = async (assessmentPayload: Partial<TeacherAssessment>) => {
    const result = await homeroomService.saveTeacherAssessment(assessmentPayload);
    const isNowAllDone = (classUnevaluatedCount <= 1);
    if (isNowAllDone) {
      setAssessmentToast(`🎉 Tuyệt vời! Đã hoàn thành xếp loại đủ 100% học sinh lớp ${selectedClass?.name}! Thầy/Cô có thể bấm “Báo đã hoàn thành xếp loại”.`);
    } else if (result?.isUpdate) {
      setAssessmentToast('Đã cập nhật xếp loại của GVCN thành công');
    } else {
      setAssessmentToast('Đã lưu phiếu xếp loại của GVCN thành công');
    }
    setTimeout(() => {
      setAssessmentToast('');
    }, 5000);
  };

  // Completion status calculation for current class & period
  const currentClassCompletion = useMemo(() => {
    if (!selectedClass) return null;
    const yearSlug = (selectedSchoolYear || '2026–2027').replace(/[^a-zA-Z0-9]/g, '_');
    const monthSlug = (selectedMonth || 'Thang_09').replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `completion_${selectedClass.id}_${yearSlug}_${monthSlug}`;
    return assessmentCompletions.find(c => c.id === docId && c.isCompleted) || null;
  }, [assessmentCompletions, selectedClass, selectedSchoolYear, selectedMonth]);

  // Pending BGH approvals count across all classes
  const pendingBghClassApprovalCount = useMemo(() => {
    return assessmentCompletions.filter(c => 
      c.isCompleted && (!c.approvalStatus || c.approvalStatus === 'Chờ BGH duyệt')
    ).length;
  }, [assessmentCompletions]);

  const handleReportCompletion = async () => {
    if (!selectedClass) return;
    try {
      setReportingCompletion(true);
      await homeroomService.reportTeacherAssessmentCompletion({
        classId: selectedClass.id,
        className: selectedClass.name,
        schoolYear: selectedSchoolYear,
        month: selectedMonth,
        semester: 'Học kỳ I',
        totalStudents: classStudents.length,
        evaluatedCount: classEvaluatedCount,
        ratingCounts: classRatingCounts,
        note: completionNote.trim(),
        user: { id: user?.id, name: user?.name, role: user?.role }
      });
      setShowReportCompletionModal(false);
      setCompletionNote('');
      setAssessmentToast(`🎉 Đã báo hoàn thành xếp loại học sinh của GVCN cho lớp ${selectedClass.name} (${selectedMonth}) thành công!`);
      setTimeout(() => setAssessmentToast(''), 6000);
    } catch (err: any) {
      alert('Lỗi khi báo hoàn thành xếp loại: ' + (err.message || ''));
    } finally {
      setReportingCompletion(false);
    }
  };

  const handleReopenCompletion = async () => {
    if (!selectedClass) return;
    if (window.confirm(`Bạn có chắc chắn muốn mở lại xếp loại cho lớp ${selectedClass.name} để tiếp tục chỉnh sửa?`)) {
      try {
        await homeroomService.reopenTeacherAssessmentCompletion(selectedClass.id, selectedSchoolYear, selectedMonth);
        setAssessmentToast(`Đã mở lại trạng thái xếp loại cho lớp ${selectedClass.name}.`);
        setTimeout(() => setAssessmentToast(''), 4000);
      } catch (err: any) {
        alert('Lỗi khi mở lại xếp loại: ' + err.message);
      }
    }
  };

  const handleBulkSaveTeacherAssessments = async (
    selectedIds: string[],
    data: any,
    skipDuplicates?: boolean
  ) => {
    if (!selectedClass) {
      return {
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        failedStudents: [],
        skippedDuplicatesCount: 0,
        updatedCount: 0,
        newCount: 0
      };
    }
    const targetStudents = classStudents.filter(s => selectedIds.includes(s.id));
    const result = await homeroomService.bulkSaveTeacherAssessments({
      students: targetStudents,
      classId: selectedClass.id,
      className: selectedClass.name,
      schoolYear: selectedSchoolYear,
      semester: 'Học kỳ I',
      month: selectedMonth,
      monthNumber: selMonthNum,
      assessment: {
        ruleCompliance: data.ruleCompliance,
        learningAttitude: data.learningAttitude,
        responsibility: data.responsibility,
        collectiveActivities: data.collectiveActivities,
        relationships: data.relationships,
        selfDiscipline: data.selfDiscipline,
      },
      content: data.content || data.comment,
      comment: data.comment || data.content,
      levelRating: data.levelRating,
      teacherProposedRating: data.teacherProposedRating,
      needsMonitoring: data.needsMonitoring,
      recordDate: data.recordDate,
      teacherId: user?.id || 'gvcn',
      teacherName: homeroomTeacherName,
      recordedBy: user?.name || 'Giáo viên chủ nhiệm',
      updatedBy: user?.name || 'GVCN',
      skipDuplicates
    });

    if (result.successCount > 0) {
      if (classUnevaluatedCount - result.successCount <= 0) {
        setAssessmentToast(`🎉 Tuyệt vời! Đã hoàn thành xếp loại đủ 100% học sinh lớp ${selectedClass.name}! Thầy/Cô có thể bấm “Báo đã hoàn thành xếp loại”.`);
      } else {
        setAssessmentToast(`✓ Đã ghi nhận cho ${result.successCount}/${targetStudents.length} học sinh.`);
      }
    } else if (result.skippedDuplicatesCount > 0) {
      setAssessmentToast(`Đã bỏ qua ${result.skippedDuplicatesCount} bản ghi trùng lặp.`);
    }
    setTimeout(() => {
      setAssessmentToast('');
    }, 4500);

    return result;
  };

  const handleOpenBulkGoodAssessment = (mode: 'all' | 'unevaluated' = 'all') => {
    setBulkGoodInitialMode(mode);
    setIsBulkGoodModalOpen(true);
  };

  const handleSaveBulkGoodAssessment = async (
    selectedIds: string[],
    data: {
      ruleCompliance: string;
      learningAttitude: string;
      responsibility: string;
      collectiveActivities: string;
      relationships: string;
      selfDiscipline: string;
      comment: string;
      levelRating: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
      teacherProposedRating: 'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt';
      needsMonitoring: boolean;
      recordDate: string;
    }
  ) => {
    if (!selectedClass) return { totalProcessed: 0, updatedCount: 0, newCount: 0 };
    const targetStudents = students.filter(s => selectedIds.includes(s.id));
    const result = await homeroomService.bulkSaveGoodTeacherAssessments({
      students: targetStudents,
      classId: selectedClass.id,
      className: selectedClass.name,
      schoolYear: selectedSchoolYear,
      semester: 'Học kỳ I',
      month: selectedMonth,
      monthNumber: selMonthNum,
      assessment: {
        ruleCompliance: data.ruleCompliance,
        learningAttitude: data.learningAttitude,
        responsibility: data.responsibility,
        collectiveActivities: data.collectiveActivities,
        relationships: data.relationships,
        selfDiscipline: data.selfDiscipline,
      },
      comment: data.comment,
      levelRating: data.levelRating,
      teacherProposedRating: data.teacherProposedRating,
      needsMonitoring: data.needsMonitoring,
      recordDate: data.recordDate,
      teacherId: user?.id || 'gvcn',
      teacherName: homeroomTeacherName,
      recordedBy: user?.name || 'Giáo viên chủ nhiệm',
      updatedBy: user?.name || 'GVCN'
    });

    setAssessmentToast(`Đã cập nhật đánh giá cho ${result.totalProcessed} học sinh. Xếp loại: Tốt.`);
    setTimeout(() => {
      setAssessmentToast('');
    }, 4500);

    return result;
  };

  const handleConfirmDeleteAllStudents = async () => {
    if (!selectedClass) return;
    try {
      setIsDeletingAll(true);
      const res = await homeroomService.deleteAllStudentsOfClass(selectedClass.id, {
        deleteRecordsAndAssessments: deleteAllWithConductRecords
      });
      if (deleteAllWithConductRecords) {
        setRecords(prev => prev.filter(r => !(r.classId === selectedClass.id && (!r.schoolYear || r.schoolYear === selectedSchoolYear))));
        setEvaluations(prev => prev.filter(e => !(e.classId === selectedClass.id && (!e.schoolYear || e.schoolYear === selectedSchoolYear))));
        setTeacherAssessments(prev => prev.filter(a => !(a.classId === selectedClass.id && (!a.schoolYear || a.schoolYear === selectedSchoolYear))));
      }
      setIsDeleteAllModalOpen(false);
      setSelectedStudentIds([]);
      setResetSuccessToast(`Đã xóa thành công toàn bộ ${res.deletedCount} hồ sơ học sinh của lớp ${selectedClass.name}.`);
      setTimeout(() => setResetSuccessToast(''), 4000);
    } catch (err: any) {
      alert('Lỗi khi xóa hồ sơ học sinh: ' + (err.message || err));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleConfirmDeleteSelectedStudents = async () => {
    if (!selectedClass || selectedStudentIds.length === 0) return;
    try {
      setIsDeletingSelected(true);
      await homeroomService.deleteStudentsBulk(selectedStudentIds, selectedClass.id);
      setShowBulkDeleteConfirm(false);
      const count = selectedStudentIds.length;
      setSelectedStudentIds([]);
      setResetSuccessToast(`Đã xóa thành công ${count} hồ sơ học sinh đã chọn.`);
      setTimeout(() => setResetSuccessToast(''), 4000);
    } catch (err: any) {
      alert('Lỗi khi xóa học sinh: ' + (err.message || err));
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi nhận này?')) {
      await homeroomService.deleteConductRecord(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center">
        <BackButton />
      </div>
      {/* 1. Header Title & Top Info Bar */}
      <div className="bg-gradient-to-r from-[#123B78] via-[#1457D9] to-[#123B78] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Users size={28} className="text-blue-200" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                CÔNG TÁC CHỦ NHIỆM & QUẢN LÝ NỀN NẾP
              </h1>
              <p className="text-xs sm:text-sm text-blue-100">
                Trường THPT Minh Hòa • Hệ thống theo dõi điểm rèn luyện & đánh giá học sinh điện tử
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isBgh && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1.5"
            >
              <Sliders size={16} /> Ngưỡng điểm rèn luyện
            </button>
          )}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <BarChart3 size={16} /> Báo cáo & Bảng tổng hợp
          </button>
        </div>
      </div>

      {/* 2. Filter & Navigation Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* School Year */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Năm học:</span>
              <select
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="2026–2027">2026–2027</option>
                <option value="2025–2026">2025–2026</option>
              </select>
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Khối:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tất cả khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>

            {/* Class Selector & Add Button */}
            <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
              <span className="text-blue-600 font-bold">Lớp chủ nhiệm:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-transparent font-black text-blue-900 text-sm outline-none cursor-pointer"
              >
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({getClassStudentCount(c)} học sinh)</option>
                ))}
              </select>
              <button
                onClick={() => setIsClassManagerOpen(true)}
                className="ml-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                title="Thêm hoặc quản lý danh sách lớp học"
              >
                <PlusCircle size={13} /> Thêm lớp
              </button>
            </div>

            {/* Week Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">
                {studentTableScope === 'month' ? 'Tuần xem chi tiết:' : 'Tuần:'}
              </span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                {Array.from({ length: 36 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Tuần {String(w).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            {/* Month Selector with all 12 months (Requirement 2) */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setStudentTableScope('month');
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                {ALL_MONTH_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher Badge */}
          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
            <span>GVCN Lớp <strong>{selectedClass?.name}</strong>:</span>
            <strong className="text-blue-700">{homeroomTeacherName}</strong>
          </div>
        </div>

        {/* Warning banner when selected week does not belong to selected month (Requirement 10) */}
        {!isSelectedWeekInMonth && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Lưu ý:</strong> Tuần {String(selectedWeek).padStart(2, '0')} không thuộc <strong>{selectedMonth}</strong>. Toàn bộ dữ liệu hiển thị hiện tại được tính riêng cho <strong>{selectedMonth}</strong>.
                {weeksForCurrentMonth.length > 0 && (
                  <span className="ml-1 text-amber-800">
                    (Các tuần thuộc {selectedMonth}: {weeksForCurrentMonth.map(w => `Tuần ${String(w).padStart(2, '0')}`).join(', ')})
                  </span>
                )}
              </span>
            </div>
            {weeksForCurrentMonth.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedWeek(weeksForCurrentMonth[0])}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                Chuyển sang Tuần {String(weeksForCurrentMonth[0]).padStart(2, '0')}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setDefaultStudentForRecord(undefined);
                setIsRecordModalOpen(true);
              }}
              className="px-4 py-2 bg-[#1457D9] hover:bg-[#123B78] text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <PlusCircle size={16} /> + GHI NHẬN NỀN NẾP
            </button>

            <button
              onClick={() => setIsQuickRecordModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Zap size={16} className="fill-white" /> ⚡ GHI NHẬN NHANH
            </button>

            <button
              onClick={() => setIsBonusModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Star size={16} className="fill-white" /> ⭐ ĐIỂM TỐT
            </button>

            <button
              onClick={() => setIsClassManagerOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <School size={16} /> QUẢN LÝ / THÊM LỚP
            </button>

            <button
              onClick={() => {
                setStudentManagerInitialTab('excel');
                setIsStudentManagerOpen(true);
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={16} /> QUẢN LÝ / NHẬP HS
            </button>

            {isBgh && (
              <button
                onClick={() => setIsCriteriaManagerOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <Settings size={15} /> QUẢN LÝ TIÊU CHÍ & VI PHẠM
              </button>
            )}

            <button
              onClick={() => setIsSeriousReportModalOpen(true)}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert size={15} /> BÁO CÁO VP NGHIÊM TRỌNG
            </button>

            <button
              onClick={handleOpenResetModal}
              className="px-3.5 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              title="Xóa / reset tất cả kết quả rèn luyện học sinh"
            >
              <Trash2 size={15} /> XÓA / RESET KẾT QUẢ
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm học sinh theo tên, mã HS..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'students'
              ? 'bg-[#1457D9] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={16} /> Danh sách học sinh ({classStudents.length})
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'weekly'
              ? 'bg-[#1457D9] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar size={16} /> Theo dõi theo tuần
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'monthly'
              ? 'bg-[#1457D9] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 size={16} /> Theo dõi theo tháng
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ranking'
              ? 'bg-[#1457D9] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award size={16} /> Xếp hạng rèn luyện
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <AlertTriangle size={16} /> Cảnh báo rèn luyện
        </button>

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'evaluations'
              ? 'bg-[#1457D9] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 size={16} /> Đánh giá GVCN
        </button>

        <button
          onClick={() => setActiveTab('bgh_approval')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'bgh_approval'
              ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-800 hover:bg-amber-50 border border-amber-300 font-bold'
          }`}
        >
          <ShieldAlert size={16} className="text-amber-600" />
          <span>BGH Phê Duyệt</span>
          {pendingBghClassApprovalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] animate-pulse">
              {pendingBghClassApprovalCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Views */}

      {/* TAB 1: DANH SÁCH HỌC SINH */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Prominent XẾP LOẠI CỦA GVCN Action Card (Requirements 1, 8, 12) */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-blue-50/70 p-4 border border-emerald-200/90 rounded-2xl shadow-xs space-y-3">
            {/* Status Alert Banner */}
            {currentClassCompletion ? (
              <div className={`p-4 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-2xs border ${
                currentClassCompletion.approvalStatus === 'Đã duyệt'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-950'
                  : currentClassCompletion.approvalStatus === 'Yêu cầu điều chỉnh'
                  ? 'bg-rose-100 border-rose-300 text-rose-950'
                  : 'bg-amber-100 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                  {currentClassCompletion.approvalStatus === 'Đã duyệt' ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : currentClassCompletion.approvalStatus === 'Yêu cầu điều chỉnh' ? (
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Megaphone size={18} />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase">
                        {currentClassCompletion.approvalStatus === 'Đã duyệt'
                          ? '🟢 BAN GIÁM HIỆU ĐÃ PHÊ DUYỆT XẾP LOẠI'
                          : currentClassCompletion.approvalStatus === 'Yêu cầu điều chỉnh'
                          ? '🔴 BGH YÊU CẦU ĐIỀU CHỈNH XẾP LOẠI'
                          : '🟡 ĐÃ BÁO HOÀN THÀNH — ĐANG CHỜ BGH PHÊ DUYỆT'}
                      </span>
                    </div>

                    <p className="text-[11px] opacity-90 mt-0.5">
                      Báo hoàn thành bởi <strong>{currentClassCompletion.completedByName}</strong> ({currentClassCompletion.completedAt})
                      {currentClassCompletion.approvedByName && (
                        <span> • Phê duyệt bởi: <strong>{currentClassCompletion.approvedByName}</strong> ({currentClassCompletion.approvedAt})</span>
                      )}
                    </p>

                    {currentClassCompletion.note && (
                      <p className="text-[11px] text-slate-700 italic mt-0.5">
                        GVCN nhắn: "{currentClassCompletion.note}"
                      </p>
                    )}

                    {currentClassCompletion.bghComment && (
                      <div className="mt-1.5 p-2 rounded-xl bg-white/85 border border-current text-xs font-semibold">
                        💬 <strong>Ý kiến của Ban Giám hiệu:</strong> {currentClassCompletion.bghComment}
                      </div>
                    )}
                  </div>
                </div>

                {canManageAssessment && (
                  <button
                    type="button"
                    onClick={handleReopenCompletion}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Mở lại trạng thái xếp loại để chỉnh sửa hoặc xếp loại thêm"
                  >
                    <RotateCcw size={13} /> Mở lại để chỉnh sửa
                  </button>
                )}
              </div>
            ) : classUnevaluatedCount === 0 && classStudents.length > 0 ? (
              <div className="bg-blue-100/90 border border-blue-300 text-blue-950 px-3.5 py-2 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-blue-600 shrink-0" />
                  <span className="font-black text-blue-900">
                    ĐÃ XẾP LOẠI ĐỦ 100% ({classStudents.length}/{classStudents.length} HỌC SINH)
                  </span>
                  <span className="text-[11px] text-blue-800">
                    • Thầy/Cô hãy bấm nút "Báo đã hoàn thành xếp loại" để gửi Ban Giám hiệu phê duyệt.
                  </span>
                </div>
                {canManageAssessment && (
                  <button
                    type="button"
                    onClick={() => setShowReportCompletionModal(true)}
                    className="px-3.5 py-1.5 bg-[#1457D9] hover:bg-[#123B78] text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-blue-300"
                  >
                    <Megaphone size={13} /> Báo đã hoàn thành ngay
                  </button>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                    <span>XẾP LOẠI CỦA GIÁO VIÊN CHỦ NHIỆM</span>
                    <span className="text-[10px] bg-emerald-200/90 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {selectedMonth} • {selectedSchoolYear}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-2 font-medium">
                    <span>Lớp: <strong className="text-emerald-950 font-bold">{selectedClass?.name}</strong></span>
                    <span>•</span>
                    <span>Tổng số: <strong className="text-slate-800 font-bold">{classStudents.length} học sinh</strong></span>
                    <span>•</span>
                    <span>Đã đánh giá: <strong className="text-blue-700 font-bold">{classEvaluatedCount}</strong></span>
                    <span>•</span>
                    <span>Chưa đánh giá: <strong className="text-amber-700 font-bold">{classUnevaluatedCount}</strong></span>
                    {activeRatingTiers.map(t => (
                      <React.Fragment key={t.id || t.name}>
                        <span>•</span>
                        <span>{t.name}: <strong className="font-bold text-slate-800">{classRatingCounts[t.name] || 0}</strong></span>
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Báo đã hoàn thành, Chọn tất cả HS tốt, Chọn HS chưa đánh giá, Xếp loại GVCN, Chọn tất cả */}
              <div className="flex flex-wrap items-center gap-2">
                {/* NÚT BÁO ĐÃ HOÀN THÀNH XẾP LOẠI CỦA GVCN */}
                {currentClassCompletion ? (
                  <div className="flex items-center gap-1.5">
                    <span className={`px-3.5 py-2 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 border ${
                      currentClassCompletion.approvalStatus === 'Đã duyệt'
                        ? 'bg-emerald-700 border-emerald-800'
                        : currentClassCompletion.approvalStatus === 'Yêu cầu điều chỉnh'
                        ? 'bg-rose-700 border-rose-800'
                        : 'bg-amber-600 border-amber-700'
                    }`}>
                      <CheckCircle2 size={15} />
                      <span>
                        {currentClassCompletion.approvalStatus === 'Đã duyệt'
                          ? '✓ BGH ĐÃ DUYỆT'
                          : currentClassCompletion.approvalStatus === 'Yêu cầu điều chỉnh'
                          ? '⚠ BGH YÊU CẦU SỬA'
                          : '⏳ CHỜ BGH DUYỆT'}
                      </span>
                    </span>
                  </div>
                ) : (
                  canManageAssessment && (
                    <button
                      type="button"
                      onClick={() => setShowReportCompletionModal(true)}
                      className={`px-3.5 py-2 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ${
                        classUnevaluatedCount === 0 && classStudents.length > 0
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 ring-emerald-300 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700 ring-indigo-300'
                      }`}
                      title="Báo đã hoàn thành xếp loại học sinh của GVCN cho Ban Giám Hiệu"
                    >
                      <Megaphone size={15} />
                      <span>📢 BÁO ĐÃ HOÀN THÀNH XẾP LOẠI</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleOpenBulkGoodAssessment('all')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-300 hover:ring-emerald-400"
                  title="Mở cửa sổ Đánh giá học sinh thực hiện tốt và áp dụng Xếp loại Tốt"
                >
                  <Sparkles size={15} />
                  <span>🟢 CHỌN TẤT CẢ HS THỰC HIỆN TỐT – XẾP LOẠI {currentGoodTier.name.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBulkGoodAssessment('unevaluated')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Chỉ chọn những học sinh chưa có phiếu đánh giá trong tháng này để xếp loại Tốt"
                >
                  <span>🟡 CHỌN HS CHƯA ĐÁNH GIÁ ({classUnevaluatedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenTeacherAssessment(null, selectedStudentIds.length > 0 ? selectedStudentIds : classStudents.map(s => s.id));
                  }}
                  className="px-3.5 py-2 bg-[#1457D9] hover:bg-[#123B78] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-blue-300"
                  title="Mở phiếu xếp loại của GVCN (áp dụng cho cả lớp hoặc học sinh đã chọn)"
                >
                  <FileText size={14} />
                  <span>📝 Xếp loại của GVCN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudentIds.length === classStudents.length) {
                      setSelectedStudentIds([]);
                    } else {
                      setSelectedStudentIds(classStudents.map(s => s.id));
                    }
                  }}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Chọn hoặc bỏ chọn tất cả học sinh trong bảng"
                >
                  <CheckSquare size={14} className="text-slate-500" />
                  <span>{selectedStudentIds.length === classStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả học sinh'}</span>
                </button>
              </div>
            </div>

            {/* Scope Selector: Đánh giá Tháng, Tuần, Cả năm học & ⚙️ CẤU HÌNH XẾP LOẠI (Yêu cầu 1) */}
            <div className="pt-2.5 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                  <Sliders size={13} className="text-emerald-700" />
                  <span>Phạm vi đánh giá rèn luyện:</span>
                </span>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStudentTableScope('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'month'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`Hiển thị điểm rèn luyện & vi phạm trong ${selectedMonth}`}
                  >
                    <span>📊 Đánh giá {selectedMonth}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentTableScope('week')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'week'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`Hiển thị điểm rèn luyện & vi phạm trong Tuần ${String(selectedWeek).padStart(2, '0')}`}
                  >
                    <span>📅 Tuần {String(selectedWeek).padStart(2, '0')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentTableScope('year')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'year'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Hiển thị tổng hợp điểm rèn luyện cả năm học"
                  >
                    <span>🌐 Cả năm học</span>
                  </button>
                </div>

                {/* ⚙️ CẤU HÌNH XẾP LOẠI Button placed right next to Month / Week / Year (Requirement 1) */}
                <button
                  type="button"
                  onClick={() => setIsRatingConfigModalOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-amber-300 hover:text-amber-200 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 ring-2 ring-amber-400/50"
                  title="Cấu hình thang điểm và mức xếp loại rèn luyện học sinh"
                >
                  <Sliders size={14} className="text-amber-400" />
                  <span>⚙️ CẤU HÌNH XẾP LOẠI</span>
                </button>
              </div>

              <div className="text-[11px] text-emerald-900 font-semibold italic">
                * Thang điểm hiện tại: {activeRatingTiers.map(t => `${t.name} (${t.min_score}–${t.max_score}đ)`).join(', ')}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Action Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">Danh sách học sinh lớp {selectedClass?.name}:</span>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{classStudents.length} học sinh</span>
                {studentSortMode !== 'default' && (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                    ✨ Đang xếp: {getSortModeLabel(studentSortMode)}
                  </span>
                )}
              </div>

              {/* View Scope Switcher for Student Table */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-xl text-xs font-medium ml-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setStudentTableScope('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studentTableScope === 'month'
                      ? 'bg-[#1457D9] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Hiển thị điểm rèn luyện & vi phạm trong Tháng đang chọn"
                >
                  📊 Đánh giá {selectedMonth}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentTableScope('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studentTableScope === 'week'
                      ? 'bg-[#1457D9] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Hiển thị điểm rèn luyện & vi phạm trong Tuần đang chọn thuộc tháng này"
                >
                  📅 Tuần {String(selectedWeek).padStart(2, '0')}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentTableScope('year')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studentTableScope === 'year'
                      ? 'bg-[#1457D9] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Hiển thị tổng hợp điểm rèn luyện cả năm học"
                >
                  🌐 Cả năm học
                </button>

                {/* ⚙️ CẤU HÌNH XẾP LOẠI Button placed right beside Month / Week / Year (Requirement 1) */}
                <button
                  type="button"
                  onClick={() => setIsRatingConfigModalOpen(true)}
                  className="ml-1 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-amber-300 hover:text-amber-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-slate-700"
                  title="Cấu hình thang điểm và mức xếp loại rèn luyện học sinh"
                >
                  <Sliders size={13} className="text-amber-400" />
                  <span>⚙️ CẤU HÌNH XẾP LOẠI</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Nút sắp xếp chính: 🔤 XẾP A–B–C */}
              <button
                type="button"
                onClick={handleToggleAbcSort}
                disabled={isSavingAbc}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSavingAbc
                    ? 'opacity-60 cursor-not-allowed bg-purple-100 text-purple-800 border-purple-300'
                    : abcSaveStatusText === 'Đã lưu'
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200 shadow-sm'
                    : studentSortMode === 'name_asc'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 ring-2 ring-purple-200 shadow-sm'
                    : studentSortMode === 'name_desc'
                    ? 'bg-purple-700 hover:bg-purple-800 text-white border-purple-800 ring-2 ring-purple-200 shadow-sm'
                    : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-300 hover:border-purple-400'
                }`}
                title="Bấm lần đầu: Sắp xếp theo Tên A–B–C (A–Z) & Lưu vào database. Bấm lần tiếp theo: Đảo thứ tự (Z–A) & Lưu"
              >
                <span>🔤 {isSavingAbc ? 'Đang lưu...' : abcSaveStatusText ? 'Đã lưu ✓' : 'XẾP A–B–C'}</span>
                {!isSavingAbc && !abcSaveStatusText && studentSortMode === 'name_asc' && (
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-black tracking-wide">A→Z</span>
                )}
                {!isSavingAbc && !abcSaveStatusText && studentSortMode === 'name_desc' && (
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-black tracking-wide">Z→A</span>
                )}
              </button>

              {/* Dropdown tùy chọn sắp xếp */}
              <div className="relative inline-flex items-center">
                <select
                  value={studentSortMode}
                  onChange={(e) => setStudentSortMode(e.target.value as StudentSortMode)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  title="Chọn chế độ sắp xếp danh sách học sinh"
                >
                  <option value="default">Sắp xếp: Mặc định</option>
                  <option value="name_asc">🔤 Tên A–Z</option>
                  <option value="name_desc">🔤 Tên Z–A</option>
                  <option value="code_asc">Mã học sinh A–Z</option>
                  <option value="code_desc">Mã học sinh Z–A</option>
                </select>
              </div>

              {studentSortMode !== 'default' && (
                <button
                  type="button"
                  onClick={() => setStudentSortMode('default')}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
                  title="Trở về thứ tự mặc định"
                >
                  ✕ Đặt lại
                </button>
              )}

              <button
                onClick={() => {
                  setStudentManagerInitialTab('excel');
                  setIsStudentManagerOpen(true);
                }}
                className="px-3 py-1.5 bg-[#1457D9] hover:bg-[#123B78] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} /> + THÊM / NHẬP EXCEL
              </button>
              <button
                onClick={() => exportStudentListToExcel(selectedClass?.name || '', selectedSchoolYear, classStudents)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Xuất danh sách học sinh ra file Excel theo đúng thứ tự đang hiển thị"
              >
                <Download size={14} /> XUẤT FILE EXCEL
              </button>
              <button
                type="button"
                onClick={() => setIsExportStudentViolationsModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Xuất danh sách học sinh vi phạm nền nếp ra file Excel hoặc Word"
              >
                <ShieldAlert size={14} /> XUẤT DS HS VI PHẠM
              </button>

              {classStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title={`Xóa toàn bộ ${classStudents.length} hồ sơ học sinh của lớp ${selectedClass?.name}`}
                >
                  <Trash2 size={14} /> XÓA TẤT CẢ HỒ SƠ HS
                </button>
              )}
            </div>
          </div>

          {/* Selected Students Action Bar */}
          {selectedStudentIds.length > 0 && (
            <div className="p-3 px-4 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900">
                  Đã chọn: <strong className="text-blue-700 font-black">{selectedStudentIds.length}</strong> / {classStudents.length} học sinh
                </span>
                <span className="text-slate-400">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(classStudents.map(s => s.id))}
                  className="text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="text-slate-600 hover:text-slate-800 underline font-semibold ml-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenTeacherAssessment(null, selectedStudentIds);
                  }}
                  className="px-3.5 py-1.5 bg-[#1457D9] hover:bg-[#123B78] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  title="Xếp loại của GVCN cho các học sinh đã chọn"
                >
                  <FileText size={13} />
                  <span>💾 Xếp loại của GVCN ({selectedStudentIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Trash2 size={13} /> Xóa học sinh đã chọn ({selectedStudentIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <AlertCircle size={13} /> XÓA TẤT CẢ HỒ SƠ LỚP ({classStudents.length})
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={classStudents.length > 0 && selectedStudentIds.length === classStudents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(classStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Chọn tất cả học sinh trong danh sách"
                    />
                  </th>
                  <th className="p-3.5 w-14 text-center">STT</th>
                  <th className="p-3.5 w-28 md:w-32 font-bold">Mã HS</th>
                  <th className="p-3.5 min-w-[200px] font-bold">Họ và tên</th>
                  <th className="p-3.5 w-24 text-center font-bold">Giới tính</th>
                  <th className="p-3.5 w-28 md:w-32 text-center font-bold">Điểm trừ</th>
                  <th className="p-3.5 w-32 md:w-36 text-center font-bold">Điểm rèn luyện</th>
                  <th className="p-3.5 w-28 md:w-32 text-center font-bold">Xếp loại</th>
                  <th className="p-3.5 text-right font-bold min-w-[260px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                          <Users size={24} />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          Chưa có danh sách học sinh. Vui lòng tải file Excel lên.
                        </p>
                        <p className="text-xs text-slate-500">
                          Lớp {selectedClass?.name} hiện chưa có dữ liệu học sinh trong hệ thống. Vui lòng sử dụng tính năng tải file Excel để đồng bộ danh sách học sinh.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentManagerInitialTab('excel');
                            setIsStudentManagerOpen(true);
                          }}
                          className="px-4 py-2 bg-[#1457D9] hover:bg-[#123B78] text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet size={15} /> + TẢI FILE EXCEL LÊN
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  classStudents.map((st, index) => {
                    const stRecords = classRecords.filter(r => {
                      if (r.studentId !== st.id) return false;
                      if (studentTableScope === 'year') {
                        return true;
                      }
                      const rMonth = Number(r.monthNumber) || (r.recordDate ? (new Date(r.recordDate).getMonth() + 1) : null);
                      // Must match selectedMonth for month and week views (Requirements 1, 3, 4, 5, 6)
                      if (rMonth !== selMonthNum) return false;

                      if (studentTableScope === 'week') {
                        return Number(r.weekNumber) === Number(selectedWeek);
                      }
                      return true;
                    });
                    const stAssessment = teacherAssessments.find(a => 
                      a.studentId === st.id && 
                      a.schoolYear === selectedSchoolYear &&
                      (Number(a.monthNumber) === selMonthNum || a.month === selectedMonth)
                    );
                    const hasPositive = stRecords.some(r => r.recordType === 'TICH_CUC');
                    const hasViolation = stRecords.some(r => r.recordType !== 'TICH_CUC' && (r.pointType === 'minus' || r.point < 0 || Boolean(r.level)));
                    const hasSpecialWarning = checkStudentHasSpecialWarning(stRecords);

                    const scoreInfo = classStudentScores.get(st.id) || {
                      totalScore: 100,
                      classification: 'Tốt',
                      badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      totalPlus: 0,
                      totalMinus: 0
                    };
                    const totalScore = scoreInfo.totalScore;
                    const classification = scoreInfo.classification;
                    const badgeStyle = scoreInfo.badgeStyle;
                    const totalPlus = scoreInfo.totalPlus;
                    const totalMinus = scoreInfo.totalMinus;

                    return (
                      <tr key={st.id} className={`hover:bg-slate-50 transition-colors ${selectedStudentIds.includes(st.id) ? 'bg-blue-50/40' : ''}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(st.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds(prev => [...prev, st.id]);
                              } else {
                                setSelectedStudentIds(prev => prev.filter(id => id !== st.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-500">
                          {st.stt !== undefined ? String(st.stt).padStart(2, '0') : String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{st.code}</td>
                        <td className="p-3.5 font-bold text-slate-800">
                          <button
                            onClick={() => handleOpenProfile(st)}
                            className="hover:text-blue-700 hover:underline text-left cursor-pointer font-bold"
                          >
                            {st.full_name || st.name}
                          </button>
                        </td>
                        <td className="p-3.5 text-center text-slate-600">{st.gender}</td>
                        <td className="p-3.5 text-center font-bold">
                          {totalMinus > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleViewStudentViolations(st)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-black rounded-lg text-xs cursor-pointer transition-transform hover:scale-105 inline-flex items-center gap-1 shadow-2xs"
                              title={`Xem chi tiết vi phạm của ${st.full_name || st.name}`}
                            >
                              <span>-{totalMinus} đ</span>
                            </button>
                          ) : (
                            <span className="font-bold text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-base font-black text-blue-800">{totalScore}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (studentTableScope === 'month' && scoreInfo.monthlySummary) {
                                setSelectedStudentForMonthlyDetail({
                                  student: st,
                                  summary: scoreInfo.monthlySummary
                                });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${badgeStyle} ${studentTableScope === 'month' ? 'cursor-pointer hover:scale-105 transition-transform shadow-2xs' : ''}`}
                            title={studentTableScope === 'month' ? 'Nhấn để xem chi tiết kết quả tổng hợp tháng từ các tuần của Đoàn TN' : undefined}
                          >
                            {classification}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {studentTableScope === 'month' && scoreInfo.monthlySummary && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForMonthlyDetail({
                                student: st,
                                summary: scoreInfo.monthlySummary!
                              })}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1 transition-colors"
                              title="Xem chi tiết tổng hợp các tuần trong tháng của Đoàn TN"
                            >
                              <Calendar size={12} /> Chi tiết tháng
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenProfile(st)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                          >
                            Hồ sơ
                          </button>

                          {canManageAssessment ? (
                            <button
                              onClick={() => handleOpenTeacherAssessment(st)}
                              className={`px-2.5 py-1 font-bold rounded-lg text-xs transition-colors border cursor-pointer ${
                                stAssessment
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 hover:border-blue-400'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-400'
                              }`}
                              title={stAssessment ? 'Sửa xếp loại của GVCN' : 'Xếp loại của GVCN'}
                            >
                              {stAssessment ? '✏️ Sửa xếp loại của GVCN' : '📝 Xếp loại của GVCN'}
                            </button>
                          ) : stAssessment ? (
                            <button
                              onClick={() => handleOpenTeacherAssessment(st)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200"
                              title="Xem phiếu xếp loại của GVCN"
                            >
                              👁️ Xem xếp loại của GVCN
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleOpenRecordViolationModalForStudent(st)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-lg text-xs cursor-pointer border border-blue-200 hover:border-blue-300"
                            title="Thêm vi phạm cho học sinh này"
                          >
                            + Vi phạm
                          </button>
                          <button
                            onClick={() => setStudentToDeleteFromDashboard(st)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg text-xs transition-colors"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: THEO DÕI TUẦN */}
      {activeTab === 'weekly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              BẢNG THEO DÕI NỀN NẾP HẰNG NGÀY - TUẦN {String(selectedWeek).padStart(2, '0')} (LỚP {selectedClass?.name})
            </h3>
            <span className="text-xs text-slate-500 font-medium">Hiển thị vi phạm từ T2 đến T6 ({selectedMonth})</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3 text-center">Thứ 2</th>
                  <th className="p-3 text-center">Thứ 3</th>
                  <th className="p-3 text-center">Thứ 4</th>
                  <th className="p-3 text-center">Thứ 5</th>
                  <th className="p-3 text-center">Thứ 6</th>
                  <th className="p-3 text-center">Tổng vi phạm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st, idx) => {
                  const stWeekRecords = classRecords.filter(r => {
                    if (r.studentId !== st.id) return false;
                    if (Number(r.weekNumber) !== Number(selectedWeek)) return false;
                    const rMonth = Number(r.monthNumber) || (r.recordDate ? (new Date(r.recordDate).getMonth() + 1) : null);
                    return rMonth === selMonthNum;
                  });
                  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];

                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{st.name}</td>
                      {days.map((day, dIdx) => {
                        // Check if records fall on day of week
                        const dayRecords = stWeekRecords.filter(r => {
                          const dt = new Date(r.recordDate);
                          return dt.getDay() === dIdx + 1; // 1 = Mon, 5 = Fri
                        });

                        return (
                          <td key={dIdx} className="p-3 text-center">
                            {dayRecords.length === 0 ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {dayRecords.map(r => (
                                  <span
                                    key={r.id}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      r.pointType === 'plus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}
                                    title={r.criterionName}
                                  >
                                    {r.pointType === 'plus' ? `+${r.point}` : `${r.point}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-bold text-rose-700">
                        {stWeekRecords.filter(r => r.pointType === 'minus').length} lượt
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THEO DÕI THÁNG */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              TỔNG HỢP NỀN NẾP {selectedMonth.toUpperCase()} - LỚP {selectedClass?.name}
            </h3>
            <button
              onClick={() => exportHomeroomToExcel({
                className: selectedClass?.name || '10A1',
                schoolYear: selectedSchoolYear,
                periodLabel: selectedMonth,
                homeroomTeacherName,
                students: classStudents,
                records: monthClassRecords,
                criteria,
                baseScore: settings.baseScore || 100,
                ratingConfig: activeMonthRatingConfig
              })}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} /> Xuất bảng Excel tháng
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
              <span className="text-xs text-blue-600 font-bold block mb-1">Tổng học sinh</span>
              <span className="text-2xl sm:text-3xl font-black text-blue-900">{classStudents.length}</span>
            </div>
            {(activeMonthRatingConfig?.tiers && activeMonthRatingConfig.tiers.length > 0 ? activeMonthRatingConfig.tiers : DEFAULT_RATING_TIERS).map(tier => {
              const tierCount = classStudents.filter(s => {
                let plus = 0, minus = 0;
                const stRecs = monthClassRecords.filter(r => r.studentId === s.id);
                const hasSpecial = checkStudentHasSpecialWarning(stRecs);
                stRecs.forEach(r => {
                  if (r.recordType === 'TICH_CUC' || r.point === 0) return;
                  if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
                  if (r.pointType === 'plus') plus += Math.abs(r.point);
                  else minus += Math.abs(r.point);
                });
                const evalResult = evaluateStudent6Groups(stRecs);
                const scoreResult = calculateConductScore(settings.baseScore || 100, plus, minus, undefined, hasSpecial, activeMonthRatingConfig, evalResult);
                const cls = scoreResult.classification;
                if (cls === tier.name) return true;
                if (cls.includes('CHƯA ĐẠT') && tier.name.toLowerCase().includes('chưa đạt')) return true;
                if (cls.includes('ĐẠT') && tier.name.toLowerCase().trim() === 'đạt') return true;
                return false;
              }).length;

              return (
                <div key={tier.id || tier.name} className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs">
                  <span className="text-xs font-bold block mb-0.5 truncate text-slate-700">
                    Xếp loại {tier.name.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    ({tier.min_score} – {tier.max_score} điểm)
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {tierCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: XẾP HẠNG RÈN LUYỆN (LEADERBOARD) */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award size={20} className="text-amber-500" />
              BẢNG XẾP HẠNG PHONG TRÀO THI ĐUA RÈN LUYỆN - {selectedMonth.toUpperCase()} (LỚP {selectedClass?.name})
            </h3>

            {/* Top 3 Honor Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              {classStudents
                .map(st => {
                  let plus = 0, minus = 0;
                  const stRecs = monthClassRecords.filter(r => r.studentId === st.id);
                  const hasSpecial = checkStudentHasSpecialWarning(stRecs);
                  stRecs.forEach(r => {
                    if (r.recordType === 'TICH_CUC' || r.point === 0) return;
                    if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
                    if (r.pointType === 'plus') plus += Math.abs(r.point);
                    else minus += Math.abs(r.point);
                  });
                  const evalResult = evaluateStudent6Groups(stRecs);
                  return { student: st, ...calculateConductScore(100, plus, minus, undefined, hasSpecial, undefined, evalResult) };
                })
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={item.student.id} className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl text-center relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-3xl font-black text-amber-300/40">
                      #{idx + 1}
                    </div>
                    <div className="w-14 h-14 bg-amber-400 text-slate-900 rounded-full font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-md border-2 border-white">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.student.name}</h4>
                    <span className="text-xs text-slate-500 block mb-2">{item.student.code}</span>
                    <div className="inline-block bg-white px-3 py-1 rounded-xl shadow-sm font-black text-amber-700 text-lg border border-amber-200">
                      {item.totalScore} điểm
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CẢNH BÁO */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-600" />
              DANH SÁCH CẢNH BÁO RÈN LUYỆN NỀN NẾP - {selectedMonth.toUpperCase()} (LỚP {selectedClass?.name})
            </h3>
            <button
              type="button"
              onClick={() => setIsExportStudentViolationsModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Xuất danh sách học sinh vi phạm nền nếp ra Excel hoặc Word"
            >
              <Download size={14} /> Xuất DS học sinh vi phạm
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Các học sinh có điểm rèn luyện suy giảm hoặc vi phạm lỗi nghiêm trọng trong {selectedMonth} cần GVCN trực tiếp gặp mặt nhắc nhở và thông báo cho phụ huynh.
          </p>

          <div className="border border-rose-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50 border-b border-rose-200 text-rose-900 font-bold">
                <tr>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3 text-center">Điểm rèn luyện</th>
                  <th className="p-3 text-center">Xếp loại</th>
                  <th className="p-3 text-center">Số lượt vi phạm</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {classStudents.map(st => {
                  let plus = 0, minus = 0;
                  const stRecs = monthClassRecords.filter(r => r.studentId === st.id);
                  const hasSpecial = checkStudentHasSpecialWarning(stRecs);
                  stRecs.forEach(r => {
                    if (r.recordType === 'TICH_CUC' || r.point === 0) return;
                    if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
                    if (r.pointType === 'plus') plus += Math.abs(r.point);
                    else minus += Math.abs(r.point);
                  });
                  const evalResult = evaluateStudent6Groups(stRecs);
                  const { totalScore, classification } = calculateConductScore(100, plus, minus, undefined, hasSpecial, undefined, evalResult);
                  if (!hasSpecial && !evalResult.hasChuaDat && totalScore >= 80 && stRecs.filter(r => r.recordType !== 'TICH_CUC' && r.pointType === 'minus').length < 3) return null;

                  return (
                    <tr key={st.id} className="hover:bg-rose-50/50">
                      <td className="p-3 font-bold text-slate-800">{st.name} ({st.code})</td>
                      <td className="p-3 text-center font-black text-rose-700">{totalScore}</td>
                      <td className="p-3 text-center font-bold">{classification}</td>
                      <td className="p-3 text-center font-bold">{stRecs.filter(r => r.pointType === 'minus').length} lần</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenProfile(st)}
                          className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700"
                        >
                          Xử lý & Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ĐÁNH GIÁ & DUYỆT BGH */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          {/* Quick GHI NHẬN ĐÁNH GIÁ CỦA GVCN in Tab 6 */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-blue-50/70 p-4 border border-emerald-200/90 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                    <span>GHI NHẬN ĐÁNH GIÁ CỦA GVCN</span>
                    <span className="text-[10px] bg-emerald-200/90 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {studentTableScope === 'month' ? selectedMonth : studentTableScope === 'week' ? `Tuần ${String(selectedWeek).padStart(2, '0')}` : 'Cả năm học'} • {selectedSchoolYear}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-2 font-medium">
                    <span>Lớp: <strong className="text-emerald-950 font-bold">{selectedClass?.name}</strong></span>
                    <span>•</span>
                    <span>Tổng số: <strong className="text-slate-800 font-bold">{classStudents.length} học sinh</strong></span>
                    <span>•</span>
                    <span>Đã đánh giá: <strong className="text-blue-700 font-bold">{classEvaluatedCount}</strong></span>
                    <span>•</span>
                    <span>Chưa đánh giá: <strong className="text-amber-700 font-bold">{classUnevaluatedCount}</strong></span>
                    {activeRatingTiers.map(t => (
                      <React.Fragment key={t.id || t.name}>
                        <span>•</span>
                        <span>{t.name}: <strong className="font-bold text-slate-800">{classRatingCounts[t.name] || 0}</strong></span>
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBulkGoodAssessment('all')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-300 hover:ring-emerald-400"
                  title="Chọn tất cả học sinh thực hiện tốt và áp dụng Xếp loại Tốt"
                >
                  <Sparkles size={15} />
                  <span>🟢 CHỌN TẤT CẢ HS THỰC HIỆN TỐT – XẾP LOẠI {currentGoodTier.name.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBulkGoodAssessment('unevaluated')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Chỉ chọn những học sinh chưa có phiếu đánh giá trong tháng này để xếp loại Tốt"
                >
                  <span>🟡 CHỌN HS CHƯA ĐÁNH GIÁ ({classUnevaluatedCount})</span>
                </button>
              </div>
            </div>

            {/* Scope Selector: Đánh giá Tháng, Tuần, Cả năm học & ⚙️ CẤU HÌNH XẾP LOẠI (Yêu cầu 1) */}
            <div className="pt-2.5 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                  <Sliders size={13} className="text-emerald-700" />
                  <span>Phạm vi đánh giá rèn luyện:</span>
                </span>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStudentTableScope('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'month'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`Hiển thị đánh giá trong ${selectedMonth}`}
                  >
                    <span>📊 Đánh giá {selectedMonth}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentTableScope('week')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'week'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`Hiển thị đánh giá trong Tuần ${String(selectedWeek).padStart(2, '0')}`}
                  >
                    <span>📅 Tuần {String(selectedWeek).padStart(2, '0')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentTableScope('year')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentTableScope === 'year'
                        ? 'bg-[#1457D9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Hiển thị tổng hợp đánh giá cả năm học"
                  >
                    <span>🌐 Cả năm học</span>
                  </button>
                </div>

                {/* ⚙️ CẤU HÌNH XẾP LOẠI Button placed right next to Month / Week / Year (Requirement 1) */}
                <button
                  type="button"
                  onClick={() => setIsRatingConfigModalOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-amber-300 hover:text-amber-200 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 ring-2 ring-amber-400/50"
                  title="Cấu hình thang điểm và mức xếp loại rèn luyện học sinh"
                >
                  <Sliders size={14} className="text-amber-400" />
                  <span>⚙️ CẤU HÌNH XẾP LOẠI</span>
                </button>
              </div>

              <div className="text-[11px] text-emerald-900 font-semibold italic">
                * Thang điểm hiện tại: {activeRatingTiers.map(t => `${t.name} (${t.min_score}–${t.max_score}đ)`).join(', ')}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-blue-600" />
              TỔNG HỢP ĐÁNH GIÁ RÈN LUYỆN VÀ XÁC NHẬN CỦA BAN GIÁM HIỆU
            </h3>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              Thời gian: {studentTableScope === 'month' ? selectedMonth : studentTableScope === 'week' ? `Tuần ${String(selectedWeek).padStart(2, '0')}` : 'Cả năm học ' + selectedSchoolYear}
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3 text-center">Điểm tổng</th>
                  <th className="p-3 text-center">Xếp loại đề xuất</th>
                  <th className="p-3 text-center">Trạng thái BGH duyệt</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st, idx) => {
                  let plus = 0, minus = 0;
                  const stRecs = classRecords.filter(r => {
                    if (r.studentId !== st.id) return false;
                    if (studentTableScope === 'year') return true;
                    const rMonth = Number(r.monthNumber) || (r.recordDate ? (new Date(r.recordDate).getMonth() + 1) : null);
                    if (rMonth !== selMonthNum) return false;
                    if (studentTableScope === 'week') return Number(r.weekNumber) === Number(selectedWeek);
                    return true;
                  });
                  const hasSpecial = checkStudentHasSpecialWarning(stRecs);
                  stRecs.forEach(r => {
                    if (r.recordType === 'TICH_CUC' || r.point === 0) return;
                    if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
                    if (r.pointType === 'plus') plus += Math.abs(r.point);
                    else minus += Math.abs(r.point);
                  });
                  const evalResult = evaluateStudent6Groups(stRecs);
                  const { totalScore, classification, ratingResult } = calculateConductScore(
                    settings.baseScore || 100,
                    plus,
                    minus,
                    undefined,
                    hasSpecial,
                    activeRatingConfig,
                    evalResult
                  );

                  const evalItem = evaluations.find(e => 
                    e.studentId === st.id && 
                    (studentTableScope === 'month' ? e.period === selectedMonth : true) &&
                    (!e.schoolYear || e.schoolYear === selectedSchoolYear)
                  );
                  const status = evalItem?.confirmationStatus || 'Chờ GVCN đánh giá';

                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{st.name} ({st.code})</td>
                      <td className="p-3 text-center font-black text-blue-700">{totalScore}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block ${ratingResult.badge_style || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                          {evalItem?.classification || classification}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          status === 'Đã xác nhận' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          status === 'Chờ BGH xác nhận' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          status === 'Yêu cầu điều chỉnh' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenEval(st)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                        >
                          {evalItem ? 'Sửa / Xem phiếu' : 'Lập đánh giá'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* TAB 7: BGH PHÊ DUYỆT XẾP LOẠI & CẢNH BÁO VI PHẠM */}
      {activeTab === 'bgh_approval' && (
        <BghApprovalTab
          records={records}
          evaluations={evaluations}
          students={students}
          classes={classes}
          teacherAssessments={teacherAssessments}
          assessmentCompletions={assessmentCompletions}
          selectedMonth={selectedMonth}
          selectedSchoolYear={selectedSchoolYear}
          userRole={user?.role}
          onViewStudentProfile={(st) => {
            setSelectedStudentForProfile(st);
            setIsProfileModalOpen(true);
          }}
          onApproveRecord={async (recordId, status, note, newRating) => {
            await homeroomService.updateRecordBghApproval(
              recordId,
              status,
              note,
              user?.name || 'Ban Giám hiệu',
              newRating
            );
          }}
          onApproveEvaluation={async (evaluationId, status, comment) => {
            await homeroomService.updateEvaluationBghStatus(
              evaluationId,
              status,
              undefined,
              comment,
              user?.name || 'Ban Giám hiệu'
            );
          }}
          onApproveCompletion={async (docId, status, comment) => {
            await homeroomService.updateTeacherAssessmentCompletionApproval(
              docId,
              status,
              comment,
              { id: user?.id, name: user?.name, role: user?.role }
            );
          }}
          onApproveStudentAssessment={async (assessmentId, status, adjustedRating, comment) => {
            await homeroomService.updateStudentTeacherAssessmentBghApproval(
              assessmentId,
              status,
              adjustedRating,
              comment,
              { id: user?.id, name: user?.name, role: user?.role }
            );
          }}
        />
      )}

      {/* ALL MODALS */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          student={selectedStudentForProfile}
          records={records}
          settings={settings}
          onDeleteRecord={handleDeleteRecord}
          onUpdateRecord={async (id, updates) => {
            await homeroomService.updateConductRecord(id, updates);
          }}
        />
      )}

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        selectedClass={selectedClass}
        students={classStudents}
        categories={categories}
        criteria={criteria}
        records={classRecords}
        selectedWeek={selectedWeek}
        selectedMonth={selectedMonth}
        selectedSchoolYear={selectedSchoolYear}
        onSave={async (rec) => {
          const added = await homeroomService.addConductRecord(rec);
          if (rec.hasConductWarning) {
            const st = students.find(s => s.id === rec.studentId);
            setPostSaveWarningRecord({ ...rec, id: added?.id || 'temp' } as ConductRecord);
            setPostSaveWarningStudent(st || null);
            setPostSaveWarningModalOpen(true);
          }
          return added;
        }}
        onUpdateRecord={async (id, updates) => {
          await homeroomService.updateConductRecord(id, updates);
        }}
        onDeleteRecord={handleDeleteRecord}
        defaultStudentId={defaultStudentForRecord}
        homeroomTeacherId={selectedClass?.homeroomTeacherId}
        homeroomTeacherName={homeroomTeacherName}
      />

      {/* MODAL BÁO CÁO HOÀN THÀNH XẾP LOẠI HỌC SINH CỦA GVCN */}
      {showReportCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    BÁO HOÀN THÀNH XẾP LOẠI HỌC SINH
                  </h3>
                  <p className="text-xs text-blue-100">
                    Xác nhận hoàn thành xếp loại của Giáo viên Chủ nhiệm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportCompletionModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Lớp học:</span>
                  <span className="text-slate-900 font-extrabold text-sm">{selectedClass?.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Thời gian / Kỳ:</span>
                  <span className="text-slate-900 font-bold">{selectedMonth} • {selectedSchoolYear}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Giáo viên chủ nhiệm:</span>
                  <span className="text-blue-900 font-bold">{user?.name || selectedClass?.homeroomTeacherName || 'GVCN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Tổng số học sinh:</span>
                  <span className="text-slate-900 font-black">{classStudents.length} học sinh</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Số lượng đã xếp loại:</span>
                  <span className="text-emerald-700 font-black text-sm">
                    {classEvaluatedCount} / {classStudents.length} ({classStudents.length > 0 ? Math.round((classEvaluatedCount / classStudents.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 font-bold block mb-1.5">Chi tiết kết quả xếp loại:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRatingTiers.map(t => (
                      <span key={t.id || t.name} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-[11px]">
                        {t.name}: <strong className="text-blue-900">{classRatingCounts[t.name] || 0}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {classUnevaluatedCount > 0 ? (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <strong>Lưu ý:</strong> Hiện tại còn <strong>{classUnevaluatedCount} học sinh chưa có phiếu xếp loại</strong>.
                    Thầy/Cô vẫn có thể xác nhận báo hoàn thành hoặc quay lại hoàn thành nốt.
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-bold text-[11px]">
                    Tuyệt vời! 100% học sinh ({classStudents.length}/{classStudents.length}) đã được hoàn thành xếp loại.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú / Lời nhắn gửi BGH (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Ví dụ: Đã hoàn tất xếp loại nề nếp tháng 09, các em học sinh có nhiều tiến bộ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReportCompletionModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReportCompletion}
                disabled={reportingCompletion}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>{reportingCompletion ? 'Đang gửi báo cáo...' : '✓ XÁC NHẬN BÁO HOÀN THÀNH XẾP LOẠI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickRecordModal
        isOpen={isQuickRecordModalOpen}
        onClose={() => setIsQuickRecordModalOpen(false)}
        selectedClass={selectedClass}
        students={classStudents}
        criteria={criteria}
        selectedWeek={selectedWeek}
        selectedMonth={selectedMonth}
        selectedSchoolYear={selectedSchoolYear}
        onSaveQuick={async (recs) => {
          for (const r of recs) {
            await homeroomService.addConductRecord(r);
          }
          const hasPositive = recs.some(r => r.recordType === 'TICH_CUC');
          setAssessmentToast(
            hasPositive
              ? `Đã ghi nhận tích cực cho ${recs.length} học sinh thành công.`
              : `Đã ghi nhận nhanh vi phạm cho ${recs.length} học sinh thành công.`
          );
          setTimeout(() => setAssessmentToast(''), 4000);
        }}
      />

      <BonusPointModal
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        selectedClass={selectedClass}
        students={classStudents}
        criteria={criteria}
        selectedWeek={selectedWeek}
        selectedMonth={selectedMonth}
        selectedSchoolYear={selectedSchoolYear}
        onSaveBonus={async (rec) => {
          await homeroomService.addConductRecord(rec);
        }}
      />

      <CriteriaManagerModal
        isOpen={isCriteriaManagerOpen}
        onClose={() => setIsCriteriaManagerOpen(false)}
        categories={categories}
        criteria={criteria}
        violationConfigs={violationConfigs}
        onAddCriterion={async (crit) => {
          await homeroomService.addCriterion(crit);
        }}
        onUpdateCriterion={async (id, updates) => {
          await homeroomService.updateCriterion(id, updates);
        }}
        onDeleteCriterion={async (id) => {
          await homeroomService.deleteCriterion(id);
        }}
        onSaveViolationConfig={async (cfg) => {
          await homeroomService.saveViolationConfig(cfg as SeriousViolationConfig);
        }}
        onDeleteViolationConfig={async (id) => {
          await homeroomService.deleteViolationConfig(id);
        }}
      />

      <ConductSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={async (s) => {
          await homeroomService.saveSettings(s);
        }}
      />

      <HomeroomReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        selectedClass={selectedClass}
        students={classStudents}
        records={monthClassRecords}
        criteria={criteria}
        settings={settings}
        periodLabel={selectedMonth}
      />

      <ClassManagerModal
        isOpen={isClassManagerOpen}
        onClose={() => setIsClassManagerOpen(false)}
        classes={classes}
        selectedSchoolYear={selectedSchoolYear}
        teachers={teachers}
        isBgh={isBgh}
        onAddClass={async (newClass) => {
          const created = await homeroomService.addClass(newClass);
          if (created?.id) {
            setSelectedGrade('all');
            setSelectedClassId(created.id);
          }
          return created;
        }}
        onAddClassesBulk={async (classesList) => {
          const createdList = await homeroomService.addClassesBulk(classesList);
          if (createdList.length > 0) {
            setSelectedGrade('all');
            setSelectedClassId(createdList[0].id);
          }
          return createdList;
        }}
        onUpdateClass={async (id, updates) => {
          await homeroomService.updateClass(id, updates);
        }}
        onDeleteClass={async (id) => {
          await homeroomService.deleteClass(id);
          if (selectedClassId === id) {
            const remaining = classes.filter(c => c.id !== id);
            setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
          }
        }}
      />

      <StudentManagerModal
        isOpen={isStudentManagerOpen}
        onClose={() => setIsStudentManagerOpen(false)}
        selectedClass={selectedClass}
        schoolYear={selectedSchoolYear}
        students={classStudents}
        initialTab={studentManagerInitialTab}
        onAddStudent={async (st) => {
          const res = await homeroomService.addStudent(st);
          return res;
        }}
        onAddStudentsBulk={async (stList) => {
          const res = await homeroomService.upsertStudentsBulk(
            stList,
            selectedClass?.id,
            selectedClass?.name
          );
          return res;
        }}
        onUpdateStudent={async (id, updates) => {
          await homeroomService.updateStudent(id, updates);
        }}
        onDeleteStudent={async (id) => {
          await homeroomService.deleteStudent(id);
          if (selectedClass) {
            await homeroomService.updateClass(selectedClass.id, {
              totalStudents: Math.max(0, (selectedClass.totalStudents || 1) - 1)
            });
          }
        }}
        onDeleteStudentsBulk={async (ids) => {
          await homeroomService.deleteStudentsBulk(ids);
          if (selectedClass) {
            await homeroomService.updateClass(selectedClass.id, {
              totalStudents: Math.max(0, (selectedClass.totalStudents || 0) - ids.length)
            });
          }
        }}
        onDeleteAllStudents={async () => {
          if (selectedClass) {
            await homeroomService.deleteAllStudentsOfClass(selectedClass.id, {
              deleteRecordsAndAssessments: true
            });
            setResetSuccessToast(`Đã xóa toàn bộ hồ sơ học sinh của lớp ${selectedClass.name} thành công.`);
            setTimeout(() => setResetSuccessToast(''), 4000);
          }
        }}
      />

      {selectedStudentForEval && (
        <EvaluationModal
          isOpen={isEvaluationModalOpen}
          onClose={() => setIsEvaluationModalOpen(false)}
          selectedClass={selectedClass}
          student={selectedStudentForEval}
          records={monthClassRecords}
          existingEvaluation={evaluations.find(e => 
            e.studentId === selectedStudentForEval.id && 
            e.period === selectedMonth &&
            (!e.schoolYear || e.schoolYear === selectedSchoolYear)
          )}
          periodLabel={selectedMonth}
          onSaveEvaluation={async (ev) => {
            await homeroomService.saveEvaluation(ev);
          }}
          onUpdateStatus={async (id, updates) => {
            await homeroomService.updateEvaluationStatus(id, updates);
          }}
        />
      )}

      {studentToDeleteFromDashboard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Xác nhận xóa học sinh?</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa học sinh <strong className="text-rose-600">{studentToDeleteFromDashboard.name}</strong> (Mã: {studentToDeleteFromDashboard.code}) khỏi lớp {selectedClass?.name}? Mọi điểm số và rèn luyện liên kết với học sinh này trong lớp sẽ bị xóa vĩnh viễn.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentToDeleteFromDashboard(null)}
                  disabled={isDeletingFromDashboard}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsDeletingFromDashboard(true);
                      await homeroomService.deleteStudent(studentToDeleteFromDashboard.id);
                      if (selectedClass) {
                        await homeroomService.updateClass(selectedClass.id, {
                          totalStudents: Math.max(0, (selectedClass.totalStudents || 1) - 1)
                        });
                      }
                      setStudentToDeleteFromDashboard(null);
                    } catch (err: any) {
                      alert('Lỗi khi xóa học sinh: ' + (err.message || err));
                    } finally {
                      setIsDeletingFromDashboard(false);
                    }
                  }}
                  disabled={isDeletingFromDashboard}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                >
                  {isDeletingFromDashboard ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Xóa tất cả hồ sơ học sinh của lớp */}
      {isDeleteAllModalOpen && selectedClass && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900 uppercase tracking-tight">
                  XÁC NHẬN XÓA TẤT CẢ HỒ SƠ HỌC SINH
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn đang chuẩn bị xóa toàn bộ hồ sơ học sinh của lớp <strong className="text-blue-700">{selectedClass.name}</strong>.
                </p>
              </div>

              {/* Thông tin lớp & số lượng */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-left space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Lớp học:</span>
                  <span className="font-bold text-slate-800">{selectedClass.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tổng số học sinh sẽ xóa:</span>
                  <span className="font-bold text-rose-700">{classStudents.length} học sinh</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Năm học:</span>
                  <span className="font-bold text-slate-800">{selectedSchoolYear}</span>
                </div>
              </div>

              {/* Tùy chọn làm sạch dữ liệu nề nếp */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={deleteAllWithConductRecords}
                    onChange={(e) => setDeleteAllWithConductRecords(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 border-slate-300 accent-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="leading-snug text-[11px]">
                    Đồng thời xóa toàn bộ dữ liệu vi phạm, điểm rèn luyện & nhận xét GVCN của các học sinh này trong năm học.
                  </span>
                </label>
              </div>

              {/* Cảnh báo */}
              <div className="text-left bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Cảnh báo không thể hoàn tác:</strong> Thao tác này sẽ xóa vĩnh viễn toàn bộ hồ sơ học sinh khỏi cơ sở dữ liệu. Sau khi xóa, bạn có thể tạo mới hoặc tải lên lại danh sách từ file Excel.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  disabled={isDeletingAll}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAllStudents}
                  disabled={isDeletingAll}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingAll ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Xác nhận xóa tất cả ({classStudents.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Xóa danh sách học sinh đã chọn */}
      {showBulkDeleteConfirm && selectedClass && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-900 uppercase">
                  Xác nhận xóa học sinh đã chọn?
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa vĩnh viễn <strong className="text-rose-600">{selectedStudentIds.length}</strong> học sinh đã chọn khỏi lớp <strong className="text-slate-800">{selectedClass.name}</strong>?
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  disabled={isDeletingSelected}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSelectedStudents}
                  disabled={isDeletingSelected}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingSelected ? 'Đang xóa...' : `Xóa (${selectedStudentIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Save Warning Modal */}
      {postSaveWarningRecord && postSaveWarningStudent && (
        <PostSaveWarningModal
          isOpen={postSaveWarningModalOpen}
          onClose={() => setPostSaveWarningModalOpen(false)}
          record={postSaveWarningRecord}
          student={postSaveWarningStudent}
          onConfirmProposedRating={async (rating, note) => {
            if (postSaveWarningRecord.id) {
              await homeroomService.updateRecordBghApproval(
                postSaveWarningRecord.id,
                'Chưa duyệt',
                note,
                user?.name || 'GVCN',
                rating
              );
            }
          }}
        />
      )}

      {/* Serious Violations Report Modal */}
      <SeriousViolationsReportModal
        isOpen={isSeriousReportModalOpen}
        onClose={() => setIsSeriousReportModalOpen(false)}
        records={records.filter(r => (!r.schoolYear || r.schoolYear === selectedSchoolYear) && ((Number(r.monthNumber) === selMonthNum) || !r.monthNumber))}
        classes={classes}
        students={students}
      />

      {/* Reset Conduct Modal */}
      <ResetConductModal
        isOpen={isResetConductModalOpen}
        onClose={() => setIsResetConductModalOpen(false)}
        selectedSchoolYear={selectedSchoolYear}
        selectedClass={selectedClass}
        selectedWeek={selectedWeek}
        selectedMonth={selectedMonth}
        recordsCount={currentScopeRecordsCount}
        studentsCount={classStudents.length}
        onResetConduct={handleResetConduct}
      />

      {/* Reset Success Toast (Requirement 10) */}
      {resetSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-bounce border border-emerald-400">
          <CheckCircle2 size={18} />
          <span>{resetSuccessToast}</span>
        </div>
      )}

      {/* Teacher Assessment Toast */}
      {assessmentToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-top border border-emerald-400">
          <CheckCircle2 size={18} />
          <span>{assessmentToast}</span>
        </div>
      )}

      {/* Teacher Assessment Modal */}
      {isTeacherAssessmentModalOpen && (
        <TeacherAssessmentModal
          isOpen={isTeacherAssessmentModalOpen}
          onClose={() => {
            setIsTeacherAssessmentModalOpen(false);
            setSelectedStudentForAssessment(null);
            setAssessmentInitialSelectedIds(undefined);
          }}
          student={selectedStudentForAssessment}
          students={classStudents}
          initialSelectedStudentIds={assessmentInitialSelectedIds}
          selectedClass={selectedClass}
          semester="Học kỳ I"
          schoolYear={selectedSchoolYear}
          existingAssessment={selectedStudentForAssessment ? teacherAssessments.find(a => 
            a.studentId === selectedStudentForAssessment.id && 
            a.schoolYear === selectedSchoolYear &&
            (Number(a.monthNumber) === selMonthNum || a.month === selectedMonth)
          ) : null}
          existingAssessments={teacherAssessments.filter(a =>
            a.classId === selectedClass?.id &&
            (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
            (Number(a.monthNumber) === selMonthNum || a.month === selectedMonth)
          )}
          studentRecords={selectedStudentForAssessment ? records.filter(r => 
            r.studentId === selectedStudentForAssessment.id &&
            (!r.schoolYear || r.schoolYear === selectedSchoolYear) &&
            ((Number(r.monthNumber) === selMonthNum) || !r.monthNumber)
          ) : []}
          month={selectedMonth}
          monthNumber={selMonthNum}
          isReadOnly={!canManageAssessment}
          onSaveAssessment={handleSaveTeacherAssessment}
          onBulkSaveAssessments={handleBulkSaveTeacherAssessments}
        />
      )}

      {/* Bulk Good Assessment Modal (CHỌN TẤT CẢ HS THỰC HIỆN TỐT – XẾP LOẠI TỐT) */}
      <BulkGoodAssessmentModal
        isOpen={isBulkGoodModalOpen}
        onClose={() => setIsBulkGoodModalOpen(false)}
        selectedClass={selectedClass}
        students={classStudents}
        schoolYear={selectedSchoolYear}
        semester="Học kỳ I"
        month={selectedMonth}
        monthNumber={selMonthNum}
        ratingConfig={activeRatingConfig || activeMonthRatingConfig}
        studentScores={Object.fromEntries(
          classStudents.map(st => [st.id, classStudentScores.get(st.id)?.totalScore ?? 100])
        )}
        existingAssessments={teacherAssessments.filter(a =>
          a.classId === selectedClass?.id &&
          (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
          (Number(a.monthNumber) === selMonthNum || a.month === selectedMonth)
        )}
        initialSelectMode={bulkGoodInitialMode}
        onSaveBulk={handleSaveBulkGoodAssessment}
      />

      {/* Evaluation Rating Config Modal (⚙️ CẤU HÌNH XẾP LOẠI) */}
      <EvaluationRatingConfigModal
        isOpen={isRatingConfigModalOpen}
        onClose={() => setIsRatingConfigModalOpen(false)}
        schoolYear={selectedSchoolYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
        currentScope={studentTableScope}
        configs={ratingConfigs}
        historyList={ratingHistory}
        isBgh={Boolean(isBgh)}
        onSaveConfig={handleSaveRatingConfig}
        onRestoreDefault={handleRestoreDefaultRatingConfig}
      />

      {/* MODAL 1: CHI TIẾT VI PHẠM CỦA HỌC SINH */}
      {isStudentViolationsModalOpen && selectedStudentForViolationsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                  <ShieldAlert size={20} />
                  <span>CHI TIẾT VI PHẠM CỦA HỌC SINH – {selectedStudentForViolationsModal.student.fullName || selectedStudentForViolationsModal.student.name}</span>
                </h3>
                <p className="text-xs text-rose-100 font-bold mt-0.5">
                  Lớp: {selectedStudentForViolationsModal.student.className || selectedClass?.name} • Mã HS: {selectedStudentForViolationsModal.student.code || '—'} • Số lần vi phạm: {selectedStudentForViolationsModal.summary.violationCount} • Tổng điểm trừ: -{selectedStudentForViolationsModal.summary.totalDeduction} đ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentViolationsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {selectedStudentForViolationsModal.summary.violations.length === 0 ? (
                <div className="py-12 text-center text-slate-500 italic space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                  <p className="font-bold text-slate-700">Học sinh không có vi phạm nào trong phạm vi được chọn.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-3.5">NGÀY VI PHẠM</th>
                        <th className="py-3 px-3 text-center">TUẦN</th>
                        <th className="py-3 px-3.5">TIÊU CHÍ VI PHẠM</th>
                        <th className="py-3 px-4">NỘI DUNG VI PHẠM</th>
                        <th className="py-3 px-3 text-center">ĐIỂM TRỪ</th>
                        <th className="py-3 px-3.5">NGƯỜI GHI NHẬN</th>
                        <th className="py-3 px-3 text-center">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {selectedStudentForViolationsModal.summary.violations.map((v, idx) => (
                        <tr key={v.id} className="hover:bg-rose-50/40 transition-colors divide-x divide-slate-200">
                          <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3.5 font-extrabold text-slate-900">
                            <div>{v.violationDate}</div>
                            <span className="text-[11px] font-normal text-slate-500">
                              {v.violationTime || ''} {v.periodSlot ? `(${v.periodSlot})` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-blue-900">Tuần {v.weekNumber}</td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">{v.criterionName}</td>
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
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs flex-shrink-0">
              <span className="font-bold text-slate-600">
                Tổng cộng {selectedStudentForViolationsModal.summary.violationCount} lần vi phạm • Tổng điểm bị trừ: <span className="text-rose-600 font-black">-{selectedStudentForViolationsModal.summary.totalDeduction} đ</span>
              </span>
              <button
                type="button"
                onClick={() => setIsStudentViolationsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GHI NHẬN VI PHẠM CHO HỌC SINH TỪ CÔNG TÁC CHỦ NHIỆM */}
      {isRecordViolationModalOpen && selectedStudentForNewViolation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <PlusCircle size={18} />
                <span>GHI NHẬN VI PHẠM HỌC SINH</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRecordViolationModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNewViolationFromHomeroom} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <p className="font-black text-blue-900 text-sm">{selectedStudentForNewViolation.fullName || selectedStudentForNewViolation.name}</p>
                <p className="text-slate-600">
                  Mã HS: <strong className="font-bold">{selectedStudentForNewViolation.code || '—'}</strong> • Lớp: <strong className="font-bold">{selectedClass?.name}</strong>
                </p>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Chọn tiêu chí vi phạm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCriterionIdForNewVio}
                  onChange={e => {
                    const cId = e.target.value;
                    setSelectedCriterionIdForNewVio(cId);
                    const matched = youthCriteriaList.find(c => c.id === cId);
                    if (matched) {
                      setFormNewVioMinusPoints(matched.minusPoints || 2);
                      setFormNewVioContent(matched.name);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-500"
                  required
                >
                  {youthCriteriaList.map(crit => (
                    <option key={crit.id} value={crit.id}>
                      {crit.name} (-{crit.minusPoints}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">
                    Ngày vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formNewVioDate}
                    onChange={e => setFormNewVioDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">
                    Số điểm trừ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formNewVioMinusPoints}
                    onChange={e => setFormNewVioMinusPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-rose-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Mô tả / Chi tiết vi phạm
                </label>
                <textarea
                  value={formNewVioContent}
                  onChange={e => setFormNewVioContent(e.target.value)}
                  placeholder="Nhập mô tả chi tiết lỗi vi phạm của học sinh..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordViolationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle size={15} />
                  <span>Ghi nhận vi phạm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT TỔNG HỢP RÈN LUYỆN THÁNG (TỔNG HỢP CÁC TUẦN CỦA ĐOÀN TN) */}
      {selectedStudentForMonthlyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Calendar size={20} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    CHI TIẾT TỔNG HỢP RÈN LUYỆN {selectedStudentForMonthlyDetail.summary.monthLabel.toUpperCase()}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Học sinh: <strong className="text-amber-300">{selectedStudentForMonthlyDetail.student.fullName || selectedStudentForMonthlyDetail.student.name}</strong> ({selectedStudentForMonthlyDetail.student.code || 'MHS'}) • Lớp {selectedClass?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForMonthlyDetail(null)}
                className="p-1.5 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Số tuần thuộc tháng</span>
                  <span className="text-base font-black text-slate-900">{selectedStudentForMonthlyDetail.summary.totalWeeksInMonth} tuần</span>
                </div>
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-center">
                  <span className="text-[11px] font-bold text-blue-600 block uppercase">Tổng điểm trừ tháng</span>
                  <span className="text-base font-black text-rose-600">-{selectedStudentForMonthlyDetail.summary.totalDeduction}đ</span>
                </div>
                <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-center">
                  <span className="text-[11px] font-bold text-indigo-600 block uppercase">Điểm rèn luyện tháng</span>
                  <span className="text-base font-black text-indigo-900">{selectedStudentForMonthlyDetail.summary.trainingScore} / 100</span>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block uppercase">Xếp loại tháng</span>
                  <span className="text-base font-black uppercase text-emerald-800">{selectedStudentForMonthlyDetail.summary.monthlyResult}</span>
                </div>
              </div>

              {/* Weekly breakdown table */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase mb-2 flex items-center gap-1.5">
                  <ListOrdered size={15} className="text-blue-600" />
                  <span>Chi tiết đánh giá theo từng tuần của Đoàn TN & Lớp:</span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Tuần</th>
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3 text-center">Xếp loại tuần</th>
                        <th className="py-2.5 px-3 text-center">Điểm trừ</th>
                        <th className="py-2.5 px-3">Vi phạm trong tuần</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedStudentForMonthlyDetail.summary.weeklyResults.map(item => (
                        <tr key={item.weekNumber} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-blue-900">{item.weekLabel}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px]">{item.timeRangeStr}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                              item.rating === 'Tốt' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              item.rating === 'Khá' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              item.rating === 'Đạt' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              item.rating === 'Chưa đạt' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {item.rating}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-rose-600">
                            {item.deduction > 0 ? `-${item.deduction}đ` : '0đ'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {item.violations.length > 0 ? (
                              <ul className="space-y-1 list-disc list-inside">
                                {item.violations.map(v => (
                                  <li key={v.id} className="text-[11px]">
                                    <strong className="text-slate-900">{v.criterionName}</strong> (-{v.minusPoints}đ)
                                    {v.content && v.content !== v.criterionName ? <span className="text-slate-500"> - {v.content}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-400 italic">Không có vi phạm</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForMonthlyDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Student Violations Modal */}
      <ExportStudentViolationsModal
        isOpen={isExportStudentViolationsModalOpen}
        onClose={() => setIsExportStudentViolationsModalOpen(false)}
        violations={youthViolations}
        classes={classes}
        students={classStudents.length > 0 ? classStudents : students}
        teachers={teachers}
        assignments={assignments}
        defaultSchoolYear={selectedSchoolYear}
        defaultMonth={selMonthNum}
        defaultClassId={selectedClass?.id || 'All'}
      />
    </div>
  );
}
