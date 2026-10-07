import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  Award, 
  MinusCircle, 
  PlusCircle, 
  Info,
  UserCheck,
  Send,
  ShieldCheck,
  Lock,
  Unlock,
  Sparkles,
  FileCheck2,
  Clock,
  ChevronRight,
  Check,
  FileText,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  Layers,
  CheckSquare
} from 'lucide-react';
import { 
  Teacher, 
  Department,
  KpiEvaluationForm, 
  KpiEvaluationItem, 
  KpiTargetCode 
} from '../../types';
import { 
  KPI_TARGET_GROUPS, 
  KpiTargetGroup, 
  normalizeTargetGroup, 
  resolveTeacherTargetGroup, 
  filterTeachersByTargetGroup, 
  createEvaluationItemsForTarget, 
  calculateEvaluationFormTotals,
  getEligibleEvaluators,
  isExcludedCbqlEvaluator,
  getKpiFormStatusInfo
} from '../../lib/kpiTargetAudienceUtils';
import { useAuth } from '../../store/AuthContext';
import { useAppContext } from '../../store/AppContext';
import { cn } from '../../lib/utils';

interface KpiEvaluationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formToEdit?: KpiEvaluationForm | null;
  initialTeacher?: Teacher | null;
  initialMonth?: string;
  initialAcademicYear?: string;
  onPrint?: (form: KpiEvaluationForm) => void;
}

export default function KpiEvaluationFormModal({
  isOpen,
  onClose,
  formToEdit,
  initialTeacher,
  initialMonth = '09',
  initialAcademicYear = '2026-2027',
  onPrint
}: KpiEvaluationFormModalProps) {
  const { user } = useAuth();
  const { teachers, departments, kpiEvaluationForms, addKpiEvaluationForm, updateKpiEvaluationForm } = useAppContext();

  // Evaluatee state (Phần Thông Tin Chung)
  const [selectedTarget, setSelectedTarget] = useState<KpiTargetGroup>('GV');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [month, setMonth] = useState<string>(initialMonth);
  const [academicYear, setAcademicYear] = useState<string>(initialAcademicYear);
  
  // Evaluator state
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('');
  const [evaluationDate, setEvaluationDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<KpiEvaluationForm['status']>('draft');
  
  // Feedback & Items State
  const [note, setNote] = useState<string>('');
  const [evaluateeComment, setEvaluateeComment] = useState<string>('');
  const [evaluatorComment, setEvaluatorComment] = useState<string>('');
  const [items, setItems] = useState<KpiEvaluationItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingFormNotice, setExistingFormNotice] = useState<string | null>(null);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);

  // Column view filter (Tất cả cột / Chỉ Tự đánh giá / Chỉ Lãnh đạo đánh giá)
  const [columnViewMode, setColumnViewMode] = useState<'all' | 'self' | 'evaluator'>('all');

  // Determine user permissions
  const isBghOrAdmin = !user || user.role === 'BGH' || (user as any).role === 'ADMIN' || user.id === 'admin';

  // Evaluatee object
  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  const teacherDepartment = useMemo(() => {
    return selectedTeacher ? departments.find(d => d.id === selectedTeacher.departmentId) : undefined;
  }, [departments, selectedTeacher]);

  // Compute eligible evaluators strictly according to position rules
  const eligibleEvaluatorsResult = useMemo(() => {
    return getEligibleEvaluators(selectedTeacher, teachers, departments);
  }, [selectedTeacher, teachers, departments]);

  // Selected Evaluator object
  const selectedEvaluator = useMemo(() => {
    return teachers.find(t => t.id === selectedEvaluatorId) || null;
  }, [teachers, selectedEvaluatorId]);

  // Check roles relative to this specific form
  const isCurrentUserEvaluatee = useMemo(() => {
    if (!user?.id) return false;
    return user.id === selectedTeacherId;
  }, [user, selectedTeacherId]);

  const isCurrentUserEvaluator = useMemo(() => {
    if (!user?.id) return false;
    return isBghOrAdmin || user.id === selectedEvaluatorId;
  }, [user, selectedEvaluatorId, isBghOrAdmin]);

  // Status checks
  const isFormLocked = status === 'locked';
  const isFormEvaluated = status === 'evaluated' || status === 'confirmed';
  const isFormSubmitted = status === 'pending_evaluator' || status === 'pending_evaluation' || status === 'submitted' || status === 'evaluating';

  // Permissions for Part A (Tự đánh giá)
  const canEditPartA = !isFormLocked && !isFormSubmitted && !isFormEvaluated && (isCurrentUserEvaluatee || isBghOrAdmin || !formToEdit);

  // Permissions for Part B (Người đánh giá)
  const canEditPartB = !isFormLocked && (isCurrentUserEvaluator || isBghOrAdmin);

  // Initialize / load form data
  const loadFormData = (f: KpiEvaluationForm) => {
    setCurrentFormId(f.id);
    const target = normalizeTargetGroup(f.targetGroup);
    setSelectedTarget(target);
    setSelectedTeacherId(f.teacherId || f.employee_id || '');
    setMonth(f.month || initialMonth);
    setAcademicYear(f.academicYear || initialAcademicYear);
    
    setSelectedEvaluatorId(f.evaluatorId || f.evaluator_id || '');
    setEvaluationDate(f.evaluationDate || new Date().toISOString().split('T')[0]);
    setStatus(f.status || 'draft');
    setNote(f.note || '');
    setEvaluateeComment(f.evaluateeComment || '');
    setEvaluatorComment(f.evaluatorComment || '');
    
    if (f.items && f.items.length > 0) {
      const defaultTemplateItems = createEvaluationItemsForTarget(target, f.id);
      
      setItems(f.items.map((item, idx) => {
        const tmpl = defaultTemplateItems.find(t => t.kpi_code === item.kpi_code || t.code === item.code) || defaultTemplateItems[idx];
        const baseSc = Number(item.base_score ?? item.standardScore ?? tmpl?.base_score ?? 10);
        
        return {
          ...tmpl,
          ...item,
          stt: item.stt || idx + 1,
          kpi_code: item.kpi_code || item.code || tmpl?.kpi_code || `TC.${idx + 1}`,
          code: item.code || item.kpi_code || tmpl?.code || `TC.${idx + 1}`,
          kpi_group: item.kpi_group || tmpl?.kpi_group || 'Nhiệm vụ chung',
          group: item.group || item.kpi_group || tmpl?.kpi_group || 'Nhiệm vụ chung',
          criterion_content: item.criterion_content || item.criterionName || tmpl?.criterion_content || '',
          criterionName: item.criterionName || item.criterion_content || tmpl?.criterionName || '',
          description: item.description || tmpl?.description || '',
          base_score: baseSc,
          standardScore: baseSc,
          minus_rules: (item.minus_rules && item.minus_rules.length > 0) ? item.minus_rules : (tmpl?.minus_rules || []),
          plus_rules: (item.plus_rules && item.plus_rules.length > 0) ? item.plus_rules : (tmpl?.plus_rules || []),
          evidence_rule: item.evidence_rule || tmpl?.evidence_rule || '',
          evaluator_role: item.evaluator_role || tmpl?.evaluator_role || 'Tổ trưởng / BGH',
          
          self_score: item.self_score !== undefined ? item.self_score : (item.selfScore !== undefined ? item.selfScore : baseSc),
          selfScore: item.selfScore !== undefined ? item.selfScore : (item.self_score !== undefined ? item.self_score : baseSc),
          self_plus_score: item.self_plus_score ?? item.selfPlusScore ?? 0,
          selfPlusScore: item.selfPlusScore ?? item.self_plus_score ?? 0,
          self_minus_score: item.self_minus_score ?? item.selfMinusScore ?? 0,
          selfMinusScore: item.selfMinusScore ?? item.self_minus_score ?? 0,
          evidence: item.evidence || item.self_evidence || '',
          self_evidence: item.self_evidence || item.evidence || '',
          
          evaluator_score: item.evaluator_score !== undefined ? item.evaluator_score : (item.evaluatorScore !== undefined ? item.evaluatorScore : baseSc),
          evaluatorScore: item.evaluatorScore !== undefined ? item.evaluatorScore : (item.evaluator_score !== undefined ? item.evaluator_score : baseSc),
          evaluator_plus_score: item.evaluator_plus_score ?? item.evaluatorPlusScore ?? 0,
          evaluatorPlusScore: item.evaluatorPlusScore ?? item.evaluator_plus_score ?? 0,
          evaluator_minus_score: item.evaluator_minus_score ?? item.evaluatorMinusScore ?? 0,
          evaluatorMinusScore: item.evaluatorMinusScore ?? item.evaluator_minus_score ?? 0,
          evaluatorComment: item.evaluatorComment || item.evaluator_comment || item.evaluatorNote || item.evaluator_note || '',
          
          plusScore: item.plusScore ?? item.plus_score ?? 0,
          minusScore: item.minusScore ?? item.minus_score ?? 0,
          kpiScore: item.kpiScore ?? item.kpi_score ?? baseSc
        };
      }));
    } else {
      setItems(createEvaluationItemsForTarget(target, f.id));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setExistingFormNotice(null);

    if (formToEdit) {
      loadFormData(formToEdit);
    } else {
      let defaultTeacherId = '';
      if (initialTeacher) {
        defaultTeacherId = initialTeacher.id;
      } else if (!isBghOrAdmin && user?.id) {
        defaultTeacherId = user.id;
      } else if (teachers.length > 0) {
        defaultTeacherId = teachers[0].id;
      }

      // Check if existing form exists for this teacher + month + year
      const existing = (kpiEvaluationForms || []).find(f => 
        (f.teacherId === defaultTeacherId || f.employee_id === defaultTeacherId) &&
        f.month === initialMonth &&
        (f.academicYear === initialAcademicYear || f.academic_year === initialAcademicYear)
      );

      if (existing) {
        setExistingFormNotice(`Đồng chí đã có 01 Phiếu KPI cho Tháng ${initialMonth}/${initialAcademicYear}. Hệ thống đã mở phiếu hiện có để tiếp tục thực hiện.`);
        loadFormData(existing);
        return;
      }

      const activeTeach = teachers.find(t => t.id === defaultTeacherId);
      const defaultTarget: KpiTargetGroup = activeTeach ? resolveTeacherTargetGroup(activeTeach) : 'GV';
      
      setCurrentFormId(null);
      setSelectedTarget(defaultTarget);
      setSelectedTeacherId(defaultTeacherId);
      setMonth(initialMonth);
      setAcademicYear(initialAcademicYear);
      setSelectedEvaluatorId('');
      setEvaluationDate(new Date().toISOString().split('T')[0]);
      setStatus('draft');
      setNote('');
      setEvaluateeComment('');
      setEvaluatorComment('');
      setItems(createEvaluationItemsForTarget(defaultTarget));
    }
  }, [isOpen, formToEdit, initialTeacher, initialMonth, initialAcademicYear, user, teachers, isBghOrAdmin, kpiEvaluationForms]);

  // Auto-select evaluator if empty or not found or excluded
  useEffect(() => {
    if (!isOpen) return;
    const currentEval = teachers.find(t => t.id === selectedEvaluatorId);
    const isInvalid = !selectedEvaluatorId || !currentEval || isExcludedCbqlEvaluator(currentEval);

    if (isInvalid) {
      if (eligibleEvaluatorsResult.defaultEvaluatorId && !isExcludedCbqlEvaluator(teachers.find(t => t.id === eligibleEvaluatorsResult.defaultEvaluatorId))) {
        setSelectedEvaluatorId(eligibleEvaluatorsResult.defaultEvaluatorId);
      } else {
        const firstValid = eligibleEvaluatorsResult.evaluators.find(t => !isExcludedCbqlEvaluator(t));
        if (firstValid) {
          setSelectedEvaluatorId(firstValid.id);
        }
      }
    }
  }, [isOpen, selectedTeacherId, selectedEvaluatorId, eligibleEvaluatorsResult, teachers]);

  // Check existing form on period / employee change
  const checkExistingFormForPeriod = (tId: string, m: string, yr: string) => {
    if (!tId) return;
    const existing = (kpiEvaluationForms || []).find(f => 
      (f.teacherId === tId || f.employee_id === tId) &&
      f.month === m &&
      (f.academicYear === yr || f.academic_year === yr)
    );

    if (existing && existing.id !== currentFormId) {
      setExistingFormNotice(`Đã tồn tại 01 Phiếu KPI của giáo viên này trong Tháng ${m}/${yr}. Hệ thống đã chuyển sang phiếu hiện có.`);
      loadFormData(existing);
    } else {
      setExistingFormNotice(null);
    }
  };

  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      const teacherTarget = resolveTeacherTargetGroup(teacher);
      if (teacherTarget !== selectedTarget) {
        setSelectedTarget(teacherTarget);
        setItems(createEvaluationItemsForTarget(teacherTarget));
      }
      checkExistingFormForPeriod(teacherId, month, academicYear);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    checkExistingFormForPeriod(selectedTeacherId, newMonth, academicYear);
  };

  const handleAcademicYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    checkExistingFormForPeriod(selectedTeacherId, month, newYear);
  };

  const handleTargetChange = (newTarget: KpiTargetGroup) => {
    setSelectedTarget(newTarget);
    if (!currentFormId) {
      const filtered = filterTeachersByTargetGroup(teachers, newTarget);
      if (filtered.length > 0 && !filtered.some(t => t.id === selectedTeacherId)) {
        handleTeacherChange(filtered[0].id);
      }
      setItems(createEvaluationItemsForTarget(newTarget));
    }
  };

  // Live item updates for Part A (Tự đánh giá)
  const handlePartAMinusRuleChange = (itemId: string, ruleLabel: string, scoreValue: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;
      const std = Number(item.base_score ?? item.standardScore) || 0;
      const plus = Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0);
      const minus = Math.max(0, scoreValue);
      const selfSc = Math.max(0, std - minus + plus);
      
      return {
        ...item,
        selected_self_minus_label: ruleLabel,
        self_minus_score: minus,
        selfMinusScore: minus,
        self_score: selfSc,
        selfScore: selfSc,
        plusScore: plus,
        minusScore: minus,
        kpiScore: selfSc
      };
    }));
  };

  const handlePartAPlusRuleChange = (itemId: string, ruleLabel: string, scoreValue: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;
      const std = Number(item.base_score ?? item.standardScore) || 0;
      const minus = Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0);
      const plus = Math.max(0, scoreValue);
      const selfSc = Math.max(0, std - minus + plus);
      
      return {
        ...item,
        selected_self_plus_label: ruleLabel,
        self_plus_score: plus,
        selfPlusScore: plus,
        self_score: selfSc,
        selfScore: selfSc,
        plusScore: plus,
        minusScore: minus,
        kpiScore: selfSc
      };
    }));
  };

  const handlePartAEvidenceChange = (itemId: string, value: string) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, evidence: value, self_evidence: value, selfComment: value } : item));
  };

  // Live item updates for Part B (Đánh giá của Lãnh đạo / Người đánh giá)
  const handlePartBMinusRuleChange = (itemId: string, ruleLabel: string, scoreValue: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;
      const std = Number(item.base_score ?? item.standardScore) || 0;
      const plus = Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0);
      const minus = Math.max(0, scoreValue);
      const evalSc = Math.max(0, std - minus + plus);

      return {
        ...item,
        selected_evaluator_minus_label: ruleLabel,
        evaluator_minus_score: minus,
        evaluatorMinusScore: minus,
        evaluator_score: evalSc,
        evaluatorScore: evalSc,
        plusScore: plus,
        minusScore: minus,
        kpiScore: evalSc
      };
    }));
  };

  const handlePartBPlusRuleChange = (itemId: string, ruleLabel: string, scoreValue: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;
      const std = Number(item.base_score ?? item.standardScore) || 0;
      const minus = Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0);
      const plus = Math.max(0, scoreValue);
      const evalSc = Math.max(0, std - minus + plus);

      return {
        ...item,
        selected_evaluator_plus_label: ruleLabel,
        evaluator_plus_score: plus,
        evaluatorPlusScore: plus,
        evaluator_score: evalSc,
        evaluatorScore: evalSc,
        plusScore: plus,
        minusScore: minus,
        kpiScore: evalSc
      };
    }));
  };

  const handlePartBCommentChange = (itemId: string, value: string) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, evaluatorComment: value, evaluator_comment: value, evaluatorNote: value, evaluator_note: value } : item));
  };

  // Totals calculations
  const totals = calculateEvaluationFormTotals(items);

  // Status Info
  const statusInfo = getKpiFormStatusInfo(status);

  // Automatic Ranking Badge
  const getRankBadge = (score: number) => {
    if (score >= 90) {
      return { label: 'Hoàn thành xuất sắc', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (score >= 75) {
      return { label: 'Hoàn thành tốt', class: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (score >= 50) {
      return { label: 'Hoàn thành', class: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'Không hoàn thành', class: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const rankBadge = getRankBadge(totals.totalKpiScore);

  // Save with Workflow Transition
  const handleSave = async (targetAction: 'draft' | 'self_assessing' | 'self_assessed' | 'submit_to_evaluator' | 'save_evaluation' | 'complete_evaluation' | 'lock' | 'unlock') => {
    if (!selectedTeacherId) {
      setErrorMsg('Vui lòng chọn Cán bộ / Giáo viên / Nhân viên được đánh giá!');
      return;
    }
    if (targetAction === 'submit_to_evaluator' && !selectedEvaluatorId) {
      setErrorMsg('Vui lòng chọn Người đánh giá có thẩm quyền trước khi gửi phiếu!');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Phiếu đánh giá phải có ít nhất một tiêu chí!');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const teacher = teachers.find(t => t.id === selectedTeacherId);
      const dept = teacher ? departments.find(d => d.id === teacher.departmentId) : undefined;

      const evaluator = teachers.find(t => t.id === selectedEvaluatorId);
      const evaluatorDept = evaluator ? departments.find(d => d.id === evaluator.departmentId) : undefined;

      let evalPos = evaluator?.position || evaluator?.role || 'Tổ trưởng / Quản lý';
      if (evaluator?.role === 'BGH' || (evaluator?.position || '').toLowerCase().includes('hiệu trưởng')) {
        evalPos = evaluator.position || 'Ban Giám Hiệu';
      } else if (evaluator?.role === 'TTCM') {
        evalPos = 'Tổ trưởng Chuyên môn';
      }

      let nextStatus = status;
      let selfAssessedAt = formToEdit?.self_assessed_at;
      let submittedAt = formToEdit?.submitted_at;
      let evaluatedAt = formToEdit?.evaluated_at;
      let lockedAt = formToEdit?.lockedAt;

      const now = new Date().toISOString();

      if (targetAction === 'draft') {
        nextStatus = 'draft';
      } else if (targetAction === 'self_assessing') {
        nextStatus = 'self_assessing';
      } else if (targetAction === 'self_assessed') {
        nextStatus = 'self_assessed';
        selfAssessedAt = selfAssessedAt || now;
      } else if (targetAction === 'submit_to_evaluator') {
        nextStatus = 'pending_evaluator';
        selfAssessedAt = selfAssessedAt || now;
        submittedAt = now;
      } else if (targetAction === 'save_evaluation') {
        nextStatus = 'evaluating';
      } else if (targetAction === 'complete_evaluation') {
        nextStatus = 'evaluated';
        evaluatedAt = now;
      } else if (targetAction === 'lock') {
        nextStatus = 'locked';
        lockedAt = now;
      } else if (targetAction === 'unlock') {
        nextStatus = 'evaluated';
        lockedAt = undefined;
      }

      const formIdToUse = currentFormId || formToEdit?.id || `kpif_${(academicYear || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_')}_m${String(month || '09').padStart(2, '0')}_${selectedTeacherId}`;

      const formPayload: KpiEvaluationForm = {
        id: formIdToUse,
        
        // Evaluatee snapshots
        teacherId: selectedTeacherId,
        employee_id: selectedTeacherId,
        teacherName: teacher?.name || 'Không xác định',
        employee_name_snapshot: teacher?.name || 'Không xác định',
        teacherCode: teacher?.code || '',
        employee_code_snapshot: teacher?.code || '',
        position: teacher?.position || teacher?.role || 'Giáo viên',
        employee_position_snapshot: teacher?.position || teacher?.role || 'Giáo viên',
        departmentId: teacher?.departmentId || '',
        department_id: teacher?.departmentId || '',
        departmentName: dept?.name || teacher?.subject || 'Trường THPT Minh Hòa',
        employee_department_snapshot: dept?.name || teacher?.subject || 'Trường THPT Minh Hòa',
        
        // Target & Evaluation period
        targetGroup: selectedTarget as KpiTargetCode,
        evaluation_type: selectedTarget,
        month,
        academicYear,
        academic_year: academicYear,
        
        // Evaluator snapshots
        evaluatorId: selectedEvaluatorId || '',
        evaluator_id: selectedEvaluatorId || '',
        evaluatorName: evaluator?.name || '',
        evaluator_name_snapshot: evaluator?.name || '',
        evaluatorPosition: selectedEvaluatorId ? evalPos : '',
        evaluator_position_snapshot: selectedEvaluatorId ? evalPos : '',
        evaluatorDepartment: evaluatorDept?.name || evaluator?.subject || '',
        evaluator_department_snapshot: evaluatorDept?.name || evaluator?.subject || '',

        evaluationDate,
        self_assessed_at: selfAssessedAt,
        submitted_at: submittedAt,
        evaluated_at: evaluatedAt,
        lockedAt: lockedAt,
        lockedBy: lockedAt ? (user?.name || 'Ban Giám Hiệu') : undefined,

        status: nextStatus,
        totalStandardScore: totals.totalStandardScore,
        totalSelfScore: totals.totalSelfScore,
        totalEvaluatorScore: totals.totalEvaluatorScore,
        totalPlusScore: totals.totalPlusScore,
        totalMinusScore: totals.totalMinusScore,
        totalKpiScore: totals.totalKpiScore,
        
        // Snapshot ALL items with full rule definitions
        items: items.map((item, idx) => ({
          ...item,
          stt: idx + 1,
          kpi_code: item.kpi_code || item.code || `TC.${idx + 1}`,
          code: item.code || item.kpi_code || `TC.${idx + 1}`,
          kpi_group: item.kpi_group || item.group || 'Nhiệm vụ chung',
          group: item.group || item.kpi_group || 'Nhiệm vụ chung',
          criterion_content: item.criterion_content || item.criterionName || '',
          criterionName: item.criterionName || item.criterion_content || '',
          description: item.description || '',
          base_score: Number(item.base_score ?? item.standardScore) || 0,
          standardScore: Number(item.base_score ?? item.standardScore) || 0,
          minus_rules: item.minus_rules || [],
          plus_rules: item.plus_rules || [],
          evidence_rule: item.evidence_rule || '',
          evaluator_role: item.evaluator_role || '',
          
          self_score: Number(item.self_score ?? item.selfScore) || 0,
          selfScore: Number(item.self_score ?? item.selfScore) || 0,
          self_plus_score: Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0),
          selfPlusScore: Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0),
          self_minus_score: Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0),
          selfMinusScore: Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0),
          evidence: item.evidence || item.self_evidence || '',
          self_evidence: item.self_evidence || item.evidence || '',
          
          evaluator_score: Number(item.evaluator_score ?? item.evaluatorScore) || 0,
          evaluatorScore: Number(item.evaluator_score ?? item.evaluatorScore) || 0,
          evaluator_plus_score: Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0),
          evaluatorPlusScore: Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0),
          evaluator_minus_score: Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0),
          evaluatorMinusScore: Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0),
          evaluatorComment: item.evaluatorComment || item.evaluator_comment || item.evaluatorNote || '',
          
          plusScore: Math.max(0, Number(item.evaluator_plus_score ?? item.plusScore ?? item.self_plus_score) || 0),
          minusScore: Math.max(0, Number(item.evaluator_minus_score ?? item.minusScore ?? item.self_minus_score) || 0),
          kpiScore: Number(item.evaluator_score ?? item.self_score ?? item.base_score) || 0
        })),
        note: note.trim(),
        evaluateeComment: evaluateeComment.trim(),
        evaluatorComment: evaluatorComment.trim(),
        confirmedBy: (nextStatus === 'evaluated' || nextStatus === 'confirmed' || nextStatus === 'locked') ? (evaluator?.name || user?.name) : undefined,
        confirmedDate: (nextStatus === 'evaluated' || nextStatus === 'confirmed' || nextStatus === 'locked') ? evaluationDate : undefined,
        createdAt: formToEdit?.createdAt || now,
        updatedAt: now
      };

      if (currentFormId || formToEdit) {
        await updateKpiEvaluationForm(formIdToUse, formPayload);
      } else {
        await addKpiEvaluationForm(formPayload);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving KPI Evaluation Form:', err);
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi lưu phiếu đánh giá KPI.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-1 sm:p-3 overflow-y-auto">
      <div 
        id="kpi-evaluation-form-modal"
        className="relative w-full max-w-[98vw] 2xl:max-w-[1750px] bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ========================================================================= */}
        {/* TOP TOOLBAR & HEADER */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center text-amber-300 border border-blue-400/30 shadow-inner">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                  PHIẾU ĐÁNH GIÁ VÀ XẾP LOẠI KPI
                </h2>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm",
                  statusInfo.badgeClass
                )}>
                  {statusInfo.label}
                </span>
                {isFormLocked && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500 text-white flex items-center gap-1">
                    <Lock size={12} /> Đã khóa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Trường THPT Minh Hòa • Cấu trúc chuẩn 7 cột dữ liệu gốc & tích hợp đánh giá đa cấp
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center flex-wrap gap-2">
            {/* View filter */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs mr-2">
              <button
                type="button"
                onClick={() => setColumnViewMode('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all",
                  columnViewMode === 'all' ? "bg-blue-600 text-white shadow" : "text-slate-300 hover:text-white"
                )}
              >
                Tất cả cột
              </button>
              <button
                type="button"
                onClick={() => setColumnViewMode('self')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all",
                  columnViewMode === 'self' ? "bg-emerald-600 text-white shadow" : "text-slate-300 hover:text-white"
                )}
              >
                Chỉ Tự ĐG
              </button>
              <button
                type="button"
                onClick={() => setColumnViewMode('evaluator')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all",
                  columnViewMode === 'evaluator' ? "bg-blue-600 text-white shadow" : "text-slate-300 hover:text-white"
                )}
              >
                Chỉ Lãnh đạo ĐG
              </button>
            </div>

            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  if (formToEdit) {
                    onPrint(formToEdit);
                  } else {
                    const tempForm: KpiEvaluationForm = {
                      id: 'temp_print',
                      teacherId: selectedTeacherId,
                      teacherName: selectedTeacher?.name || 'Giáo viên',
                      teacherCode: selectedTeacher?.code || '',
                      position: selectedTeacher?.position || 'Giáo viên',
                      departmentName: teacherDepartment?.name || 'Trường THPT Minh Hòa',
                      targetGroup: selectedTarget,
                      month,
                      academicYear,
                      evaluatorId: selectedEvaluatorId,
                      evaluatorName: selectedEvaluator?.name || '',
                      evaluatorPosition: selectedEvaluator?.position || '',
                      evaluationDate,
                      status,
                      totalStandardScore: totals.totalStandardScore,
                      totalSelfScore: totals.totalSelfScore,
                      totalEvaluatorScore: totals.totalEvaluatorScore,
                      totalPlusScore: totals.totalPlusScore,
                      totalMinusScore: totals.totalMinusScore,
                      totalKpiScore: totals.totalKpiScore,
                      items,
                      note,
                      evaluateeComment,
                      evaluatorComment
                    };
                    onPrint(tempForm);
                  }
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="In phiếu đánh giá"
              >
                <Printer size={15} />
                In phiếu
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Existing form banner notice */}
        {existingFormNotice && (
          <div className="bg-amber-500/10 border-b border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center gap-2">
            <Info size={16} className="text-amber-600 shrink-0" />
            <span>{existingFormNotice}</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="bg-rose-500/10 border-b border-rose-200 px-5 py-2 text-xs text-rose-900 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL BODY (SCROLLABLE) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ========================================================================= */}
          {/* 1. PHẦN THÔNG TIN CHUNG (HEADER PHIẾU ĐÁNH GIÁ) */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  I. THÔNG TIN CHUNG CỦA PHIẾU ĐÁNH GIÁ
                </h3>
              </div>
              <span className="text-xs text-slate-400 italic">
                * Tuân thủ quy định chuẩn đánh giá CBGVNV Trường THPT Minh Hòa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              {/* 1.1 Họ và tên & Mã CBGVNV */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <User size={13} className="text-blue-600" />
                  Họ và tên CBGVNV:
                </label>
                <select
                  disabled={isFormLocked || (!!formToEdit && !isBghOrAdmin)}
                  value={selectedTeacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-75"
                >
                  {(showAllTeachers ? teachers : filterTeachersByTargetGroup(teachers, selectedTarget)).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code || t.id}) - {t.position || t.role}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Mã CBGVNV: <strong className="text-slate-800 font-mono">{selectedTeacher?.code || selectedTeacher?.id || '-'}</strong></span>
                  {isBghOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAllTeachers(!showAllTeachers)}
                      className="text-blue-600 hover:underline text-[10px]"
                    >
                      {showAllTeachers ? 'Chỉ hiện theo nhóm' : 'Hiện tất cả'}
                    </button>
                  )}
                </div>
              </div>

              {/* 1.2 Chức vụ & Tổ / Bộ phận */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <FolderOpen size={13} className="text-blue-600" />
                  Chức vụ & Tổ / Bộ phận:
                </label>
                <div className="px-2.5 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-slate-800 font-medium">
                  <div className="font-bold truncate">{selectedTeacher?.position || selectedTeacher?.role || 'Giáo viên'}</div>
                  <div className="text-[11px] text-slate-600 truncate">{teacherDepartment?.name || selectedTeacher?.subject || 'Trường THPT Minh Hòa'}</div>
                </div>
              </div>

              {/* 1.3 Đối tượng đánh giá */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Layers size={13} className="text-blue-600" />
                  Đối tượng đánh giá:
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {KPI_TARGET_GROUPS.map(tg => {
                    const isSelected = selectedTarget === tg.key;
                    return (
                      <button
                        key={tg.key}
                        type="button"
                        disabled={isFormLocked || !!currentFormId}
                        onClick={() => handleTargetChange(tg.key)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-bold text-left border transition-all truncate",
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-700 shadow-xs" 
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-60"
                        )}
                        title={tg.description}
                      >
                        {tg.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1.4 Thời gian & Người đánh giá */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="font-bold text-slate-700 block text-[11px]">Tháng:</label>
                    <select
                      disabled={isFormLocked || !!currentFormId}
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="font-bold text-slate-700 block text-[11px]">Năm học:</label>
                    <select
                      disabled={isFormLocked || !!currentFormId}
                      value={academicYear}
                      onChange={(e) => handleAcademicYearChange(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                    </select>
                  </div>
                </div>

                {/* Người đánh giá */}
                <div className="pt-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <UserCheck size={12} className="text-emerald-600" />
                      Người đánh giá:
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal italic">
                      {eligibleEvaluatorsResult.note}
                    </span>
                  </label>
                  <select
                    disabled={isFormLocked || (!isBghOrAdmin && !canEditPartA && !canEditPartB)}
                    value={selectedEvaluatorId}
                    onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-emerald-400/80 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn người đánh giá thẩm quyền --</option>
                    {eligibleEvaluatorsResult.evaluators.filter(ev => !isExcludedCbqlEvaluator(ev)).map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.position || ev.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. BẢNG ĐÁNH GIÁ KPI CHUẨN (7 CỘT GỐC + CỘT ĐÁNH GIÁ) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  II. BẢNG TIÊU CHÍ VÀ ĐÁNH GIÁ KPI CHI TIẾT (ĐẦY ĐỦ 7 CỘT FILE GỐC + ĐÁNH GIÁ)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-300">Tổng số tiêu chí: <strong className="text-amber-300">{items.length}</strong></span>
                <span className="text-slate-300">Tổng điểm nền: <strong className="text-emerald-300">100 điểm</strong></span>
              </div>
            </div>

            {/* Scrollable Container with Sticky Table Headers */}
            <div className="overflow-x-auto overflow-y-auto max-h-[58vh] scrollbar-thin">
              <table className="w-full text-xs text-left border-collapse min-w-[1700px]">
                
                {/* 2.1 STICKY HEADER */}
                <thead className="sticky top-0 z-20 bg-slate-800 text-white shadow-md select-none text-[11px]">
                  {/* Top Level Category Row */}
                  <tr>
                    <th colSpan={7} className="border-r border-slate-700 bg-slate-800 px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-200">
                      CẤU TRÚC 7 CỘT NGUYÊN BẢN THEO FILE QUY ĐỊNH
                    </th>
                    {(columnViewMode === 'all' || columnViewMode === 'self') && (
                      <th colSpan={4} className="border-r border-emerald-800 bg-emerald-950/90 px-3 py-2 text-center font-bold uppercase tracking-wider text-emerald-300">
                        PHẦN A: TỰ ĐÁNH GIÁ (CÁ NHÂN)
                      </th>
                    )}
                    {(columnViewMode === 'all' || columnViewMode === 'evaluator') && (
                      <th colSpan={4} className="bg-blue-950/90 px-3 py-2 text-center font-bold uppercase tracking-wider text-blue-300">
                        PHẦN B: ĐÁNH GIÁ CỦA LÃNH ĐẠO / NGƯỜI ĐÁNH GIÁ
                      </th>
                    )}
                  </tr>

                  {/* Exact 7 Column Names + Interactive Column Names */}
                  <tr className="border-t border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    {/* Cột 1 */}
                    <th className="px-2.5 py-2.5 w-20 text-center border-r border-slate-700">
                      Mã KPI
                    </th>
                    {/* Cột 2 */}
                    <th className="px-3 py-2.5 w-48 border-r border-slate-700">
                      Nhóm KPI
                    </th>
                    {/* Cột 3 */}
                    <th className="px-3 py-2.5 min-w-[260px] max-w-[340px] border-r border-slate-700">
                      Tiêu chí thành phần
                    </th>
                    {/* Cột 4 */}
                    <th className="px-2.5 py-2.5 w-20 text-center border-r border-slate-700">
                      Điểm nền
                    </th>
                    {/* Cột 5 */}
                    <th className="px-3 py-2.5 min-w-[240px] max-w-[320px] border-r border-slate-700">
                      Mức điểm trừ cụ thể
                    </th>
                    {/* Cột 6 */}
                    <th className="px-3 py-2.5 min-w-[240px] max-w-[320px] border-r border-slate-700">
                      Mức điểm cộng cụ thể
                    </th>
                    {/* Cột 7 */}
                    <th className="px-3 py-2.5 min-w-[200px] max-w-[260px] border-r border-slate-700">
                      Minh chứng / Người đánh giá
                    </th>

                    {/* CỘT NHẬP TỰ ĐÁNH GIÁ */}
                    {(columnViewMode === 'all' || columnViewMode === 'self') && (
                      <>
                        <th className="px-2.5 py-2.5 w-44 bg-emerald-900/60 border-r border-emerald-800 text-emerald-200 text-center">
                          Điểm trừ tự ĐG
                        </th>
                        <th className="px-2.5 py-2.5 w-44 bg-emerald-900/60 border-r border-emerald-800 text-emerald-200 text-center">
                          Điểm cộng tự ĐG
                        </th>
                        <th className="px-2 py-2.5 w-24 bg-emerald-900/80 border-r border-emerald-800 text-emerald-300 text-center font-extrabold">
                          Điểm KPI tự ĐG
                        </th>
                        <th className="px-3 py-2.5 w-48 bg-emerald-900/60 border-r border-slate-700 text-emerald-200">
                          Minh chứng cá nhân
                        </th>
                      </>
                    )}

                    {/* CỘT NHẬP LÃNH ĐẠO ĐÁNH GIÁ */}
                    {(columnViewMode === 'all' || columnViewMode === 'evaluator') && (
                      <>
                        <th className="px-2.5 py-2.5 w-44 bg-blue-900/60 border-r border-blue-800 text-blue-200 text-center">
                          Điểm trừ Lãnh đạo
                        </th>
                        <th className="px-2.5 py-2.5 w-44 bg-blue-900/60 border-r border-blue-800 text-blue-200 text-center">
                          Điểm cộng Lãnh đạo
                        </th>
                        <th className="px-2 py-2.5 w-24 bg-blue-900/80 border-r border-blue-800 text-amber-300 text-center font-extrabold">
                          Điểm KPI cuối cùng
                        </th>
                        <th className="px-3 py-2.5 w-52 bg-blue-900/60 text-blue-200">
                          Nhận xét của người ĐG
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                {/* 2.2 TABLE BODY (ALL ROWS IN SEQUENCE) */}
                <tbody className="divide-y divide-slate-200 font-sans">
                  {items.map((item, idx) => {
                    const baseScore = Number(item.base_score ?? item.standardScore) || 0;
                    
                    // Self values
                    const selfMinus = Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0);
                    const selfPlus = Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0);
                    const selfKpi = Math.max(0, baseScore - selfMinus + selfPlus);

                    // Evaluator values
                    const evalMinus = Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0);
                    const evalPlus = Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0);
                    const evalKpi = Math.max(0, baseScore - evalMinus + evalPlus);

                    return (
                      <tr 
                        key={item.id || idx}
                        className={cn(
                          "hover:bg-slate-50/90 transition-colors align-top",
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        )}
                      >
                        {/* CỘT 1: Mã KPI */}
                        <td className="px-2.5 py-3 text-center border-r border-slate-200 font-mono font-black text-blue-900 bg-blue-50/30">
                          {item.kpi_code || item.code || `TC.${idx + 1}`}
                        </td>

                        {/* CỘT 2: Nhóm KPI */}
                        <td className="px-3 py-3 border-r border-slate-200 font-semibold text-slate-800 text-[11.5px] leading-relaxed">
                          {item.kpi_group || item.group || 'Nhiệm vụ chung'}
                        </td>

                        {/* CỘT 3: Tiêu chí thành phần (Nội dung chi tiết đầy đủ, không cắt ngắn) */}
                        <td className="px-3 py-3 border-r border-slate-200 text-slate-900 leading-relaxed">
                          <div className="font-bold text-slate-900">
                            {item.criterion_content || item.criterionName}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-slate-600 mt-1 leading-normal italic bg-slate-100/70 p-1.5 rounded border border-slate-200/60">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* CỘT 4: Điểm nền */}
                        <td className="px-2.5 py-3 text-center border-r border-slate-200 font-black text-sm text-slate-800 bg-slate-100/50">
                          {baseScore}
                        </td>

                        {/* CỘT 5: Mức điểm trừ cụ thể (Hiển thị đầy đủ tất cả mức quy định) */}
                        <td className="px-3 py-3 border-r border-slate-200 text-[11px] leading-relaxed text-slate-700">
                          {item.minus_rules && item.minus_rules.length > 0 ? (
                            <ul className="space-y-1">
                              {item.minus_rules.map((rule, rIdx) => (
                                <li key={rIdx} className={cn(
                                  "flex items-start gap-1.5",
                                  rule.score === 0 ? "text-slate-500 italic" : "text-rose-900"
                                )}>
                                  <span className="font-bold shrink-0">
                                    {rule.score === 0 ? '• 0đ:' : `• -${rule.score}đ:`}
                                  </span>
                                  <span>{rule.label}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Theo quy định hiện hành</span>
                          )}
                        </td>

                        {/* CỘT 6: Mức điểm cộng cụ thể (Hiển thị đầy đủ tất cả mức quy định) */}
                        <td className="px-3 py-3 border-r border-slate-200 text-[11px] leading-relaxed text-slate-700">
                          {item.plus_rules && item.plus_rules.length > 0 ? (
                            <ul className="space-y-1">
                              {item.plus_rules.map((rule, rIdx) => (
                                <li key={rIdx} className={cn(
                                  "flex items-start gap-1.5",
                                  rule.score === 0 ? "text-slate-500 italic" : "text-emerald-900"
                                )}>
                                  <span className="font-bold shrink-0">
                                    {rule.score === 0 ? '• 0đ:' : `• +${rule.score}đ:`}
                                  </span>
                                  <span>{rule.label}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Không có điểm cộng</span>
                          )}
                        </td>

                        {/* CỘT 7: Minh chứng / Người đánh giá */}
                        <td className="px-3 py-3 border-r border-slate-200 text-[11px] leading-relaxed">
                          {item.evidence_rule && (
                            <div className="text-slate-800 font-medium">
                              <span className="text-slate-500 block text-[10px] uppercase font-bold">Yêu cầu minh chứng:</span>
                              {item.evidence_rule}
                            </div>
                          )}
                          {item.evaluator_role && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-blue-900 font-semibold text-[10.5px]">
                              <span className="text-slate-500 block text-[10px] uppercase font-bold">Người đánh giá:</span>
                              {item.evaluator_role}
                            </div>
                          )}
                        </td>

                        {/* ========================================================= */}
                        {/* PHẦN A: CÁC CỘT TỰ ĐÁNH GIÁ (DÙNG HỘP KIỂM CHECKBOX THAY DẠNG CHỌN MẶC ĐỊNH) */}
                        {/* ========================================================= */}
                        {(columnViewMode === 'all' || columnViewMode === 'self') && (
                          <>
                            {/* Điểm trừ tự ĐG - Hộp kiểm (Checkbox) */}
                            <td className="px-2 py-2.5 border-r border-emerald-100 bg-emerald-50/20">
                              <div className="space-y-1.5 min-w-[160px]">
                                <label className={cn(
                                  "flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                  selfMinus === 0 
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}>
                                  <input
                                    type="checkbox"
                                    disabled={!canEditPartA}
                                    checked={selfMinus === 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handlePartAMinusRuleChange(item.id, 'Không vi phạm', 0);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                  />
                                  <span>✓ Không vi phạm (0đ)</span>
                                </label>

                                {(item.minus_rules || []).filter(r => r.score > 0).map((r, rIdx) => {
                                  const isChecked = selfMinus === r.score;
                                  return (
                                    <label 
                                      key={rIdx} 
                                      className={cn(
                                        "flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                        isChecked 
                                          ? "bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-xs" 
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!canEditPartA}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handlePartAMinusRuleChange(item.id, r.label, r.score);
                                          } else {
                                            handlePartAMinusRuleChange(item.id, 'Không vi phạm', 0);
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                                      />
                                      <div className="leading-tight">
                                        <span className="font-extrabold text-rose-700 mr-1">-{r.score}đ:</span>
                                        <span>{r.label}</span>
                                      </div>
                                    </label>
                                  );
                                })}

                                {selfMinus > 0 && (
                                  <div className="text-center font-black text-rose-700 text-xs pt-0.5">
                                    Tổng trừ: -{selfMinus}đ
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Điểm cộng tự ĐG - Hộp kiểm (Checkbox) */}
                            <td className="px-2 py-2.5 border-r border-emerald-100 bg-emerald-50/20">
                              <div className="space-y-1.5 min-w-[160px]">
                                <label className={cn(
                                  "flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                  selfPlus === 0 
                                    ? "bg-slate-50 border-slate-200 text-slate-600 font-bold" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}>
                                  <input
                                    type="checkbox"
                                    disabled={!canEditPartA}
                                    checked={selfPlus === 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handlePartAPlusRuleChange(item.id, 'Không cộng', 0);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 cursor-pointer shrink-0"
                                  />
                                  <span>Không cộng (0đ)</span>
                                </label>

                                {(item.plus_rules || []).filter(r => r.score > 0).map((r, rIdx) => {
                                  const isChecked = selfPlus === r.score;
                                  return (
                                    <label 
                                      key={rIdx} 
                                      className={cn(
                                        "flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                        isChecked 
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs" 
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!canEditPartA}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handlePartAPlusRuleChange(item.id, r.label, r.score);
                                          } else {
                                            handlePartAPlusRuleChange(item.id, 'Không cộng', 0);
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                      />
                                      <div className="leading-tight">
                                        <span className="font-extrabold text-emerald-700 mr-1">+{r.score}đ:</span>
                                        <span>{r.label}</span>
                                      </div>
                                    </label>
                                  );
                                })}

                                {selfPlus > 0 && (
                                  <div className="text-center font-black text-emerald-700 text-xs pt-0.5">
                                    Tổng cộng: +{selfPlus}đ
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Điểm KPI tự ĐG (Tự động = Điểm nền - Trừ + Cộng) */}
                            <td className="px-2 py-3 border-r border-emerald-200 bg-emerald-50/40 text-center">
                              <span className="font-black text-sm text-emerald-900 bg-emerald-100/90 px-2 py-1 rounded-md border border-emerald-300 shadow-xs">
                                {selfKpi}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {baseScore} - {selfMinus} + {selfPlus}
                              </div>
                            </td>

                            {/* Minh chứng cá nhân */}
                            <td className="px-2 py-2.5 border-r border-slate-200 bg-emerald-50/10">
                              <textarea
                                rows={2}
                                disabled={!canEditPartA}
                                value={item.evidence || item.self_evidence || ''}
                                onChange={(e) => handlePartAEvidenceChange(item.id, e.target.value)}
                                placeholder="Ghi chú minh chứng, số hiệu..."
                                className="w-full p-1.5 text-[11px] bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:bg-slate-100 resize-none"
                              />
                            </td>
                          </>
                        )}

                        {/* ========================================================= */}
                        {/* PHẦN B: CÁC CỘT ĐÁNH GIÁ CỦA LÃNH ĐẠO / NGƯỜI ĐÁNH GIÁ (HỘP KIỂM CHECKBOX) */}
                        {/* ========================================================= */}
                        {(columnViewMode === 'all' || columnViewMode === 'evaluator') && (
                          <>
                            {/* Điểm trừ Lãnh đạo chấm - Hộp kiểm (Checkbox) */}
                            <td className="px-2 py-2.5 border-r border-blue-100 bg-blue-50/20">
                              <div className="space-y-1.5 min-w-[160px]">
                                <label className={cn(
                                  "flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                  evalMinus === 0 
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}>
                                  <input
                                    type="checkbox"
                                    disabled={!canEditPartB}
                                    checked={evalMinus === 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handlePartBMinusRuleChange(item.id, 'Không vi phạm', 0);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                  />
                                  <span>✓ Không vi phạm (0đ)</span>
                                </label>

                                {(item.minus_rules || []).filter(r => r.score > 0).map((r, rIdx) => {
                                  const isChecked = evalMinus === r.score;
                                  return (
                                    <label 
                                      key={rIdx} 
                                      className={cn(
                                        "flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                        isChecked 
                                          ? "bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-xs" 
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!canEditPartB}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handlePartBMinusRuleChange(item.id, r.label, r.score);
                                          } else {
                                            handlePartBMinusRuleChange(item.id, 'Không vi phạm', 0);
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                                      />
                                      <div className="leading-tight">
                                        <span className="font-extrabold text-rose-700 mr-1">-{r.score}đ:</span>
                                        <span>{r.label}</span>
                                      </div>
                                    </label>
                                  );
                                })}

                                {evalMinus > 0 && (
                                  <div className="text-center font-black text-rose-700 text-xs pt-0.5">
                                    Trừ LĐ: -{evalMinus}đ
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Điểm cộng Lãnh đạo chấm - Hộp kiểm (Checkbox) */}
                            <td className="px-2 py-2.5 border-r border-blue-100 bg-blue-50/20">
                              <div className="space-y-1.5 min-w-[160px]">
                                <label className={cn(
                                  "flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                  evalPlus === 0 
                                    ? "bg-slate-50 border-slate-200 text-slate-600 font-bold" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}>
                                  <input
                                    type="checkbox"
                                    disabled={!canEditPartB}
                                    checked={evalPlus === 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handlePartBPlusRuleChange(item.id, 'Không cộng', 0);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 cursor-pointer shrink-0"
                                  />
                                  <span>Không cộng (0đ)</span>
                                </label>

                                {(item.plus_rules || []).filter(r => r.score > 0).map((r, rIdx) => {
                                  const isChecked = evalPlus === r.score;
                                  return (
                                    <label 
                                      key={rIdx} 
                                      className={cn(
                                        "flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                                        isChecked 
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs" 
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!canEditPartB}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handlePartBPlusRuleChange(item.id, r.label, r.score);
                                          } else {
                                            handlePartBPlusRuleChange(item.id, 'Không cộng', 0);
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                      />
                                      <div className="leading-tight">
                                        <span className="font-extrabold text-emerald-700 mr-1">+{r.score}đ:</span>
                                        <span>{r.label}</span>
                                      </div>
                                    </label>
                                  );
                                })}

                                {evalPlus > 0 && (
                                  <div className="text-center font-black text-emerald-700 text-xs pt-0.5">
                                    Cộng LĐ: +{evalPlus}đ
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Điểm KPI cuối cùng (Tự động = Điểm nền - Trừ LĐ + Cộng LĐ) */}
                            <td className="px-2 py-3 border-r border-blue-200 bg-blue-50/40 text-center">
                              <span className="font-black text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded-md border border-blue-300 shadow-xs">
                                {evalKpi}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {baseScore} - {evalMinus} + {evalPlus}
                              </div>
                            </td>

                            {/* Nhận xét của người đánh giá */}
                            <td className="px-2 py-2.5 bg-blue-50/10">
                              <textarea
                                rows={2}
                                disabled={!canEditPartB}
                                value={item.evaluatorComment || item.evaluator_comment || ''}
                                onChange={(e) => handlePartBCommentChange(item.id, e.target.value)}
                                placeholder="Nhận xét thẩm định..."
                                className="w-full p-1.5 text-[11px] bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:bg-slate-100 resize-none"
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>

                {/* 2.3 STICKY SUMMARY FOOTER (TỔNG CỘNG) */}
                <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold border-t-2 border-slate-700 shadow-xl text-xs">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-amber-300 border-r border-slate-700">
                      TỔNG CỘNG ĐIỂM KPI:
                    </td>
                    
                    {/* Tổng điểm nền = 100 */}
                    <td className="px-2.5 py-3 text-center border-r border-slate-700 text-sm font-black text-amber-300 bg-slate-800">
                      {totals.totalStandardScore}
                    </td>

                    {/* Mức trừ, Mức cộng, Minh chứng */}
                    <td className="px-3 py-3 text-center border-r border-slate-700 text-slate-400 font-normal italic">-</td>
                    <td className="px-3 py-3 text-center border-r border-slate-700 text-slate-400 font-normal italic">-</td>
                    <td className="px-3 py-3 text-center border-r border-slate-700 text-slate-400 font-normal italic">-</td>

                    {/* TỔNG TỰ ĐÁNH GIÁ */}
                    {(columnViewMode === 'all' || columnViewMode === 'self') && (
                      <>
                        <td className="px-2 py-3 text-center border-r border-emerald-900 bg-emerald-950/80 text-rose-300 font-black">
                          {totals.selfTotalMinus > 0 ? `-${totals.selfTotalMinus}` : '0'}
                        </td>
                        <td className="px-2 py-3 text-center border-r border-emerald-900 bg-emerald-950/80 text-emerald-300 font-black">
                          {totals.selfTotalPlus > 0 ? `+${totals.selfTotalPlus}` : '0'}
                        </td>
                        <td className="px-2 py-3 text-center border-r border-emerald-900 bg-emerald-900 text-white font-extrabold text-sm">
                          {totals.totalSelfScore}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-700 bg-emerald-950/80 text-center text-slate-400 font-normal italic">-</td>
                      </>
                    )}

                    {/* TỔNG ĐÁNH GIÁ LÃNH ĐẠO */}
                    {(columnViewMode === 'all' || columnViewMode === 'evaluator') && (
                      <>
                        <td className="px-2 py-3 text-center border-r border-blue-900 bg-blue-950/80 text-rose-300 font-black">
                          {totals.evaluatorTotalMinus > 0 ? `-${totals.evaluatorTotalMinus}` : '0'}
                        </td>
                        <td className="px-2 py-3 text-center border-r border-blue-900 bg-blue-950/80 text-emerald-300 font-black">
                          {totals.evaluatorTotalPlus > 0 ? `+${totals.evaluatorTotalPlus}` : '0'}
                        </td>
                        <td className="px-2 py-3 text-center border-r border-blue-900 bg-blue-900 text-amber-300 font-black text-base">
                          {totals.totalKpiScore}
                        </td>
                        <td className="px-3 py-3 bg-blue-950/80">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300 font-normal uppercase">Xếp loại:</span>
                            <span className={cn("px-2 py-0.5 rounded text-[11px] font-black border", rankBadge.class)}>
                              {rankBadge.label}
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. PHẦN Ý KIẾN & KẾT LUẬN CUỐI PHIẾU */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 3.1 Ý kiến của người tự đánh giá */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <User size={14} className="text-emerald-600" />
                  Ý kiến / Giải trình của Người tự đánh giá:
                </span>
                <span className="text-[10px] text-slate-400 font-normal italic">
                  (Cá nhân nhập khi tự đánh giá)
                </span>
              </label>
              <textarea
                rows={3}
                disabled={!canEditPartA}
                value={evaluateeComment}
                onChange={(e) => setEvaluateeComment(e.target.value)}
                placeholder="Nhập ý kiến, đề xuất hoặc giải trình về kết quả công tác trong tháng..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* 3.2 Nhận xét / Kết luận của Người đánh giá */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-900">
                  <UserCheck size={14} className="text-blue-600" />
                  Nhận xét & Kết luận của Người đánh giá / Lãnh đạo:
                </span>
                <span className="text-[10px] text-slate-400 font-normal italic">
                  (Người đánh giá / BGH ghi nhận xét và kết luận xếp loại)
                </span>
              </label>
              <textarea
                rows={3}
                disabled={!canEditPartB}
                value={evaluatorComment}
                onChange={(e) => setEvaluatorComment(e.target.value)}
                placeholder="Ghi nhận xét chung về ưu điểm, hạn chế và kết luận xếp loại thi đua tháng..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER WITH WORKFLOW BUTTONS */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 shrink-0 shadow-lg">
          
          {/* Summary status chip & Auto-Rank */}
          <div className="flex items-center gap-2.5">
            <div className="text-xs text-slate-600">
              Điểm KPI cuối: <strong className="text-blue-900 text-sm">{totals.totalKpiScore}/100</strong>
            </div>
            <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", rankBadge.class)}>
              {rankBadge.label}
            </div>
          </div>

          {/* Workflow Action Buttons strictly respecting Roles & Status */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* 1. Lưu bản nháp (Draft) */}
            {canEditPartA && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('draft')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                Lưu bản nháp
              </button>
            )}

            {/* 2. Hoàn thành tự đánh giá & Gửi cho người đánh giá */}
            {canEditPartA && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('submit_to_evaluator')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} />
                Hoàn thành & Gửi người đánh giá
              </button>
            )}

            {/* 3. Lưu tạm đánh giá của Lãnh đạo */}
            {canEditPartB && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('save_evaluation')}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                Lưu tạm đánh giá
              </button>
            )}

            {/* 4. Hoàn tất đánh giá (Evaluated) */}
            {canEditPartB && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('complete_evaluation')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle size={14} />
                Hoàn tất đánh giá & Xếp loại
              </button>
            )}

            {/* 5. Khóa phiếu / Mở khóa phiếu (Dành riêng cho BGH / Admin) */}
            {isBghOrAdmin && (
              <>
                {!isFormLocked ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('lock')}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Khóa phiếu KPI để không ai được sửa"
                  >
                    <Lock size={14} />
                    Khóa phiếu KPI
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('unlock')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Mở khóa để cho phép điều chỉnh"
                  >
                    <Unlock size={14} />
                    Mở khóa phiếu
                  </button>
                )}
              </>
            )}

            {/* Đóng Modal */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
