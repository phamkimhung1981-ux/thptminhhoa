import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  FileText, 
  Plus, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Award, 
  Edit3, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Building,
  UserCheck,
  Sparkles,
  Home,
  ArrowLeft,
  Loader2,
  Folder,
  List
} from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import BackButton from '../components/ui/BackButton';
import { 
  KpiVcForm, 
  KpiVcPeriod, 
  KpiVcCriterion, 
  KpiVcCriteriaGroup, 
  KpiVcAuditLog,
  KpiVcRatingConfig,
  KpiVcRatingConfigHistory
} from '../types/kpiVc';
import { 
  subscribeVcForms, 
  subscribeVcPeriods, 
  subscribeVcCriteria, 
  subscribeVcGroups, 
  subscribeVcAuditLogs, 
  subscribeVcRatingConfigs,
  subscribeVcRatingConfigHistory,
  seedVcInitialDataIfNeeded,
  deleteVcForm,
  bulkDeleteVcForms,
  toggleLockVcForm
} from '../services/kpiVcService';
import { 
  getEligibleVcTeachers,
  resolveVcTeacherPosition,
  resolveVcTeacherDepartment,
  getKpiRating,
  getVcClassificationBadge,
  getEffectiveRatingConfig,
  DEFAULT_VC_GROUPS,
  DEFAULT_VC_CRITERIA,
  DEFAULT_VC_PERIODS
} from '../lib/kpiVcData';
import KpiVcDocumentModal from '../components/kpiVc/KpiVcDocumentModal';
import KpiVcCriteriaManagerModal from '../components/kpiVc/KpiVcCriteriaManagerModal';
import KpiVcPeriodManagerModal from '../components/kpiVc/KpiVcPeriodManagerModal';
import KpiVcRatingConfigModal from '../components/kpiVc/KpiVcRatingConfigModal';
import KpiVcPrintModal from '../components/kpiVc/KpiVcPrintModal';
import { exportVcSummaryToExcel } from '../utils/kpiVcExport';
import { exportVcFormToWord } from '../utils/kpiWordExport';

export default function KpiTeacherStaff() {
  const navigate = useNavigate();
  const { teachers, departments } = useAppContext();
  const { user } = useAuth();

  // Permissions
  const isAdmin = user?.id === 'admin' || user?.role === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');

  const canDeleteForm = (form: KpiVcForm) => {
    if (!user) return false;
    if (user.id === 'admin' || user.role === 'admin' || user.role === 'BGH' || user.role === 'TTCM' || user.role === 'CBQL' || user.role === 'manager') return true;
    const pos = (user.position || '').toLowerCase();
    if (pos.includes('hiệu trưởng') || pos.includes('tổ trưởng') || pos.includes('quản lý') || pos.includes('bgh')) return true;
    if (form.employeeId === user.id && (form.status === 'self_evaluated' || !form.status)) return true;
    return false;
  };

  // Delete modal state
  const [formToDelete, setFormToDelete] = useState<KpiVcForm | null>(null);
  const [isDeletingForm, setIsDeletingForm] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Checkbox selection state & Bulk delete modal state
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2>(1);
  const [bulkDeleteType, setBulkDeleteType] = useState<'filtered_all' | 'selected_items'>('filtered_all');
  const [bulkConfirmInput, setBulkConfirmInput] = useState<string>('');
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // Firestore Data State
  const [forms, setForms] = useState<KpiVcForm[]>([]);
  const [periods, setPeriods] = useState<KpiVcPeriod[]>([]);
  const [criteria, setCriteria] = useState<KpiVcCriterion[]>([]);
  const [groups, setGroups] = useState<KpiVcCriteriaGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<KpiVcAuditLog[]>([]);
  const [ratingConfigs, setRatingConfigs] = useState<KpiVcRatingConfig[]>([]);
  const [ratingHistoryList, setRatingHistoryList] = useState<KpiVcRatingConfigHistory[]>([]);

  // Filters & Search
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupByDept, setGroupByDept] = useState<boolean>(true);

  // Modals state
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [docModalMode, setDocModalMode] = useState<'create' | 'edit' | 'self_eval' | 'ttcm_eval' | 'leader_eval' | 'view'>('create');
  const [selectedFormForDoc, setSelectedFormForDoc] = useState<KpiVcForm | null>(null);

  const [isCriteriaManagerOpen, setIsCriteriaManagerOpen] = useState<boolean>(false);
  const [isPeriodManagerOpen, setIsPeriodManagerOpen] = useState<boolean>(false);
  const [isRatingConfigModalOpen, setIsRatingConfigModalOpen] = useState<boolean>(false);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedFormForPrint, setSelectedFormForPrint] = useState<KpiVcForm | null>(null);

  const [exportingWordId, setExportingWordId] = useState<string | null>(null);

  const handleExportWord = async (form: KpiVcForm) => {
    if (!form || !form.id) {
      alert('Vui lòng lưu phiếu trước khi xuất Word.');
      return;
    }
    setExportingWordId(form.id);
    try {
      await exportVcFormToWord(form);
    } catch (err) {
      alert('Lỗi xuất file Word: ' + (err instanceof Error ? err.message : 'Không xác định'));
    } finally {
      setExportingWordId(null);
    }
  };

  // Eligible teacher list (Teachers & Staff, excluding BGH/Principal)
  const eligibleTeachers = useMemo(() => {
    return getEligibleVcTeachers(teachers);
  }, [teachers]);

  // Initial Firestore subscriptions
  useEffect(() => {
    seedVcInitialDataIfNeeded();

    const unsubForms = subscribeVcForms(setForms);
    const unsubPeriods = subscribeVcPeriods((pList) => {
      setPeriods(pList);
    });
    const unsubCriteria = subscribeVcCriteria(setCriteria);
    const unsubGroups = subscribeVcGroups(setGroups);
    const unsubLogs = subscribeVcAuditLogs(setAuditLogs);
    const unsubRatingConfigs = subscribeVcRatingConfigs(setRatingConfigs);
    const unsubRatingHistory = subscribeVcRatingConfigHistory(setRatingHistoryList);

    return () => {
      unsubForms();
      unsubPeriods();
      unsubCriteria();
      unsubGroups();
      unsubLogs();
      unsubRatingConfigs();
      unsubRatingHistory();
    };
  }, []);

  // Hàm xác định xếp loại động của phiếu dựa theo cấu hình
  const getFormRating = (form: KpiVcForm) => {
    const finalScore = (form.managerTotalScore !== null && form.managerTotalScore !== undefined) 
      ? form.managerTotalScore 
      : form.totalScore;
      
    const effective = getEffectiveRatingConfig(form.periodId, ratingConfigs);
    
    // Nếu kỳ này có tùy chọn khóa xếp loại khi hoàn thành và phiếu đã khóa / hoàn thành
    if (effective.isLockedWhenPeriodCompleted && (form.status === 'locked' || form.status === 'completed')) {
      const stored = form.leaderClassification || form.selfClassification;
      if (stored) {
        return {
          ratingName: stored,
          badgeStyle: getVcClassificationBadge(stored, form.periodId, ratingConfigs)
        };
      }
    }

    const ratingRes = getKpiRating(finalScore, form.periodId, ratingConfigs);
    return {
      ratingName: ratingRes.ratingName,
      badgeStyle: ratingRes.badgeStyle
    };
  };

  // Danh sách các tùy chọn xếp loại động cho bộ lọc
  const dynamicClassificationOptions = useMemo(() => {
    const effective = getEffectiveRatingConfig(selectedPeriodId, ratingConfigs);
    const options = new Set<string>();
    effective.tiers.filter(t => t.isActive).forEach(t => options.add(t.ratingName));
    
    // Thêm các tên xếp loại từ tất cả cấu hình để không bị thiếu khi lọc
    ratingConfigs.forEach(c => {
      c.tiers?.forEach(t => {
        if (t.isActive && t.ratingName) options.add(t.ratingName);
      });
    });

    // Thêm các giá trị mặc định nếu rỗng
    if (options.size === 0) {
      options.add('Hoàn thành xuất sắc nhiệm vụ');
      options.add('Hoàn thành tốt nhiệm vụ');
      options.add('Hoàn thành nhiệm vụ');
      options.add('Không hoàn thành nhiệm vụ');
    }

    return Array.from(options);
  }, [selectedPeriodId, ratingConfigs]);

  // Filtered forms
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      if (user && !isAdmin) {
        const isOwner = f.employeeId === user.id;
        const isAssignedTtcm = f.ttcmEvaluatorId === user.id || f.evaluatorId === user.id;
        const isAssignedBgh = f.bghEvaluatorId === user.id;
        if (!isOwner && !isAssignedTtcm && !isAssignedBgh) {
          return false;
        }
      }

      const matchPeriod = selectedPeriodId === 'all' || f.periodId === selectedPeriodId;
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'completed' ? (f.status === 'completed' || f.status === 'self_evaluated') : f.status === statusFilter);
      
      const formRatingName = getFormRating(f).ratingName;
      const matchClass = classificationFilter === 'all' || (
        formRatingName === classificationFilter ||
        f.leaderClassification === classificationFilter || 
        (!f.leaderClassification && f.selfClassification === classificationFilter)
      );
      
      let matchDept = true;
      if (selectedDeptId !== 'all') {
        const teacher = teachers.find(t => t.id === f.employeeId);
        matchDept = teacher?.departmentId === selectedDeptId || f.departmentId === selectedDeptId;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (f.employeeName || '').toLowerCase().includes(q) ||
        (f.employeeCode || '').toLowerCase().includes(q) ||
        (f.position || '').toLowerCase().includes(q) ||
        (f.department || '').toLowerCase().includes(q)
      );

      return matchPeriod && matchStatus && matchClass && matchDept && matchSearch;
    });
  }, [forms, selectedPeriodId, statusFilter, classificationFilter, selectedDeptId, searchQuery, teachers, ratingConfigs]);

  // Group forms by Department
  const groupedFormsByDept = useMemo(() => {
    const map = new Map<string, { deptId: string; deptName: string; forms: KpiVcForm[] }>();

    filteredForms.forEach(form => {
      let deptName = form.department || 'Tổ / Đơn vị khác';
      let deptId = form.departmentId || 'other';

      const teacher = teachers.find(t => t.id === form.employeeId);
      if (teacher && teacher.departmentId) {
        deptId = teacher.departmentId;
        const deptObj = departments.find(d => d.id === teacher.departmentId);
        if (deptObj) deptName = deptObj.name;
      }

      if (!map.has(deptId)) {
        map.set(deptId, { deptId, deptName, forms: [] });
      }
      map.get(deptId)!.forms.push(form);
    });

    const result: { deptId: string; deptName: string; forms: KpiVcForm[] }[] = [];

    departments.forEach(d => {
      if (map.has(d.id)) {
        result.push(map.get(d.id)!);
        map.delete(d.id);
      }
    });

    map.forEach(val => {
      result.push(val);
    });

    return result;
  }, [filteredForms, teachers, departments]);

  // Statistics
  const stats = useMemo(() => {
    const totalForms = filteredForms.length;
    const completedCount = filteredForms.filter(f => f.status === 'completed' || f.status === 'locked').length;
    const evaluatingCount = filteredForms.filter(f => f.status === 'draft' || f.status === 'self_evaluated').length;
    
    let sumScore = 0;
    filteredForms.forEach(f => {
      sumScore += Number(f.totalScore) || 0;
    });
    const avgScore = totalForms > 0 ? (Math.round((sumScore / totalForms) * 10) / 10) : 0;

    // Tính thống kê động theo các mức xếp loại cấu hình
    const ratingCounts: Record<string, number> = {};
    filteredForms.forEach(f => {
      const rName = getFormRating(f).ratingName;
      ratingCounts[rName] = (ratingCounts[rName] || 0) + 1;
    });

    const effective = getEffectiveRatingConfig(selectedPeriodId, ratingConfigs);
    const activeTiers = effective.tiers.filter(t => t.isActive);
    const topTier1Name = activeTiers[0]?.ratingName || 'Hoàn thành xuất sắc nhiệm vụ';
    const topTier2Name = activeTiers[1]?.ratingName || 'Hoàn thành tốt nhiệm vụ';

    const topCount = (ratingCounts[topTier1Name] || 0) + (ratingCounts[topTier2Name] || 0);

    return {
      totalForms,
      completedCount,
      evaluatingCount,
      avgScore,
      topCount,
      topTier1Name,
      topTier2Name,
      ratingCounts
    };
  }, [filteredForms, ratingConfigs, selectedPeriodId]);

  // Check if current user has a form in the selected period
  const myFormInPeriod = useMemo(() => {
    if (!user) return null;
    return forms.find(f => f.employeeId === user.id && (selectedPeriodId === 'all' || f.periodId === selectedPeriodId));
  }, [user, forms, selectedPeriodId]);

  // Open Document Handlers
  const handleOpenCreateModal = () => {
    setSelectedFormForDoc(null);
    setDocModalMode('create');
    setIsDocModalOpen(true);
  };

  const handleOpenDoc = (form: KpiVcForm, mode: 'edit' | 'self_eval' | 'leader_eval' | 'view') => {
    setSelectedFormForDoc(form);
    setDocModalMode(mode);
    setIsDocModalOpen(true);
  };

  const handleOpenPrint = (form: KpiVcForm) => {
    setSelectedFormForPrint(form);
    setIsPrintModalOpen(true);
  };

  const handleRequestDeleteForm = (form: KpiVcForm) => {
    setDeleteError(null);
    setFormToDelete(form);
  };

  const handleConfirmDeleteForm = async () => {
    if (!formToDelete) return;
    setIsDeletingForm(true);
    setDeleteError(null);
    try {
      await deleteVcForm(formToDelete.id, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      // Update local state immediately
      setForms(prev => prev.filter(f => f.id !== formToDelete.id));
      setFormToDelete(null);
    } catch (err: any) {
      console.error('Lỗi khi xóa phiếu KPI:', err);
      setDeleteError(err.message || 'Không thể xóa phiếu đánh giá. Vui lòng thử lại.');
    } finally {
      setIsDeletingForm(false);
    }
  };

  const handleToggleLock = async (form: KpiVcForm) => {
    const isLocked = form.status === 'locked';
    try {
      await toggleLockVcForm(form.id, !isLocked, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: isLocked ? 'completed' : 'locked' } : f));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thay đổi trạng thái khóa');
    }
  };

  // Selection & Bulk Delete Handlers
  const isAllSelected = useMemo(() => {
    return filteredForms.length > 0 && filteredForms.every(f => selectedFormIds.includes(f.id));
  }, [filteredForms, selectedFormIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFormIds([]);
    } else {
      setSelectedFormIds(filteredForms.map(f => f.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedFormIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenBulkDeleteFilteredAll = () => {
    if (filteredForms.length === 0) return;
    setBulkDeleteType('filtered_all');
    setBulkDeleteStep(1);
    setBulkConfirmInput('');
    setBulkDeleteError(null);
    setIsBulkDeleteModalOpen(true);
  };

  const handleOpenBulkDeleteSelected = () => {
    if (selectedFormIds.length === 0) return;
    setBulkDeleteType('selected_items');
    setBulkDeleteStep(1);
    setBulkConfirmInput('');
    setBulkDeleteError(null);
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    const targetIds = bulkDeleteType === 'selected_items' 
      ? selectedFormIds 
      : filteredForms.map(f => f.id);

    if (targetIds.length === 0) return;

    if (bulkDeleteStep === 1) {
      setBulkDeleteStep(2);
      return;
    }

    // Check confirmation input
    if (bulkConfirmInput.trim().toUpperCase() !== 'XOA') {
      setBulkDeleteError('Vui lòng nhập chính xác "XOA" để thực hiện thao tác xóa.');
      return;
    }

    setIsBulkDeleting(true);
    setBulkDeleteError(null);

    const activePeriodName = periods.find(p => p.id === selectedPeriodId)?.name || (selectedPeriodId === 'all' ? 'Tất cả kỳ đánh giá' : '');
    const activeDeptName = departments.find(d => d.id === selectedDeptId)?.name || (selectedDeptId === 'all' ? 'Tất cả đơn vị' : '');

    try {
      await bulkDeleteVcForms(
        targetIds,
        {
          id: user?.id || 'admin',
          name: user?.name || 'Ban Giám hiệu',
          role: user?.role || 'BGH'
        },
        {
          periodName: activePeriodName,
          deptName: activeDeptName
        }
      );

      // Local state update
      const targetSet = new Set(targetIds);
      setForms(prev => prev.filter(f => !targetSet.has(f.id)));
      setSelectedFormIds(prev => prev.filter(id => !targetSet.has(id)));

      setIsBulkDeleteModalOpen(false);
      setNotificationMessage(`Đã xóa thành công ${targetIds.length} phiếu đánh giá.`);
      setTimeout(() => setNotificationMessage(null), 5000);
    } catch (err: any) {
      console.error('Lỗi xóa hàng loạt:', err);
      setBulkDeleteError(err.message || 'Lỗi khi thực hiện xóa hàng loạt. Vui lòng thử lại.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const activePeriodObj = periods.find(p => p.id === selectedPeriodId) || periods[0];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 0. NAVIGATION / BREADCRUMB ROW */}
      <div className="flex items-center gap-4">
        <BackButton />
      </div>

      {/* 1. TOP HEADER BANNER - CLEAN HORIZONTAL CONTROL PANEL */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xl relative overflow-hidden border border-blue-800/40 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Award size={20} className="text-blue-300 shrink-0" />
            ĐÁNH GIÁ KPI GIÁO VIÊN
          </h1>
          <span className="text-xs text-blue-200 font-medium">Trường THPT Sơn Lương</span>
        </div>

        {/* Thanh chức năng ngang */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
          {/* Nút Quay lại Trang chủ */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/25 transition-all cursor-pointer backdrop-blur-xs"
            title="Trở về Trang chủ Dashboard"
          >
            <Home size={15} /> Trang chủ
          </button>

          {/* Tạo phiếu mới */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus size={16} /> Tạo phiếu đánh giá mới
          </button>

          {/* Quản lý tiêu chí (Admin only) */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsCriteriaManagerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/25 transition-all cursor-pointer backdrop-blur-xs"
              >
                <Sliders size={15} /> Quản lý tiêu chí
              </button>
              <button
                type="button"
                onClick={() => setIsPeriodManagerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/25 transition-all cursor-pointer backdrop-blur-xs"
              >
                <Calendar size={15} /> Quản lý kỳ
              </button>
              <button
                type="button"
                onClick={() => setIsRatingConfigModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white text-xs font-bold rounded-xl border border-amber-400/40 transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                title="Cấu hình điểm xếp loại KPI"
              >
                <Sliders size={15} /> Cấu hình xếp loại
              </button>
            </>
          )}

          {/* Xuất Excel */}
          <button
            type="button"
            onClick={() => exportVcSummaryToExcel(filteredForms, activePeriodObj?.name, activePeriodObj?.academicYear, ratingConfigs)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md ml-auto"
          >
            <FileSpreadsheet size={15} /> Xuất Excel tổng hợp
          </button>
        </div>

        {/* Trang trí background */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. CARD NHẮC NHỞ TỰ ĐÁNH GIÁ (NẾU LÀ GIÁO VIÊN ĐĂNG NHẬP) */}
      {!isAdmin && user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                Hồ sơ tự đánh giá của bạn: <span className="text-blue-700 underline">{user.name}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {myFormInPeriod 
                  ? `Bạn đã có phiếu đánh giá trong ${myFormInPeriod.periodName}. Tổng điểm hiện tại: ${myFormInPeriod.totalScore}/100 (${myFormInPeriod.selfClassification}).`
                  : `Bạn chưa hoàn thành tự chấm điểm cho kỳ ${activePeriodObj?.name || 'này'}. Vui lòng tạo phiếu để hoàn thành.`}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {myFormInPeriod ? (
              <button
                type="button"
                onClick={() => handleOpenDoc(myFormInPeriod, 'self_eval')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 size={15} /> Mở phiếu tự chấm điểm
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} /> Bắt đầu tự chấm điểm ngay
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. THỐNG KÊ METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tổng số phiếu */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số phiếu</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalForms}</span>
              <span className="text-xs text-slate-500 font-medium">/ {eligibleTeachers.length} Giáo viên</span>
            </div>
          </div>
        </div>

        {/* Đã hoàn thành */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.completedCount}</span>
              <span className="text-xs text-slate-500 font-medium">phiếu</span>
            </div>
          </div>
        </div>

        {/* Điểm TB toàn trường */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm TB tự chấm</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-indigo-600">{stats.avgScore}</span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
          </div>
        </div>

        {/* Mức xếp loại hàng đầu */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider line-clamp-1" title={`${stats.topTier1Name} & ${stats.topTier2Name}`}>
              {stats.topTier1Name} & Tốt
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-amber-600">
                {stats.topCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">cán bộ</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Chọn Kỳ đánh giá */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Kỳ đánh giá:
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tất cả kỳ đánh giá</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Tổ / Đơn vị */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Tổ / Bộ môn:
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tất cả tổ / đơn vị</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Xếp loại */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Xếp loại:
            </label>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tất cả xếp loại</option>
              {dynamicClassificationOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Trạng thái phiếu */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Trạng thái:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="draft">Bản nháp</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>

          {/* Tìm kiếm */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Tìm kiếm:
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Họ tên, mã, chức vụ..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Thông báo thao tác thành công */}
      {notificationMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 font-bold text-sm flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            <span>{notificationMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotificationMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-xs px-2 py-1 rounded-lg hover:bg-emerald-100"
          >
            Đóng ✕
          </button>
        </div>
      )}

      {/* 5. BẢNG DANH SÁCH PHIẾU ĐÁNH GIÁ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Danh sách Phiếu đánh giá KPI Viên chức ({filteredForms.length})
              </h2>
            </div>

            {selectedFormIds.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                ☑ Đã chọn {selectedFormIds.length} phiếu
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tùy chọn nhóm theo Tổ chuyên môn */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setGroupByDept(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  groupByDept ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gộp danh sách theo Tổ chuyên môn"
              >
                <Folder size={14} /> Theo Tổ chuyên môn
              </button>
              <button
                type="button"
                onClick={() => setGroupByDept(false)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !groupByDept ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hiển thị danh sách phẳng"
              >
                <List size={14} /> Danh sách phẳng
              </button>
            </div>

            {/* Nút Xóa đã chọn (hiển thị khi có phiếu được chọn) */}
            {isAdmin && selectedFormIds.length > 0 && (
              <button
                type="button"
                onClick={handleOpenBulkDeleteSelected}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Xóa các phiếu đã chọn"
              >
                <Trash2 size={14} /> Xóa đã chọn ({selectedFormIds.length})
              </button>
            )}

            {/* Nút Xóa tất cả (màu đỏ nhưng không quá nổi bật, chỉ hiện cho BGH/Admin/CBQL) */}
            {isAdmin && (
              <button
                type="button"
                disabled={filteredForms.length === 0}
                onClick={handleOpenBulkDeleteFilteredAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                title={filteredForms.length === 0 ? "Chưa có dữ liệu để xóa" : "Xóa tất cả phiếu phù hợp với bộ lọc hiện tại"}
              >
                <Trash2 size={14} /> 🗑 Xóa tất cả
              </button>
            )}

            <span className="text-xs text-slate-500 hidden md:inline ml-1">
              Hiển thị theo thứ tự cập nhật mới nhất
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                {isAdmin && (
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      disabled={filteredForms.length === 0}
                      title={isAllSelected ? "Bỏ chọn tất cả" : `Chọn tất cả ${filteredForms.length} phiếu`}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </th>
                )}
                <th className="p-3.5 w-12 text-center">STT</th>
                <th className="p-3.5 min-w-[200px]">Cán bộ / Giáo viên / Nhân viên</th>
                <th className="p-3.5 min-w-[150px]">Đơn vị công tác</th>
                <th className="p-3.5 min-w-[140px]">Kỳ đánh giá</th>
                <th className="p-3.5 text-center w-32 bg-blue-50/70 text-blue-900 font-bold">
                  Điểm tự đánh giá
                </th>
                <th className="p-3.5 text-center w-36 bg-purple-50/70 text-purple-900 font-bold">
                  Điểm TTCM đánh giá
                </th>
                <th className="p-3.5 text-center w-36 bg-indigo-50/70 text-indigo-900 font-bold">
                  Điểm BGH đánh giá
                </th>
                <th className="p-3.5 text-center min-w-[180px]">Xếp loại</th>
                <th className="p-3.5 text-center w-28">Trạng thái</th>
                <th className="p-3.5 text-center w-36">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-slate-300" />
                      <p className="font-semibold text-slate-600">Chưa có phiếu đánh giá KPI.</p>
                      <p className="text-xs text-slate-400">Nhấn nút "+ Tạo phiếu đánh giá mới" để bắt đầu.</p>
                    </div>
                  </td>
                </tr>
              ) : groupByDept ? (
                groupedFormsByDept.map(group => {
                  if (group.forms.length === 0) return null;
                  return (
                    <React.Fragment key={group.deptId}>
                      {/* GROUP HEADER ROW FOR TỔ CHUYÊN MÔN */}
                      <tr className="bg-slate-100/95 border-y border-slate-300 font-extrabold text-slate-800">
                        <td colSpan={isAdmin ? 10 : 9} className="py-2.5 px-4 bg-slate-100/90">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-xs sm:text-sm">
                              <Folder size={16} className="text-blue-600 fill-blue-100 shrink-0" />
                              <span>{group.deptName}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
                                {group.forms.length} phiếu đánh giá
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {group.forms.map((form, idx) => {
                        const isLocked = form.status === 'locked';
                        const ratingInfo = getFormRating(form);
                        const finalClassification = ratingInfo.ratingName;
                        const classStyle = ratingInfo.badgeStyle;
                        const isSelected = selectedFormIds.includes(form.id);

                        return (
                          <tr key={form.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                            {isAdmin && (
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRow(form.id)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                />
                              </td>
                            )}
                            <td className="p-3.5 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {form.employeeName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                                     onClick={() => handleOpenDoc(form, 'view')}>
                                    {form.employeeName}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {form.position} {form.employeeCode ? `• ${form.employeeCode}` : ''}
                                  </p>
                                  <div className="text-[10px] space-y-0.5 mt-1">
                                    {form.ttcmEvaluatorName && (
                                      <div className="text-slate-600">
                                        <span className="font-bold text-purple-700">Tổ:</span> {form.ttcmEvaluatorName}
                                        {typeof form.ttcmTotalScore === 'number' && form.ttcmTotalScore !== null ? (
                                          <span className="ml-1 font-mono text-purple-900 font-bold">({form.ttcmTotalScore}đ)</span>
                                        ) : (
                                          <span className="ml-1 text-slate-400 italic font-normal">(chưa chấm)</span>
                                        )}
                                      </div>
                                    )}
                                    {(form.bghEvaluatorName || form.evaluatorName) && (
                                      <div className="text-slate-600">
                                        <span className="font-bold text-blue-700">BGH:</span> {form.bghEvaluatorName || form.evaluatorName}
                                        {typeof form.managerTotalScore === 'number' && form.managerTotalScore !== null ? (
                                          <span className="ml-1 font-mono text-blue-900 font-bold">({form.managerTotalScore}đ)</span>
                                        ) : (
                                          <span className="ml-1 text-slate-400 italic font-normal">(chưa chấm)</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 text-slate-700 font-medium">
                              {form.department}
                            </td>

                            <td className="p-3.5">
                              <span className="font-semibold text-slate-900 block">{form.periodName}</span>
                              <span className="text-[11px] text-slate-500">{form.academicYear}</span>
                            </td>

                            <td className="p-3.5 text-center font-extrabold text-blue-800 bg-blue-50/30 text-sm">
                              {form.totalScore !== null && form.totalScore !== undefined ? (
                                <>{form.totalScore}<span className="text-[10px] font-normal text-slate-400">/100</span></>
                              ) : (
                                <span className="text-slate-400 text-xs font-normal">Chưa chấm</span>
                              )}
                            </td>

                            <td className="p-3.5 text-center font-extrabold text-purple-800 bg-purple-50/30 text-sm">
                              {form.ttcmTotalScore !== null && form.ttcmTotalScore !== undefined ? (
                                <>{form.ttcmTotalScore}<span className="text-[10px] font-normal text-slate-400">/100</span></>
                              ) : (
                                <span className="text-slate-400 text-xs font-normal">Chưa chấm</span>
                              )}
                            </td>

                            <td className="p-3.5 text-center font-extrabold text-indigo-800 bg-indigo-50/30 text-sm">
                              {form.managerTotalScore !== null && form.managerTotalScore !== undefined ? (
                                <>
                                  {form.managerTotalScore}<span className="text-[10px] font-normal text-slate-400">/100</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-xs font-normal">Chưa chấm</span>
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${classStyle.bg} ${classStyle.text} ${classStyle.border}`}>
                                {finalClassification}
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  <Lock size={12} /> Đã khóa
                                </span>
                              ) : (form.status === 'completed' || form.status === 'self_evaluated') ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} /> Hoàn thành
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  <Clock size={12} /> Bản nháp
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDoc(form, 'view')}
                                  title="Xem chi tiết phiếu"
                                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye size={15} />
                                </button>

                                {(!isLocked || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDoc(form, 'edit')}
                                    title="Chỉnh sửa / Tự chấm"
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenPrint(form)}
                                  title="In phiếu A4 chuẩn"
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Printer size={15} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleExportWord(form)}
                                  disabled={exportingWordId === form.id}
                                  title="Xuất Word (.doc)"
                                  className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {exportingWordId === form.id ? (
                                    <Loader2 size={15} className="animate-spin text-blue-600" />
                                  ) : (
                                    <FileText size={15} />
                                  )}
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLock(form)}
                                    title={isLocked ? "Mở khóa phiếu" : "Khóa phiếu"}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isLocked ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                                  </button>
                                )}

                                {canDeleteForm(form) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDeleteForm(form)}
                                    title="Xóa phiếu đánh giá"
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredForms.map((form, idx) => {
                  const isLocked = form.status === 'locked';
                  const ratingInfo = getFormRating(form);
                  const finalClassification = ratingInfo.ratingName;
                  const classStyle = ratingInfo.badgeStyle;

                  const isSelected = selectedFormIds.includes(form.id);

                  return (
                    <tr key={form.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                      {isAdmin && (
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(form.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>
                      )}
                      <td className="p-3.5 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {form.employeeName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                               onClick={() => handleOpenDoc(form, 'view')}>
                              {form.employeeName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {form.position} {form.employeeCode ? `• ${form.employeeCode}` : ''}
                            </p>
                            <div className="text-[10px] space-y-0.5 mt-1">
                              {form.ttcmEvaluatorName && (
                                <div className="text-slate-600">
                                  <span className="font-bold text-purple-700">Tổ:</span> {form.ttcmEvaluatorName}
                                  {typeof form.ttcmTotalScore === 'number' && form.ttcmTotalScore !== null ? (
                                    <span className="ml-1 font-mono text-purple-900 font-bold">({form.ttcmTotalScore}đ)</span>
                                  ) : (
                                    <span className="ml-1 text-slate-400 italic font-normal">(chưa chấm)</span>
                                  )}
                                </div>
                              )}
                              {(form.bghEvaluatorName || form.evaluatorName) && (
                                <div className="text-slate-600">
                                  <span className="font-bold text-blue-700">BGH:</span> {form.bghEvaluatorName || form.evaluatorName}
                                  {typeof form.managerTotalScore === 'number' && form.managerTotalScore !== null ? (
                                    <span className="ml-1 font-mono text-blue-900 font-bold">({form.managerTotalScore}đ)</span>
                                  ) : (
                                    <span className="ml-1 text-slate-400 italic font-normal">(chưa chấm)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700 font-medium">
                        {form.department}
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 block">{form.periodName}</span>
                        <span className="text-[11px] text-slate-500">{form.academicYear}</span>
                      </td>

                      <td className="p-3.5 text-center font-extrabold text-blue-800 bg-blue-50/30 text-sm">
                        {form.totalScore}<span className="text-[10px] font-normal text-slate-400">/100</span>
                      </td>

                      <td className="p-3.5 text-center font-extrabold text-indigo-800 bg-indigo-50/30 text-sm">
                        {form.managerTotalScore !== null && form.managerTotalScore !== undefined ? (
                          <>
                            {form.managerTotalScore}<span className="text-[10px] font-normal text-slate-400">/100</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">Chưa chấm</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${classStyle.bg} ${classStyle.text} ${classStyle.border}`}>
                          {finalClassification}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock size={12} /> Đã khóa
                          </span>
                        ) : (form.status === 'completed' || form.status === 'self_evaluated') ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Clock size={12} /> Bản nháp
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(form, 'view')}
                            title="Xem chi tiết phiếu"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          {(!isLocked || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleOpenDoc(form, 'edit')}
                              title="Chỉnh sửa / Tự chấm"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenPrint(form)}
                            title="In phiếu A4 chuẩn"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportWord(form)}
                            disabled={exportingWordId === form.id}
                            title="Xuất Word (.doc)"
                            className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {exportingWordId === form.id ? (
                              <Loader2 size={15} className="animate-spin text-blue-600" />
                            ) : (
                              <FileText size={15} />
                            )}
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleLock(form)}
                              title={isLocked ? "Mở khóa phiếu" : "Khóa phiếu"}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                            </button>
                          )}

                          {canDeleteForm(form) && (
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteForm(form)}
                              title="Xóa phiếu đánh giá"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
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

      </div>

      {/* MODAL VĂN BẢN ĐÁNH GIÁ (DOCUMENT MODAL) */}
      <KpiVcDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        form={selectedFormForDoc}
        mode={docModalMode}
        teachers={teachers}
        departments={departments}
        periods={periods}
        criteria={criteria}
        groups={groups}
        onSaved={(formId) => {
          setIsDocModalOpen(false);
          setSelectedPeriodId('all');
          setStatusFilter('all');
          setClassificationFilter('all');
          setSelectedDeptId('all');
          setSearchQuery('');
        }}
        onPrintRequest={(f) => {
          setIsDocModalOpen(false);
          setSelectedFormForPrint(f);
          setIsPrintModalOpen(true);
        }}
      />

      {/* MODAL QUẢN LÝ TIÊU CHÍ (CRITERIA MANAGER MODAL) */}
      <KpiVcCriteriaManagerModal
        isOpen={isCriteriaManagerOpen}
        onClose={() => setIsCriteriaManagerOpen(false)}
        criteria={criteria}
        groups={groups}
        onRefresh={() => {}}
      />

      {/* MODAL QUẢN LÝ KỲ ĐÁNH GIÁ (PERIOD MANAGER MODAL) */}
      <KpiVcPeriodManagerModal
        isOpen={isPeriodManagerOpen}
        onClose={() => setIsPeriodManagerOpen(false)}
        periods={periods}
      />

      {/* MODAL CẤU HÌNH ĐIỂM XẾP LOẠI KPI (RATING CONFIG MODAL) */}
      <KpiVcRatingConfigModal
        isOpen={isRatingConfigModalOpen}
        onClose={() => setIsRatingConfigModalOpen(false)}
        periods={periods}
        configs={ratingConfigs}
        historyList={ratingHistoryList}
        defaultPeriodId={selectedPeriodId === 'all' ? (periods[0]?.id || 'all') : selectedPeriodId}
        onSaved={() => {}}
      />

      {/* MODAL IN PHIẾU A4 (PRINT MODAL) */}
      <KpiVcPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={selectedFormForPrint}
      />

      {/* MODAL XÁC NHẬN XÓA PHIẾU */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Xác nhận xóa phiếu KPI</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">
                Bạn có chắc chắn muốn xóa phiếu đánh giá KPI của:
              </p>
              <p className="text-sm font-bold text-rose-700">
                👤 {formToDelete.employeeName}
              </p>
              <p className="text-slate-600">
                Kỳ đánh giá: <span className="font-medium text-slate-800">{formToDelete.periodName}</span>
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingForm}
                onClick={() => setFormToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingForm}
                onClick={handleConfirmDeleteForm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingForm ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÓA HÀNG LOẠT (BULK DELETE DIALOG - STEP 1 & STEP 2) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">
                  {bulkDeleteStep === 1 
                    ? (bulkDeleteType === 'selected_items' ? '⚠ XÓA CÁC PHIẾU ĐÁNH GIÁ ĐÃ CHỌN' : '⚠ XÓA DANH SÁCH PHIẾU ĐÁNH GIÁ')
                    : '⚠ XÁC NHẬN XÓA'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {bulkDeleteStep === 1 ? 'Bước 1/2: Kiểm tra số lượng & thông tin điều kiện lọc' : 'Bước 2/2: Nhập từ khóa để hoàn tất xóa dữ liệu'}
                </p>
              </div>
            </div>

            {/* Step 1 Body */}
            {bulkDeleteStep === 1 ? (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5 text-rose-950">
                  <p className="font-bold text-sm">Bạn đang chuẩn bị xóa:</p>
                  
                  <div className="bg-white/90 p-3.5 rounded-xl border border-rose-200 space-y-2 shadow-2xs">
                    <p className="text-base font-black text-rose-700 flex items-center gap-2">
                      <Trash2 size={18} />
                      {bulkDeleteType === 'selected_items' ? (
                        <span>{selectedFormIds.length} phiếu đánh giá đã chọn</span>
                      ) : (
                        <span>{filteredForms.length} phiếu đánh giá KPI</span>
                      )}
                    </p>
                    
                    <div className="h-px bg-rose-200 my-1"></div>

                    <p className="text-slate-700">
                      • Kỳ đánh giá: <span className="font-bold text-slate-900">{periods.find(p => p.id === selectedPeriodId)?.name || (selectedPeriodId === 'all' ? 'Tất cả kỳ' : selectedPeriodId)}</span>
                    </p>
                    <p className="text-slate-700">
                      • Tổ / Bộ môn: <span className="font-bold text-slate-900">{departments.find(d => d.id === selectedDeptId)?.name || (selectedDeptId === 'all' ? 'Tất cả đơn vị' : selectedDeptId)}</span>
                    </p>
                    {statusFilter !== 'all' && (
                      <p className="text-slate-700">• Trạng thái: <span className="font-bold text-slate-900">{statusFilter}</span></p>
                    )}
                    {classificationFilter !== 'all' && (
                      <p className="text-slate-700">• Xếp loại: <span className="font-bold text-slate-900">{classificationFilter}</span></p>
                    )}
                  </div>

                  <p className="text-xs text-rose-800 leading-relaxed pt-1">
                    Thao tác này sẽ xóa các phiếu được chọn khỏi danh sách quản lý.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed text-[11.5px]">
                  🔒 <strong>Bảo vệ dữ liệu gốc:</strong> Thao tác này chỉ xóa phiếu đánh giá KPI, tuyệt đối không làm ảnh hưởng đến Hồ sơ CBGVNV, Tổ bộ môn, Bảng điểm hoặc Tiêu chí KPI gốc.
                </div>
              </div>
            ) : (
              /* Step 2 Body */
              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                  <p className="font-bold text-sm text-rose-900">
                    Bạn có chắc chắn muốn xóa {bulkDeleteType === 'selected_items' ? selectedFormIds.length : filteredForms.length} phiếu?
                  </p>
                  <p className="text-rose-800 text-xs leading-relaxed">
                    Đây là thao tác có ảnh hưởng đến dữ liệu đánh giá KPI. Nhập <strong className="text-rose-950 font-black underline">"XOA"</strong> để xác nhận:
                  </p>

                  <div>
                    <input
                      type="text"
                      value={bulkConfirmInput}
                      onChange={(e) => setBulkConfirmInput(e.target.value)}
                      placeholder='Nhập "XOA" để xác nhận...'
                      className="w-full px-4 py-2.5 text-sm font-black bg-white border-2 border-rose-300 rounded-xl text-rose-900 focus:ring-2 focus:ring-rose-500 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal"
                      autoFocus
                    />
                  </div>
                </div>

                {bulkDeleteError && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-800 font-medium">
                    ⚠️ {bulkDeleteError}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => {
                  if (bulkDeleteStep === 2) {
                    setBulkDeleteStep(1);
                  } else {
                    setIsBulkDeleteModalOpen(false);
                  }
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {bulkDeleteStep === 2 ? 'Quay lại' : 'Hủy'}
              </button>

              <button
                type="button"
                disabled={isBulkDeleting || (bulkDeleteStep === 2 && bulkConfirmInput.trim().toUpperCase() !== 'XOA')}
                onClick={handleConfirmBulkDelete}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  bulkDeleteStep === 1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                }`}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang xóa phiếu đánh giá...</span>
                  </>
                ) : bulkDeleteStep === 1 ? (
                  <span>Tiếp tục ➔</span>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Xóa {bulkDeleteType === 'selected_items' ? selectedFormIds.length : filteredForms.length} phiếu</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
