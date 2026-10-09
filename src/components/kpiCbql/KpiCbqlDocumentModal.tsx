import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Send, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Printer, 
  FileSpreadsheet, 
  AlertCircle, 
  Info, 
  User, 
  Calendar, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Search,
  ShieldCheck,
  FileText,
  Paperclip,
  Check
} from 'lucide-react';
import { 
  KpiCbqlForm, 
  KpiCbqlPeriod, 
  KpiCbqlScoreItem 
} from '../../types/kpiCbql';
import { Teacher, Department } from '../../types';
import { 
  DEFAULT_CBQL_CRITERIA, 
  calculateCbqlFormTotals, 
  getCbqlFormStatusBadge,
  getCbqlTeachers,
  isTeacherCbql,
  getEligibleCbqlEvaluators,
  initializeCbqlScoreItems,
  resolveCbqlTeacherPosition,
  resolveCbqlTeacherDepartmentName
} from '../../lib/kpiCbqlData';
import { isExcludedCbqlEvaluator } from '../../lib/kpiTargetAudienceUtils';
import { 
  createCbqlForm, 
  saveCbqlSelfEvaluation, 
  submitCbqlForm, 
  evaluateCbqlForm, 
  lockCbqlForm, 
  unlockCbqlForm 
} from '../../services/kpiCbqlService';
import { useAuth } from '../../store/AuthContext';
import { exportSingleCbqlFormToExcel } from '../../utils/kpiCbqlExport';
import { exportCbqlFormToWord } from '../../utils/kpiWordExport';

interface KpiCbqlDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'evaluator' | 'view';
  form?: KpiCbqlForm | null;
  periods?: KpiCbqlPeriod[];
  existingForms?: KpiCbqlForm[];
  teachers?: Teacher[];
  departments?: Department[];
  onSaved?: (formId: string) => void;
  onPrint?: (form: KpiCbqlForm) => void;
}

export default function KpiCbqlDocumentModal({
  isOpen,
  onClose,
  mode: initialMode,
  form: initialForm,
  periods = [],
  existingForms = [],
  teachers = [],
  departments = [],
  onSaved,
  onPrint
}: KpiCbqlDocumentModalProps) {
  const { user } = useAuth();

  // Mode state
  const isCreate = initialMode === 'create';
  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'evaluator' | 'view'>(initialMode);

  // Role permissions
  const isAdmin = user?.id === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');

  // All available personnel with optional admin/BGH user inclusion
  const allSelectableTeachers = useMemo(() => {
    let list = [...teachers];
    if (user && (user.role === 'BGH' || user.id === 'admin') && !list.some(t => t.id === user.id) && !isExcludedCbqlEvaluator(user as any)) {
      list.unshift({
        id: user.id,
        name: user.name || 'Ban Giám hiệu (Admin)',
        username: user.username || 'admin',
        role: 'BGH',
        position: user.position || 'Hiệu trưởng / Ban Giám hiệu',
        departmentName: 'Trường THPT Minh Hòa',
        code: 'BGH_ADMIN',
        subject: 'Quản lý',
        phone: '',
        email: user.email || '',
        joinDate: '2020-09-01',
        degree: 'Thạc sĩ Quản lý Giáo dục',
        status: 'Đang công tác'
      } as Teacher);
    }
    return list;
  }, [teachers, user]);

  // Teacher selection for Create mode
  const cbqlTeachers = useMemo(() => {
    return getCbqlTeachers(allSelectableTeachers, departments, user);
  }, [allSelectableTeachers, departments, user]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');

  // Selected teacher details
  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;
    return allSelectableTeachers.find(t => t.id === selectedTeacherId) || teachers.find(t => t.id === selectedTeacherId) || null;
  }, [allSelectableTeachers, teachers, selectedTeacherId]);

  const selectedPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  // Evaluators list
  const eligibleEvaluators = useMemo(() => {
    const list = getEligibleCbqlEvaluators(selectedTeacher, allSelectableTeachers, departments).filter(t => !isExcludedCbqlEvaluator(t));
    if (list.length > 0) return list;
    return allSelectableTeachers.filter(t => (!selectedTeacher || t.id !== selectedTeacher.id) && !isExcludedCbqlEvaluator(t));
  }, [selectedTeacher, allSelectableTeachers, departments]);

  // Auto select default evaluator if none selected
  useEffect(() => {
    if (isOpen) {
      const currentEval = allSelectableTeachers.find(t => t.id === selectedEvaluatorId);
      const isInvalid = !selectedEvaluatorId || !currentEval || isExcludedCbqlEvaluator(currentEval);
      if (isInvalid && eligibleEvaluators.length > 0) {
        setSelectedEvaluatorId(eligibleEvaluators[0].id);
      }
    }
  }, [isOpen, selectedTeacherId, selectedEvaluatorId, eligibleEvaluators, allSelectableTeachers]);

  // Score Items
  const [items, setItems] = useState<KpiCbqlScoreItem[]>([]);
  const [selfComment, setSelfComment] = useState<string>('');
  const [selfGrade, setSelfGrade] = useState<string>('Hoàn thành tốt nhiệm vụ');
  const [evaluatorComment, setEvaluatorComment] = useState<string>('');
  const [evaluatorGrade, setEvaluatorGrade] = useState<string>('Hoàn thành tốt nhiệm vụ');
  const [generalEvidence, setGeneralEvidence] = useState<string>('');
  const [activeEvidenceItemId, setActiveEvidenceItemId] = useState<string | null>(null);

  // UI status
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lock status
  const isLocked = !isCreate && initialForm?.status === 'locked';

  // Initialize state when opening or form changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setCurrentMode(initialMode);

      if (isCreate) {
        // Mode create
        const defaultTeacher = (user && isTeacherCbql(user as any, departments)) 
          ? allSelectableTeachers.find(t => t.id === user.id) || cbqlTeachers[0] || allSelectableTeachers[0]
          : cbqlTeachers[0] || allSelectableTeachers[0];

        if (defaultTeacher) {
          setSelectedTeacherId(defaultTeacher.id);
        }

        if (periods.length > 0) {
          setSelectedPeriodId(periods[0].id);
        }

        // Initialize blank score sheet from default criteria
        const freshItems = initializeCbqlScoreItems();
        setItems(freshItems);
        setSelfComment('');
        setSelfGrade('Hoàn thành tốt nhiệm vụ');
        setEvaluatorComment('');
        setEvaluatorGrade('Hoàn thành tốt nhiệm vụ');
        setGeneralEvidence('');
      } else if (initialForm) {
        // Mode edit / evaluator / view: load existing form exactly
        setSelectedTeacherId(initialForm.evaluateeId);
        setSelectedPeriodId(initialForm.periodId);
        setSelectedEvaluatorId(initialForm.evaluatorId);

        if (initialForm.items && initialForm.items.length > 0) {
          setItems(JSON.parse(JSON.stringify(initialForm.items)));
        } else {
          setItems(initializeCbqlScoreItems());
        }

        setSelfComment(initialForm.selfComment || '');
        setSelfGrade(initialForm.grade || 'Hoàn thành tốt nhiệm vụ');
        setEvaluatorComment(initialForm.evaluatorComment || '');
        setEvaluatorGrade(initialForm.grade || 'Hoàn thành tốt nhiệm vụ');
        setGeneralEvidence(initialForm.generalEvidence || '');
      }
    }
  }, [isOpen, initialMode, initialForm, isCreate, user, cbqlTeachers, allSelectableTeachers, departments, periods]);

  // Keep evaluator unselected by default so the user must choose manually

  // Check unique constraint for Create mode
  const duplicateForm = useMemo(() => {
    if (!isCreate || !selectedTeacherId || !selectedPeriodId) return null;
    return existingForms.find(f => f.evaluateeId === selectedTeacherId && f.periodId === selectedPeriodId) || null;
  }, [isCreate, existingForms, selectedTeacherId, selectedPeriodId]);

  // Real-time calculation of all score totals
  const totals = useMemo(() => {
    return calculateCbqlFormTotals(items);
  }, [items]);

  if (!isOpen) return null;

  // Selected teacher position / department display
  const evaluateePosition = isCreate 
    ? resolveCbqlTeacherPosition(selectedTeacher, departments)
    : (initialForm?.evaluateePosition || resolveCbqlTeacherPosition(selectedTeacher, departments));

  const evaluateeDepartment = isCreate
    ? resolveCbqlTeacherDepartmentName(selectedTeacher, departments)
    : (initialForm?.evaluateeDepartmentName || resolveCbqlTeacherDepartmentName(selectedTeacher, departments));

  const periodDisplayName = isCreate
    ? (selectedPeriod?.name || 'Năm học 2026-2027')
    : (initialForm?.periodName || 'Năm học 2026-2027');

  const academicYearDisplay = isCreate
    ? (selectedPeriod?.academicYear || '2026-2027')
    : (initialForm?.academicYear || '2026-2027');

  const resolvedInitialEvaluatorName = (() => {
    const raw = initialForm?.evaluatorName || '';
    if (!raw || isExcludedCbqlEvaluator({ name: raw } as any)) {
      return 'Trịnh Việt Phương';
    }
    return raw;
  })();

  const selectedEvaluator = allSelectableTeachers.find(t => t.id === selectedEvaluatorId && !isExcludedCbqlEvaluator(t)) || {
    name: resolvedInitialEvaluatorName,
    position: initialForm?.evaluatorPosition || 'Hiệu trưởng / Thủ trưởng đơn vị',
    avatar: null
  };

  // Group items
  const groupIItems = items.filter(i => i.groupCode === 'I' || i.groupId === 'group_I');
  const groupIIItems = items.filter(i => i.groupCode === 'II' || i.groupId === 'group_II');
  const groupIIIItems = items.filter(i => i.groupCode === 'III' || i.groupId === 'group_III');

  // Group III Sub 1 and Sub 2
  const groupIII_1_Items = groupIIIItems.filter(i => i.criterionCode.startsWith('1.'));
  const groupIII_2_Items = groupIIIItems.filter(i => i.criterionCode.startsWith('2.'));

  // Handler: Change Self Score / Level
  const handleSelectSelfLevel = (criterionId: string, level: { id: string; label: string; score: number }) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          selfScore: level.score,
          selfLevelId: level.id,
          selfLevelLabel: level.label
        };
      }
      return item;
    }));
  };

  const handleSelfScoreInputChange = (criterionId: string, maxScore: number, valueStr: string) => {
    if (isLocked) return;
    const num = parseFloat(valueStr);
    const validScore = isNaN(num) ? 0 : Math.min(Math.max(0, num), maxScore);
    
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          selfScore: validScore
        };
      }
      return item;
    }));
  };

  // Handler: Change Evaluator Score / Level
  const handleSelectEvaluatorLevel = (criterionId: string, level: { id: string; label: string; score: number }) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          evaluatorScore: level.score,
          evaluatorLevelId: level.id,
          evaluatorLevelLabel: level.label
        };
      }
      return item;
    }));
  };

  const handleEvaluatorScoreInputChange = (criterionId: string, maxScore: number, valueStr: string) => {
    if (isLocked) return;
    const num = parseFloat(valueStr);
    const validScore = isNaN(num) ? 0 : Math.min(Math.max(0, num), maxScore);
    
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          evaluatorScore: validScore
        };
      }
      return item;
    }));
  };

  // Handler: Update Evidence / Notes
  const handleEvidenceChange = (criterionId: string, value: string) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return { ...item, selfEvidence: value };
      }
      return item;
    }));
  };

  const handleEvaluatorNoteChange = (criterionId: string, value: string) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return { ...item, evaluatorNote: value };
      }
      return item;
    }));
  };

  // =========================================================================
  // SUBMIT / SAVE ACTIONS
  // =========================================================================

  // Save New Form
  const handleCreateFormSubmit = async (submitNow: boolean) => {
    setErrorMsg(null);
    if (!selectedTeacher) {
      setErrorMsg('Vui lòng chọn cán bộ quản lý được đánh giá.');
      return;
    }
    if (!selectedPeriod) {
      setErrorMsg('Vui lòng chọn kỳ đánh giá.');
      return;
    }
    if (duplicateForm) {
      setErrorMsg(`Cán bộ ${selectedTeacher.name} đã có phiếu đánh giá cho kỳ ${selectedPeriod.name}. Mỗi CBQL chỉ có 01 phiếu trong một kỳ!`);
      return;
    }
    if (!selectedEvaluatorId) {
      setErrorMsg("Vui lòng chọn cán bộ quản lý/lãnh đạo đánh giá trước khi gửi phiếu.");
      return;
    }

    const selectedEvaluator = teachers.find(t => t.id === selectedEvaluatorId);
    if (!selectedEvaluator) {
      setErrorMsg("Vui lòng chọn cán bộ quản lý/lãnh đạo đánh giá trước khi gửi phiếu.");
      return;
    }

    try {
      setIsSaving(true);

      const formPayload: Omit<KpiCbqlForm, 'id' | 'createdAt'> = {
        evaluateeId: selectedTeacher.id,
        evaluateeName: selectedTeacher.name,
        evaluateeCode: selectedTeacher.code || `CBQL_${selectedTeacher.id}`,
        evaluateePosition: evaluateePosition,
        evaluateeDepartmentId: selectedTeacher.departmentId || null,
        evaluateeDepartmentName: evaluateeDepartment || 'Cán bộ quản lý',
        evaluateeAvatar: selectedTeacher.avatar || null,
        evaluatorAvatar: (selectedEvaluator as any)?.avatar || null,
        evaluateAvatar: (selectedEvaluator as any)?.avatar || null,

        periodId: selectedPeriod.id,
        periodName: selectedPeriod.name,
        academicYear: academicYearDisplay,

        selfEvaluatorId: selectedTeacher.id,
        selfEvaluatorName: selectedTeacher.name,

        evaluatorId: selectedEvaluatorId,
        evaluatorName: selectedEvaluator.name,
        evaluatorPosition: (selectedEvaluator as any).position || 'Hiệu trưởng',

        maxTotalScore: 100,
        selfGroupScores: totals.selfGroupScores,
        selfTotalScore: totals.selfTotalScore,
        evaluatorGroupScores: totals.evaluatorGroupScores,
        evaluatorTotalScore: totals.evaluatorTotalScore,
        scoreDifference: totals.scoreDifference,
        grade: (selfGrade || totals.grade) as any,

        selfComment: selfComment || '',
        evaluatorComment: evaluatorComment || '',
        generalEvidence: generalEvidence || '',
        items,
        status: submitNow ? 'pending_evaluation' : 'draft',
        submittedAt: submitNow ? new Date().toISOString() : null
      };

      const newId = await createCbqlForm(formPayload, {
        id: user?.id || 'admin',
        name: user?.name || 'CBQL',
        role: user?.role
      });

      setSuccessMsg(submitNow ? 'Đã tạo và gửi phiếu đánh giá thành công!' : 'Đã tạo và lưu nháp phiếu đánh giá thành công!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSaved?.(newId);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo phiếu đánh giá');
    } finally {
      setIsSaving(false);
    }
  };

  // Update Existing Form (LƯU THAY ĐỔI)
  const handleUpdateExistingForm = async (submitToEvaluator = false) => {
    if (!initialForm) return;
    setErrorMsg(null);

    try {
      setIsSaving(true);
      const updates: Partial<KpiCbqlForm> = {
        items,
        selfGroupScores: totals.selfGroupScores,
        selfTotalScore: totals.selfTotalScore,
        evaluatorGroupScores: totals.evaluatorGroupScores,
        evaluatorTotalScore: totals.evaluatorTotalScore,
        scoreDifference: totals.scoreDifference,
        grade: (selfGrade || totals.grade) as any,
        selfComment,
        evaluatorComment,
        generalEvidence
      };

      if (submitToEvaluator) {
        await submitCbqlForm(
          initialForm.id,
          updates,
          { id: user?.id || 'admin', name: user?.name || 'CBQL', role: user?.role }
        );
        setSuccessMsg('Đã gửi phiếu lên thủ trưởng đánh giá thành công!');
      } else {
        await saveCbqlSelfEvaluation(
          initialForm.id,
          updates,
          { id: user?.id || 'admin', name: user?.name || 'CBQL', role: user?.role }
        );
        setSuccessMsg('Đã lưu thay đổi phiếu đánh giá thành công!');
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onSaved?.(initialForm.id);
        if (submitToEvaluator) onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  // Evaluator Save & Finalize
  const handleEvaluatorSave = async (shouldLock = false) => {
    if (!initialForm) return;
    setErrorMsg(null);

    try {
      setIsSaving(true);
      await evaluateCbqlForm(
        initialForm.id,
        {
          items,
          evaluatorGroupScores: totals.evaluatorGroupScores,
          evaluatorTotalScore: totals.evaluatorTotalScore,
          scoreDifference: totals.scoreDifference,
          grade: (evaluatorGrade || totals.grade) as any,
          evaluatorComment
        },
        { id: user?.id || 'admin', name: user?.name || 'Thủ trưởng', role: user?.role }
      );

      if (shouldLock) {
        await lockCbqlForm(initialForm.id, { id: user?.id || 'admin', name: user?.name || 'BGH', role: user?.role });
        setSuccessMsg('Đã chốt kết quả và khóa phiếu đánh giá!');
      } else {
        setSuccessMsg('Đã lưu kết quả đánh giá của thủ trưởng!');
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onSaved?.(initialForm.id);
        if (shouldLock) onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu đánh giá');
    } finally {
      setIsSaving(false);
    }
  };

  // Unlock form (Admin)
  const handleAdminUnlock = async () => {
    if (!initialForm) return;
    if (!window.confirm('Bạn có chắc chắn muốn mở khóa phiếu đánh giá này để cho phép chỉnh sửa bổ sung?')) return;

    try {
      setIsSaving(true);
      await unlockCbqlForm(initialForm.id, { id: user?.id || 'admin', name: user?.name || 'Admin', role: user?.role });
      setSuccessMsg('Đã mở khóa phiếu đánh giá thành công!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSaved?.(initialForm.id);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi mở khóa phiếu');
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = initialForm ? getCbqlFormStatusBadge(initialForm.status) : null;

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-[2000] flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[96vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* TOP ACTION BAR */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  {isCreate ? 'Tạo Phiếu Đánh Giá KPI Cán Bộ Quản Lý Mới' : 'Phiếu Đánh Giá KPI Cán Bộ Quản Lý'}
                </h2>
                {statusBadge && (
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Mẫu chuẩn Trường THPT Minh Hòa • Khung 100 điểm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreate && initialForm && onPrint && (
              <button
                onClick={() => onPrint(initialForm)}
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="In phiếu chuẩn A4"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">In Phiếu A4</span>
              </button>
            )}

            {!isCreate && initialForm && (
              <button
                onClick={() => exportSingleCbqlFormToExcel({ ...initialForm, items, selfTotalScore: totals.selfTotalScore, evaluatorTotalScore: totals.evaluatorTotalScore })}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Xuất Excel"
              >
                <FileSpreadsheet size={15} />
                <span className="hidden sm:inline">Xuất Excel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOCKED BANNER */}
        {isLocked && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-amber-600" />
              <span>Phiếu này đã được chốt và khóa chỉnh sửa.</span>
            </div>
            {isAdmin && (
              <button
                onClick={handleAdminUnlock}
                disabled={isSaving}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Unlock size={13} />
                <span>MỞ KHÓA PHIẾU</span>
              </button>
            )}
          </div>
        )}

        {/* DOCUMENT SHEET BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 font-sans text-slate-800">
          
          {/* WORD PAPER SHEET CONTAINER */}
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 shadow-lg border border-slate-300 rounded-lg text-xs sm:text-[13px] leading-normal text-slate-900">
            
            {/* 1. HEADER CƠ QUAN VÀ QUỐC HIỆU */}
            <div className="flex justify-between items-start text-center mb-6">
              <div className="w-5/12 text-center">
                <p className="text-xs sm:text-[13px] uppercase font-semibold">SỞ GD&ĐT TỈNH PHÚ THỌ</p>
                <p className="text-xs sm:text-sm uppercase font-bold text-slate-900">TRƯỜNG THPT MINH HÒA</p>
                <div className="w-24 h-[1px] bg-slate-800 mx-auto mt-1" />
              </div>

              <div className="w-6/12 text-center">
                <p className="text-xs sm:text-[13px] uppercase font-bold tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-xs sm:text-[13px] font-bold underline">Độc lập – Tự do – Hạnh phúc</p>
              </div>
            </div>

            {/* 2. TIÊU ĐỀ PHIẾU */}
            <div className="text-center my-6">
              <h1 className="text-base sm:text-lg font-extrabold uppercase text-slate-900 leading-tight tracking-wide">
                ĐÁNH GIÁ KPI CÁN BỘ QUẢN LÝ
              </h1>
              <p className="text-xs sm:text-sm font-semibold italic text-slate-800 mt-1">
                (Áp dụng đối với viên chức giữ chức vụ lãnh đạo, quản lý)
              </p>
              <p className="text-xs font-semibold text-blue-900 mt-1">
                Kỳ đánh giá: {periodDisplayName} (Năm học: {academicYearDisplay})
              </p>
            </div>

            {/* 3. THÔNG TIN NGƯỜI ĐƯỢC ĐÁNH GIÁ */}
            <div className="border border-slate-300 bg-slate-50/50 rounded-xl p-4 mb-6 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Họ và tên: Dropdown chọn CBGVNV */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Họ và tên cán bộ quản lý: <span className="text-rose-500">*</span>
                  </label>
                  {isCreate ? (
                    <div className="space-y-1">
                      <select
                        id="select-cbql-evaluatee"
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <optgroup label="⭐ Danh sách Cán bộ Quản lý (BGH / Tổ trưởng / CBQL)">
                          {cbqlTeachers.map(t => {
                            const pos = resolveCbqlTeacherPosition(t, departments);
                            const deptName = resolveCbqlTeacherDepartmentName(t, departments);
                            return (
                              <option key={t.id} value={t.id}>
                                [{pos}] {t.name} — {deptName} ({t.code || t.username})
                              </option>
                            );
                          })}
                        </optgroup>
                        {allSelectableTeachers.filter(t => !isTeacherCbql(t, departments)).length > 0 && (
                          <optgroup label="📋 Danh sách Cán bộ, Giáo viên & Nhân viên khác">
                            {allSelectableTeachers.filter(t => !isTeacherCbql(t, departments)).map(t => {
                              const deptName = resolveCbqlTeacherDepartmentName(t, departments);
                              return (
                                <option key={t.id} value={t.id}>
                                  [Giáo viên] {t.name} — {deptName} ({t.code || t.username})
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                      <p className="text-[10.5px] text-slate-500 italic">
                        * Hệ thống tự động nạp Họ tên, Chức vụ và Đơn vị công tác từ hồ sơ nhân sự.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm flex items-center justify-between">
                      <div>
                        <span>{selectedTeacher?.name || initialForm?.evaluateeName}</span>
                        {(selectedTeacher?.code || initialForm?.evaluateeCode) && (
                          <span className="text-xs text-slate-500 font-normal ml-2">
                            ({selectedTeacher?.code || initialForm?.evaluateeCode})
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {evaluateePosition}
                      </span>
                    </div>
                  )}
                </div>

                {/* Chức vụ */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chức vụ:
                  </label>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                    {evaluateePosition}
                  </div>
                </div>

                {/* Đơn vị công tác */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Đơn vị công tác:
                  </label>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                    {evaluateeDepartment}
                  </div>
                </div>

                {/* Kỳ đánh giá */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kỳ đánh giá: <span className="text-rose-500">*</span>
                  </label>
                  {isCreate ? (
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Năm học: {p.academicYear})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                      {periodDisplayName} ({academicYearDisplay})
                    </div>
                  )}
                </div>

              </div>

              {/* Người đánh giá (Thủ trưởng) */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Người đánh giá (Thủ trưởng):</span>
                  {isCreate ? (
                    <select
                      value={selectedEvaluatorId}
                      onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn cán bộ quản lý đánh giá --</option>
                      {eligibleEvaluators
                        .filter(e => !isExcludedCbqlEvaluator(e))
                        .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.position || 'Thủ trưởng'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-indigo-900">{selectedEvaluator.name} ({selectedEvaluator.position})</span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-bold">
                  <span className="text-slate-600">Điểm tự chấm hiện tại:</span>
                  <span className="text-blue-700 font-extrabold text-sm">{totals.selfTotalScore}/100</span>
                </div>
              </div>
            </div>

            {/* TIÊU ĐỀ PHẦN A */}
            <div className="font-bold text-xs sm:text-sm uppercase mb-2 text-slate-900 flex items-center justify-between">
              <span>A. NỘI DUNG CHẤM ĐIỂM</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase italic">
                (Đầy đủ toàn bộ 26 tiêu chí theo mẫu chuẩn)
              </span>
            </div>

            {/* 4. BẢNG PHIẾU ĐÁNH GIÁ CHÍNH */}
            <div className="overflow-x-auto border border-slate-600 mb-6">
              <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold text-slate-900">
                    <th rowSpan={2} className="border border-slate-600 p-2 w-8">Stt</th>
                    <th rowSpan={2} className="border border-slate-600 p-2">Nội dung đánh giá</th>
                    <th rowSpan={2} className="border border-slate-600 p-2 w-16">Điểm tối đa</th>
                    <th colSpan={2} className="border border-slate-600 p-1.5">Đánh giá, chấm điểm</th>
                  </tr>
                  <tr className="bg-slate-100 text-center font-bold text-[10.5px] text-slate-900">
                    <th className="border border-slate-600 p-1.5 w-28">Điểm cá nhân tự chấm</th>
                    <th className="border border-slate-600 p-1.5 w-28">Thủ trưởng đơn vị chấm</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* ========================================================= */}
                  {/* NHÓM I: CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (15đ) */}
                  {/* ========================================================= */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td className="border border-slate-600 p-2 text-center">I</td>
                    <td className="border border-slate-600 p-2 uppercase">
                      Chính trị tư tưởng, đạo đức lối sống
                    </td>
                    <td className="border border-slate-600 p-2 text-center">15</td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-blue-800 bg-blue-50/40">
                      {totals.selfGroupScores?.group_I || 0}
                    </td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-indigo-800 bg-indigo-50/40">
                      {totals.evaluatorGroupScores?.group_I || 0}
                    </td>
                  </tr>

                  {groupIItems.map((it) => {
                    const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === it.criterionId || c.code === it.criterionCode);
                    const levels = criterionDef?.levels || [];
                    const isEvidenceOpen = activeEvidenceItemId === it.criterionId;

                    return (
                      <tr key={it.criterionId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="border border-slate-600 p-2 text-center font-semibold">{it.criterionCode}</td>
                        
                        <td className="border border-slate-600 p-2 space-y-1.5">
                          <div className="leading-relaxed text-slate-900">{it.criterionName}</div>
                          
                          {/* Nút nhập minh chứng / ghi chú */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveEvidenceItemId(isEvidenceOpen ? null : it.criterionId)}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 underline cursor-pointer"
                            >
                              <Paperclip size={11} />
                              {it.selfEvidence ? 'Sửa minh chứng' : '+ Thêm minh chứng / ghi chú'}
                            </button>
                            {it.selfEvidence && (
                              <span className="text-[10px] text-slate-600 italic truncate max-w-xs">
                                ({it.selfEvidence})
                              </span>
                            )}
                          </div>

                          {isEvidenceOpen && (
                            <div className="p-2 bg-blue-50/60 rounded border border-blue-200 mt-1 space-y-1">
                              <input
                                type="text"
                                value={it.selfEvidence || ''}
                                onChange={(e) => handleEvidenceChange(it.criterionId, e.target.value)}
                                disabled={isLocked}
                                placeholder="Nhập đường dẫn file minh chứng hoặc ghi chú xác thực..."
                                className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </td>

                        <td className="border border-slate-600 p-2 text-center font-bold">{it.maxScore}</td>

                        {/* Điểm cá nhân tự chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-blue-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={it.maxScore}
                              value={it.selfScore}
                              onChange={(e) => handleSelfScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                              disabled={isLocked || currentMode === 'evaluator'}
                              className="w-16 px-1.5 py-1 text-center font-bold text-blue-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Điểm thủ trưởng chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-indigo-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={it.maxScore}
                              value={it.evaluatorScore}
                              onChange={(e) => handleEvaluatorScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                              disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                              className="w-16 px-1.5 py-1 text-center font-bold text-indigo-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* ========================================================= */}
                  {/* NHÓM II: TÁC PHONG, LỀ LỐI LÀM VIỆC (15đ) */}
                  {/* ========================================================= */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td className="border border-slate-600 p-2 text-center">II</td>
                    <td className="border border-slate-600 p-2 uppercase">
                      Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật
                    </td>
                    <td className="border border-slate-600 p-2 text-center">15</td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-blue-800 bg-blue-50/40">
                      {totals.selfGroupScores?.group_II || 0}
                    </td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-indigo-800 bg-indigo-50/40">
                      {totals.evaluatorGroupScores?.group_II || 0}
                    </td>
                  </tr>

                  {groupIIItems.map((it) => {
                    const isEvidenceOpen = activeEvidenceItemId === it.criterionId;

                    return (
                      <tr key={it.criterionId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="border border-slate-600 p-2 text-center font-semibold">{it.criterionCode}</td>
                        
                        <td className="border border-slate-600 p-2 space-y-1.5">
                          <div className="leading-relaxed text-slate-900">{it.criterionName}</div>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveEvidenceItemId(isEvidenceOpen ? null : it.criterionId)}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 underline cursor-pointer"
                            >
                              <Paperclip size={11} />
                              {it.selfEvidence ? 'Sửa minh chứng' : '+ Thêm minh chứng / ghi chú'}
                            </button>
                            {it.selfEvidence && (
                              <span className="text-[10px] text-slate-600 italic truncate max-w-xs">
                                ({it.selfEvidence})
                              </span>
                            )}
                          </div>

                          {isEvidenceOpen && (
                            <div className="p-2 bg-blue-50/60 rounded border border-blue-200 mt-1 space-y-1">
                              <input
                                type="text"
                                value={it.selfEvidence || ''}
                                onChange={(e) => handleEvidenceChange(it.criterionId, e.target.value)}
                                disabled={isLocked}
                                placeholder="Nhập đường dẫn file minh chứng hoặc ghi chú xác thực..."
                                className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </td>

                        <td className="border border-slate-600 p-2 text-center font-bold">{it.maxScore}</td>

                        {/* Điểm cá nhân tự chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-blue-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={it.maxScore}
                              value={it.selfScore}
                              onChange={(e) => handleSelfScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                              disabled={isLocked || currentMode === 'evaluator'}
                              className="w-16 px-1.5 py-1 text-center font-bold text-blue-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Điểm thủ trưởng chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-indigo-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={it.maxScore}
                              value={it.evaluatorScore}
                              onChange={(e) => handleEvaluatorScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                              disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                              className="w-16 px-1.5 py-1 text-center font-bold text-indigo-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* ========================================================= */}
                  {/* NHÓM III: KẾT QUẢ THỰC HIỆN NHIỆM VỤ (70đ) */}
                  {/* ========================================================= */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td className="border border-slate-600 p-2 text-center">III</td>
                    <td className="border border-slate-600 p-2 uppercase">
                      KẾT QUẢ THỰC HIỆN NHIỆM VỤ
                    </td>
                    <td className="border border-slate-600 p-2 text-center">70</td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-blue-800 bg-blue-50/40">
                      {totals.selfGroupScores?.group_III || 0}
                    </td>
                    <td className="border border-slate-600 p-2 text-center font-extrabold text-indigo-800 bg-indigo-50/40">
                      {totals.evaluatorGroupScores?.group_III || 0}
                    </td>
                  </tr>

                  {/* 1. Năng lực và kỹ năng làm việc (10 điểm) */}
                  <tr className="bg-slate-50 font-bold italic text-slate-800">
                    <td className="border border-slate-600 p-2 text-center">1</td>
                    <td className="border border-slate-600 p-2">
                      Năng lực và kỹ năng làm việc
                    </td>
                    <td className="border border-slate-600 p-2 text-center">10</td>
                    <td className="border border-slate-600 p-2 text-center"></td>
                    <td className="border border-slate-600 p-2 text-center"></td>
                  </tr>

                  {groupIII_1_Items.map((it) => {
                    const isEvidenceOpen = activeEvidenceItemId === it.criterionId;

                    return (
                      <tr key={it.criterionId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="border border-slate-600 p-2 text-center font-semibold">{it.criterionCode}</td>
                        
                        <td className="border border-slate-600 p-2 space-y-1.5">
                          <div className="leading-relaxed text-slate-900">{it.criterionName}</div>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveEvidenceItemId(isEvidenceOpen ? null : it.criterionId)}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 underline cursor-pointer"
                            >
                              <Paperclip size={11} />
                              {it.selfEvidence ? 'Sửa minh chứng' : '+ Thêm minh chứng / ghi chú'}
                            </button>
                            {it.selfEvidence && (
                              <span className="text-[10px] text-slate-600 italic truncate max-w-xs">
                                ({it.selfEvidence})
                              </span>
                            )}
                          </div>

                          {isEvidenceOpen && (
                            <div className="p-2 bg-blue-50/60 rounded border border-blue-200 mt-1 space-y-1">
                              <input
                                type="text"
                                value={it.selfEvidence || ''}
                                onChange={(e) => handleEvidenceChange(it.criterionId, e.target.value)}
                                disabled={isLocked}
                                placeholder="Nhập đường dẫn file minh chứng hoặc ghi chú..."
                                className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </td>

                        <td className="border border-slate-600 p-2 text-center font-bold">{it.maxScore}</td>

                        {/* Tự chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-blue-50/20">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={it.maxScore}
                            value={it.selfScore}
                            onChange={(e) => handleSelfScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                            disabled={isLocked || currentMode === 'evaluator'}
                            className="w-16 px-1.5 py-1 text-center font-bold text-blue-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Thủ trưởng chấm */}
                        <td className="border border-slate-600 p-2 text-center bg-indigo-50/20">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={it.maxScore}
                            value={it.evaluatorScore}
                            onChange={(e) => handleEvaluatorScoreInputChange(it.criterionId, it.maxScore, e.target.value)}
                            disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                            className="w-16 px-1.5 py-1 text-center font-bold text-indigo-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {/* 2. Kết quả thực hiện nhiệm vụ được giao (60 điểm) */}
                  <tr className="bg-slate-50 font-bold italic text-slate-800">
                    <td className="border border-slate-600 p-2 text-center">2</td>
                    <td className="border border-slate-600 p-2">
                      Kết quả thực hiện nhiệm vụ được giao
                    </td>
                    <td className="border border-slate-600 p-2 text-center">60</td>
                    <td className="border border-slate-600 p-2 text-center"></td>
                    <td className="border border-slate-600 p-2 text-center"></td>
                  </tr>

                  {groupIII_2_Items.map((it) => {
                    const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === it.criterionId || c.code === it.criterionCode);
                    const levels = criterionDef?.levels || [];

                    return (
                      <tr key={it.criterionId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="border border-slate-600 p-2 text-center font-semibold align-top">{it.criterionCode}</td>
                        
                        <td className="border border-slate-600 p-2 space-y-2 align-top">
                          <div className="font-bold text-slate-900 leading-relaxed">{it.criterionName}</div>
                          
                          {/* THANG MỨC LỰA CHỌN BẮT BUỘC THEO QUY ĐỊNH (RADIO OPTIONS) */}
                          <div className="space-y-1.5 pt-1 pl-1">
                            <span className="text-[10.5px] font-bold text-blue-900 block">
                              Mức lựa chọn tiêu chí {it.criterionCode}:
                            </span>
                            
                            {levels.map((lvl) => {
                              const isSelfSelected = it.selfScore === lvl.score;
                              const isEvalSelected = it.evaluatorScore === lvl.score;

                              return (
                                <div 
                                  key={lvl.id} 
                                  className={`p-1.5 rounded-lg border text-[11px] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                    isSelfSelected ? 'bg-blue-50/80 border-blue-400 font-medium' : 'bg-slate-50/50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="font-bold text-slate-800 shrink-0">•</span>
                                    <div>
                                      <span className="text-slate-900">{lvl.label}</span>
                                      <span className="font-bold text-blue-700 ml-1.5">({lvl.score} điểm)</span>
                                    </div>
                                  </div>

                                  {/* Radio buttons for Self and Evaluator */}
                                  <div className="flex items-center gap-3 shrink-0 pl-4 sm:pl-0">
                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name={`self_radio_${it.criterionId}`}
                                        checked={isSelfSelected}
                                        onChange={() => handleSelectSelfLevel(it.criterionId, lvl)}
                                        disabled={isLocked || currentMode === 'evaluator'}
                                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <span className="text-[10px] text-blue-800 font-semibold">Tự chấm</span>
                                    </label>

                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name={`eval_radio_${it.criterionId}`}
                                        checked={isEvalSelected}
                                        onChange={() => handleSelectEvaluatorLevel(it.criterionId, lvl)}
                                        disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className="text-[10px] text-indigo-800 font-semibold">Thủ trưởng</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td className="border border-slate-600 p-2 text-center font-bold align-top">{it.maxScore}</td>

                        {/* Điểm cá nhân tự chấm */}
                        <td className="border border-slate-600 p-2 text-center font-extrabold text-blue-900 bg-blue-50/20 align-top text-sm">
                          {it.selfScore}
                        </td>

                        {/* Điểm thủ trưởng chấm */}
                        <td className="border border-slate-600 p-2 text-center font-extrabold text-indigo-900 bg-indigo-50/20 align-top text-sm">
                          {it.evaluatorScore}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ========================================================= */}
                  {/* DÒNG TỔNG ĐIỂM TOÀN PHIẾU */}
                  {/* ========================================================= */}
                  <tr className="font-extrabold bg-slate-100 text-slate-900 text-xs sm:text-sm">
                    <td colSpan={2} className="border border-slate-600 p-2.5 text-center uppercase tracking-wider">
                      TỔNG ĐIỂM
                    </td>
                    <td className="border border-slate-600 p-2.5 text-center">100</td>
                    <td className="border border-slate-600 p-2.5 text-center text-blue-900 text-base">
                      {totals.selfTotalScore}
                    </td>
                    <td className="border border-slate-600 p-2.5 text-center text-indigo-900 text-base">
                      {totals.evaluatorTotalScore}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* 5. PHẦN TỔNG HỢP VÀ TỰ XẾP LOẠI CỦA CÁ NHÂN */}
            <div className="border border-slate-300 rounded-xl p-4 mb-6 bg-slate-50 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pb-2 border-b border-slate-200">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10.5px] text-slate-500 block uppercase font-bold">Nhóm I (Tối đa 15)</span>
                  <span className="font-extrabold text-blue-800 text-sm">{totals.selfGroupScores.group_I}đ</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10.5px] text-slate-500 block uppercase font-bold">Nhóm II (Tối đa 15)</span>
                  <span className="font-extrabold text-blue-800 text-sm">{totals.selfGroupScores.group_II}đ</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10.5px] text-slate-500 block uppercase font-bold">Nhóm III (Tối đa 70)</span>
                  <span className="font-extrabold text-blue-800 text-sm">{totals.selfGroupScores.group_III}đ</span>
                </div>
                <div className="p-2 bg-blue-100/70 rounded border border-blue-300">
                  <span className="text-[10.5px] text-blue-900 block uppercase font-bold">TỔNG ĐIỂM TỰ CHẤM</span>
                  <span className="font-extrabold text-blue-950 text-base">{totals.selfTotalScore}/100</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Cá nhân tự xếp loại:</span>
                  <select
                    value={selfGrade}
                    onChange={(e) => setSelfGrade(e.target.value)}
                    disabled={isLocked || currentMode === 'evaluator'}
                    className="px-3 py-1.5 font-bold text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Hoàn thành xuất sắc nhiệm vụ">Hoàn thành xuất sắc nhiệm vụ</option>
                    <option value="Hoàn thành tốt nhiệm vụ">Hoàn thành tốt nhiệm vụ</option>
                    <option value="Hoàn thành nhiệm vụ">Hoàn thành nhiệm vụ</option>
                    <option value="Không hoàn thành nhiệm vụ">Không hoàn thành nhiệm vụ</option>
                  </select>
                </div>

                <div className="text-xs text-slate-500 italic">
                  Chênh lệch (Thủ trưởng - Tự chấm): <strong className={totals.scoreDifference > 0 ? 'text-emerald-600' : totals.scoreDifference < 0 ? 'text-rose-600' : 'text-slate-700'}>
                    {totals.scoreDifference > 0 ? `+${totals.scoreDifference}` : totals.scoreDifference} điểm
                  </strong>
                </div>
              </div>

              {/* Tự nhận xét của cán bộ quản lý */}
              <div className="pt-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Ý kiến tự nhận xét, đánh giá của Cán bộ Quản lý:
                </label>
                <textarea
                  rows={3}
                  value={selfComment}
                  onChange={(e) => setSelfComment(e.target.value)}
                  disabled={isLocked || currentMode === 'evaluator'}
                  placeholder="Nhập ý kiến tự đánh giá về quá trình thực hiện nhiệm vụ trong năm học..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 text-center text-xs">
                <div className="w-1/2">
                  <p className="italic text-slate-600">Minh Hòa, ngày ..... tháng ..... năm 202...</p>
                  <p className="font-bold uppercase mt-1">Người tự đánh giá</p>
                  <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-10" />
                  <p className="font-bold text-slate-900">{isCreate ? selectedTeacher?.name : initialForm?.evaluateeName}</p>
                </div>
              </div>
            </div>

            {/* 6. PHẦN B: Ý KIẾN NHẬN XÉT, ĐÁNH GIÁ (DÀNH CHO NGƯỜI ĐỨNG ĐẦU ĐƠN VỊ) */}
            <div className="border-t-2 border-slate-600 pt-4 mt-8 space-y-4">
              <h2 className="font-bold text-xs sm:text-sm uppercase text-slate-900">
                B. Ý KIẾN NHẬN XÉT, ĐÁNH GIÁ (Phần dành cho người đứng đầu đơn vị)
              </h2>

              <div className="space-y-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-200">
                <div>
                  <label className="block font-bold text-indigo-950 mb-1">
                    1. Ý kiến nhận xét, đánh giá của Thủ trưởng / Người đứng đầu:
                  </label>
                  <textarea
                    rows={4}
                    value={evaluatorComment}
                    onChange={(e) => setEvaluatorComment(e.target.value)}
                    disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                    placeholder="Nhận xét ưu điểm, tồn tại hạn chế và đánh giá kết quả thực hiện nhiệm vụ..."
                    className="w-full p-2.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-950">2. Mức xếp loại của Thủ trưởng:</span>
                    <select
                      value={evaluatorGrade}
                      onChange={(e) => setEvaluatorGrade(e.target.value)}
                      disabled={isLocked || (!isAdmin && currentMode !== 'evaluator')}
                      className="px-3 py-1.5 font-bold text-xs bg-white border border-indigo-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Hoàn thành xuất sắc nhiệm vụ">Hoàn thành xuất sắc nhiệm vụ</option>
                      <option value="Hoàn thành tốt nhiệm vụ">Hoàn thành tốt nhiệm vụ</option>
                      <option value="Hoàn thành nhiệm vụ">Hoàn thành nhiệm vụ</option>
                      <option value="Không hoàn thành nhiệm vụ">Không hoàn thành nhiệm vụ</option>
                    </select>
                  </div>

                  <div className="font-bold text-indigo-950">
                    Tổng điểm thủ trưởng chấm: <span className="text-base text-indigo-700">{totals.evaluatorTotalScore}/100</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 text-center text-xs">
                  <div className="w-1/2">
                    <p className="italic text-slate-600">Minh Hòa, ngày ..... tháng ..... năm 202...</p>
                    <p className="font-bold uppercase mt-1">NGƯỜI NHẬN XÉT, ĐÁNH GIÁ</p>
                    <p className="italic text-[11px] text-slate-500">(Ký, ghi rõ họ tên; đóng dấu)</p>
                    <div className="h-12" />
                    <p className="font-bold text-slate-900">{selectedEvaluator.name}</p>
                    <p className="text-[11px] text-slate-500">{selectedEvaluator.position}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            Tổng điểm: <strong className="text-blue-700 font-extrabold text-sm">{totals.selfTotalScore}/100</strong> (Tự chấm) • <strong className="text-indigo-700 font-extrabold text-sm">{totals.evaluatorTotalScore}/100</strong> (Thủ trưởng)
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Đóng / Hủy
              </button>

              <button
                type="button"
                onClick={() => {
                  if (initialForm && initialForm.id) {
                    exportCbqlFormToWord(initialForm);
                  } else {
                    alert('Vui lòng lưu phiếu trước khi xuất Word.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <FileText size={15} />
                <span>Xuất Word (.doc)</span>
              </button>
            </div>

            {/* CREATE MODE ACTIONS */}
            {isCreate && (
              <>
                <button
                  type="button"
                  onClick={() => handleCreateFormSubmit(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Nháp Phiếu'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateFormSubmit(true)}
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{isSaving ? 'Đang tạo...' : 'Tạo và Gửi Duyệt'}</span>
                </button>
              </>
            )}

            {/* EDIT / EVALUATOR MODE ACTIONS */}
            {!isCreate && !isLocked && (
              <>
                {/* Nút lưu thay đổi bản tự chấm */}
                <button
                  type="button"
                  onClick={() => handleUpdateExistingForm(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}</span>
                </button>

                {/* Nút gửi duyệt lên thủ trưởng */}
                {initialForm?.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateExistingForm(true)}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>Gửi Thủ Trưởng Duyệt</span>
                  </button>
                )}

                {/* Thủ trưởng lưu đánh giá & Chốt kết quả */}
                {(isAdmin || currentMode === 'evaluator') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEvaluatorSave(false)}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-bold bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck size={15} />
                      <span>Lưu Đánh Giá Thủ Trưởng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEvaluatorSave(true)}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Lock size={15} />
                      <span>Chốt Kết Quả & Khóa Phiếu</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
